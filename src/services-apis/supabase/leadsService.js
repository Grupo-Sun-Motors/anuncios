import { supabase } from './client.js';

// Helper para obter o cliente Supabase
function getSupabaseClient(supabaseClient = null) {
    if (supabaseClient) {
        return supabaseClient;
    }
    // Tenta usar o cliente global se disponível
    if (typeof window !== 'undefined' && window.getSupabaseClient) {
        return window.getSupabaseClient();
    }
    // Fallback para o cliente importado
    return supabase;
}

export async function buscarTodosLeads(supabaseClient = null) {
    const client = getSupabaseClient(supabaseClient);
    const { data, error } = await client
        .from('leads')
        .select(`
            *,
            conta_de_anuncio:contas_de_anuncio(nome),
            formulario:formularios(nome)
        `)
        .order('criado_em', { ascending: false });
    if (error) {
        console.error('Erro ao buscar leads:', error);
        return [];
    }
    return data;
}

export async function buscarLeadPorId(id, supabaseClient = null) {
    const client = getSupabaseClient(supabaseClient);
    const { data, error } = await client
        .from('leads')
        .select(`
            *,
            conta_de_anuncio:contas_de_anuncio(nome),
            formulario:formularios(nome)
        `)
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar lead com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarLead(dadosDoLead, supabaseClient = null) {
    const client = getSupabaseClient(supabaseClient);
    const { data, error } = await client
        .from('leads')
        .insert([dadosDoLead])
        .select();
    if (error) {
        console.error('Erro ao criar lead:', error);
        return null;
    }
    return data[0];
}

export async function criarLeadsEmMassa(leads, supabaseClient = null) {
    const client = getSupabaseClient(supabaseClient);
    const { data, error } = await client
        .from('leads')
        .insert(leads)
        .select();
    if (error) {
        console.error('Erro ao criar leads em massa:', error);
        throw error;
    }
    return data;
}

export async function importarLeadsViaFuncao(marcaId, plataformaId, leadsJson, supabaseClient = null) {
    const client = getSupabaseClient(supabaseClient);

    const { data, error } = await client.rpc('importar_leads_em_massa', {
        p_marca_id: marcaId,
        p_plataforma_id: plataformaId,
        p_dados_leads: leadsJson
    });

    if (error) {
        console.error('Erro ao importar leads via função:', error);
        throw error;
    }
    return data;
}

export async function atualizarLead(id, novosDados, supabaseClient = null) {
    const client = getSupabaseClient(supabaseClient);
    const { data, error } = await client
        .from('leads')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar lead com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarLead(id, supabaseClient = null) {
    const client = getSupabaseClient(supabaseClient);
    const { error } = await client
        .from('leads')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar lead com id ${id}:`, error);
        return false;
    }
    return true;
}

export async function buscarLeadsComFiltros(filtros = {}, supabaseClient = null, onProgress = null) {
    const client = getSupabaseClient(supabaseClient);
    let query = client
        .from('leads')
        .select(`
            *,
            conta_de_anuncio:contas_de_anuncio(nome),
            formulario:formularios(nome)
        `, { count: 'exact' });

    // Aplicar filtros de data usando criado_em (data que o usuário se cadastrou)
    if (filtros.data_inicio) {
        query = query.gte('criado_em', `${filtros.data_inicio}T00:00:00.000Z`);
    }

    if (filtros.data_fim) {
        query = query.lte('criado_em', `${filtros.data_fim}T23:59:59.999Z`);
    }

    // Aplicar filtro de conta de anúncio
    if (filtros.conta_de_anuncio_id) {
        query = query.eq('conta_de_anuncio_id', filtros.conta_de_anuncio_id);
    }

    // Aplicar filtro de marca (usando view consolidada)
    if (filtros.marca_id) {
        const { data: contas, error: erroContas } = await client
            .from('relatorio_completo_marcas')
            .select('conta_id')
            .eq('marca_id', filtros.marca_id);

        if (!erroContas && contas) {
            const contaIds = contas.map(c => c.conta_id);
            // Se não houver contas, não deve retornar leads (filtro impossível)
            if (contaIds.length > 0) {
                query = query.in('conta_de_anuncio_id', contaIds);
            } else {
                // Força retorno vazio se a marca não tiver contas
                query = query.eq('id', '00000000-0000-0000-0000-000000000000');
            }
        }
    }

    // Aplicar filtro de estágio
    if (filtros.estagio) {
        query = query.eq('estagio', filtros.estagio);
    }

    // Aplicar filtro de formulário (ID)
    if (filtros.formulario_id) {
        query = query.eq('formulario_id', filtros.formulario_id);
    }
    // Fallback para busca por nome se não houver ID
    else if (filtros.nome_formulario) {
        query = query.ilike('nome_formulario', `%${filtros.nome_formulario}%`);
    }

    // Ordenar por criado_em (mais recente primeiro)
    query = query.order('criado_em', { ascending: false, nullsFirst: false });

    // Mostrar progresso inicial
    if (onProgress) {
        onProgress({ loaded: 0, total: 0, percentage: 0, status: 'Buscando leads...' });
    }

    // Buscar todos os dados (a query com count: 'exact' retorna count e data)
    const { data, count, error } = await query;

    if (error) {
        console.error('Erro ao buscar leads com filtros:', error);
        if (onProgress) {
            onProgress({ loaded: 0, total: 0, percentage: 0, status: 'Erro ao buscar leads' });
        }
        return [];
    }

    // Atualizar progresso final
    if (onProgress) {
        const total = count || (data ? data.length : 0);
        onProgress({ loaded: total, total: total, percentage: 100, status: 'Concluído!' });
    }

    return data || [];
}
