import { supabase } from './client.js';

/**
 * Busca todas as landing pages com informações da marca relacionada
 * Usa a tabela landing_pages que tem apenas: id, links, status, id_marcas
 * @returns {Promise<Array>} Lista de landing pages
 */
export async function buscarTodasLandingPages() {
    console.log('[LandingPages] Iniciando busca de landing pages...');

    // Primeiro, tenta uma query simples sem join para verificar RLS
    const { data: simpleData, error: simpleError, count } = await supabase
        .from('landing_pages')
        .select('*', { count: 'exact' });

    console.log('[LandingPages] Query simples (sem join):', {
        data: simpleData,
        error: simpleError,
        count,
        rowCount: (simpleData || []).length
    });

    // Se a query simples também retorna vazio, é problema de RLS
    if ((simpleData || []).length === 0) {
        console.warn('[LandingPages] ⚠️ Query simples retornou vazio - provável problema de RLS na tabela landing_pages');
        console.log('[LandingPages] Verifique se há policies de SELECT para usuários autenticados');
    }

    // Query com join de marca
    const { data, error } = await supabase
        .from('landing_pages')
        .select(`
            id,
            links,
            status,
            id_marcas,
            nome,
            descricao,
            modelo_ids,
            marca:marcas(id, nome)
        `);

    console.log('[LandingPages] Resposta da API (com join):', { data, error });

    if (error) {
        console.error('[LandingPages] Erro ao buscar landing pages:', error);
        return [];
    }

    console.log(`[LandingPages] ${(data || []).length} landing pages encontradas`);
    return data || [];
}

/**
 * Busca uma landing page por ID
 * @param {string} id - UUID da landing page
 * @returns {Promise<Object|null>} Landing page ou null
 */
export async function buscarLandingPagePorId(id) {
    const { data, error } = await supabase
        .from('landing_pages')
        .select(`
            id,
            links,
            status,
            id_marcas,
            nome,
            descricao,
            modelo_ids,
            marca:marcas(id, nome)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Erro ao buscar landing page com id ${id}:`, error);
        return null;
    }
    return data;
}

/**
 * Cria uma nova landing page
 * @param {Object} dadosDaLandingPage - Dados da landing page
 * @param {string} dadosDaLandingPage.links - URL do link
 * @param {string} dadosDaLandingPage.status - Status (ativo, inativo, etc)
 * @param {string} dadosDaLandingPage.id_marcas - UUID da marca relacionada
 * @returns {Promise<Object|null>} Landing page criada ou null
 */
export async function criarLandingPage(dadosDaLandingPage) {
    const { data, error } = await supabase
        .from('landing_pages')
        .insert([dadosDaLandingPage])
        .select(`
            id,
            links,
            status,
            id_marcas,
            nome,
            descricao,
            modelo_ids,
            marca:marcas(id, nome)
        `);

    if (error) {
        console.error('Erro ao criar landing page:', error);
        throw error;
    }
    return data?.[0] || null;
}

/**
 * Atualiza uma landing page existente
 * @param {string} id - UUID da landing page
 * @param {Object} novosDados - Novos dados para atualizar
 * @returns {Promise<Object|null>} Landing page atualizada ou null
 */
export async function atualizarLandingPage(id, novosDados) {
    const { data, error } = await supabase
        .from('landing_pages')
        .update(novosDados)
        .eq('id', id)
        .select(`
            id,
            links,
            status,
            id_marcas,
            nome,
            descricao,
            modelo_ids,
            marca:marcas(id, nome)
        `);

    if (error) {
        console.error(`Erro ao atualizar landing page com id ${id}:`, error);
        throw error;
    }
    return data?.[0] || null;
}

/**
 * Deleta uma landing page
 * @param {string} id - UUID da landing page
 * @returns {Promise<boolean>} true se deletado com sucesso
 */
export async function deletarLandingPage(id) {
    const { error } = await supabase
        .from('landing_pages')
        .delete()
        .eq('id', id);

    if (error) {
        console.error(`Erro ao deletar landing page com id ${id}:`, error);
        throw error;
    }
    return true;
}

/**
 * Busca landing pages por marca
 * @param {string} marcaId - UUID da marca
 * @returns {Promise<Array>} Lista de landing pages da marca
 */
export async function buscarLandingPagesPorMarca(marcaId) {
    const { data, error } = await supabase
        .from('landing_pages')
        .select(`
            id,
            links,
            status,
            id_marcas,
            nome,
            descricao,
            modelo_ids,
            marca:marcas(id, nome)
        `)
        .eq('id_marcas', marcaId);

    if (error) {
        console.error(`Erro ao buscar landing pages da marca ${marcaId}:`, error);
        return [];
    }
    return data || [];
}

/**
 * Busca dados da view relatorio_completo_marcas
 * Útil para popular dropdowns de marca com informações consolidadas
 * @returns {Promise<Array>} Lista de marcas com plataformas e contas
 */
export async function buscarMarcasConsolidadas() {
    console.log('[LandingPages] Buscando marcas consolidadas...');

    const { data, error } = await supabase
        .from('relatorio_completo_marcas')
        .select('*');

    console.log('[LandingPages] Resposta marcas consolidadas:', { data, error });

    if (error) {
        console.error('[LandingPages] Erro ao buscar marcas consolidadas:', error);
        return [];
    }

    // Deduplica por marca_id para retornar lista única de marcas
    const marcasUnicas = [];
    const marcasIds = new Set();

    (data || []).forEach(item => {
        if (item.marca_id && !marcasIds.has(item.marca_id)) {
            marcasIds.add(item.marca_id);
            marcasUnicas.push({
                id: item.marca_id,
                nome: item.marca,
                plataforma_id: item.plataforma_id,
                plataforma: item.plataforma,
                conta_id: item.conta_id,
                conta_nome: item.conta_nome
            });
        }
    });

    console.log(`[LandingPages] ${marcasUnicas.length} marcas únicas encontradas:`, marcasUnicas);
    return marcasUnicas;
}
