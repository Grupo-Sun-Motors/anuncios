import { supabase } from './client.js';

export async function buscarTodosPublicos() {
    const { data, error } = await supabase
        .from('publicos_personalizados')
        .select('*');
    if (error) {
        console.error('Erro ao buscar públicos personalizados:', error);
        return [];
    }
    return data;
}

export async function buscarPublicoPorId(id) {
    const { data, error } = await supabase
        .from('publicos_personalizados')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar público personalizado com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarPublico(dados) {
    const { data, error } = await supabase
        .from('publicos_personalizados')
        .insert([dados])
        .select();
    if (error) {
        console.error('Erro ao criar público personalizado:', error);
        return null;
    }
    return data[0];
}

export async function atualizarPublico(id, novosDados) {
    const { data, error } = await supabase
        .from('publicos_personalizados')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar público personalizado com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarPublico(id) {
    const { error } = await supabase
        .from('publicos_personalizados')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar público personalizado com id ${id}:`, error);
        return false;
    }
    return true;
}
