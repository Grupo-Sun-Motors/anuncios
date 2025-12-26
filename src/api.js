/**
 * @file Centralized API client for all Supabase interactions.
 * This module abstracts all database queries, providing a clean and consistent interface
 * for the rest of the application. It handles fetching, creating, updating, and deleting
 * data from the Supabase backend.
 */

// --- UTILITIES ---

/**
 * Retrieves the initialized Supabase client from the global scope.
 * @returns {import('@supabase/supabase-js').SupabaseClient} The Supabase client instance.
 * @throws {Error} If the Supabase client is not available.
 */
function getSupabaseClient() {
    if (window.getSupabaseClient) {
        return window.getSupabaseClient();
    }
    throw new Error('Supabase client not initialized or getter not found.');
}

/**
 * A generic function to handle Supabase query execution and error handling.
 * @param {Promise} query - The Supabase query promise.
 * @param {string} errorMessage - A descriptive error message.
 * @returns {Promise<any>} The data from the query.
 * @throws {Error} If the query fails.
 */
async function handleQuery(query, errorMessage) {
    try {
        const { data, error } = await query;
        if (error) throw error;
        return data;
    } catch (error) {
        console.error(`${errorMessage}:`, error);
        throw new Error(`${errorMessage}: ${error.message}`);
    }
}

// --- SHARED API ---

export const commonApi = {
    /**
     * Fetches all brands.
     * @returns {Promise<Array<Object>>} A list of brands.
     */
    async getBrands() {
        const query = getSupabaseClient().from('marcas').select('id, nome').order('nome');
        return handleQuery(query, 'Failed to fetch brands');
    },

    /**
     * Fetches all advertising platforms.
     * @returns {Promise<Array<Object>>} A list of platforms.
     */
    async getPlatforms() {
        const query = getSupabaseClient().from('plataformas').select('id, nome').order('nome');
        return handleQuery(query, 'Failed to fetch platforms');
    },

    /**
     * Fetches all ad accounts with their associated platform.
     * @returns {Promise<Array<Object>>} A list of ad accounts.
     */
    async getAdAccounts() {
        const query = getSupabaseClient().from('contas_de_anuncio').select('id, nome, plataformas(nome)').order('nome');
        return handleQuery(query, 'Failed to fetch ad accounts');
    },
    
    /**
     * Fetches ad accounts based on brand and platform.
     * @param {string} brandId - The ID of the brand.
     * @param {string} platformId - The ID of the platform.
     * @returns {Promise<Array<Object>>} A list of filtered ad accounts.
     */
    async getAdAccountsByBrandAndPlatform(brandId, platformId) {
        const client = getSupabaseClient();
        const brandAccountsQuery = client.from('marcas_contas').select('conta_de_anuncio_id').eq('marca_id', brandId);
        const brandAccounts = await handleQuery(brandAccountsQuery, 'Failed to fetch brand-account links');
        
        const accountIds = brandAccounts.map(ba => ba.conta_de_anuncio_id);
        if (accountIds.length === 0) return [];
        
        const accountsQuery = client.from('contas_de_anuncio').select('id, nome').in('id', accountIds).eq('plataforma_id', platformId);
        return handleQuery(accountsQuery, 'Failed to fetch filtered ad accounts');
    }
};

// --- DASHBOARD API ---

