import { supabase } from './client.js';

export async function buscarTodoHistorico() {
    const { data, error } = await supabase
        .from('historico_otimizacoes')
        .select(`
            *,
            marcas(nome),
            campanhas(nome),
            plataformas(nome),
            contas_de_anuncio(nome),
            grupos_de_anuncios(nome),
            criativos(titulos)
        `)
        .order('criado_em', { ascending: false });
    if (error) {
        console.error('Erro ao buscar histórico de otimizações:', error);
        return [];
    }
    return data || [];
}

export async function buscarHistoricoComFiltros(filtros = {}) {
    let query = supabase
        .from('historico_otimizacoes')
        .select(`
            *,
            marcas(nome),
            campanhas(nome),
            plataformas(nome),
            contas_de_anuncio(nome),
            grupos_de_anuncios(nome),
            criativos(titulos)
        `)
        .order('criado_em', { ascending: false });

    if (filtros.status) {
        query = query.eq('status', filtros.status);
    }
    if (filtros.tipo_alteracao) {
        query = query.eq('tipo_alteracao', filtros.tipo_alteracao);
    }
    if (filtros.responsavel) {
        query = query.ilike('responsavel', `%${filtros.responsavel}%`);
    }
    if (filtros.marca_id) {
        query = query.eq('marca_id', filtros.marca_id);
    }
    if (filtros.data_inicio) {
        query = query.gte('data_alteracao', filtros.data_inicio);
    }
    if (filtros.data_fim) {
        query = query.lte('data_alteracao', filtros.data_fim);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Erro ao buscar histórico de otimizações com filtros:', error);
        return [];
    }
    return data || [];
}

export async function buscarHistoricoPorId(id) {
    const { data, error } = await supabase
        .from('historico_otimizacoes')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar histórico de otimização com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarHistorico(dados) {
    // Campos obrigatórios: descricao e responsavel (is_nullable = NO)
    // Todos os outros campos podem ser null
    const dadosLimpos = {};

    Object.keys(dados).forEach(key => {
        // Inclui todos os campos, permitindo null para campos opcionais
        dadosLimpos[key] = dados[key];
    });

    const { data, error } = await supabase
        .from('historico_otimizacoes')
        .insert([dadosLimpos])
        .select();
    if (error) {
        console.error('Erro ao criar histórico de otimização:', error);
        throw error; // Propaga o erro para que possa ser tratado no componente
    }
    return data[0];
}

export async function atualizarHistorico(id, novosDados) {
    // Campos obrigatórios: descricao e responsavel (is_nullable = NO)
    // Todos os outros campos podem ser null
    const dadosLimpos = {};

    Object.keys(novosDados).forEach(key => {
        // Inclui todos os campos, permitindo null para campos opcionais
        dadosLimpos[key] = novosDados[key];
    });

    const { data, error } = await supabase
        .from('historico_otimizacoes')
        .update(dadosLimpos)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar histórico de otimização com id ${id}:`, error);
        throw error; // Propaga o erro para que possa ser tratado no componente
    }
    return data[0];
}

export async function deletarHistorico(id) {
    const { error } = await supabase
        .from('historico_otimizacoes')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar histórico de otimização com id ${id}:`, error);
        return false;
    }
    return true;
}

export async function atualizarStatusOtimizacao(id, novoStatus) {
    console.log(`[Service] Atualizando status otimização ${id} para ${novoStatus}`);

    // Atualiza status e data de alteração
    const { data, error } = await supabase
        .from('historico_otimizacoes')
        .update({
            status: novoStatus,
            data_alteracao: new Date().toISOString() // Keeps the record fresh
        })
        .eq('id', id)
        .select();

    if (error) {
        console.error(`[Service] Erro ao atualizar status da otimização ${id}:`, error);
        throw error;
    }

    console.log(`[Service] Status atualizado com sucesso:`, data);
    return data && data.length > 0 ? data[0] : null;
}
