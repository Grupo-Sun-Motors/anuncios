import { supabase } from './client.js';

// Helper para obter o cliente Supabase
function getSupabaseClient(supabaseClient = null) {
    if (supabaseClient) {
        return supabaseClient;
    }
    // Tenta usar o cliente global se disponível
    if (typeof window !== 'undefined' && window.getSupabaseClient) {
        return window.getSupabaseClient();
    }
    // Fallback para o cliente importado
    return supabase;
}

/**
 * Busca o perfil do usuário pelo ID do usuário autenticado
 * @param {string} userId - ID do usuário (auth.users.id)
 * @param {Object} [supabaseClient] - Cliente Supabase opcional
 * @returns {Promise<Object|null>} Perfil do usuário ou null se não encontrado
 */
export async function buscarPerfilUsuario(userId, supabaseClient = null) {
    try {
        const client = getSupabaseClient(supabaseClient);
        const { data, error } = await client
            .from('perfil_de_usuario')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) {
            // Se não encontrar registro, retorna null (não é erro crítico)
            if (error.code === 'PGRST116') {
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
 * Cria um novo perfil de usuário
 * @param {Object} dadosPerfil - Dados do perfil (id, nome, email, avatar_url, telefone, cargo)
 * @param {Object} [supabaseClient] - Cliente Supabase opcional
 * @returns {Promise<Object|null>} Perfil criado ou null em caso de erro
 */
export async function criarPerfilUsuario(dadosPerfil, supabaseClient = null) {
    try {
        const client = getSupabaseClient(supabaseClient);
        
        // Garantir que os campos obrigatórios estão presentes
        const perfilData = {
            id: dadosPerfil.id, // ID do usuário autenticado
            nome: dadosPerfil.nome || '',
            email: dadosPerfil.email || '',
            avatar_url: dadosPerfil.avatar_url || null,
            telefone: dadosPerfil.telefone || null,
            cargo: dadosPerfil.cargo || null,
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        };

        const { data, error } = await client
            .from('perfil_de_usuario')
            .insert([perfilData])
            .select()
            .single();
        
        if (error) {
            console.error('Erro ao criar perfil do usuário:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Erro ao criar perfil do usuário:', error);
        return null;
    }
}

/**
 * Atualiza o perfil do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} dadosAtualizados - Campos a serem atualizados
 * @param {Object} [supabaseClient] - Cliente Supabase opcional
 * @returns {Promise<Object|null>} Perfil atualizado ou null em caso de erro
 */
export async function atualizarPerfilUsuario(userId, dadosAtualizados, supabaseClient = null) {
    try {
        const client = getSupabaseClient(supabaseClient);
        
        // Adicionar timestamp de atualização
        const dadosComTimestamp = {
            ...dadosAtualizados,
            atualizado_em: new Date().toISOString()
        };

        const { data, error } = await client
            .from('perfil_de_usuario')
            .update(dadosComTimestamp)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) {
            console.error('Erro ao atualizar perfil do usuário:', error);
            return null;
        }
        return data;
    } catch (error) {
        console.error('Erro ao atualizar perfil do usuário:', error);
        return null;
    }
}

/**
 * Cria ou atualiza o perfil do usuário (upsert)
 * @param {string} userId - ID do usuário
 * @param {Object} dadosPerfil - Dados do perfil
 * @param {Object} [supabaseClient] - Cliente Supabase opcional
 * @returns {Promise<Object|null>} Perfil criado/atualizado ou null em caso de erro
 */
export async function criarOuAtualizarPerfilUsuario(userId, dadosPerfil, supabaseClient = null) {
    try {
        const client = getSupabaseClient(supabaseClient);
        
        // Verificar se o perfil já existe
        const perfilExistente = await buscarPerfilUsuario(userId, client);
        
        if (perfilExistente) {
            // Atualizar perfil existente
            return await atualizarPerfilUsuario(userId, dadosPerfil, client);
        } else {
            // Criar novo perfil
            return await criarPerfilUsuario({
                id: userId,
                ...dadosPerfil
            }, client);
        }
    } catch (error) {
        console.error('Erro ao criar/atualizar perfil do usuário:', error);
        return null;
    }
}

/**
 * Deleta o perfil do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} [supabaseClient] - Cliente Supabase opcional
 * @returns {Promise<boolean>} true se deletado com sucesso, false caso contrário
 */
export async function deletarPerfilUsuario(userId, supabaseClient = null) {
    try {
        const client = getSupabaseClient(supabaseClient);
        const { error } = await client
            .from('perfil_de_usuario')
            .delete()
            .eq('id', userId);
        
        if (error) {
            console.error('Erro ao deletar perfil do usuário:', error);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Erro ao deletar perfil do usuário:', error);
        return false;
    }
}

/**
 * Busca todos os perfis de usuário (útil para administração)
 * @param {Object} [supabaseClient] - Cliente Supabase opcional
 * @returns {Promise<Array>} Lista de perfis ou array vazio em caso de erro
 */
export async function buscarTodosPerfis(supabaseClient = null) {
    try {
        const client = getSupabaseClient(supabaseClient);
        const { data, error } = await client
            .from('perfil_de_usuario')
            .select('*')
            .order('criado_em', { ascending: false });
        
        if (error) {
            console.error('Erro ao buscar todos os perfis:', error);
            return [];
        }
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar todos os perfis:', error);
        return [];
    }
}

// Funções auxiliares para uso com cliente Supabase global (para scripts não-modulares)
if (typeof window !== 'undefined') {
    window.buscarPerfilUsuario = async function(userId) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return buscarPerfilUsuario(userId, client);
        }
        return buscarPerfilUsuario(userId);
    };
    
    window.criarPerfilUsuario = async function(dadosPerfil) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return criarPerfilUsuario(dadosPerfil, client);
        }
        return criarPerfilUsuario(dadosPerfil);
    };
    
    window.atualizarPerfilUsuario = async function(userId, dadosAtualizados) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return atualizarPerfilUsuario(userId, dadosAtualizados, client);
        }
        return atualizarPerfilUsuario(userId, dadosAtualizados);
    };
    
    window.criarOuAtualizarPerfilUsuario = async function(userId, dadosPerfil) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return criarOuAtualizarPerfilUsuario(userId, dadosPerfil, client);
        }
        return criarOuAtualizarPerfilUsuario(userId, dadosPerfil);
    };
    
    window.deletarPerfilUsuario = async function(userId) {
        if (window.getSupabaseClient) {
            const client = window.getSupabaseClient();
            return deletarPerfilUsuario(userId, client);
        }
        return deletarPerfilUsuario(userId);
    };
}