export const dashboardApi = {
    /**
     * Fetches performance data within a date range.
     * @param {string} startDate - The start date (YYYY-MM-DD).
     * @param {string} endDate - The end date (YYYY-MM-DD).
     * @param {string} [brandId] - Optional brand ID to filter by.
     * @returns {Promise<Array<Object>>} Performance data.
     */
    async getPerformanceData(startDate, endDate, brandId = null) {
        let query = getSupabaseClient()
            .from('relatorio_performance')
            .select('*, campanhas!inner(id, nome, marca_id, marcas(nome), contas_de_anuncio(nome, plataformas(nome)))')
            .gte('data_relatorio', startDate)
            .lte('data_relatorio', endDate);

        if (brandId) {
            query = query.eq('campanhas.marca_id', brandId);
        }
        return handleQuery(query.order('data_relatorio', { ascending: false }), 'Failed to fetch performance data');
    },

    /**
     * Fetches budget data for the current month.
     * @param {string} [brandId] - Optional brand ID to filter by.
     * @returns {Promise<Array<Object>>} Budget data.
     */
    async getBudgetData(brandId = null) {
        const today = new Date();
        const month = today.getMonth() + 1;
        const year = today.getFullYear();

        let query = getSupabaseClient()
            .from('orcamento_mensal')
            .select('*, marcas(nome)')
            .eq('mes', month)
            .eq('ano', year);

        if (brandId) {
            query = query.eq('marca_id', brandId);
        }
        return handleQuery(query, 'Failed to fetch budget data');
    },

    /**
     * Fetches recent optimization activities.
     * @param {string} [brandId] - Optional brand ID to filter by.
     * @returns {Promise<Array<Object>>} A list of recent activities.
     */
    async getRecentActivities(brandId = null) {
        let query = getSupabaseClient()
            .from('historico_otimizacoes')
            .select('*, plataformas(nome), campanhas(nome), marcas(nome)')
            .order('data_alteracao', { ascending: false })
            .limit(5);

        if (brandId) {
            query = query.eq('marca_id', brandId);
        }
        return handleQuery(query, 'Failed to fetch recent activities');
    },
    
    /**
     * Fetches campaigns data.
     * @param {string} [brandId] - Optional brand ID to filter by.
     * @returns {Promise<Array<Object>>} A list of campaigns.
     */
    async getCampaigns(brandId = null) {
        let query = getSupabaseClient()
            .from('campanhas')
            .select('id, nome, status, orcamento, marcas(nome), contas_de_anuncio(nome, plataformas(nome))')
            .order('orcamento', { ascending: false });

        if (brandId) {
            query = query.eq('marca_id', brandId);
        }
        return handleQuery(query, 'Failed to fetch campaigns data');
    }
};

// --- CAMPAIGNS API ---

