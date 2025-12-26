import { supabase } from './client.js';

// Funções para orcamento_mensal
export async function buscarTodosOrcamentosMensais() {
    const { data, error } = await supabase
        .from('orcamento_mensal')
        .select(`
            *,
            marcas(nome)
        `);
    if (error) {
        console.error('Erro ao buscar orçamentos mensais:', error);
        return [];
    }
    return data;
}

export async function buscarOrcamentoMensalPorId(id) {
    const { data, error } = await supabase
        .from('orcamento_mensal')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar orçamento mensal com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarOrcamentoMensal(dados) {
    const { data, error } = await supabase
        .from('orcamento_mensal')
        .insert([dados])
        .select();
    if (error) {
        console.error('Erro ao criar orçamento mensal:', error);
        return null;
    }
    return data[0];
}

export async function upsertOrcamentoMensal(dados) {
    // Check if exists first
    const { data: existing } = await supabase
        .from('orcamento_mensal')
        .select('*')
        .eq('marca_id', dados.marca_id)
        .eq('mes', dados.mes)
        .eq('ano', dados.ano)
        .single();

    if (existing) {
        // Update
        // If we are setting google, keep existing meta, and vice versa
        const updatePayload = {};
        if (dados.meta_investimento_google !== undefined) {
            updatePayload.meta_investimento_google = dados.meta_investimento_google;
            updatePayload.meta_investimento_total = (existing.meta_investimento_meta || 0) + dados.meta_investimento_google;
        }
        if (dados.meta_investimento_meta !== undefined) {
            updatePayload.meta_investimento_meta = dados.meta_investimento_meta;
            updatePayload.meta_investimento_total = (existing.meta_investimento_google || 0) + dados.meta_investimento_meta;
        }

        return await atualizarOrcamentoMensal(existing.id, updatePayload);
    } else {
        // Insert
        // Ensure the other field is 0 if not provided
        const insertPayload = {
            ...dados,
            meta_investimento_google: dados.meta_investimento_google || 0,
            meta_investimento_meta: dados.meta_investimento_meta || 0,
            meta_investimento_total: (dados.meta_investimento_google || 0) + (dados.meta_investimento_meta || 0)
        };
        return await criarOrcamentoMensal(insertPayload);
    }
}

export async function atualizarOrcamentoMensal(id, novosDados) {
    const { data, error } = await supabase
        .from('orcamento_mensal')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar orçamento mensal com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarOrcamentoMensal(id) {
    const { error } = await supabase
        .from('orcamento_mensal')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar orçamento mensal com id ${id}:`, error);
        return false;
    }
    return true;
}

// Funções para orcamento_detalhado
export async function buscarTodosOrcamentosDetalhados() {
    const { data, error } = await supabase
        .from('orcamento_detalhado')
        .select(`
            *,
            modelos(nome),
            contas_de_anuncio(nome, plataforma_id, plataformas:contas_de_anuncio_plataforma_id_fkey(nome))
        `);
    if (error) {
        console.error('Erro ao buscar orçamentos detalhados:', error);
        return [];
    }
    return data;
}

export async function buscarOrcamentoDetalhadoPorId(id) {
    const { data, error } = await supabase
        .from('orcamento_detalhado')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error(`Erro ao buscar orçamento detalhado com id ${id}:`, error);
        return null;
    }
    return data;
}

export async function criarOrcamentoDetalhado(dados) {
    const { data, error } = await supabase
        .from('orcamento_detalhado')
        .insert([dados])
        .select();
    if (error) {
        console.error('Erro ao criar orçamento detalhado:', error);
        return null;
    }
    return data[0];
}

export async function atualizarOrcamentoDetalhado(id, novosDados) {
    const { data, error } = await supabase
        .from('orcamento_detalhado')
        .update(novosDados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar orçamento detalhado com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function deletarOrcamentoDetalhado(id) {
    const { error } = await supabase
        .from('orcamento_detalhado')
        .delete()
        .eq('id', id);
    if (error) {
        console.error(`Erro ao deletar orçamento detalhado com id ${id}:`, error);
        return false;
    }
    return true;
}
