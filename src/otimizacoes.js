// Import services
let historicoOtimizacoesService = null;
let configService = null;
let campanhasService = null;
let gruposDeAnunciosService = null;
let criativosService = null;

// Load service modules dynamically
async function loadHistoricoService() {
    if (!historicoOtimizacoesService) {
        try {
            const module = await import('./services-apis/supabase/historicoOtimizacoesService.js');
            historicoOtimizacoesService = module;
        } catch (error) {
            console.error('Error loading historicoOtimizacoesService:', error);
        }
    }
    return historicoOtimizacoesService;
}

async function loadConfigService() {
    if (!configService) {
        try {
            const module = await import('./services-apis/supabase/configService.js');
            configService = module;
        } catch (error) {
            console.error('Error loading configService:', error);
        }
    }
    return configService;
}

async function loadCampanhasService() {
    if (!campanhasService) {
        try {
            const module = await import('./services-apis/supabase/campanhasService.js');
            campanhasService = module;
        } catch (error) {
            console.error('Error loading campanhasService:', error);
        }
    }
    return campanhasService;
}

async function loadGruposDeAnunciosService() {
    if (!gruposDeAnunciosService) {
        try {
            const module = await import('./services-apis/supabase/gruposDeAnunciosService.js');
            gruposDeAnunciosService = module;
        } catch (error) {
            console.error('Error loading gruposDeAnunciosService:', error);
        }
    }
    return gruposDeAnunciosService;
}

async function loadCriativosService() {
    if (!criativosService) {
        try {
            const module = await import('./services-apis/supabase/criativosService.js');
            criativosService = module;
        } catch (error) {
            console.error('Error loading criativosService:', error);
        }
    }
    return criativosService;
}

class OtimizacoesManager {
    constructor() {
        this.supabase = null;
        this.optimizations = [];
        this.brands = [];
        this.campaigns = [];
        this.platforms = [];
        this.adAccounts = [];
        this.adGroups = [];
        this.creatives = [];
        this.marcasContas = [];
        this.editingId = null;
        this.deleteId = null;
        this.init();
    }

    async init() {
        try {
            this.supabase = window.getSupabaseClient();
            await Promise.all([
                loadHistoricoService(),
                loadConfigService(),
                loadCampanhasService(),
                loadGruposDeAnunciosService(),
                loadCriativosService()
            ]);
            this.setupEventListeners();
            this.showListView(); // Show list view by default
        } catch (error) {
            console.error('Error initializing OtimizacoesManager:', error);
        }
    }