export const campaignsApi = {
    /**
     * Fetches all campaigns with their statistics. Tries an RPC call first and falls back to a legacy method if the RPC function doesn't exist.
     * @returns {Promise<Array<Object>>} A list of campaigns with stats.
     */
    async getCampaignsWithStats() {
        const client = getSupabaseClient();
        try {
            // Try the efficient RPC call first
            const { data, error } = await client.rpc('get_campanhas_com_estatisticas');
            if (error && error.code !== 'PGRST202') {
                // If it's an error other than "function not found", throw it
                throw error;
            }
            if (!error) {
                return data;
            }

            // Fallback to legacy method if RPC function does not exist
            console.warn('RPC function "get_campanhas_com_estatisticas" not found. Using less efficient fallback method.');
            
            const { data: campaigns, error: campaignsError } = await client
                .from('campanhas')
                .select('*, marca_id(*), conta_de_anuncio_id(*, plataforma_id(*))')
                .order('criado_em', { ascending: false });

            if (campaignsError) throw campaignsError;

            const campaignsWithCounts = await Promise.all(
                (campaigns || []).map(async (campaign) => {
                    const { count: adGroupsCount, error: adGroupsError } = await client
                        .from('grupos_de_anuncios')
                        .select('id', { count: 'exact', head: true })
                        .eq('campanha_id', campaign.id);
                    if(adGroupsError) console.error(`Failed to get ad group count for campaign ${campaign.id}`, adGroupsError);

                    const { data: groupIds, error: groupIdsError } = await client
                        .from('grupos_de_anuncios')
                        .select('id')
                        .eq('campanha_id', campaign.id);

                    if (groupIdsError) throw groupIdsError;

                    const ids = groupIds.map(g => g.id);
                    let creativesCount = 0;
                    if (ids.length > 0) {
                        const { count, error: creativesError } = await client
                            .from('criativos')
                            .select('id', { count: 'exact', head: true })
                            .in('grupo_de_anuncio_id', ids);
                        if(creativesError) console.error(`Failed to get creatives count for campaign ${campaign.id}`, creativesError);
                        creativesCount = count;
                    }

                    return {
                        ...campaign,
                        ad_groups_count: adGroupsCount || 0,
                        creatives_count: creativesCount || 0,
                    };
                })
            );

            return campaignsWithCounts;

        } catch (error) {
            console.error('Failed to fetch campaigns with stats:', error);
            throw new Error(`Failed to fetch campaigns with stats: ${error.message}`);
        }
    },

    /**
     * Fetches the full hierarchical data for a single campaign.
     * @param {string} campaignId - The ID of the campaign.
     * @returns {Promise<Object>} The campaign object with nested ad groups and creatives.
     */
    async getFullCampaign(campaignId) {
        const client = getSupabaseClient();
        
        const campaignQuery = client.from('campanhas').select('*, marca_id(*), conta_de_anuncio_id(*, plataforma_id(*))').eq('id', campaignId).single();
        const campaign = await handleQuery(campaignQuery, `Failed to fetch campaign ${campaignId}`);

        const adGroupsQuery = client.from('grupos_de_anuncios').select('*').eq('campanha_id', campaignId);
        const adGroups = await handleQuery(adGroupsQuery, `Failed to fetch ad groups for campaign ${campaignId}`);
        
        const adGroupIds = adGroups.map(g => g.id);
        let creatives = [];
        if (adGroupIds.length > 0) {
            const creativesQuery = client.from('criativos').select('*').in('grupo_de_anuncio_id', adGroupIds);
            creatives = await handleQuery(creativesQuery, `Failed to fetch creatives for campaign ${campaignId}`);
        }
        
        campaign.ad_groups = adGroups.map(group => ({
            ...group,
            creatives: creatives.filter(c => c.grupo_de_anuncio_id === group.id)
        }));
        
        return campaign;
    },

    /**
     * Saves a full campaign, including its ad groups and creatives.
     * Handles creation and updates (upsert).
     * @param {Object} campaignData - The complete campaign object.
     * @returns {Promise<Object>} The saved campaign data with updated IDs.
     */
    async saveFullCampaign(campaignData) {
        const client = getSupabaseClient();
        const isNewCampaign = String(campaignData.id).startsWith('new_');

        const campaignPayload = {
            id: isNewCampaign ? undefined : campaignData.id,
            nome: campaignData.nome,
            marca_id: campaignData.marca_id?.id || campaignData.marca_id,
            conta_de_anuncio_id: campaignData.conta_de_anuncio_id?.id || campaignData.conta_de_anuncio_id,
            status: campaignData.status || 'Ativa',
            objetivo: campaignData.objetivo || 'Leads',
            orcamento: campaignData.orcamento || { valor: 0, tipo: 'Diário' },
            data_inicio: campaignData.data_inicio || new Date().toISOString(),
            data_fim: campaignData.data_fim,
            conversao_desejada: campaignData.conversao_desejada || 'Visitas ao Perfil',
        };

        const savedCampaign = await handleQuery(
            client.from('campanhas').upsert(campaignPayload).select().single(),
            'Failed to save campaign'
        );

        for (const group of (campaignData.ad_groups || [])) {
            const isNewGroup = String(group.id).startsWith('new_');
            const groupPayload = {
                id: isNewGroup ? undefined : group.id,
                campanha_id: savedCampaign.id,
                nome: group.nome,
                status: group.status,
            };
            const savedGroup = await handleQuery(
                client.from('grupos_de_anuncios').upsert(groupPayload).select().single(),
                `Failed to save ad group ${group.nome}`
            );

            for (const creative of (group.creatives || [])) {
                const isNewCreative = String(creative.id).startsWith('new_');
                const creativePayload = {
                    id: isNewCreative ? undefined : creative.id,
                    grupo_de_anuncio_id: savedGroup.id,
                    campanha_id: savedCampaign.id,
                    nome: creative.nome,
                    tipo: creative.tipo,
                    titulos: creative.titulos,
                    urls_criativo: creative.urls_criativo,
                };
                await handleQuery(
                    client.from('criativos').upsert(creativePayload),
                    `Failed to save creative ${creative.nome}`
                );
            }
        }
        
        return this.getFullCampaign(savedCampaign.id);
    },

    /**
     * Deletes a campaign and its related ad groups and creatives.
     * @param {string} campaignId - The ID of the campaign to delete.
     * @returns {Promise<void>}
     */
    async deleteCampaign(campaignId) {
        const client = getSupabaseClient();
        await handleQuery(client.from('criativos').delete().eq('campanha_id', campaignId), 'Failed to delete creatives');
        await handleQuery(client.from('grupos_de_anuncios').delete().eq('campanha_id', campaignId), 'Failed to delete ad groups');
        await handleQuery(client.from('campanhas').delete().eq('id', campaignId), 'Failed to delete campaign');
    },
};

