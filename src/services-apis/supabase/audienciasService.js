import { supabase } from './client.js';

export async function buscarTodasAudiencias() {
    const { data, error } = await supabase
        .from('audiencias')
        .select(`
            *,
            modelos (
                id,
                nome,
                marca_id
            )
        `);
    if (error) {
        console.error('Erro ao buscar audiências:', error);
        return [];
    }
    return data;
}

export async function buscarAudienciaPorId(id) {
    const { data, error } = await supabase
        .from('audiencias')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar audiência com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarAudiencia(dadosDaAudiencia) {
    const { data, error } = await supabase
        .from('audiencias')
        .insert([dadosDaAudiencia])
        .select();
    if (error) {
        console.error('Erro ao criar audiência:', error);
        return null;
    }
    return data[0];
}

export async function atualizarAudiencia(id, novosDados) {
    const { data, error } = await supabase
        .from('audiencias')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar audiência com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarAudiencia(id) {
    const { error } = await supabase
        .from('audiencias')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar audiência com id ${id}:`, error);
        return false;
    }
    return true;
}
