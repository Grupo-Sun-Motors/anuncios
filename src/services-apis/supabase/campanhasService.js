import { supabase } from './client.js';

export async function buscarTodasCampanhas() {
    const { data, error } = await supabase
        .from('campanhas')
        .select(`
            *,
            marca:marcas(nome),
            conta_de_anuncio:contas_de_anuncio(
                nome,
                plataforma_id
            ),
            modelo_id:modelos(*)
        `);
    if (error) {
        console.error('Erro ao buscar campanhas:', error);
        return [];
    }
    return data;
}

export async function buscarCampanhaPorId(id) {
    const { data, error } = await supabase
        .from('campanhas')
        .select(`
            *,
            modelo_id:modelos(*)
        `)
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar campanha com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarCampanha(dadosDaCampanha) {
    const { data, error } = await supabase
        .from('campanhas')
        .insert([dadosDaCampanha])
        .select();
    if (error) {
        console.error('Erro ao criar campanha:', error);
        return null;
    }
    return data[0];
}

export async function atualizarCampanha(id, novosDados) {
    const { data, error } = await supabase
        .from('campanhas')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar campanha com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarCampanha(id) {
    const { error } = await supabase
        .from('campanhas')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar campanha com id ${id}:`, error);
        return false;
    }
    return true;
}