// --- CAMPANHAS API (from campanhas.js) ---

export const campanhasApi = {
    async getInitialCampaignsData() {
        const client = getSupabaseClient();
        const campaignsQuery = client.rpc('get_campanhas_com_estatisticas');
        const accountsQuery = client.from('contas_de_anuncio').select('*, plataforma_id(*)');
        const marcasContasQuery = client.from('marcas_contas').select('*');

        const [campaigns, accounts, marcasContas] = await Promise.all([
            handleQuery(campaignsQuery, 'Failed to fetch campaigns with stats'),
            handleQuery(accountsQuery, 'Failed to fetch ad accounts'),
            handleQuery(marcasContasQuery, 'Failed to fetch brand-account links')
        ]);

        return { campaigns, accounts, marcasContas };
    },

    async getBrandsAndPlatforms() {
        const client = getSupabaseClient();
        const brandsQuery = client.from('marcas').select('*').order('nome');
        const platformsQuery = client.from('plataformas').select('*').order('nome');

        const [brands, platforms] = await Promise.all([
            handleQuery(brandsQuery, 'Failed to fetch brands'),
            handleQuery(platformsQuery, 'Failed to fetch platforms')
        ]);

        return { brands, platforms };
    },

    async getFullCampaignDetails(campaignId) {
        const client = getSupabaseClient();
        const campaignQuery = client.from('campanhas').select('*, marca_id(*), conta_de_anuncio_id(*, plataforma_id(*))').eq('id', campaignId).single();
        const adGroupsQuery = client.from('grupos_de_anuncios').select('*').eq('campanha_id', campaignId);

        const [campaign, adGroups] = await Promise.all([
            handleQuery(campaignQuery, `Failed to fetch campaign ${campaignId}`),
            handleQuery(adGroupsQuery, `Failed to fetch ad groups for campaign ${campaignId}`)
        ]);

        const adGroupIds = adGroups.map(g => g.id);
        let creatives = [];
        if (adGroupIds.length > 0) {
            const creativesQuery = client.from('criativos').select('*').in('grupo_de_anuncio_id', adGroupIds);
            creatives = await handleQuery(creativesQuery, `Failed to fetch creatives for campaign ${campaignId}`);
        }

        campaign.ad_groups = adGroups.map(group => ({
            ...group,
            creatives: creatives.filter(c => c.grupo_de_anuncio_id === group.id)
        }));

        return campaign;
    },

    async saveCampaign(campaignData) {
        const client = getSupabaseClient();
        // This is a complex transaction-like operation. It might be better to create an RPC function in Supabase.
        // For now, we'll keep the logic here.
        const { id, ...campaignPayload } = campaignData;
        const { data: savedCampaign, error } = await client.from('campanhas').upsert(campaignPayload).select().single();
        if (error) throw error;
        return savedCampaign;
    },

    async saveAdGroup(adGroupData) {
        const client = getSupabaseClient();
        const { id, ...adGroupPayload } = adGroupData;
        const { data: savedAdGroup, error } = await client.from('grupos_de_anuncios').upsert(adGroupPayload).select().single();
        if (error) throw error;
        return savedAdGroup;
    },

    async saveCreative(creativeData) {
        const client = getSupabaseClient();
        const { id, ...creativePayload } = creativeData;
        const { data: savedCreative, error } = await client.from('criativos').upsert(creativePayload).select().single();
        if (error) throw error;
        return savedCreative;
    },

    async deleteCampaignHierarchy(campaignId) {
        const client = getSupabaseClient();
        await handleQuery(client.from('criativos').delete().eq('campanha_id', campaignId), 'Failed to delete creatives');
        await handleQuery(client.from('grupos_de_anuncios').delete().eq('campanha_id', campaignId), 'Failed to delete ad groups');
        await handleQuery(client.from('campanhas').delete().eq('id', campaignId), 'Failed to delete campaign');
    }
};

// --- BUDGET API (from budget.js) ---