    setupEventListeners() {
        const form = document.getElementById('optimization-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Setup checkboxes para mostrar/ocultar campos dinâmicos
        this.setupDynamicFields();

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions') && !e.target.closest('.actions-dropdown')) {
                this.closeAllDropdowns();
            }
        });
    }

    setupDynamicFields() {
        const checkboxes = document.querySelectorAll('.field-toggle-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', async (e) => {
                const fieldName = e.target.dataset.field;
                const fieldElement = document.querySelector(`.dynamic-field[data-field="${fieldName}"]`);

                if (fieldElement) {
                    if (e.target.checked) {
                        fieldElement.style.display = 'block';
                        // Configurar o campo quando ele aparece
                        await this.configureDynamicField(fieldName);
                    } else {
                        fieldElement.style.display = 'none';
                        // Limpa o valor do campo quando ocultado
                        const input = fieldElement.querySelector('input, select, textarea');
                        if (input) {
                            input.value = '';
                        }
                        // Limpar campos dependentes quando um campo pai é desmarcado
                        this.clearDependentFields(fieldName);
                    }
                }
            });
        });
    }

    async configureDynamicField(fieldName) {
        switch (fieldName) {
            case 'plataforma_id':
                await this.populatePlatformSelect();
                // Quando plataforma é selecionada, verificar se marca também está e atualizar conta
                const brandSelect = document.getElementById('optimization-brand');
                if (brandSelect && brandSelect.value) {
                    await this._updateAccountSelect();
                }
                // Configurar listener para quando plataforma mudar
                await this.setupAccountDependency();
                break;
            case 'marca_id':
                await this.populateBrandSelect();
                // Quando marca é selecionada, verificar se plataforma também está e atualizar conta
                const platformSelect = document.getElementById('optimization-platform');
                if (platformSelect && platformSelect.value) {
                    await this._updateAccountSelect();
                }
                // Configurar listener para quando marca mudar
                await this.setupAccountDependency();
                break;
            case 'campanha_id':
                // Campanha depende de conta (que é selecionada automaticamente)
                // Verificar se já temos conta selecionada
                const accountInput = document.getElementById('optimization-ad-account');
                if (accountInput && accountInput.value) {
                    await this.updateCampaigns(accountInput.value);
                }
                await this.setupCampaignDependency();
                break;
            case 'grupo_de_anuncio_id':
                // Grupo depende de campanha
                await this.setupAdGroupDependency();
                break;
            case 'criativo_id':
                // Criativo depende de grupo
                await this.setupCreativeDependency();
                break;
        }
    }

    clearDependentFields(fieldName) {
        const dependencies = {
            'plataforma_id': ['campanha_id', 'grupo_de_anuncio_id', 'criativo_id'],
            'marca_id': ['campanha_id', 'grupo_de_anuncio_id', 'criativo_id'],
            'campanha_id': ['grupo_de_anuncio_id', 'criativo_id'],
            'grupo_de_anuncio_id': ['criativo_id']
        };

        const fieldsToClear = dependencies[fieldName] || [];
        fieldsToClear.forEach(field => {
            const checkbox = document.querySelector(`.field-toggle-checkbox[data-field="${field}"]`);
            const fieldElement = document.querySelector(`.dynamic-field[data-field="${field}"]`);
            if (checkbox && fieldElement) {
                checkbox.checked = false;
                fieldElement.style.display = 'none';
                const input = fieldElement.querySelector('input, select, textarea');
                if (input) {
                    input.value = '';
                }
            }
        });

        // Limpar conta de anúncio (input hidden) quando marca ou plataforma são desmarcados
        if (fieldName === 'plataforma_id' || fieldName === 'marca_id') {
            const accountInput = document.getElementById('optimization-ad-account');
            if (accountInput) {
                accountInput.value = '';
            }
        }
    }

    async loadInitialData() {
        this.showListView(); // Ensure list view is shown
        await Promise.all([
            this.loadOptimizations(),
            this.loadBrands(),
            this.loadPlatforms(),
            this.loadAdAccounts(),
            this.loadMarcasContas()
        ]);
        this.populateSelects();
        this.setupDependentDropdowns();
    }

    async loadOptimizations() {
        try {
            const service = await loadHistoricoService();
            if (!service) {
                throw new Error('Service not available');
            }

            const data = await service.buscarTodoHistorico();
            this.optimizations = data || [];
            this.renderOptimizations();
        } catch (error) {
            console.error('Error loading optimizations:', error);
            this.showError('Erro ao carregar otimizações');
        }
    }

    async loadBrands() {
        try {
            const service = await loadConfigService();
            if (!service) {
                throw new Error('ConfigService not available');
            }
            const data = await service.buscarMarcas();
            this.brands = (data || []).sort((a, b) => a.nome.localeCompare(b.nome));
        } catch (error) {
            console.error('Error loading brands:', error);
            this.brands = [];
        }
    }

    async loadPlatforms() {
        try {
            const service = await loadConfigService();
            if (!service) {
                throw new Error('ConfigService not available');
            }
            const data = await service.buscarPlataformas();
            this.platforms = (data || []).sort((a, b) => a.nome.localeCompare(b.nome));
        } catch (error) {
            console.error('Error loading platforms:', error);
            this.platforms = [];
        }
    }

    async loadAdAccounts() {
        try {
            const service = await loadConfigService();
            if (!service) {
                throw new Error('ConfigService not available');
            }
            const data = await service.buscarTodasContasDeAnuncio();
            this.adAccounts = data || [];
        } catch (error) {
            console.error('Error loading ad accounts:', error);
            this.adAccounts = [];
        }
    }

    async loadMarcasContas() {
        try {
            const service = await loadConfigService();
            if (!service) {
                throw new Error('ConfigService not available');
            }
            const data = await service.buscarTodasMarcasContas();
            this.marcasContas = data || [];
        } catch (error) {
            console.error('Error loading marcas_contas:', error);
            this.marcasContas = [];
        }
    }

    async populatePlatformSelect() {
        const select = document.getElementById('optimization-platform');
        if (!select) return;

        if (this.platforms.length === 0) {
            await this.loadPlatforms();
        }

        select.innerHTML = '<option value="">Selecione...</option>';
        this.platforms.forEach(platform => {
            select.innerHTML += `<option value="${platform.id}">${platform.nome}</option>`;
        });
    }

    async populateBrandSelect() {
        const select = document.getElementById('optimization-brand');
        if (!select) return;

        if (this.brands.length === 0) {
            await this.loadBrands();
        }

        select.innerHTML = '<option value="">Selecione...</option>';
        this.brands.forEach(brand => {
            select.innerHTML += `<option value="${brand.id}">${brand.nome}</option>`;
        });
    }

    async setupAccountDependency() {
        const platformSelect = document.getElementById('optimization-platform');
        const brandSelect = document.getElementById('optimization-brand');
        const accountInput = document.getElementById('optimization-ad-account'); // Agora é um input hidden

        if (!platformSelect || !brandSelect || !accountInput) return;

        // Remover listeners antigos se existirem
        if (this._accountChangeHandler) {
            platformSelect.removeEventListener('change', this._accountChangeHandler);
            brandSelect.removeEventListener('change', this._accountChangeHandler);
        }

        // Criar novo handler que atualiza conta automaticamente
        this._accountChangeHandler = async () => {
            await this._updateAccountSelect();
        };

        // Adicionar listeners
        platformSelect.addEventListener('change', this._accountChangeHandler);
        brandSelect.addEventListener('change', this._accountChangeHandler);

        // Atualizar imediatamente se já houver valores
        if (platformSelect.value && brandSelect.value) {
            await this._updateAccountSelect();
        }
    }

    async setupCampaignDependency() {
        const accountInput = document.getElementById('optimization-ad-account');
        const campaignSelect = document.getElementById('optimization-campaign');
        const platformSelect = document.getElementById('optimization-platform');
        const brandSelect = document.getElementById('optimization-brand');

        if (!accountInput || !campaignSelect) return;

        // Como a conta é atualizada quando marca ou plataforma mudam,
        // precisamos observar mudanças nesses campos para atualizar campanhas
        // Remover listeners antigos se existirem
        if (this._campaignUpdateHandler) {
            platformSelect?.removeEventListener('change', this._campaignUpdateHandler);
            brandSelect?.removeEventListener('change', this._campaignUpdateHandler);
        }

        // Criar novo handler que atualiza campanhas quando conta muda
        this._campaignUpdateHandler = async () => {
            if (accountInput.value) {
                await this.updateCampaigns(accountInput.value);
                this.clearDependentSelects(['optimization-campaign', 'optimization-ad-group', 'optimization-creative']);
            }
        };

        // Adicionar listeners aos campos que afetam a conta
        if (platformSelect) {
            platformSelect.addEventListener('change', this._campaignUpdateHandler);
        }
        if (brandSelect) {
            brandSelect.addEventListener('change', this._campaignUpdateHandler);
        }

        // Atualizar imediatamente se já houver valor
        if (accountInput.value) {
            await this.updateCampaigns(accountInput.value);
        }
    }

    async setupAdGroupDependency() {
        const campaignSelect = document.getElementById('optimization-campaign');
        const adGroupSelect = document.getElementById('optimization-ad-group');

        if (!campaignSelect || !adGroupSelect) return;

        // Remover listener antigo se existir
        campaignSelect.removeEventListener('change', this._adGroupChangeHandler);

        // Criar novo handler
        this._adGroupChangeHandler = async (e) => {
            await this.updateAdGroups(e.target.value);
            this.clearDependentSelects(['optimization-ad-group', 'optimization-creative']);
        };

        // Adicionar listener
        campaignSelect.addEventListener('change', this._adGroupChangeHandler);

        // Atualizar imediatamente se já houver valor
        if (campaignSelect.value) {
            await this.updateAdGroups(campaignSelect.value);
        }
    }

    async setupCreativeDependency() {
        const adGroupSelect = document.getElementById('optimization-ad-group');
        const creativeSelect = document.getElementById('optimization-creative');

        if (!adGroupSelect || !creativeSelect) return;

        // Remover listener antigo se existir
        adGroupSelect.removeEventListener('change', this._creativeChangeHandler);

        // Criar novo handler
        this._creativeChangeHandler = async (e) => {
            await this.updateCreatives(e.target.value);
        };

        // Adicionar listener
        adGroupSelect.addEventListener('change', this._creativeChangeHandler);

        // Atualizar imediatamente se já houver valor
        if (adGroupSelect.value) {
            await this.updateCreatives(adGroupSelect.value);
        }
    }

    populateSelects() {
        // Os selects agora são populados dinamicamente quando os campos aparecem
        // através do método configureDynamicField
        // Esta função mantém compatibilidade mas não precisa fazer nada
    }

    setupDependentDropdowns() {
        const platformSelect = document.getElementById('optimization-platform');
        const brandSelect = document.getElementById('optimization-brand');
        const adAccountSelect = document.getElementById('optimization-ad-account');
        const campaignSelect = document.getElementById('optimization-campaign');
        const adGroupSelect = document.getElementById('optimization-ad-group');

        if (platformSelect && brandSelect) {
            platformSelect.addEventListener('change', () => this._updateAccountSelect());
            brandSelect.addEventListener('change', () => this._updateAccountSelect());
        }

        // Ad Account -> Campaign dependency
        if (adAccountSelect) {
            adAccountSelect.addEventListener('change', (e) => {
                this.updateCampaigns(e.target.value);
                this.clearDependentSelects(['optimization-campaign', 'optimization-ad-group', 'optimization-creative']);
            });
        }

        // Campaign -> Ad Group dependency
        if (campaignSelect) {
            campaignSelect.addEventListener('change', (e) => {
                this.updateAdGroups(e.target.value);
                this.clearDependentSelects(['optimization-ad-group', 'optimization-creative']);
            });
        }

        // Ad Group -> Creative dependency
        if (adGroupSelect) {
            adGroupSelect.addEventListener('change', (e) => {
                this.updateCreatives(e.target.value);
            });
        }
    }

    async _updateAccountSelect() {
        const platformSelect = document.getElementById('optimization-platform');
        const brandSelect = document.getElementById('optimization-brand');
        const accountInput = document.getElementById('optimization-ad-account'); // Agora é um input hidden

        if (!platformSelect || !brandSelect || !accountInput) return;

        const platformId = platformSelect.value;
        const brandId = brandSelect.value;

        if (!brandId || !platformId) {
            accountInput.value = '';
            // Limpar campanhas e campos dependentes quando marca/plataforma são desmarcados
            const campaignSelect = document.getElementById('optimization-campaign');
            if (campaignSelect) {
                campaignSelect.innerHTML = '<option value="">Selecione...</option>';
                campaignSelect.disabled = true;
            }
            return;
        }

        try {
            const configService = await loadConfigService();
            if (!configService) {
                throw new Error('ConfigService not available');
            }

            // Buscar contas da marca
            const brandAccounts = await configService.buscarContasPorMarca(brandId);

            if (!brandAccounts || brandAccounts.length === 0) {
                accountInput.value = '';
                return;
            }

            // Filtrar contas pela plataforma
            const filteredAccounts = brandAccounts.filter(acc => acc.plataforma_id === platformId);

            if (filteredAccounts.length > 0) {
                // Se houver apenas uma conta, selecionar automaticamente
                if (filteredAccounts.length === 1) {
                    accountInput.value = filteredAccounts[0].id;
                    // Atualizar campanhas automaticamente quando conta é selecionada
                    await this.updateCampaigns(filteredAccounts[0].id);
                } else {
                    // Se houver múltiplas contas, selecionar a primeira automaticamente
                    // (ou podemos deixar vazio se preferir, mas selecionar a primeira é mais prático)
                    filteredAccounts.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
                    accountInput.value = filteredAccounts[0].id;
                    await this.updateCampaigns(filteredAccounts[0].id);
                }
            } else {
                accountInput.value = '';
            }

        } catch (error) {
            console.error('Error updating account select:', error);
            accountInput.value = '';
            this.showError('Erro ao carregar contas de anúncio.');
        }
    }

    async updateCampaigns(adAccountId) {
        const select = document.getElementById('optimization-campaign');
        if (!select) return;

        if (!adAccountId) {
            select.innerHTML = '<option value="">Selecione uma conta</option>';
            select.disabled = true;
            return;
        }

        select.innerHTML = '<option value="">Carregando...</option>';
        select.disabled = true;

        try {
            const { data, error } = await this.supabase
                .from('campanhas')
                .select('id, nome')
                .eq('conta_de_anuncio_id', adAccountId)
                .order('nome');

            if (error) throw error;

            select.innerHTML = '<option value="">Selecione...</option>';
            if (data && data.length > 0) {
                data.forEach(campaign => {
                    select.innerHTML += `<option value="${campaign.id}">${campaign.nome}</option>`;
                });
                select.disabled = false;
            } else {
                select.innerHTML = '<option value="">Nenhuma campanha encontrada</option>';
            }
        } catch (error) {
            console.error('Error loading campaigns:', error);
            select.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async updateAdGroups(campaignId) {
        const select = document.getElementById('optimization-ad-group');
        if (!select) return;

        if (!campaignId) {
            select.innerHTML = '<option value="">Selecione uma campanha</option>';
            select.disabled = true;
            return;
        }

        select.innerHTML = '<option value="">Carregando...</option>';
        select.disabled = true;

        try {
            const service = await loadGruposDeAnunciosService();
            if (!service) {
                throw new Error('GruposDeAnunciosService not available');
            }

            const data = await service.buscarGruposPorCampanha(campaignId);

            select.innerHTML = '<option value="">Selecione...</option>';
            if (data && data.length > 0) {
                data.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
                data.forEach(group => {
                    select.innerHTML += `<option value="${group.id}">${group.nome || 'Sem nome'}</option>`;
                });
                select.disabled = false;
            } else {
                select.innerHTML = '<option value="">Nenhum grupo encontrado</option>';
            }
        } catch (error) {
            console.error('Error loading ad groups:', error);
            select.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    async updateCreatives(adGroupId) {
        const select = document.getElementById('optimization-creative');
        if (!select) return;

        if (!adGroupId) {
            select.innerHTML = '<option value="">Selecione um grupo</option>';
            select.disabled = true;
            return;
        }

        select.innerHTML = '<option value="">Carregando...</option>';
        select.disabled = true;

        try {
            const service = await loadCriativosService();
            if (!service) {
                throw new Error('CriativosService not available');
            }

            const data = await service.buscarCriativosPorGrupo(adGroupId);

            select.innerHTML = '<option value="">Selecione...</option>';
            if (data && data.length > 0) {
                data.sort((a, b) => {
                    const titleA = (a.titulos && a.titulos.length > 0) ? a.titulos[0] : '';
                    const titleB = (b.titulos && b.titulos.length > 0) ? b.titulos[0] : '';
                    return titleA.localeCompare(titleB);
                });
                data.forEach(creative => {
                    const title = (creative.titulos && creative.titulos.length > 0) ? creative.titulos[0] : 'Criativo sem título';
                    select.innerHTML += `<option value="${creative.id}">${title}</option>`;
                });
                select.disabled = false;
            } else {
                select.innerHTML = '<option value="">Nenhum criativo encontrado</option>';
            }
        } catch (error) {
            console.error('Error loading creatives:', error);
            select.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    }

    clearDependentSelects(selectIds) {
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Selecione...</option>';
            }
        });
    }

    renderOptimizations() {
        const container = document.getElementById('optimizationsList');
        if (!container) return;

        if (this.optimizations.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="search"></i>
                    <h3>Nenhuma otimização encontrada</h3>
                    <p>Registre sua primeira otimização usando o formulário acima.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const html = this.optimizations.map(opt => this.createOptimizationCard(opt)).join('');
        container.innerHTML = html;
        lucide.createIcons();
    }

    createOptimizationCard(optimization) {
        const statusClass = optimization.status ? optimization.status.toLowerCase().replace(' ', '-') : '';
        const brandName = optimization.marcas?.nome || 'N/A';
        const campaignName = optimization.campanhas?.nome || 'N/A';
        const platformName = optimization.plataformas?.nome || 'N/A';
        const adAccountName = optimization.contas_de_anuncio?.nome || 'N/A';
        const adGroupName = optimization.grupos_de_anuncios?.nome || 'N/A';
        const creativeName = (optimization.criativos && optimization.criativos.titulos && optimization.criativos.titulos.length > 0 ? optimization.criativos.titulos[0] : 'N/A');
        const date = optimization.data_alteracao ? new Date(optimization.data_alteracao).toLocaleDateString('pt-BR') : 'N/A';

        return `
            <div class="optimization-card status-${statusClass}">
                <div class="card-header">
                    <h4 class="card-title">${optimization.descricao}</h4>
                    <div class="card-actions">
                        <button class="actions-trigger" onclick="if(window.otimizacoesManager) window.otimizacoesManager.toggleDropdown(event, '${optimization.id}')">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        <div class="actions-dropdown" id="dropdown-${optimization.id}">
                            <button class="dropdown-item" onclick="if(window.otimizacoesManager) window.otimizacoesManager.viewOptimization('${optimization.id}')">
                                Visualizar
                            </button>
                            <button class="dropdown-item" onclick="if(window.otimizacoesManager) window.otimizacoesManager.editOptimization('${optimization.id}')">
                                Editar
                            </button>
                            <button class="dropdown-item danger" onclick="if(window.otimizacoesManager) window.otimizacoesManager.confirmDelete('${optimization.id}')">
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="card-content">
                    <div class="card-field">
                        <span class="field-label">Status</span>
                        <span class="field-value">
                            <span class="status-badge status-${statusClass}">${optimization.status || 'N/A'}</span>
                        </span>
                    </div>
                    
                    <div class="card-field">
                        <span class="field-label">Tipo</span>
                        <span class="field-value">
                            ${optimization.tipo_alteracao ? `<span class="type-badge">${optimization.tipo_alteracao}</span>` : 'N/A'}
                        </span>
                    </div>
                                     
                    <div class="card-field">
                        <span class="field-label">Data</span>
                        <span class="field-value">${date}</span>
                    </div>
                                       
                    <div class="card-field">
                        <span class="field-label">Conta</span>
                        <span class="field-value">${adAccountName}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async viewOptimization(id) {
        this.closeAllDropdowns();

        const optimization = this.optimizations.find(opt => opt.id === id);
        if (!optimization) return;

        const modal = document.getElementById('viewOptimizationModal');
        const content = document.getElementById('optimizationDetailsContent');
        if (!modal || !content) return;

        const statusClass = optimization.status ? optimization.status.toLowerCase().replace(' ', '-') : '';
        const brandName = optimization.marcas?.nome || 'N/A';
        const campaignName = optimization.campanhas?.nome || 'N/A';
        const platformName = optimization.plataformas?.nome || 'N/A';
        const adAccountName = optimization.contas_de_anuncio?.nome || 'N/A';
        const adGroupName = optimization.grupos_de_anuncios?.nome || 'N/A';
        const creativeName = (optimization.criativos && optimization.criativos.titulos && optimization.criativos.titulos.length > 0 ? optimization.criativos.titulos[0] : 'N/A');
        const date = optimization.data_alteracao ? new Date(optimization.data_alteracao).toLocaleDateString('pt-BR') : 'N/A';

        content.innerHTML = `
            <div class="details-grid">
                <div class="detail-item full-width"><strong>Descrição:</strong> ${optimization.descricao}</div>
                <div class="detail-item"><strong>Status:</strong> <span class="status-badge status-${statusClass}">${optimization.status || 'N/A'}</span></div>
                <div class="detail-item"><strong>Tipo:</strong> ${optimization.tipo_alteracao || 'N/A'}</div>
                <div class="detail-item"><strong>Responsável:</strong> ${optimization.responsavel || 'N/A'}</div>
                <div class="detail-item"><strong>Data:</strong> ${date}</div>
                <div class="detail-item"><strong>Plataforma:</strong> ${platformName}</div>
                <div class="detail-item"><strong>Marca:</strong> ${brandName}</div>
                <div class="detail-item"><strong>Conta de Anúncio:</strong> ${adAccountName}</div>
                <div class="detail-item"><strong>Campanha:</strong> ${campaignName}</div>
                <div class="detail-item"><strong>Grupo de Anúncio:</strong> ${adGroupName}</div>
                <div class="detail-item"><strong>Criativo:</strong> ${creativeName}</div>
                <div class="detail-item full-width"><strong>Hipótese:</strong> ${optimization.hipotese || 'N/A'}</div>
            </div>
        `;

        modal.classList.add('is-active');
        this.closeAllDropdowns();
    }

    closeViewModal() {
        const modal = document.getElementById('viewOptimizationModal');
        if (modal) {
            modal.classList.remove('is-active');
        }
    }

    toggleDropdown(event, id) {
        if (event) {
            event.stopPropagation();
        }

        // Close all other dropdowns
        document.querySelectorAll('.actions-dropdown').forEach(dropdown => {
            if (dropdown.id !== `dropdown-${id}`) {
                dropdown.classList.remove('active');
            }
        });

        // Toggle current dropdown
        const dropdown = document.getElementById(`dropdown-${id}`);
        if (dropdown) {
            dropdown.classList.toggle('active');
        }
    }

    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.actions-dropdown');
        dropdowns.forEach(dropdown => dropdown.classList.remove('active'));
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Campos obrigatórios: descricao e responsavel (is_nullable = NO)
        // criado_em também é obrigatório mas tem default now(), então não precisa validar
        const requiredFields = ['descricao', 'responsavel'];

        // Validação de campos obrigatórios
        for (const field of requiredFields) {
            if (!data[field] || data[field].trim() === '') {
                const fieldNames = {
                    'descricao': 'Descrição',
                    'responsavel': 'Responsável'
                };
                this.showError(`O campo "${fieldNames[field]}" é obrigatório.`);
                return;
            }
        }

        // Remover valores de campos que estão ocultos (não marcados nos checkboxes)
        const checkboxes = document.querySelectorAll('.field-toggle-checkbox');
        const hiddenFields = [];
        checkboxes.forEach(checkbox => {
            if (!checkbox.checked) {
                hiddenFields.push(checkbox.dataset.field);
            }
        });

        // Garantir que conta_de_anuncio_id seja incluída se marca e plataforma estão selecionadas
        // O campo é um input hidden, então já deve estar no FormData
        const marcaId = data.marca_id;
        const plataformaId = data.plataforma_id;
        const contaDeAnuncioId = data.conta_de_anuncio_id;

        // Se marca e plataforma estão selecionadas mas conta não está no FormData, buscar do input hidden
        if (marcaId && plataformaId && !contaDeAnuncioId) {
            const accountInput = document.getElementById('optimization-ad-account');
            if (accountInput && accountInput.value) {
                data.conta_de_anuncio_id = accountInput.value;
            }
        }

        // Convert empty strings to null para todos os campos
        // Campos opcionais podem ser null
        // Campos ocultos devem ser null mesmo se tiverem valor
        const cleanedData = {};

        Object.keys(data).forEach(key => {
            // Se o campo está oculto (exceto conta_de_anuncio_id que é automático), força null
            const fieldMapping = {
                'hipotese': 'hipotese',
                'tipo_alteracao': 'tipo_alteracao',
                'plataforma_id': 'plataforma_id',
                'marca_id': 'marca_id',
                'conta_de_anuncio_id': 'conta_de_anuncio_id',
                'campanha_id': 'campanha_id',
                'grupo_de_anuncio_id': 'grupo_de_anuncio_id',
                'criativo_id': 'criativo_id'
            };

            // Conta de anúncio não tem checkbox, então não deve ser tratada como oculta
            // Se marca e plataforma estão selecionadas, incluir conta mesmo que não tenha checkbox marcado
            if (key === 'conta_de_anuncio_id') {
                // Incluir conta se marca e plataforma estão selecionadas
                if (marcaId && plataformaId && data[key]) {
                    cleanedData[key] = data[key] === '' ? null : data[key];
                } else {
                    cleanedData[key] = null;
                }
            } else {
                const isHidden = hiddenFields.includes(fieldMapping[key]);
                const value = (data[key] === '' || isHidden) ? null : data[key];
                cleanedData[key] = value;
            }
        });

        try {
            if (this.editingId) {
                await this.updateOptimization(this.editingId, cleanedData);
                this.showSuccess('Otimização atualizada com sucesso!');
            } else {
                await this.createOptimization(cleanedData);
                this.showSuccess('Otimização criada com sucesso!');
            }

            this.resetForm();
            await this.loadOptimizations();
            this.showListView(); // Return to list view after saving
        } catch (error) {
            console.error('Error submitting form:', error);
            // Mostra mensagem de erro específica se disponível, senão mostra genérica
            const errorMessage = error.message || 'Erro ao salvar otimização';
            this.showError(errorMessage);
        }
    }

    async createOptimization(data) {
        const service = await loadHistoricoService();
        if (!service) {
            throw new Error('Service not available');
        }

        try {
            const result = await service.criarHistorico(data);
            if (!result) {
                throw new Error('Failed to create');
            }
            return result;
        } catch (error) {
            throw error;
        }
    }

    async updateOptimization(id, data) {
        const service = await loadHistoricoService();
        if (!service) {
            throw new Error('Service not available');
        }

        try {
            const result = await service.atualizarHistorico(id, data);
            if (!result) {
                throw new Error('Failed to update');
            }
            return result;
        } catch (error) {
            throw error;
        }
    }

    async editOptimization(id) {
        this.closeAllDropdowns();

        const optimization = this.optimizations.find(opt => opt.id === id);
        if (!optimization) return;

        this.editingId = id;

        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.textContent = 'Editando Otimização';
        }

        const form = document.getElementById('optimization-form');
        if (form) {
            // Reset checkboxes primeiro
            const checkboxes = document.querySelectorAll('.field-toggle-checkbox');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
                const fieldName = checkbox.dataset.field;
                const fieldElement = document.querySelector(`.dynamic-field[data-field="${fieldName}"]`);
                if (fieldElement) {
                    fieldElement.style.display = 'none';
                }
            });

            // Fill non-dependent fields
            form.querySelector('#optimization-description').value = optimization.descricao || '';
            form.querySelector('#optimization-status').value = optimization.status || '';
            form.querySelector('#optimization-responsible').value = optimization.responsavel || '';
            form.querySelector('#optimization-date').value = optimization.data_alteracao ? new Date(optimization.data_alteracao).toISOString().split('T')[0] : '';

            // Preencher e mostrar campos dinâmicos que têm valores
            const dynamicFields = {
                'hipotese': { element: '#optimization-hypothesis', value: optimization.hipotese },
                'tipo_alteracao': { element: '#optimization-type', value: optimization.tipo_alteracao },
                'plataforma_id': { element: '#optimization-platform', value: optimization.plataforma_id },
                'marca_id': { element: '#optimization-brand', value: optimization.marca_id },
                'conta_de_anuncio_id': { element: '#optimization-ad-account', value: optimization.conta_de_anuncio_id },
                'campanha_id': { element: '#optimization-campaign', value: optimization.campanha_id },
                'grupo_de_anuncio_id': { element: '#optimization-ad-group', value: optimization.grupo_de_anuncio_id },
                'criativo_id': { element: '#optimization-creative', value: optimization.criativo_id }
            };

            // Get handles for all select elements
            const platformSelect = form.querySelector('#optimization-platform');
            const brandSelect = form.querySelector('#optimization-brand');
            const accountInput = form.querySelector('#optimization-ad-account'); // Agora é input hidden
            const campaignSelect = form.querySelector('#optimization-campaign');
            const adGroupSelect = form.querySelector('#optimization-ad-group');
            const creativeSelect = form.querySelector('#optimization-creative');

            // Processar campos dinâmicos
            for (const [fieldName, fieldData] of Object.entries(dynamicFields)) {
                if (fieldData.value) {
                    // Marcar checkbox e mostrar campo
                    const checkbox = document.querySelector(`.field-toggle-checkbox[data-field="${fieldName}"]`);
                    const fieldElement = document.querySelector(`.dynamic-field[data-field="${fieldName}"]`);

                    if (checkbox && fieldElement) {
                        checkbox.checked = true;
                        fieldElement.style.display = 'block';
                        // Configurar o campo dinâmico (carregar dados e configurar dependências)
                        await this.configureDynamicField(fieldName);
                    }
                }
            }

            // Preencher valores dos campos dinâmicos
            if (optimization.hipotese) {
                form.querySelector('#optimization-hypothesis').value = optimization.hipotese || '';
            }
            if (optimization.tipo_alteracao) {
                form.querySelector('#optimization-type').value = optimization.tipo_alteracao || '';
            }

            // Set initial values that control the first dependency
            if (optimization.plataforma_id) {
                platformSelect.value = optimization.plataforma_id || '';
            }
            if (optimization.marca_id) {
                brandSelect.value = optimization.marca_id || '';
            }

            // Configurar conta de anúncio (depende de marca e plataforma)
            if (optimization.plataforma_id && optimization.marca_id) {
                await this._updateAccountSelect();
                // Se a conta da otimização for diferente da selecionada automaticamente, usar a da otimização
                if (optimization.conta_de_anuncio_id && accountInput) {
                    accountInput.value = optimization.conta_de_anuncio_id || '';
                }
            }

            // Configurar campanha (depende de conta)
            const contaId = accountInput?.value || optimization.conta_de_anuncio_id;
            if (contaId) {
                await this.updateCampaigns(contaId);
                if (optimization.campanha_id && campaignSelect) {
                    campaignSelect.value = optimization.campanha_id || '';
                }
            }

            if (optimization.campanha_id) {
                await this.updateAdGroups(optimization.campanha_id);
                if (optimization.grupo_de_anuncio_id) {
                    adGroupSelect.value = optimization.grupo_de_anuncio_id || '';
                }
            }

            if (optimization.grupo_de_anuncio_id) {
                await this.updateCreatives(optimization.grupo_de_anuncio_id);
                if (optimization.criativo_id) {
                    creativeSelect.value = optimization.criativo_id || '';
                }
            }
        }

        this.closeAllDropdowns();
        this.showFormView();
    }

    confirmDelete(id) {
        this.closeAllDropdowns();

        this.deleteId = id;
        const modal = document.getElementById('deleteOptimizationModal');
        if (modal) {
            modal.classList.add('is-active');
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteOptimizationModal');
        if (modal) {
            modal.classList.remove('is-active');
        }
        this.deleteId = null;
    }

    async executeDelete() {
        if (!this.deleteId) return;

        try {
            const service = await loadHistoricoService();
            if (!service) {
                throw new Error('Service not available');
            }

            const success = await service.deletarHistorico(this.deleteId);

            if (!success) {
                throw new Error('Failed to delete');
            }

            this.showSuccess('Otimização excluída com sucesso!');
            this.closeDeleteModal();
            await this.loadOptimizations();
        } catch (error) {
            console.error('Error deleting optimization:', error);
            this.showError('Erro ao excluir otimização');
        }
    }

    resetForm() {
        const form = document.getElementById('optimization-form');
        if (form) {
            form.reset();
        }

        // Reset checkboxes e ocultar todos os campos dinâmicos
        const checkboxes = document.querySelectorAll('.field-toggle-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const fieldName = checkbox.dataset.field;
            const fieldElement = document.querySelector(`.dynamic-field[data-field="${fieldName}"]`);
            if (fieldElement) {
                fieldElement.style.display = 'none';
            }
        });

        this.editingId = null;

        // Reset form title
        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.textContent = 'Registrar Nova Otimização';
        }

        this.showListView(); // Return to list view when canceling
    }

    addNewOptimization() {
        this.resetForm();

        // Set current date as default
        const dateField = document.getElementById('optimization-date');
        if (dateField) {
            const today = new Date().toISOString().split('T')[0];
            dateField.value = today;
        }

        // Reset checkboxes e ocultar campos dinâmicos
        const checkboxes = document.querySelectorAll('.field-toggle-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const fieldName = checkbox.dataset.field;
            const fieldElement = document.querySelector(`.dynamic-field[data-field="${fieldName}"]`);
            if (fieldElement) {
                fieldElement.style.display = 'none';
            }
        });

        const formTitle = document.getElementById('form-title');
        if (formTitle) {
            formTitle.textContent = 'Registrar Nova Otimização';
        }
        this.showFormView(); // Show form view for adding new optimization
    }

    async applyFilters() {
        const status = document.getElementById('filter-status').value;
        const type = document.getElementById('filter-type').value;
        const responsible = document.getElementById('filter-responsible').value;
        const dateStart = document.getElementById('filter-date-start').value;
        const dateEnd = document.getElementById('filter-date-end').value;

        try {
            const service = await loadHistoricoService();
            if (!service) {
                throw new Error('Service not available');
            }

            const filtros = {};
            if (status) filtros.status = status;
            if (type) filtros.tipo_alteracao = type;
            if (responsible) filtros.responsavel = responsible;
            if (dateStart) filtros.data_inicio = dateStart;
            if (dateEnd) filtros.data_fim = dateEnd;

            const data = await service.buscarHistoricoComFiltros(filtros);
            this.optimizations = data || [];
            this.renderOptimizations();
        } catch (error) {
            console.error('Error applying filters:', error);
            this.showError('Erro ao aplicar filtros');
        }
    }

    clearFilters() {
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-type').value = '';
        document.getElementById('filter-responsible').value = '';
        document.getElementById('filter-date-start').value = '';
        document.getElementById('filter-date-end').value = '';

        this.loadOptimizations();
    }

    showSuccess(message) {
        // Hide any existing notifications first
        const notification = document.getElementById('optimizationSuccessNotification');
        const messageEl = document.getElementById('optimizationSuccessMessage');

        if (notification && messageEl) {
            // Clear any existing timeout and hide notification
            notification.classList.remove('show');
            notification.classList.remove('success');
            notification.classList.add('error');

            // Set new message and show
            messageEl.textContent = message;

            setTimeout(() => {
                notification.classList.add('show');
            }, 100);

            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.classList.remove('error');
                    notification.classList.add('success');
                }, 300);
            }, 3000);
        }
    }

    showError(message) {
        console.error(message);
        // Mostra notificação de erro similar à de sucesso
        const notification = document.getElementById('optimizationSuccessNotification');
        const messageEl = document.getElementById('optimizationSuccessMessage');

        if (notification && messageEl) {
            // Limpa qualquer timeout existente e esconde notificação
            notification.classList.remove('show');
            notification.classList.remove('success');
            notification.classList.add('error');

            // Define nova mensagem e mostra
            messageEl.textContent = message;

            setTimeout(() => {
                notification.classList.add('show');
            }, 100);

            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    notification.classList.remove('error');
                    notification.classList.add('success');
                }, 300);
            }, 5000); // Mostra por 5 segundos para erros
        }
    }

    showListView() {
        const formSection = document.querySelector('.optimization-form-section');
        const filtersSection = document.querySelector('.optimization-filters-section');
        const listSection = document.querySelector('.optimization-list-section');
        const addButton = document.getElementById('add-optimization-btn');

        if (formSection) formSection.style.display = 'none';
        if (filtersSection) filtersSection.style.display = 'block';
        if (listSection) listSection.style.display = 'block';
        if (addButton) addButton.style.display = 'block';
    }

    showFormView() {
        const formSection = document.querySelector('.optimization-form-section');
        const filtersSection = document.querySelector('.optimization-filters-section');
        const listSection = document.querySelector('.optimization-list-section');
        const addButton = document.getElementById('add-optimization-btn');

        if (formSection) formSection.style.display = 'block';
        if (filtersSection) filtersSection.style.display = 'none';
        if (listSection) listSection.style.display = 'none';
        if (addButton) addButton.style.display = 'none';
    }
}

// Global instance
window.otimizacoesManager = new OtimizacoesManager();

// Initialize Lucide icons after page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
});