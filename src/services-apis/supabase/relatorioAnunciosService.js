import { supabase } from './client.js';

// =============================================
// UTILIDADES - Tratamento de Dados
// =============================================

/**
 * Converte uma string formatada em dinheiro/porcentagem para número decimal.
 * Exemplos: "R$ 1.234,56" -> 1234.56, "2,5%" -> 2.5
 * @param {string|number} value - Valor a ser convertido
 * @returns {number} Valor decimal limpo
 */
export function parseMetricValue(value) {
    if (typeof value === 'number') return value;
    if (!value || typeof value !== 'string') return 0;

    // Remove símbolos de moeda, espaços e %
    let cleaned = value.replace(/[R$\s%]/g, '');
    // Troca vírgula decimal por ponto
    cleaned = cleaned.replace('.', '').replace(',', '.');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Normaliza a data para sempre ser a segunda-feira da semana.
 * Isso é crucial para a regra de unicidade funcionar corretamente.
 * @param {string|Date} date - Data a ser normalizada
 * @returns {string} Data normalizada no formato YYYY-MM-DD
 */
export function normalizeToMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    // Se não for segunda (1), ajusta para a segunda anterior ou do dia
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}

/**
 * Formata valor para moeda brasileira
 * @param {number} value - Valor numérico
 * @returns {string} Valor formatado em BRL
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

/**
 * Formata valor como porcentagem
 * @param {number} value - Valor numérico (ex: 2.5 para 2.5%)
 * @returns {string} Valor formatado como porcentagem
 */
export function formatPercentage(value) {
    return `${(value || 0).toFixed(2).replace('.', ',')}%`;
}

// =============================================
// CRUD - RELATÓRIO DE ANÚNCIOS
// =============================================

/**
 * Busca todos os relatórios de anúncios
 * @returns {Promise<Array>} Lista de relatórios
 */
export async function buscarTodosRelatoriosAnuncios() {
    const { data, error } = await supabase
        .from('relatorio_anuncios')
        .select(`
            *,
            anuncios(nome, status, preview_midia),
            marcas(nome),
            plataformas(nome),
            contas_de_anuncio(nome),
            modelos(nome)
        `)
        .order('data_inicio', { ascending: false });

    if (error) {
        console.error('Erro ao buscar relatórios de anúncios:', error);
        return [];
    }
    return data || [];
}

/**
 * Busca relatórios de anúncios com filtros
 * @param {Object} filtros - Filtros a serem aplicados
 * @returns {Promise<Array>} Lista de relatórios filtrados
 */
export async function buscarRelatoriosComFiltros(filtros = {}) {
    let query = supabase
        .from('relatorio_anuncios')
        .select(`
            *,
            anuncios(nome, status, preview_midia),
            marcas(nome),
            plataformas(nome),
            contas_de_anuncio(nome),
            modelos(nome)
        `)
        .order('data_inicio', { ascending: false });

    if (filtros.marca_id) {
        query = query.eq('marca_id', filtros.marca_id);
    }
    if (filtros.plataforma_id) {
        query = query.eq('plataforma_id', filtros.plataforma_id);
    }
    if (filtros.conta_de_anuncio_id) {
        query = query.eq('conta_de_anuncio_id', filtros.conta_de_anuncio_id);
    }
    if (filtros.modelo_id) {
        query = query.eq('modelo_id', filtros.modelo_id);
    }
    if (filtros.data_inicio) {
        query = query.gte('data_inicio', filtros.data_inicio);
    }
    if (filtros.data_fim) {
        query = query.lte('data_fim', filtros.data_fim);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao buscar relatórios de anúncios com filtros:', error);
        return [];
    }
    return data || [];
}

/**
 * Upsert de dados do relatório de anúncios.
 * Usa a combinação anuncio_id + data_inicio para detectar conflitos.
 * Se a combinação existir, atualiza; caso contrário, insere novo registro.
 * @param {Object} dadosRelatorio - Dados do relatório
 * @returns {Promise<Object|null>} Registro inserido/atualizado ou null em caso de erro
 */