export const budgetApi = {
    /**
     * Fetches all budget-related data for the current month.
     * @returns {Promise<Object>} An object containing monthly budgets, detailed budgets, and ad accounts.
     */
    async getAllBudgetData() {
        const client = getSupabaseClient();
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        const adAccounts = await handleQuery(client.from('contas_de_anuncio').select('*, plataformas(id, nome), marcas_contas(marca_id, marcas(id, nome))'), 'Failed to fetch ad accounts for budget');
        const monthlyBudgets = await handleQuery(client.from('orcamento_mensal').select('*, marcas(nome)').eq('mes', currentMonth).eq('ano', currentYear), 'Failed to fetch monthly budgets');
        const detailedBudgets = await handleQuery(client.from('orcamento_detalhado').select('*, modelos(nome), contas_de_anuncio(nome, plataforma_id, plataformas(nome))'), 'Failed to fetch detailed budgets');

        return { adAccounts, monthlyBudgets, detailedBudgets };
    },

    /**
     * Upserts a monthly budget.
     * @param {Object} budgetData - The monthly budget data.
     * @returns {Promise<Object>} The saved monthly budget.
     */
    async saveMonthlyBudget(budgetData) {
        const query = getSupabaseClient().from('orcamento_mensal').upsert(budgetData, { onConflict: 'marca_id,mes,ano' });
        return handleQuery(query, 'Failed to save monthly budget');
    },
    
    /**
     * Updates a detailed budget entry.
     * @param {string} budgetId - The ID of the detailed budget.
     * @param {Object} updateData - The fields to update.
     * @returns {Promise<Object>} The updated detailed budget.
     */
    async updateDetailedBudget(budgetId, updateData) {
        const query = getSupabaseClient().from('orcamento_detalhado').update(updateData).eq('id', budgetId);
        return handleQuery(query, `Failed to update detailed budget ${budgetId}`);
    },

    /**
     * Deletes a detailed budget entry.
     * @param {string} budgetId - The ID of the detailed budget to delete.
     * @returns {Promise<void>}
     */
    async deleteDetailedBudget(budgetId) {
        const query = getSupabaseClient().from('orcamento_detalhado').delete().eq('id', budgetId);
        return handleQuery(query, `Failed to delete detailed budget ${budgetId}`);
    },

    async getBudgetsForNewBudgetForm() {
        const client = getSupabaseClient();
        const monthlyBudgetsQuery = client.from('orcamento_mensal').select('id, marcas(nome), mes, ano').order('ano', { ascending: false }).order('mes', { ascending: false });
        const modelsQuery = client.from('modelos').select('id, nome').order('nome');
        const accountsQuery = client.from('contas_de_anuncio').select('id, nome, plataforma_id, plataformas(nome)').order('nome');

        const [monthlyBudgets, models, accounts] = await Promise.all([
            handleQuery(monthlyBudgetsQuery, 'Failed to fetch monthly budgets'),
            handleQuery(modelsQuery, 'Failed to fetch models'),
            handleQuery(accountsQuery, 'Failed to fetch ad accounts')
        ]);

        return { monthlyBudgets, models, accounts };
    },

    async getBudgetDetails(budgetId) {
        const query = getSupabaseClient().from('orcamento_detalhado').select('*').eq('id', budgetId).single();
        return handleQuery(query, 'Failed to fetch budget details');
    }
};

// --- CONFIGURACOES API (from configuracoes.js) ---

export const configuracoesApi = {
    async getUserProfile(userId) {
        const query = getSupabaseClient().from('profiles').select('plan').eq('id', userId).single();
        return handleQuery(query, 'Failed to fetch user profile');
    },

    async updateUserPlan(userId, plan) {
        const query = getSupabaseClient().from('profiles').upsert({ id: userId, plan: plan, updated_at: new Date().toISOString() });
        return handleQuery(query, 'Failed to update user plan');
    }
};

// --- OTIMIZACOES API (from otimizacoes.js) ---

