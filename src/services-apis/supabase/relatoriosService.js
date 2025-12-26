import { supabase } from './client.js';

export async function buscarTodosRelatorios() {
    const { data, error } = await supabase
        .from('relatorio_performance')
        .select('*');
    if (error) {
        console.error('Erro ao buscar relatórios de performance:', error);
        return [];
    }
    return data;
}

export async function buscarRelatorioPorId(id) {
    const { data, error } = await supabase
        .from('relatorio_performance')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar relatório de performance com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarRelatorio(dadosDoRelatorio) {
    const { data, error } = await supabase
        .from('relatorio_performance')
        .insert([dadosDoRelatorio])
        .select();
    if (error) {
        console.error('Erro ao criar relatório de performance:', error);
        return null;
    }
    return data[0];
}

export async function atualizarRelatorio(id, novosDados) {
    const { data, error } = await supabase
        .from('relatorio_performance')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar relatório de performance com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarRelatorio(id) {
    const { error } = await supabase
        .from('relatorio_performance')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar relatório de performance com id ${id}:`, error);
        return false;
    }
    return true;
}
