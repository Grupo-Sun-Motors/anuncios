import { supabase } from './client.js';

export async function buscarPlataformas() {
    const { data, error } = await supabase
        .from('plataformas')
        .select('*');
    if (error) {
        console.error('Erro ao buscar plataformas:', error);
        return [];
    }
    return data;
}

export async function buscarMarcas() {
    const { data, error } = await supabase
        .from('marcas')
        .select('*');
    if (error) {
        console.error('Erro ao buscar marcas:', error);
        return [];
    }
    return data;
}

export async function atualizarMarca(id, dados) {
    const { data, error } = await supabase
        .from('marcas')
        .update(dados)
        .eq('id', id)
        .select();
    if (error) {
        console.error(`Erro ao atualizar marca com id ${id}:`, error);
        return null;
    }
    return data[0];
}

export async function buscarTodasContasDeAnuncio() {
    const { data, error } = await supabase
        .from('contas_de_anuncio')
        .select('*');
    if (error) {
        console.error('Erro ao buscar contas de anúncio:', error);
        return [];
    }
    return data;
}

export async function buscarContasPorMarca(marcaId) {
    const { data, error } = await supabase
        .from('marcas_contas')
        .select(`
            contas_de_anuncio (*)
        `)
        .eq('marca_id', marcaId);
    if (error) {
        console.error('Erro ao buscar contas por marca:', error);
        return [];
    }
    return data.map(item => item.contas_de_anuncio);
}

export async function buscarTodasMarcasContas() {
    const { data, error } = await supabase
        .from('marcas_contas')
        .select(`
            marca:marcas(nome),
            conta:contas_de_anuncio(nome)
        `);
    if (error) {
        console.error('Erro ao buscar relações marcas_contas:', error);
        return [];
    }
    return data;
}

/**
 * Busca o perfil do usuário pelo ID
 * @param {string} userId - ID do usuário
 * @param {Object} [supabaseClient] - Cliente Supabase opcional (usa o cliente padrão se não fornecido)
 * @returns {Promise<Object|null>} Perfil do usuário ou null se não encontrado
 */
export async function buscarPerfilUsuario(userId, supabaseClient = null) {
    try {
        const client = supabaseClient || supabase;
        const { data, error } = await client
            .from('profiles')
            .select('plan')
            .eq('id', userId)
            .single();

        if (error) {
            // Se a tabela não existir ou não houver registro, retorna null
            if (error.code === 'PGRST116' || error.code === '42P01') {
                return null;
            }
            console.error('Erro ao buscar perfil do usuário:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        return null;
    }
}

/**
 * Atualiza ou cria o plano do usuário
 * @param {string} userId - ID do usuário
 * @param {string} plan - Nome do plano (ex: 'Free', 'PRO')
 * @param {Object} [supabaseClient] - Cliente Supabase opcional (usa o cliente padrão se não fornecido)
 * @returns {Promise<Object|null>} Dados atualizados ou null em caso de erro
 */
export async function atualizarPlanoUsuario(userId, plan, supabaseClient = null) {
    try {
        const client = supabaseClient || supabase;
        const { data, error } = await client
            .from('profiles')
            .upsert({
                id: userId,
                plan: plan,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            // Se a tabela não existir, retorna null sem erro crítico
            if (error.code === '42P01') {
                console.log('Tabela profiles não encontrada, plano armazenado localmente apenas');
                return null;
            }
            console.error('Erro ao atualizar plano do usuário:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Erro ao atualizar plano do usuário:', error);
        return null;
    }
}

export async function buscarRelatorioCompletoMarcas() {
    const { data, error } = await supabase
        .from('relatorio_completo_marcas')
        .select('*');
    if (error) {
        console.error('Erro ao buscar relatorio completo de marcas:', error);
        return [];
    }
    return data;
}

// Funções auxiliares para uso com cliente Supabase global (para scripts não-modulares)
// Estas funções podem ser chamadas diretamente se o módulo for carregado dinamicamente
if (typeof window !== 'undefined') {
    // Criar funções globais que usam o cliente Supabase global quando disponível
    window.buscarPerfilUsuario = async function (userId) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return buscarPerfilUsuario(userId, client);
        }
        // Se não houver cliente global, tenta usar o módulo
        return buscarPerfilUsuario(userId);
    };

    window.atualizarPlanoUsuario = async function (userId, plan) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return atualizarPlanoUsuario(userId, plan, client);
        }
        // Se não houver cliente global, tenta usar o módulo
        return atualizarPlanoUsuario(userId, plan);
    };
}