export const otimizacoesApi = {
    async getOtimizacoes() {
        const query = getSupabaseClient().from('historico_otimizacoes').select('*, marcas(nome), campanhas(nome), plataformas(nome), contas_de_anuncio(nome), grupos_de_anuncios(nome), criativos(titulos)').order('criado_em', { ascending: false });
        return handleQuery(query, 'Failed to fetch optimizations');
    },

    async getFormData() {
        const client = getSupabaseClient();
        const brandsQuery = client.from('marcas').select('id, nome').order('nome');
        const platformsQuery = client.from('plataformas').select('id, nome').order('nome');
        const adAccountsQuery = client.from('contas_de_anuncio').select('id, nome, plataforma_id').order('nome');
        const marcasContasQuery = client.from('marcas_contas').select('*');

        const [brands, platforms, adAccounts, marcasContas] = await Promise.all([
            handleQuery(brandsQuery, 'Failed to fetch brands'),
            handleQuery(platformsQuery, 'Failed to fetch platforms'),
            handleQuery(adAccountsQuery, 'Failed to fetch ad accounts'),
            handleQuery(marcasContasQuery, 'Failed to fetch brand-account links')
        ]);

        return { brands, platforms, adAccounts, marcasContas };
    },

    async getCampaignsByAdAccount(adAccountId) {
        const query = getSupabaseClient().from('campanhas').select('id, nome').eq('conta_de_anuncio_id', adAccountId).order('nome');
        return handleQuery(query, 'Failed to fetch campaigns');
    },

    async getAdGroupsByCampaign(campaignId) {
        const query = getSupabaseClient().from('grupos_de_anuncios').select('id, nome').eq('campanha_id', campaignId).order('nome');
        return handleQuery(query, 'Failed to fetch ad groups');
    },

    async getCreativesByAdGroup(adGroupId) {
        const query = getSupabaseClient().from('criativos').select('id, titulos').eq('grupo_de_anuncio_id', adGroupId).order('titulos');
        return handleQuery(query, 'Failed to fetch creatives');
    },

    async createOtimizacao(data) {
        const query = getSupabaseClient().from('historico_otimizacoes').insert([data]);
        return handleQuery(query, 'Failed to create optimization');
    },

    async updateOtimizacao(id, data) {
        const query = getSupabaseClient().from('historico_otimizacoes').update(data).eq('id', id);
        return handleQuery(query, 'Failed to update optimization');
    },

    async deleteOtimizacao(id) {
        const query = getSupabaseClient().from('historico_otimizacoes').delete().eq('id', id);
        return handleQuery(query, 'Failed to delete optimization');
    }
};

// --- PRODUTOS API (from produtos.js) ---

export const produtosApi = {
    async getProdutosData() {
        const client = getSupabaseClient();
        const modelsQuery = client.from('modelos').select('*, marcas(id, nome)').order('nome');
        const brandsQuery = client.from('marcas').select('*').order('nome');

        const [models, brands] = await Promise.all([
            handleQuery(modelsQuery, 'Failed to fetch models'),
            handleQuery(brandsQuery, 'Failed to fetch brands')
        ]);

        return { models, brands };
    },

    async getAudienceByModel(modelId) {
        const query = getSupabaseClient().from('audiencias').select('*').eq('modelo_id', modelId).single();
        return handleQuery(query, 'Failed to fetch audience data');
    },

    async saveModel(modelData, modelId = null) {
        if (modelId) {
            const query = getSupabaseClient().from('modelos').update(modelData).eq('id', modelId);
            return handleQuery(query, 'Failed to update model');
        } else {
            const query = getSupabaseClient().from('modelos').insert(modelData);
            return handleQuery(query, 'Failed to create model');
        }
    },

    async deleteModel(modelId) {
        const query = getSupabaseClient().from('modelos').delete().eq('id', modelId);
        return handleQuery(query, 'Failed to delete model');
    }
};

// --- PUBLICO ALVO API (from publico-alvo-script.js) ---

export const publicoAlvoApi = {
    async getPublicoAlvoData() {
        const client = getSupabaseClient();
        const brandsQuery = client.from('marcas').select('*');
        const audiencesQuery = client.from('audiencias').select('*, modelos(*, marcas(nome))');
        const modelsQuery = client.from('modelos').select('*, marcas(nome)');

        const [brands, audiences, models] = await Promise.all([
            handleQuery(brandsQuery, 'Failed to fetch brands'),
            handleQuery(audiencesQuery, 'Failed to fetch audiences'),
            handleQuery(modelsQuery, 'Failed to fetch models')
        ]);

        return { brands, audiences, models };
    },

    async createAudience(data) {
        const query = getSupabaseClient().from('audiencias').insert(data);
        return handleQuery(query, 'Failed to create audience');
    },

    async updateAudience(audienceId, data) {
        const query = getSupabaseClient().from('audiencias').update(data).eq('id', audienceId);
        return handleQuery(query, 'Failed to update audience');
    },

    async updateBrandProfile(brandId, data) {
        const query = getSupabaseClient().from('marcas').update(data).eq('id', brandId);
        return handleQuery(query, 'Failed to update brand profile');
    },

    async deleteAudience(audienceId) {
        const query = getSupabaseClient().from('audiencias').delete().eq('id', audienceId);
        return handleQuery(query, 'Failed to delete audience');
    }
};

