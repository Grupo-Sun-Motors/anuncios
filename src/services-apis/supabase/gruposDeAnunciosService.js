import { supabase } from './client.js';

export async function buscarGruposPorCampanha(campanhaId) {
    const { data, error } = await supabase
        .from('grupos_de_anuncios')
        .select('*')
        .eq('campanha_id', campanhaId);
    if (error) {
        console.error(`Erro ao buscar grupos de anúncios para a campanha ${campanhaId}:`, error);
        return [];
    }
    return data;
}

export async function buscarGrupoDeAnuncioPorId(id) {
    const { data, error } = await supabase
        .from('grupos_de_anuncios')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar grupo de anúncio com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarGrupoDeAnuncio(dadosDoGrupo) {
    const { data, error } = await supabase
        .from('grupos_de_anuncios')
        .insert([dadosDoGrupo])
        .select();
    if (error) {
        console.error('Erro ao criar grupo de anúncio:', error);
        return null;
    }
    return data[0];
}

export async function atualizarGrupoDeAnuncio(id, novosDados) {
    const { data, error } = await supabase
        .from('grupos_de_anuncios')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar grupo de anúncio com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarGrupoDeAnuncio(id) {
    const { error } = await supabase
        .from('grupos_de_anuncios')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar grupo de anúncio com id ${id}:`, error);
        return false;
    }
    return true;
}
