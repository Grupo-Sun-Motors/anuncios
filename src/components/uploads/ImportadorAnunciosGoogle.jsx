import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../services-apis/supabase/client';
import { useToast } from '../../contexts/ToastContext';

/**
 * Componente para importar ANÚNCIOS da plataforma GOOGLE Ads
 * RPC: upload_tabela_anuncios_google
 * 
 * Formato CSV esperado: Exportação padrão do Google Ads
 * Particularidades:
 * - Período de relatório no cabeçalho (não por linha)
 * - Métricas com nomes diferentes: Custo, CPC méd., CPM médio, Custo / conv., etc.
 * - Orçamento em coluna própria
 * - Tipo de campanha em coluna própria
 * - Linhas de "Total" que devem ser ignoradas
 * - Não possui external_id por linha
 * 
 * @param {string} contaSelecionada - ID da conta de anúncio selecionada
 * @param {string} contaNome - Nome da conta para exibição
 * @param {function} onImportSuccess - Callback após importação com sucesso
 * @param {function} onReset - Callback para resetar a seleção de conta
 */
const ImportadorAnunciosGoogle = ({ contaSelecionada, contaNome, onImportSuccess, onReset }) => {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [arquivo, setArquivo] = useState(null);
    const [dadosPreview, setDadosPreview] = useState([]);
    const [periodoRelatorio, setPeriodoRelatorio] = useState('');
    const [etapa, setEtapa] = useState('upload'); // 'upload' | 'preview' | 'importing' | 'resultado'
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);

    /**
     * Parseia valor de métrica do Google Ads
     * Formato típico: "5,00" ou "R$ 139,65" ou "8,58%"
     */
    const parseMetricValue = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;

        const str = String(value).trim();
        // Remove símbolos de moeda, espaços e porcentagem
        let cleaned = str.replace(/[R$\s%]/g, '');

        // Trata formato brasileiro (1.000,00)
        if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (cleaned.includes(',')) {
            cleaned = cleaned.replace(',', '.');
        }

        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    /**
     * Extrai período de relatório do cabeçalho do arquivo Google Ads
     * Procura por padrão como "1 de junho de 2025 - 30 de junho de 2025"
     */
    const extractPeriodoFromHeader = (rawData) => {
        // Procura nas primeiras linhas por padrão de período
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
            const row = rawData[i];
            if (typeof row === 'object') {
                const values = Object.values(row);
                for (const val of values) {
                    if (typeof val === 'string' && val.includes(' - ') &&
                        (val.includes('de ') || val.match(/\d{1,2}\/\d{1,2}\/\d{4}/))) {
                        return val;
                    }
                }
            }
        }
        return '';
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        console.log('[Google Import] Arquivo selecionado:', file.name, 'Tamanho:', file.size);

        const extension = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(extension)) {
            setErro('Selecione um arquivo CSV ou Excel.');
            return;
        }

        setArquivo(file);
        setErro(null);

        if (extension === 'csv') {
            // Ler o arquivo como texto para análise e processamento manual
            const textReader = new FileReader();
            textReader.onload = (e) => {
                const textContent = e.target.result;
                console.log('[Google Import] Conteúdo total:', textContent.length, 'chars');
                console.log('[Google Import] Primeiras 800 chars:', textContent.substring(0, 800));

                // Dividir em linhas
                const allLines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                console.log('[Google Import] Total de linhas:', allLines.length);
                console.log('[Google Import] Primeiras 5 linhas:', allLines.slice(0, 5));

                // CSV do Google Ads tem estrutura:
                // Linha 0: "Relatório de campanha" (título - ignorar)
                // Linha 1: "1 de junho de 2025 - 30 de junho de 2025" (período - extrair)
                // Linha 2: Headers reais (Status da campanha,Campanha,Orçamento,...)
                // Linhas 3+: Dados

                // Extrair período (linha 2 do arquivo original, índice 1)
                let periodoExtraido = '';
                if (allLines.length > 1 && allLines[1].includes(' - ') &&
                    (allLines[1].includes('de ') || allLines[1].match(/\d{1,2}\/\d{1,2}\/\d{4}/))) {
                    periodoExtraido = allLines[1].trim();
                    console.log('[Google Import] Período extraído:', periodoExtraido);
                }
                setPeriodoRelatorio(periodoExtraido);

                // Encontrar a linha de headers (primeira linha com múltiplas colunas separadas por vírgula)
                let headerLineIndex = 0;
                for (let i = 0; i < Math.min(5, allLines.length); i++) {
                    const commaCount = (allLines[i].match(/,/g) || []).length;
                    console.log(`[Google Import] Linha ${i}: ${commaCount} vírgulas - "${allLines[i].substring(0, 50)}..."`);
                    if (commaCount >= 5) { // Headers do Google Ads têm muitas colunas
                        headerLineIndex = i;
                        console.log('[Google Import] Linha de headers encontrada no índice:', i);
                        break;
                    }
                }

                // Criar CSV limpo começando dos headers
                const cleanedLines = allLines.slice(headerLineIndex);
                const cleanedCSV = cleanedLines.join('\n');
                console.log('[Google Import] CSV limpo criado com', cleanedLines.length, 'linhas');
                console.log('[Google Import] Headers limpos:', cleanedLines[0]?.substring(0, 100));

                // Parsear o CSV limpo
                Papa.parse(cleanedCSV, {
                    header: true,
                    skipEmptyLines: 'greedy',
                    dynamicTyping: false,
                    transformHeader: (header) => header.trim(),
                    complete: (results) => {
                        console.log('[Google Import] Parse do CSV limpo:');
                        console.log('  - Total linhas:', results.data?.length);
                        console.log('  - Erros:', results.errors);
                        console.log('  - Headers:', results.meta?.fields);
                        console.log('  - Primeira linha:', results.data?.[0]);

                        if (results.errors?.length > 0) {
                            console.warn('[Google Import] Avisos no parse:', results.errors);
                        }

                        // Mesmo com pequenos erros, continuar se houver dados
                        if (results.data?.length > 0) {
                            processFileData(results.data, [], periodoExtraido);
                        } else {
                            setErro('Nenhum dado encontrado no arquivo.');
                        }
                    },
                    error: (error) => {
                        console.error('[Google Import] Erro no parse:', error);
                        setErro(`Erro: ${error.message}`);
                    }
                });
            };
            textReader.onerror = (err) => {
                console.error('[Google Import] Erro ao ler arquivo:', err);
                setErro('Erro ao ler arquivo.');
            };
            textReader.readAsText(file, 'UTF-8');
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    console.log('[Google Import] Processando arquivo Excel...');
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
                    const sheet = workbook.SheetNames[0];
                    console.log('[Google Import] Sheet:', sheet);

                    // Extrai período do cabeçalho
                    const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { header: 1 });
                    console.log('[Google Import] Primeiras linhas raw:', rawJson.slice(0, 5));
                    const periodo = extractPeriodoFromRaw(rawJson);
                    setPeriodoRelatorio(periodo);

                    // Parseia com headers
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
                    console.log('[Google Import] Dados parseados:', json.length, 'linhas');
                    console.log('[Google Import] Primeira linha:', json[0]);
                    processFileData(json, [], periodo);
                } catch (error) {
                    console.error('[Google Import] Erro ao processar Excel:', error);
                    setErro(`Erro: ${error.message}`);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    /**
     * Extrai período de data raw (array de arrays ou objetos)
     */
    const extractPeriodoFromRaw = (rawData) => {
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
            const row = rawData[i];
            const values = Array.isArray(row) ? row : Object.values(row);
            for (const val of values) {
                if (typeof val === 'string' && val.includes(' - ') &&
                    (val.includes('de ') || val.match(/\d{1,2}\/\d{1,2}\/\d{4}/))) {
                    return val;
                }
            }
        }
        return '';
    };

    const processFileData = (data, errors, periodo) => {
        console.log('[Google Import] processFileData chamado:');
        console.log('  - data length:', data?.length);
        console.log('  - errors:', errors);
        console.log('  - periodo:', periodo);
        console.log('  - Primeira linha completa:', JSON.stringify(data?.[0], null, 2));
        console.log('  - Keys da primeira linha:', data?.[0] ? Object.keys(data[0]) : 'N/A');

        if (errors?.length > 0) {
            console.error('[Google Import] Erros detectados:', errors);
            setErro(`Erro: ${errors[0].message}`);
            return;
        }
        if (!data || data.length === 0) {
            console.error('[Google Import] Arquivo vazio ou sem dados');
            setErro('Arquivo vazio.');
            return;
        }

        // Filtra linhas de "Total:" que o Google Ads adiciona
        // O total pode aparecer no campo Campanha ou no Status da campanha
        const dadosFiltrados = data.filter(linha => {
            const campanha = String(getVal(linha, 'Campanha') || '').toLowerCase();
            const status = String(getVal(linha, 'Status da campanha') || '').toLowerCase();

            const isTotal = campanha.startsWith('total') || status.includes('total');

            // Também filtrar linhas onde campanha está vazia (podem ser artefatos do parse)
            const isEmpty = !campanha || campanha.trim() === '';

            if (isTotal) {
                console.log('[Google Import] Linha de total filtrada:', { campanha, status });
            }
            if (isEmpty && !isTotal) {
                console.log('[Google Import] Linha vazia filtrada');
            }

            return !isTotal && !isEmpty;
        });

        console.log('[Google Import] Após filtro de totais e vazios:', dadosFiltrados.length, 'campanhas válidas');

        if (dadosFiltrados.length === 0) {
            console.warn('[Google Import] Nenhuma campanha após filtrar');
            // Mostrar as keys disponíveis para ajudar no debug
            if (data.length > 0) {
                console.log('[Google Import] Colunas disponíveis no CSV:', Object.keys(data[0]));
                console.log('[Google Import] Exemplo de linha:', data[0]);
            }
            setErro('Nenhuma campanha encontrada. Verifique se o CSV tem a coluna "Campanha".');
            return;
        }

        console.log('[Google Import] Preview da primeira campanha:', dadosFiltrados[0]);
        setDadosPreview(dadosFiltrados);
        setEtapa('preview');
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect({ target: { files: [file] } });
    };

    /**
     * Busca valor de coluna ignorando case
     */
    const getVal = (linha, coluna) => {
        const keys = Object.keys(linha);
        const found = keys.find(k => k.toLowerCase().trim() === coluna.toLowerCase());
        return found ? linha[found] : null;
    };

    const handleImportar = async () => {
        if (!contaSelecionada) {
            setErro('Conta de anúncio não selecionada');
            return;
        }

        setEtapa('importing');
        setErro(null);

        try {
            // Monta payload no formato esperado pela RPC upload_tabela_anuncios_google
            const payload = dadosPreview.map(linha => {
                const nome = String(getVal(linha, 'Campanha') || '').trim();
                const status = String(getVal(linha, 'Status da campanha') || getVal(linha, 'Estado') || '').trim();

                return {
                    nome: nome,
                    external_id: null, // Google Ads CSV não tem ID por linha
                    status: status,
                    orcamento: {
                        valor: parseMetricValue(getVal(linha, 'Orçamento')),
                        tipo: String(getVal(linha, 'Tipo de orçamento') || 'Diário').trim(),
                        moeda: String(getVal(linha, 'Código da moeda') || 'BRL').trim()
                    },
                    configuracoes_avancadas: {
                        tipo_campanha_google: String(getVal(linha, 'Tipo de campanha') || '').trim(),
                        estrategia_lances: String(getVal(linha, 'Tipo de estratégia de lances') || '').trim(),
                        motivos_status: String(getVal(linha, 'Motivos do status') || '').trim(),
                        origem: 'google_ads_import'
                    },
                    metricas: {
                        cpa: parseMetricValue(getVal(linha, 'Custo / conv.') || getVal(linha, 'Custo por conversão')),
                        cpc: parseMetricValue(getVal(linha, 'CPC méd.') || getVal(linha, 'CPC médio')),
                        ctr: parseMetricValue(getVal(linha, 'Taxa de interação') || getVal(linha, 'CTR')),
                        spend: parseMetricValue(getVal(linha, 'Custo')),
                        conversao: parseMetricValue(getVal(linha, 'Conversões')),
                        impressoes: parseInt(getVal(linha, 'Impr.') || getVal(linha, 'Impressões') || '0', 10),
                        cpm: parseMetricValue(getVal(linha, 'CPM médio') || getVal(linha, 'CPM méd.')),
                        cliques: parseInt(getVal(linha, 'Cliques') || '0', 10),
                        periodo_relatorio: periodoRelatorio
                    }
                };
            }).filter(item => item.nome); // Remove itens sem nome

            if (payload.length === 0) {
                setResultado({
                    sucesso: false,
                    mensagem: 'Nenhum registro válido',
                    resumo: { total: dadosPreview.length, importados: 0, ignorados: dadosPreview.length, erros: 0 }
                });
                setEtapa('resultado');
                return;
            }

            console.log('Payload Google Ads:', payload); // Debug

            // Envia para o Supabase - Função específica para GOOGLE
            const { data, error } = await supabase.rpc('upload_tabela_anuncios_google', {
                p_conta_de_anuncio_id: contaSelecionada,
                p_anuncios: payload
            });

            if (error) {
                console.error('Erro RPC (Google):', error);
                setResultado({
                    sucesso: false,
                    mensagem: `Erro: ${error.message}`,
                    resumo: { total: dadosPreview.length, importados: 0, ignorados: 0, erros: 1 }
                });
            } else {
                setResultado({
                    sucesso: true,
                    mensagem: `${payload.length} anúncios Google atualizados.`,
                    resumo: {
                        total: dadosPreview.length,
                        importados: payload.length,
                        ignorados: dadosPreview.length - payload.length,
                        erros: 0
                    }
                });
                addToast('Snapshot de anúncios Google atualizado!', 'success');
                if (onImportSuccess) onImportSuccess();
            }
            setEtapa('resultado');
        } catch (error) {
            console.error('Erro:', error);
            setErro(`Erro: ${error.message}`);
            setEtapa('preview');
        }
    };

    const handleReset = () => {
        setArquivo(null);
        setDadosPreview([]);
        setPeriodoRelatorio('');
        setEtapa('upload');
        setResultado(null);
        setErro(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleTrocarConta = () => {
        handleReset();
        if (onReset) onReset();
    };

    const formatVal = (v) => {
        if (v === null || v === undefined || v === '') return '-';
        const num = parseFloat(v);
        return isNaN(num) ? v : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="importador-content">
            {/* Badge da Plataforma */}
            <div className="plataforma-badge google" style={{ marginBottom: '1rem' }}>
                <span className="badge-icon">🔍</span>
                <span>Google Ads</span>
            </div>

            {/* Conta Selecionada */}
            <div className="conta-info" style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <small style={{ color: 'var(--text-muted)' }}>Conta selecionada:</small>
                        <p style={{ margin: 0, fontWeight: 500 }}>{contaNome || 'N/A'}</p>
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={handleTrocarConta}>Trocar</button>
                </div>
            </div>

            {/* Período do Relatório (se extraído) */}
            {periodoRelatorio && (
                <div className="periodo-info" style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'var(--primary-lighter)', borderRadius: '6px', fontSize: '0.875rem' }}>
                    <strong>Período:</strong> {periodoRelatorio}
                </div>
            )}

            {(etapa === 'upload' || etapa === 'preview') && (
                <div className="upload-section">
                    {etapa === 'upload' && (
                        <>
                            <div className="dropzone" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                                <Upload size={48} className="dropzone-icon" />
                                <h3>Arraste o CSV aqui</h3>
                                <p>ou clique para selecionar</p>
                                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
                            </div>
                            <div className="info-box" style={{ marginTop: '1.5rem' }}>
                                <Info size={16} />
                                <div>
                                    <strong>Formato Google Ads:</strong>
                                    <p>CSV exportado do Google Ads com <code>Campanha</code>, <code>Custo</code>, <code>CPC méd.</code>, <code>Conversões</code>, <code>Orçamento</code></p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                        • Linhas de "Total" são ignoradas automaticamente<br />
                                        • Período é extraído do cabeçalho do arquivo
                                    </p>
                                </div>
                            </div>
                        </>
                    )}

                    {etapa === 'preview' && (
                        <div className="preview-section">
                            <div className="arquivo-info">
                                <FileSpreadsheet size={20} />
                                <span>{arquivo?.name}</span>
                                <span className="registros-count">({dadosPreview.length} campanhas)</span>
                            </div>
                            <div className="preview-table-container">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Campanha</th>
                                            <th>Custo</th>
                                            <th>CPC</th>
                                            <th>Conv.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dadosPreview.slice(0, 10).map((linha, i) => (
                                            <tr key={i}>
                                                <td>{i + 1}</td>
                                                <td>{String(getVal(linha, 'Campanha') || '').substring(0, 30)}</td>
                                                <td>R$ {formatVal(getVal(linha, 'Custo'))}</td>
                                                <td>R$ {formatVal(getVal(linha, 'CPC méd.') || getVal(linha, 'CPC médio'))}</td>
                                                <td>{formatVal(getVal(linha, 'Conversões'))}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {dadosPreview.length > 10 && <div className="preview-more">...e mais {dadosPreview.length - 10}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button className="btn btn-secondary" onClick={handleReset}>Outro arquivo</button>
                                <button className="btn btn-primary" onClick={handleImportar}>
                                    <Upload size={16} style={{ marginRight: '0.5rem' }} />
                                    Importar {dadosPreview.length}
                                </button>
                            </div>
                        </div>
                    )}

                    {erro && <div className="error-box" style={{ marginTop: '1rem' }}><AlertCircle size={16} /><span>{erro}</span></div>}
                </div>
            )}

            {etapa === 'importing' && (
                <div className="importing-section">
                    <Loader2 size={64} className="spinner" />
                    <h3>Importando anúncios Google...</h3>
                </div>
            )}

            {etapa === 'resultado' && resultado && (
                <div className="resultado-section">
                    <div className={`resultado-icon ${resultado.sucesso ? 'success' : 'error'}`}>
                        {resultado.sucesso ? <CheckCircle size={64} /> : <AlertCircle size={64} />}
                    </div>
                    <h3>{resultado.sucesso ? 'Concluído!' : 'Erro'}</h3>
                    <p>{resultado.mensagem}</p>
                    <div className="resultado-resumo">
                        <div className="resumo-item"><span className="resumo-valor">{resultado.resumo.total}</span><span className="resumo-label">Total</span></div>
                        <div className="resumo-item success"><span className="resumo-valor">{resultado.resumo.importados}</span><span className="resumo-label">Importados</span></div>
                        <div className="resumo-item warning"><span className="resumo-valor">{resultado.resumo.ignorados}</span><span className="resumo-label">Ignorados</span></div>
                        <div className="resumo-item error"><span className="resumo-valor">{resultado.resumo.erros}</span><span className="resumo-label">Erros</span></div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={handleReset}>Importar Outro</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportadorAnunciosGoogle;