// --- RELATORIOS API (from relatorios.js) ---

export const relatoriosApi = {
    async getAccountsForFilter() {
        const query = getSupabaseClient().from('contas_de_anuncio').select('id, nome, plataformas(nome)').order('nome');
        return handleQuery(query, 'Failed to fetch accounts for filter');
    },

    async getAllItemsForSearch() {
        const query = getSupabaseClient().from('campanhas').select('id, nome, marcas(nome), contas_de_anuncio(nome, plataformas(nome)), grupos_de_anuncios(id, nome), criativos(id, tipo, titulos)');
        return handleQuery(query, 'Failed to fetch all items for search');
    },

    async getPerformanceReport(startDate, endDate, accountFilter) {
        let query = getSupabaseClient().from('relatorio_performance').select('*, campanhas!inner(*, marcas!inner(nome), contas_de_anuncio!inner(*, plataformas!inner(nome)))');
        if (accountFilter) {
            query = query.eq('campanhas.conta_de_anuncio_id', accountFilter);
        }
        const currentQuery = query.gte('data_relatorio', startDate).lte('data_relatorio', endDate).order('data_relatorio', { ascending: false });

        return handleQuery(currentQuery, 'Failed to fetch performance report');
    },

    async getComparisonReport(campaignIds, startDate, endDate) {
        const query = getSupabaseClient().from('relatorio_performance').select('*, campanhas!inner(*, marcas(nome), contas_de_anuncio(nome, plataformas(nome)))').in('campanha_id', campaignIds).gte('data_relatorio', startDate).lte('data_relatorio', endDate).order('data_relatorio', { ascending: false });
        return handleQuery(query, 'Failed to fetch comparison report');
    }
};

// --- IMPORTER API (from uploads.js) ---

export const importerApi = {
    /**
     * Calls the RPC to import Meta campaigns.
     * @param {string} accountId - The ad account ID.
     * @param {Array<Object>} campaignsData - The parsed CSV data for campaigns.
     * @returns {Promise<Object>} The result of the RPC call.
     */
    async importMetaCampaigns(accountId, campaignsData) {
        const query = getSupabaseClient().rpc('importar_campanhas_meta', {
            p_conta_id: accountId,
            p_dados: campaignsData,
        });
        return handleQuery(query, 'Failed to import Meta campaigns');
    },

    /**
     * Calls the RPC to import Meta ad sets.
     * @param {Array<Object>} adsetsData - The parsed CSV data for ad sets.
     * @returns {Promise<Object>} The result of the RPC call.
     */
    async importMetaAdsets(adsetsData) {
        const query = getSupabaseClient().rpc('importar_conjuntos_meta', {
            p_dados: adsetsData,
        });
        return handleQuery(query, 'Failed to import Meta ad sets');
    },

    /**
     * Calls the RPC to import Meta ads.
     * @param {Array<Object>} adsData - The parsed CSV data for ads.
     * @returns {Promise<Object>} The result of the RPC call.
     */
    async importMetaAds(adsData) {
        const query = getSupabaseClient().rpc('importar_anuncios_meta', {
            p_dados: adsData,
        });
        return handleQuery(query, 'Failed to import Meta ads');
    }
};

// --- SCRIPT API (from script.js) ---

export const scriptApi = {
    async getInitialData() {
        const client = getSupabaseClient();
        const brandsQuery = client.from('marcas').select('id, nome');
        const platformsQuery = client.from('plataformas').select('id, nome');

        const [brands, platforms] = await Promise.all([
            handleQuery(brandsQuery, 'Failed to fetch brands'),
            handleQuery(platformsQuery, 'Failed to fetch platforms')
        ]);

        return { brands, platforms };
    }
};
