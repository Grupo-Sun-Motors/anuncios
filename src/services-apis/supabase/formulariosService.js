import { supabase } from './client.js';

export async function buscarTodosFormularios() {
    const { data, error } = await supabase
        .from('formularios')
        .select('*')
        .order('nome');

    if (error) {
        console.error('Erro ao buscar formulários:', error);
        return [];
    }
    return data;
}

export async function buscarFormulariosPorConta(contaId) {
    const { data, error } = await supabase
        .from('formularios')
        .select('*')
        .eq('conta_de_anuncio_id', contaId)
        .order('nome');

    if (error) {
        console.error(`Erro ao buscar formulários da conta ${contaId}:`, error);
        return [];
    }
    return data;
}

export async function buscarFormulariosPorMarca(marcaId) {
    // Busca os IDs das contas da marca usando a view consolidada
    const { data: contas, error: erroContas } = await supabase
        .from('relatorio_completo_marcas')
        .select('conta_id')
        .eq('marca_id', marcaId);

    if (erroContas) {
        console.error(`Erro ao buscar contas da marca ${marcaId}:`, erroContas);
        return [];
    }

    const contaIds = contas.map(c => c.conta_id);

    if (contaIds.length === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from('formularios')
        .select('*')
        .in('conta_de_anuncio_id', contaIds)
        .order('nome');

    if (error) {
        console.error(`Erro ao buscar formulários da marca ${marcaId}:`, error);
        return [];
    }
    return data;
}
