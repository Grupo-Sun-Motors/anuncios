import { supabase } from './client.js';

export async function buscarCriativosPorGrupo(grupoDeAnuncioId) {
    const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('grupo_de_anuncio_id', grupoDeAnuncioId);
    if (error) {
        console.error(`Erro ao buscar criativos para o grupo de anúncio ${grupoDeAnuncioId}:`, error);
        return [];
    }
    return data;
}

export async function buscarCriativoPorId(id) {
    const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar criativo com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarCriativo(dadosDoCriativo) {
    const { data, error } = await supabase
        .from('criativos')
        .insert([dadosDoCriativo])
        .select();
    if (error) {
        console.error('Erro ao criar criativo:', error);
        return null;
    }
    return data[0];
}

export async function atualizarCriativo(id, novosDados) {
    const { data, error } = await supabase
        .from('criativos')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar criativo com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarCriativo(id) {
    const { error } = await supabase
        .from('criativos')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar criativo com id ${id}:`, error);
        return false;
    }
    return true;
}
