import { supabase } from './client.js';

export async function buscarTodosModelos() {
    const { data, error } = await supabase
        .from('modelos')
        .select('*');
    if (error) {
        console.error('Erro ao buscar modelos:', error);
        return [];
    }
    return data;
}

export async function buscarModeloPorId(id) {
    const { data, error } = await supabase
        .from('modelos')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar modelo com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarModelo(dadosDoModelo) {
    const { data, error } = await supabase
        .from('modelos')
        .insert([dadosDoModelo])
        .select();
    if (error) {
        console.error('Erro ao criar modelo:', error);
        return null;
    }
    return data[0];
}

export async function atualizarModelo(id, novosDados) {
    const { data, error } = await supabase
        .from('modelos')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar modelo com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarModelo(id) {
    const { error } = await supabase
        .from('modelos')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar modelo com id ${id}:`, error);
        return false;
    }
    return true;
}

export async function buscarModelosPorMarca(marcaId) {
    const { data, error } = await supabase
        .from('modelos')
        .select('*')
        .eq('marca_id', marcaId);
    if (error) {
        console.error(`Erro ao buscar modelos da marca ${marcaId}:`, error);
        return [];
    }
    return data || [];
}