export async function upsertRelatorioAnuncio(dadosRelatorio) {
    // Normaliza a data para segunda-feira
    const dataNormalizada = normalizeToMonday(dadosRelatorio.data_inicio);

    // Prepara os dados com métricas limpas
    const dados = {
        anuncio_id: dadosRelatorio.anuncio_id,
        marca_id: dadosRelatorio.marca_id || null,
        plataforma_id: dadosRelatorio.plataforma_id || null,
        conta_de_anuncio_id: dadosRelatorio.conta_de_anuncio_id || null,
        modelo_id: dadosRelatorio.modelo_id || null,
        data_inicio: dataNormalizada,
        data_fim: dadosRelatorio.data_fim,
        spend: parseMetricValue(dadosRelatorio.spend),
        cpc: parseMetricValue(dadosRelatorio.cpc),
        ctr: parseMetricValue(dadosRelatorio.ctr),
        conversao: parseMetricValue(dadosRelatorio.conversao),
        atualizado_em: new Date().toISOString()
    };

    const { data, error } = await supabase
        .from('relatorio_anuncios')
        .upsert(dados, {
            onConflict: 'anuncio_id,data_inicio',
            ignoreDuplicates: false
        })
        .select();

    if (error) {
        console.error('Erro ao fazer upsert do relatório de anúncio:', error);
        return null;
    }
    return data?.[0] || null;
}

/**
 * Importa múltiplos registros de relatório via upsert
 * @param {Array} registros - Lista de registros a serem importados
 * @returns {Promise<Object>} Resultado da importação com contador de sucesso/erro
 */
export async function importarRelatoriosEmLote(registros) {
    let sucessos = 0;
    let erros = 0;
    const errosDetalhados = [];

    for (const registro of registros) {
        const resultado = await upsertRelatorioAnuncio(registro);
        if (resultado) {
            sucessos++;
        } else {
            erros++;
            errosDetalhados.push({ registro, erro: 'Falha no upsert' });
        }
    }

    return {
        total: registros.length,
        sucessos,
        erros,
        errosDetalhados
    };
}

/**
 * Deleta um relatório de anúncio por ID
 * @param {string} id - ID do relatório
 * @returns {Promise<boolean>} true se deletado com sucesso
 */
export async function deletarRelatorioAnuncio(id) {
    const { error } = await supabase
        .from('relatorio_anuncios')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Erro ao deletar relatório de anúncio ${id}:`, error);
        return false;
    }
    return true;
}

// =============================================
// AGREGAÇÕES - ESTATÍSTICAS E RELATÓRIOS
// =============================================

/**
 * Calcula estatísticas agregadas dos relatórios de anúncios.
 * Para métricas absolutas (spend, conversao): usa soma
 * Para métricas relativas (cpc, ctr): usa média
 * @param {Object} filtros - Filtros para os dados
 * @returns {Promise<Object>} Estatísticas agregadas
 */
export async function calcularEstatisticasAgregadas(filtros = {}) {
    const dados = await buscarRelatoriosComFiltros(filtros);

    if (!dados || dados.length === 0) {
        return {
            totalInvestido: 0,
            totalConversoes: 0,
            ctrMedio: 0,
            cpcMedio: 0,
            totalRegistros: 0
        };
    }

    // Métricas absolutas: SOMA
    const totalInvestido = dados.reduce((sum, r) => sum + (r.spend || 0), 0);
    const totalConversoes = dados.reduce((sum, r) => sum + (r.conversao || 0), 0);

    // Métricas relativas: MÉDIA
    const registrosComCtr = dados.filter(r => r.ctr !== null && r.ctr !== undefined);
    const registrosComCpc = dados.filter(r => r.cpc !== null && r.cpc !== undefined);

    const ctrMedio = registrosComCtr.length > 0
        ? registrosComCtr.reduce((sum, r) => sum + (r.ctr || 0), 0) / registrosComCtr.length
        : 0;

    const cpcMedio = registrosComCpc.length > 0
        ? registrosComCpc.reduce((sum, r) => sum + (r.cpc || 0), 0) / registrosComCpc.length
        : 0;

    return {
        totalInvestido,
        totalConversoes,
        ctrMedio,
        cpcMedio,
        totalRegistros: dados.length
    };
}

/**
 * Calcula investimento por marca
 * @param {Object} filtros - Filtros para os dados
 * @returns {Promise<Array>} Lista de marcas com seus investimentos
 */
export async function calcularInvestimentoPorMarca(filtros = {}) {
    const dados = await buscarRelatoriosComFiltros(filtros);

    if (!dados || dados.length === 0) {
        return [];
    }

    // Agrupa por marca
    const porMarca = {};
    dados.forEach(registro => {
        const marcaId = registro.marca_id;
        const marcaNome = registro.marcas?.nome || 'Sem Marca';

        if (!porMarca[marcaId]) {
            porMarca[marcaId] = {
                marca_id: marcaId,
                marca_nome: marcaNome,
                spend: 0,
                conversao: 0,
                ctr_total: 0,
                cpc_total: 0,
                registros: 0
            };
        }

        porMarca[marcaId].spend += registro.spend || 0;
        porMarca[marcaId].conversao += registro.conversao || 0;
        porMarca[marcaId].ctr_total += registro.ctr || 0;
        porMarca[marcaId].cpc_total += registro.cpc || 0;
        porMarca[marcaId].registros++;
    });

    // Calcula médias e formata resultado
    return Object.values(porMarca).map(m => ({
        marca_id: m.marca_id,
        marca_nome: m.marca_nome,
        totalInvestido: m.spend,
        totalConversoes: m.conversao,
        ctrMedio: m.registros > 0 ? m.ctr_total / m.registros : 0,
        cpcMedio: m.registros > 0 ? m.cpc_total / m.registros : 0
    })).sort((a, b) => b.totalInvestido - a.totalInvestido);
}

/**
 * Busca dados para gráfico de tendência semanal
 * Mantém a granularidade semanal ordenada por data
 * @param {Object} filtros - Filtros para os dados
 * @returns {Promise<Array>} Dados semanais para gráfico
 */
export async function buscarTendenciaSemanal(filtros = {}) {
    const dados = await buscarRelatoriosComFiltros(filtros);

    if (!dados || dados.length === 0) {
        return [];
    }

    // Agrupa por semana (data_inicio)
    const porSemana = {};
    dados.forEach(registro => {
        const semana = registro.data_inicio;

        if (!porSemana[semana]) {
            porSemana[semana] = {
                semana,
                spend: 0,
                conversao: 0,
                ctr_total: 0,
                cpc_total: 0,
                registros: 0
            };
        }

        porSemana[semana].spend += registro.spend || 0;
        porSemana[semana].conversao += registro.conversao || 0;
        porSemana[semana].ctr_total += registro.ctr || 0;
        porSemana[semana].cpc_total += registro.cpc || 0;
        porSemana[semana].registros++;
    });

    // Ordena por data e calcula médias
    return Object.values(porSemana)
        .map(s => ({
            semana: s.semana,
            totalInvestido: s.spend,
            totalConversoes: s.conversao,
            ctrMedio: s.registros > 0 ? s.ctr_total / s.registros : 0,
            cpcMedio: s.registros > 0 ? s.cpc_total / s.registros : 0
        }))
        .sort((a, b) => new Date(a.semana) - new Date(b.semana));
}

/**
 * Gera relatório mensal agregado
 * @param {number} ano - Ano do relatório
 * @param {number} mes - Mês do relatório (1-12)
 * @returns {Promise<Object>} Relatório mensal completo
 */
export async function gerarRelatorioMensal(ano, mes) {
    // Define o período do mês
    const dataInicio = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
    const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0];

    const filtros = {
        data_inicio: dataInicio,
        data_fim: dataFim
    };

    const [estatisticas, porMarca, tendenciaSemanal] = await Promise.all([
        calcularEstatisticasAgregadas(filtros),
        calcularInvestimentoPorMarca(filtros),
        buscarTendenciaSemanal(filtros)
    ]);

    return {
        periodo: {
            ano,
            mes,
            dataInicio,
            dataFim
        },
        estatisticas,
        investimentoPorMarca: porMarca,
        tendenciaSemanal
    };
}

// =============================================
// IMPORTAÇÃO DE CSV - Resolução de IDs
// =============================================

/**
 * Busca campanhas pelo external_id (ID da plataforma Meta)
 * Cria um mapa de external_id -> uuid interno
 * @param {Array<string>} externalIds - Lista de IDs externos da plataforma
 * @returns {Promise<Object>} Mapa { external_id: uuid }
 */
export async function buscarCampanhasPorExternalId(externalIds) {
    if (!externalIds || externalIds.length === 0) {
        return {};
    }

    // Remove duplicatas e valores vazios
    const idsUnicos = [...new Set(externalIds.filter(id => id && id.trim()))];

    const { data, error } = await supabase
        .from('campanhas')
        .select('id, external_id, marca_id')
        .in('external_id', idsUnicos);

    if (error) {
        console.error('Erro ao buscar campanhas por external_id:', error);
        return {};
    }

    // Cria mapa external_id -> { id, marca_id }
    const mapa = {};
    (data || []).forEach(campanha => {
        mapa[campanha.external_id] = {
            id: campanha.id,
            marca_id: campanha.marca_id
        };
    });

    return mapa;
}

/**
 * Busca a view relatorio_completo_marcas para obter IDs consolidados
 * @returns {Promise<Object>} Mapa { conta_nome: { marca_id, plataforma_id, conta_id } }
 */
export async function buscarRelatorioCompletoMarcas() {
    const { data, error } = await supabase
        .from('relatorio_completo_marcas')
        .select('*');

    if (error) {
        console.error('Erro ao buscar relatorio_completo_marcas:', error);
        return {};
    }

    // Cria mapa por nome da conta
    const mapa = {};
    (data || []).forEach(item => {
        mapa[item.conta_nome] = {
            marca_id: item.marca_id,
            plataforma_id: item.plataforma_id,
            conta_id: item.conta_id,
            marca: item.marca,
            plataforma: item.plataforma
        };
    });

    return mapa;
}

/**
 * Converte data do formato brasileiro (DD/MM/YYYY) para YYYY-MM-DD
 * @param {string} dataBr - Data no formato DD/MM/YYYY ou YYYY-MM-DD
 * @returns {string} Data no formato YYYY-MM-DD
 */
export function parseDataBrasileira(dataBr) {
    if (!dataBr) return null;

    // Se já está no formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dataBr)) {
        return dataBr;
    }

    // Formato DD/MM/YYYY
    const partes = dataBr.split('/');
    if (partes.length === 3) {
        const [dia, mes, ano] = partes;
        return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    return dataBr;
}

/**
 * Processa dados do CSV de relatório de anúncios
 * Mapeia colunas do CSV para campos do banco e resolve IDs externos
 * @param {Array<Object>} dadosCSV - Dados parseados do CSV
 * @param {Object} mapaContas - Mapa de contas (de buscarRelatorioCompletoMarcas)
 * @param {Object} mapaCampanhas - Mapa de campanhas (de buscarCampanhasPorExternalId)
 * @returns {Object} { registrosValidos, registrosIgnorados, erros }
 */
export function processarDadosCSV(dadosCSV, mapaContas, mapaCampanhas) {
    const registrosValidos = [];
    const registrosIgnorados = [];
    const erros = [];

    dadosCSV.forEach((linha, index) => {
        try {
            // Extrai o external_id da campanha
            const externalCampanhaId = linha['Identificação da campanha'];
            const nomeConta = linha['Nome da conta'];

            // Busca a campanha pelo external_id
            const campanhaInfo = mapaCampanhas[externalCampanhaId];

            if (!campanhaInfo || !campanhaInfo.id) {
                registrosIgnorados.push({
                    linha: index + 2, // +2 porque índice 0 e cabeçalho
                    motivo: `Campanha com external_id "${externalCampanhaId}" não encontrada no banco`,
                    dados: linha
                });
                return;
            }

            // Busca informações da conta
            const contaInfo = mapaContas[nomeConta] || {};

            // Extrai e converte datas
            const dataInicio = parseDataBrasileira(linha['Início dos relatórios']);
            const dataFim = parseDataBrasileira(linha['Término dos relatórios']);

            // Extrai métricas (já vêm como números com ponto decimal)
            const spend = parseFloat(linha['Valor usado (BRL)']) || 0;
            const cpc = parseFloat(linha['CPC (custo por clique no link) (BRL)']) || 0;
            const ctr = parseFloat(linha['CTR (taxa de cliques no link)']) || 0;
            const conversao = parseFloat(linha['Resultados']) || 0;

            // Ignora linhas sem dados de spend (campanhas sem investimento)
            if (spend === 0 && conversao === 0) {
                registrosIgnorados.push({
                    linha: index + 2,
                    motivo: 'Linha sem investimento e sem conversões',
                    dados: linha
                });
                return;
            }

            // Monta registro para upsert
            // Nota: O campo anuncio_id é esperado, mas estamos recebendo campanha_id
            // Vamos usar o campo correto conforme a estrutura da tabela
            const registro = {
                anuncio_id: campanhaInfo.id, // Usando o ID da campanha como referência
                marca_id: campanhaInfo.marca_id || contaInfo.marca_id || null,
                plataforma_id: contaInfo.plataforma_id || null,
                conta_de_anuncio_id: contaInfo.conta_id || null,
                modelo_id: null,
                data_inicio: dataInicio,
                data_fim: dataFim,
                spend,
                cpc,
                ctr,
                conversao
            };

            registrosValidos.push(registro);
        } catch (err) {
            erros.push({
                linha: index + 2,
                erro: err.message,
                dados: linha
            });
        }
    });

    return {
        registrosValidos,
        registrosIgnorados,
        erros
    };
}

/**
 * Importa CSV de relatório de anúncios completo
 * Faz todo o processo: resolve IDs, processa dados e executa upsert em lote
 * @param {Array<Object>} dadosCSV - Dados parseados do CSV (via PapaParse)
 * @param {string} contaDeAnuncioId - ID da conta de anúncio selecionada pelo usuário
 * @returns {Promise<Object>} Resultado completo da importação
 */
export async function importarCSVRelatorioAnuncios(dadosCSV, contaDeAnuncioId) {
    if (!dadosCSV || dadosCSV.length === 0) {
        return {
            sucesso: false,
            mensagem: 'Nenhum dado para importar',
            resumo: { total: 0, importados: 0, ignorados: 0, erros: 0 }
        };
    }

    if (!contaDeAnuncioId) {
        return {
            sucesso: false,
            mensagem: 'Conta de anúncio não informada',
            resumo: { total: dadosCSV.length, importados: 0, ignorados: 0, erros: 1 }
        };
    }

    try {
        // 1. Extrai todos os IDs externos de campanhas do CSV
        const externalIds = dadosCSV
            .map(linha => linha['Identificação da campanha'])
            .filter(id => id && id.trim());

        // 2. Busca dados de referência em paralelo
        const [mapaContas, mapaCampanhas] = await Promise.all([
            buscarRelatorioCompletoMarcas(),
            buscarCampanhasPorExternalId(externalIds)
        ]);

        // 3. Processa os dados do CSV
        const { registrosValidos, registrosIgnorados, erros } = processarDadosCSV(
            dadosCSV,
            mapaContas,
            mapaCampanhas
        );

        // 4. Aplica a conta de anúncio selecionada em todos os registros
        const registrosComConta = registrosValidos.map(r => ({
            ...r,
            conta_de_anuncio_id: contaDeAnuncioId
        }));

        // 5. Executa upsert em lote
        let resultadoUpsert = { sucessos: 0, erros: 0, errosDetalhados: [] };

        if (registrosComConta.length > 0) {
            // Upsert em lote para melhor performance
            const { data, error } = await supabase
                .from('relatorio_anuncios')
                .upsert(registrosComConta.map(r => ({
                    ...r,
                    data_inicio: normalizeToMonday(r.data_inicio),
                    atualizado_em: new Date().toISOString()
                })), {
                    onConflict: 'anuncio_id,data_inicio',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('Erro no upsert em lote:', error);
                resultadoUpsert.erros = registrosComConta.length;
                resultadoUpsert.errosDetalhados.push({ erro: error.message });
            } else {
                resultadoUpsert.sucessos = (data || []).length;
            }
        }

        return {
            sucesso: true,
            mensagem: `Importação concluída: ${resultadoUpsert.sucessos} registros importados`,
            resumo: {
                total: dadosCSV.length,
                importados: resultadoUpsert.sucessos,
                ignorados: registrosIgnorados.length,
                erros: erros.length + resultadoUpsert.erros
            },
            detalhes: {
                registrosIgnorados,
                erros,
                errosUpsert: resultadoUpsert.errosDetalhados
            }
        };
    } catch (error) {
        console.error('Erro na importação do CSV:', error);
        return {
            sucesso: false,
            mensagem: `Erro durante a importação: ${error.message}`,
            resumo: { total: dadosCSV.length, importados: 0, ignorados: 0, erros: 1 }
        };
    }
}


