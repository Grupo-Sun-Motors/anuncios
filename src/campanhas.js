// Campanhas Manager

// Mapeamento de status (inglês -> português)
const STATUS_MAP = {
    'active': 'Ativa',
    'paused': 'Pausada',
    'inactive': 'Inativa'
};

// Mapeamento reverso (português -> inglês)
const STATUS_MAP_REVERSE = {
    'Ativa': 'active',
    'Pausada': 'paused',
    'Inativa': 'inactive',
    'Finalizada': 'inactive' // Finalizada também é inactive
};

// Função para converter status do banco para exibição
function getStatusDisplay(status) {
    return STATUS_MAP[status] || status || 'Ativa';
}

// Função para converter status da exibição para banco
function getStatusValue(statusDisplay) {
    return STATUS_MAP_REVERSE[statusDisplay] || statusDisplay || 'active';
}

// Load service modules dynamically
async function loadCampanhasService() {
    if (!window.campanhasService) {
        try {
            const module = await import('./services-apis/supabase/campanhasService.js');
            window.campanhasService = module;
        } catch (error) {
            console.error('Error loading campanhasService:', error);
        }
    }
    return window.campanhasService;
}

async function loadGruposDeAnunciosService() {
    if (!window.gruposDeAnunciosService) {
        try {
            const module = await import('./services-apis/supabase/gruposDeAnunciosService.js');
            window.gruposDeAnunciosService = module;
        } catch (error) {
            console.error('Error loading gruposDeAnunciosService:', error);
        }
    }
    return window.gruposDeAnunciosService;
}

async function loadCriativosService() {
    if (!window.criativosService) {
        try {
            const module = await import('./services-apis/supabase/criativosService.js');
            window.criativosService = module;
        } catch (error) {
            console.error('Error loading criativosService:', error);
        }
    }
    return window.criativosService;
}

async function loadConfigService() {
    if (!window.configService) {
        try {
            const module = await import('./services-apis/supabase/configService.js');
            window.configService = module;
        } catch (error) {
            console.error('Error loading configService:', error);
        }
    }
    return window.configService;
}

async function loadModelosService() {
    if (!window.modelosService) {
        try {
            const module = await import('./services-apis/supabase/modelosService.js');
            window.modelosService = module;
        } catch (error) {
            console.error('Error loading modelosService:', error);
        }
    }
    return window.modelosService;
}

class CampanhasManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.allCampaigns = []; // Renamed from this.campaigns
        this.displayedCampaigns = []; // New property for filtered campaigns
        this.brands = [];
        this.platforms = [];
        this.accounts = [];
        this.modelos = [];
        this.adGroupCache = {}; // Cache for hover
        this.currentStep = 1;
        this.newCampaignId = null;
        this.newAdGroups = [];
        this.editingCampaign = null;
        this.adGroupsToDelete = [];
        this.creativesToDelete = [];
        this.layout = 'list'; // Default to list view
        this.isSaving = false; // Add a saving flag

        // New state for hierarchical editor
        this.campaignData = null; // Will hold the entire campaign object with nested groups and creatives
        this.originalCampaignData = null; // A deep copy for tracking deletions
        this.selectedItem = null; // Will hold the reference to the currently selected item in the nav tree

        // Bind handlers to ensure stable function references for event listeners
        this.boundHandleStep1Submit = this.handleStep1Submit.bind(this);
        this.boundHandleUpdateSubmit = this.handleUpdateSubmit.bind(this);
        this.removeCreative = this.removeCreative.bind(this);
        this.handleMouseOutFromGroups = this.handleMouseOutFromGroups.bind(this);

        this.adAccounts = [];
        this.defaultAdAccount = null;
        this.isCreating = false; // Adicionado para rastrear a criação

        this.importerModal = null;
        this.openImporterBtn = null;
        this.closeImporterBtn = null;
        this.adAccountSelect = null;
        this.campaignsFileInput = null;
        this.adsetsFileInput = null;
        this.adsFileInput = null;
        this.startImportBtn = null;
        this.feedbackLog = null;
        this.btnText = null;
        this.spinner = null;

        this.importerStep2 = null;
        this.importerStep3 = null;

        this.selectedAdAccountId = null;
        this.files = {
            campaigns: null,
            adsets: null,
            ads: null,
        };

        this.init();
    }

    async init() {
        try {
            if (window.getSupabaseClient) {
                this.supabase = window.getSupabaseClient();
            }

            // Load all required services
            await Promise.all([
                loadConfigService(),
                loadCampanhasService(),
                loadGruposDeAnunciosService(),
                loadCriativosService(),
                loadModelosService()
            ]);

            this.elements = {
                listView: document.getElementById('campaigns-list-view'),
                formView: document.getElementById('campaigns-form-view'),
                campaignsList: document.getElementById('campaignsList'),
                formTitle: document.getElementById('campaign-form-title'),
                breadcrumbNav: document.getElementById('campaign-breadcrumb-nav'),
                hierarchyNav: document.getElementById('campaign-hierarchy-nav'),
                contentEditor: document.getElementById('campaign-content-editor'),
                filterBrand: document.getElementById('campaign-filter-brand'),
                filterPlatform: document.getElementById('campaign-filter-platform'),
                filterStatus: document.getElementById('campaign-filter-status'),
                countDisplay: document.getElementById('campaign-count-display'),
                gridViewBtn: document.getElementById('grid-view-btn'),
                listViewBtn: document.getElementById('list-view-btn'),
                listHeader: document.getElementById('campaigns-list-header')
            };

            await this.loadInitialData();
            this.setupEventListeners();
            this.showListView();

            // Initialize the importer-specific logic
            this.initImporter();
        } catch (error) {
            console.error('Error initializing Campanhas Manager:', error);
        }
    }

    async loadInitialData() {
        try {
            if (!window.configService || !window.modelosService) {
                console.warn('Services not fully loaded, retrying...');
                await Promise.all([loadConfigService(), loadModelosService()]);
            }

            // Load brands, platforms, accounts and models
            const [brands, platforms, accounts, modelos] = await Promise.all([
                window.configService.buscarMarcas(),
                window.configService.buscarPlataformas(),
                window.configService.buscarTodasContasDeAnuncio(),
                window.modelosService.buscarTodosModelos()
            ]);

            this.brands = brands || [];
            this.platforms = platforms || [];
            this.accounts = accounts || [];
            this.modelos = modelos || [];

            this.populateFilterSelects();

            // Load campaigns
            await this.loadCampaigns();

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Erro ao carregar dados iniciais');
        }
    }

    populateFilterSelects() {
        // Populate filter selects
        const brandFilter = document.getElementById('campaign-filter-brand');
        const platformFilter = document.getElementById('campaign-filter-platform');
        const modeloFilter = document.getElementById('campaign-filter-modelo');

        if (brandFilter) {
            brandFilter.innerHTML = '<option value="">Todas</option>';
            this.brands.forEach(brand => {
                brandFilter.innerHTML += `<option value="${brand.id}">${brand.nome}</option>`;
            });
        }

        if (platformFilter) {
            platformFilter.innerHTML = '<option value="">Todas</option>';
            this.platforms.forEach(platform => {
                platformFilter.innerHTML += `<option value="${platform.id}">${platform.nome}</option>`;
            });
        }

        // Populate modelo filter based on selected brand
        this.updateModeloFilter();

        // Populate form selects
        this.populateFormSelects();
    }

    updateModeloFilter() {
        const modeloFilter = document.getElementById('campaign-filter-modelo');
        const brandFilter = document.getElementById('campaign-filter-brand');

        if (!modeloFilter) return;

        const selectedBrandId = brandFilter?.value || '';

        modeloFilter.innerHTML = '<option value="">Todos</option>';

        // Filtrar modelos pela marca selecionada
        const filteredModelos = selectedBrandId
            ? this.modelos.filter(modelo => String(modelo.marca_id) === String(selectedBrandId))
            : this.modelos;

        filteredModelos.forEach(modelo => {
            modeloFilter.innerHTML += `<option value="${modelo.id}">${modelo.nome}</option>`;
        });
    }

    populateFormSelects() {
        const brandSelect = document.getElementById('campaign-brand');
        const platformSelect = document.getElementById('campaign-platform');
        const modeloSelect = document.getElementById('campaign-modelo');

        if (brandSelect) {
            brandSelect.innerHTML = '<option value="">Selecione...</option>';
            this.brands.forEach(brand => {
                brandSelect.innerHTML += `<option value="${brand.id}">${brand.nome}</option>`;
            });
        }

        if (platformSelect) {
            platformSelect.innerHTML = '<option value="">Selecione...</option>';
            this.platforms.forEach(platform => {
                platformSelect.innerHTML += `<option value="${platform.id}">${platform.nome}</option>`;
            });
        }

        // Populate modelo select based on selected brand
        this.updateModeloFormSelect();

        this.setupDependentSelects();
    }

    updateModeloFormSelect() {
        const modeloSelect = document.getElementById('campaign-modelo');
        const brandSelect = document.getElementById('campaign-brand');

        if (!modeloSelect) return;

        const selectedBrandId = brandSelect?.value || '';
        const currentValue = modeloSelect.value; // Preservar valor atual se existir

        modeloSelect.innerHTML = '<option value="">Selecione...</option>';

        // Filtrar modelos pela marca selecionada
        const filteredModelos = selectedBrandId
            ? this.modelos.filter(modelo => String(modelo.marca_id) === String(selectedBrandId))
            : this.modelos;

        filteredModelos.forEach(modelo => {
            const selected = currentValue && String(modelo.id) === String(currentValue) ? 'selected' : '';
            modeloSelect.innerHTML += `<option value="${modelo.id}" ${selected}>${modelo.nome}</option>`;
        });

        // Se não houver marca selecionada ou o modelo atual não pertence à marca, limpar seleção
        if (selectedBrandId && currentValue) {
            const currentModelo = this.modelos.find(m => String(m.id) === String(currentValue));
            if (!currentModelo || String(currentModelo.marca_id) !== String(selectedBrandId)) {
                modeloSelect.value = '';
            }
        }
    }

    setupDependentSelects() {
        const platformSelect = document.getElementById('campaign-platform');
        const brandSelect = document.getElementById('campaign-brand');
        const accountSelect = document.getElementById('campaign-ad-account');

        if (platformSelect && brandSelect && accountSelect) {
            platformSelect.addEventListener('change', () => this._updateAccountSelect());
            brandSelect.addEventListener('change', () => {
                this._updateAccountSelect();
                this.updateModeloFormSelect(); // Atualizar modelos quando marca mudar
            });
            this._updateAccountSelect(); // Call once on initial setup
        }
    }

    async _updateAccountSelect() {
        const platformSelect = document.getElementById('campaign-platform');
        const brandSelect = document.getElementById('campaign-brand');
        const accountSelect = document.getElementById('campaign-ad-account');

        if (!platformSelect || !brandSelect || !accountSelect) return;

        const platformId = platformSelect.value;
        const brandId = brandSelect.value;

        // A instrução é para carregar apenas quando AMBOS estiverem selecionados.
        if (!brandId || !platformId) {
            accountSelect.innerHTML = '<option value="">Selecione marca e plataforma</option>';
            accountSelect.disabled = true;
            return;
        }

        accountSelect.innerHTML = '<option value="">Carregando...</option>';
        accountSelect.disabled = true;

        try {
            // Passo 1: Obter IDs de conta para a marca selecionada
            const { data: brandAccounts, error: brandAccountsError } = await this.supabase
                .from('marcas_contas')
                .select('conta_de_anuncio_id')
                .eq('marca_id', brandId);

            if (brandAccountsError) throw brandAccountsError;

            const accountIds = brandAccounts.map(ba => ba.conta_de_anuncio_id);

            if (accountIds.length === 0) {
                accountSelect.innerHTML = '<option value="">Nenhuma conta para esta marca</option>';
                return;
            }

            // Passo 2: Buscar contas que pertencem à marca E têm a plataforma correta
            const { data: accounts, error: accountsError } = await this.supabase
                .from('contas_de_anuncio')
                .select('id, nome')
                .in('id', accountIds)
                .eq('plataforma_id', platformId);

            if (accountsError) throw accountsError;

            if (accounts.length > 0) {
                accountSelect.innerHTML = '<option value="">Selecione...</option>';
                accounts.forEach(acc => {
                    accountSelect.innerHTML += `<option value="${acc.id}">${acc.nome}</option>`;
                });
                accountSelect.disabled = false;
            } else {
                accountSelect.innerHTML = '<option value="">Nenhuma conta encontrada</option>';
            }

        } catch (error) {
            console.error('Error updating account select:', error);
            accountSelect.innerHTML = '<option value="">Erro ao carregar contas</option>';
            this.showError('Erro ao carregar contas de anúncio.');
        }
    }

    setupEventListeners() {
        // NOTE: Form submission listeners are now handled dynamically in showFormView
        // to prevent duplicates.

        // Filter change listeners
        const brandFilter = document.getElementById('campaign-filter-brand');
        const platformFilter = document.getElementById('campaign-filter-platform');
        const statusFilter = document.getElementById('campaign-filter-status');
        const modeloFilter = document.getElementById('campaign-filter-modelo');

        if (brandFilter) {
            brandFilter.addEventListener('change', () => {
                this.updateModeloFilter(); // Atualizar modelos quando marca mudar
                this.applyFilters();
            });
        }
        if (platformFilter) {
            platformFilter.addEventListener('change', () => this.applyFilters());
        }
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        if (modeloFilter) {
            modeloFilter.addEventListener('change', () => this.applyFilters());
        }

        // Action menu clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.actions-menu-btn')) {
                this.toggleActionsMenu(e.target.closest('.actions-menu-btn'));
            } else if (!e.target.closest('.actions-dropdown')) {
                this.closeAllActionMenus();
            }
        });

        // Event delegation for hover on ad groups
        const campaignsListContainer = document.getElementById('campaignsList');
        if (campaignsListContainer) {
            campaignsListContainer.addEventListener('mouseover', (e) => {
                const groupsTarget = e.target.closest('.campaign-groups');
                if (groupsTarget && !groupsTarget.contains(e.relatedTarget)) {
                    this.handleMouseOverGroups(groupsTarget);
                }
            });
            campaignsListContainer.addEventListener('mouseout', (e) => {
                const groupsTarget = e.target.closest('.campaign-groups');
                if (groupsTarget && !groupsTarget.contains(e.relatedTarget)) {
                    this.handleMouseOutFromGroups(groupsTarget);
                }
            });
        }
    }

    showListView() {
        document.getElementById('campaigns-list-view').style.display = 'block';
        document.getElementById('campaigns-form-view').style.display = 'none';

        // Set initial layout UI state
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        const container = document.getElementById('campaignsList');
        const header = document.getElementById('campaigns-list-header');

        if (gridBtn && listBtn && container) {
            if (this.layout === 'list') {
                gridBtn.classList.remove('active');
                listBtn.classList.add('active');
                container.classList.add('list-view');
                container.classList.remove('grid-view');
                if (header) header.style.display = 'flex';
            } else { // 'grid'
                listBtn.classList.remove('active');
                gridBtn.classList.add('active');
                container.classList.remove('list-view');
                container.classList.add('grid-view');
                if (header) header.style.display = 'none';
            }
        }

        this.loadCampaigns();
    }

    setLayout(layout) {
        this.layout = layout;
        const gridBtn = document.getElementById('grid-view-btn');
        const listBtn = document.getElementById('list-view-btn');
        const container = document.getElementById('campaignsList');
        const header = document.getElementById('campaigns-list-header');

        if (layout === 'list') {
            gridBtn.classList.remove('active');
            listBtn.classList.add('active');
            container.classList.add('list-view');
            container.classList.remove('grid-view');
            if (header) header.style.display = 'flex';
        } else {
            listBtn.classList.remove('active');
            gridBtn.classList.add('active');
            container.classList.remove('list-view');
            container.classList.add('grid-view');
            if (header) header.style.display = 'none';
        }
        this.renderCampaignsList();
    }

    async showFormView(campaignId = null) {
        document.getElementById('campaigns-list-view').style.display = 'none';
        document.getElementById('campaigns-form-view').style.display = 'block';
        this.resetFormState();
        const form = document.getElementById('campaign-form-step1');

        // Garantir que os selects estejam populados
        this.populateFormSelects();

        if (campaignId) {
            // Editing an existing campaign
            this.loadFullCampaign(campaignId);
        } else {
            // Creating a new campaign
            this.initializeNewCampaign();
        }
    }

    async loadFullCampaign(campaignId, itemToSelect = null) {
        try {
            if (!window.campanhasService || !window.gruposDeAnunciosService || !window.criativosService) {
                throw new Error('Serviços não estão disponíveis');
            }

            // 1. Fetch campaign details
            const campaign = await window.campanhasService.buscarCampanhaPorId(campaignId);
            if (!campaign) throw new Error('Campanha não encontrada');

            // 2. Fetch ad groups for the campaign
            const adGroups = await window.gruposDeAnunciosService.buscarGruposPorCampanha(campaignId);

            // 3. Fetch creatives for all ad groups
            const adGroupIds = adGroups.map(g => g.id);
            let creatives = [];
            if (adGroupIds.length > 0) {
                // Buscar criativos para cada grupo
                const creativesPromises = adGroupIds.map(groupId =>
                    window.criativosService.buscarCriativosPorGrupo(groupId)
                );
                const creativesArrays = await Promise.all(creativesPromises);
                creatives = creativesArrays.flat();
            }

            // 4. Assemble the hierarchical data structure
            this.campaignData = {
                ...campaign,
                ad_groups: adGroups.map(group => ({
                    ...group,
                    creatives: creatives.filter(c => c.grupo_de_anuncio_id === group.id)
                }))
            };

            // Create a deep copy for tracking changes, especially deletions
            this.originalCampaignData = JSON.parse(JSON.stringify(this.campaignData));

            // 5. Set initial state and render the UI
            if (itemToSelect) {
                this.selectedItem = itemToSelect;
            } else {
                this.selectedItem = { type: 'campaign', id: this.campaignData.id };
            }
            this.renderEditor();

        } catch (error) {
            console.error('Error loading full campaign:', error);
            this.showError('Erro ao carregar dados completos da campanha.');
            this.showListView(); // Go back to list on error
        }
    }

    initializeNewCampaign() {
        this.campaignData = {
            id: `new_${Date.now()}`, // Temporary ID for new campaign
            nome: '',
            status: 'active',
            ad_groups: []
            // Add other default fields as necessary
        };
        this.originalCampaignData = JSON.parse(JSON.stringify(this.campaignData));
        this.selectedItem = { type: 'campaign', id: this.campaignData.id };
        this.renderEditor();
    }

    renderEditor() {
        // These will be implemented next
        this.renderHierarchyNav();
        this.renderEditorPanel();
        this.renderBreadcrumbs();
    }

    renderBreadcrumbs() {
        const container = document.getElementById('campaign-breadcrumb-nav');
        if (!container || !this.campaignData || !this.selectedItem) {
            if (container) container.innerHTML = '';
            return;
        }

        const { type, id, groupId } = this.selectedItem;

        let crumbsHtml = '';

        const campaignName = this.campaignData.nome || 'Nova Campanha';
        const campaignIsActive = type === 'campaign';
        crumbsHtml += `
            <a class="breadcrumb-item ${campaignIsActive ? 'active' : ''}" onclick="campanhasManager.selectNavItem('campaign', '${this.campaignData.id}')">
                <i data-lucide="folder"></i>
                <span>${campaignName}</span>
            </a>
        `;

        if (type === 'ad_group' || type === 'creative') {
            const adGroup = this.campaignData.ad_groups.find(g => g.id === (groupId || id));
            if (adGroup) {
                const adGroupName = adGroup.nome || 'Novo Grupo';
                const adGroupIsActive = type === 'ad_group';
                crumbsHtml += `
                    <span class="breadcrumb-separator"><i data-lucide="chevron-right"></i></span>
                    <a class="breadcrumb-item ${adGroupIsActive ? 'active' : ''}" onclick="campanhasManager.selectNavItem('ad_group', '${adGroup.id}')">
                        <i data-lucide="folder"></i>
                        <span>${adGroupName}</span>
                    </a>
                `;
            }
        }

        if (type === 'creative') {
            const adGroup = this.campaignData.ad_groups.find(g => g.id === groupId);
            if (adGroup) {
                const creative = adGroup.creatives.find(c => c.id === id);
                if (creative) {
                    const creativeName = creative.nome || (creative.titulos && creative.titulos[0]) || 'Novo Criativo';
                    crumbsHtml += `
                        <span class="breadcrumb-separator"><i data-lucide="chevron-right"></i></span>
                        <a class="breadcrumb-item active" onclick="campanhasManager.selectNavItem('creative', '${creative.id}', '${adGroup.id}')">
                            <i data-lucide="image"></i>
                            <span>${creativeName}</span>
                        </a>
                    `;
                }
            }
        }

        container.innerHTML = crumbsHtml;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    selectNavItem(type, id, groupId = null) {
        // First, persist any changes from the currently displayed form into the model
        this.updateDataFromForm();
        this.selectedItem = { type, id };
        if (groupId) {
            this.selectedItem.groupId = groupId;
        }
        this.renderEditor();
    }

    renderHierarchyNav() {
        const navPanel = document.getElementById('campaign-hierarchy-nav');
        if (!navPanel || !this.campaignData) return;

        let navHtml = '';

        // Campaign level
        const campaignIsActive = this.selectedItem?.type === 'campaign';
        navHtml += `
            <div 
                class="nav-item nav-item-campaign ${campaignIsActive ? 'active' : ''}" 
                data-type="campaign" 
                data-id="${this.campaignData.id}"
            >
                <i data-lucide="folder"></i>
                <span>${this.campaignData.nome || 'Nova Campanha'}</span>
            </div>
        `;

        // Ad Groups level
        if (this.campaignData.ad_groups) {
            this.campaignData.ad_groups.forEach(group => {
                const groupIsActive = this.selectedItem?.type === 'ad_group' && this.selectedItem.id === group.id;
                navHtml += `
                    <div 
                        class="nav-item nav-item-adgroup ${groupIsActive ? 'active' : ''}" 
                        data-type="ad_group" 
                        data-id="${group.id}"
                    >
                        <i data-lucide="folder"></i>
                        <span>${group.nome || 'Novo Grupo'}</span>
                    </div>
                `;

                // Creatives level
                if (group.creatives) {
                    group.creatives.forEach(creative => {
                        const creativeIsActive = this.selectedItem?.type === 'creative' && this.selectedItem.id === creative.id;
                        navHtml += `
                            <div 
                                class="nav-item nav-item-creative ${creativeIsActive ? 'active' : ''}" 
                                data-type="creative" 
                                data-id="${creative.id}"
                                data-group-id="${group.id}"
                            >
                                <i data-lucide="image"></i>
                                <span>${creative.nome || (creative.titulos && creative.titulos[0]) || 'Novo Criativo'}</span>
                            </div>
                        `;
                    });
                }
            });
        }

        navPanel.innerHTML = navHtml;

        // Add event listeners
        navPanel.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectNavItem(
                    item.dataset.type,
                    item.dataset.id,
                    item.dataset.groupId
                );
            });
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderEditorPanel() {
        const editorPanel = document.getElementById('campaign-content-editor');
        if (!editorPanel || !this.selectedItem) {
            editorPanel.innerHTML = '<p>Selecione um item na navegação para editar.</p>';
            return;
        }

        switch (this.selectedItem.type) {
            case 'campaign':
                this.renderCampaignForm();
                break;
            case 'ad_group':
                this.renderAdGroupForm();
                break;
            case 'creative':
                this.renderCreativeForm();
                break;
            default:
                editorPanel.innerHTML = '<p>Tipo de item desconhecido.</p>';
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderCampaignForm() {
        const editorPanel = document.getElementById('campaign-content-editor');
        const campaign = this.campaignData;
        const isNewCampaign = String(campaign.id).startsWith('new_');

        // Reusing the form structure from the old Step 1
        const formHtml = `
            <div class="form-section-header">
                <h3>Detalhes da Campanha</h3>
                <button type="button" class="btn btn-sm btn-secondary" onclick="campanhasManager.addAdGroup()">
                    <i data-lucide="plus"></i> Adicionar Grupo
                </button>
            </div>
            <form id="editor-campaign-form" class="campaign-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="campaign-name">Nome da Campanha *</label>
                        <input type="text" id="campaign-name" name="nome" value="${campaign.nome || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="campaign-brand">Marca *</label>
                        <select id="campaign-brand" name="marca_id" required></select>
                    </div>
                    <div class="form-group">
                        <label for="campaign-platform">Plataforma *</label>
                        <select id="campaign-platform" name="plataforma_id" required></select>
                    </div>
                    <div class="form-group">
                        <label for="campaign-ad-account">Conta de Anúncio *</label>
                        <select id="campaign-ad-account" name="conta_de_anuncio_id" required disabled></select>
                    </div>
                    <div class="form-group">
                        <label for="campaign-status">Status</label>
                        <select id="campaign-status" name="status">
                            <option value="active" ${campaign.status === 'active' ? 'selected' : ''}>Ativa</option>
                            <option value="paused" ${campaign.status === 'paused' ? 'selected' : ''}>Pausada</option>
                            <option value="inactive" ${campaign.status === 'inactive' ? 'selected' : ''}>Inativa</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="campaign-modelo">Modelo</label>
                        <select id="campaign-modelo" name="modelo_id"></select>
                    </div>
                    <div class="form-group">
                        <label for="campaign-budget">Orçamento (R$)</label>
                        <input type="number" id="campaign-budget" name="orcamento" step="0.01" min="0" value="${campaign.orcamento?.valor || ''}">
                    </div>
                    <div class="form-group">
                        <label for="campaign-start-date">Data de Início</label>
                        <input type="date" id="campaign-start-date" name="data_inicio" value="${campaign.data_inicio ? campaign.data_inicio.split('T')[0] : ''}">
                    </div>
                    <div class="form-group">
                        <label for="campaign-end-date">Data de Fim</label>
                        <input type="date" id="campaign-end-date" name="data_fim" value="${campaign.data_fim ? campaign.data_fim.split('T')[0] : ''}">
                    </div>
                </div>
                <div class="form-group full-width">
                    <label for="campaign-objective">Objetivo da Campanha</label>
                    <select id="campaign-objective" name="objetivo">
                        <option value="">Selecione um objetivo</option>
                        <option value="Leads" ${campaign.objetivo === 'Leads' ? 'selected' : ''}>Leads</option>
                        <option value="Tráfego" ${campaign.objetivo === 'Tráfego' ? 'selected' : ''}>Tráfego</option>
                        <option value="Vendas" ${campaign.objetivo === 'Vendas' ? 'selected' : ''}>Vendas</option>
                        <option value="Reconhecimento" ${campaign.objetivo === 'Reconhecimento' ? 'selected' : ''}>Reconhecimento</option>
                    </select>
                </div>
                <div class="form-actions" style="justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-primary" onclick="campanhasManager.handleCampaignSaveAndNext()">
                        Salvar e Adicionar Grupo
                        <i data-lucide="arrow-right"></i>
                    </button>
                </div>
            </form>
        `;

        editorPanel.innerHTML = formHtml;

        // Populate selects and set up listeners (similar to old logic)
        this.populateFormSelects(); // This already populates brand and platform
        this.addRealtimeUpdateListeners();

        // Restore values for selects
        const platformId = campaign.conta_de_anuncio_id?.plataforma_id?.id;
        if (campaign.marca_id) {
            const marcaId = campaign.marca_id.id || campaign.marca_id;
            document.getElementById('campaign-brand').value = marcaId;
            // Atualizar modelos após definir a marca
            this.updateModeloFormSelect();
        }
        if (platformId) {
            document.getElementById('campaign-platform').value = platformId;
        }
        if (campaign.modelo_id) {
            const modeloId = campaign.modelo_id?.id || campaign.modelo_id;
            const modeloSelect = document.getElementById('campaign-modelo');
            if (modeloSelect) {
                modeloSelect.value = modeloId;
            }
        }

        // Trigger account loading
        this._updateAccountSelect().then(() => {
            if (campaign.conta_de_anuncio_id) {
                document.getElementById('campaign-ad-account').value = campaign.conta_de_anuncio_id.id || campaign.conta_de_anuncio_id;
            }
        });
    }

    renderAdGroupForm() {
        const editorPanel = document.getElementById('campaign-content-editor');
        const adGroup = this.campaignData.ad_groups.find(g => g.id === this.selectedItem.id);
        if (!adGroup) {
            editorPanel.innerHTML = '<p class="error-message">Grupo de anúncio não encontrado.</p>';
            return;
        }

        if (!adGroup.creatives) {
            adGroup.creatives = [];
        }

        // Obter marca da campanha para filtrar modelos
        const campaignMarcaId = this.campaignData.marca_id?.id || this.campaignData.marca_id;
        const selectedModeloId = adGroup.modelo_id?.id || adGroup.modelo_id || '';

        const formHtml = `
            <div class="form-section-header">
                <h3>Detalhes do Grupo de Anúncios</h3>
                <div>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="campanhasManager.addCreative('${adGroup.id}')">
                        <i data-lucide="plus"></i> Adicionar Criativo
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="campanhasManager.removeItem()">
                        <i data-lucide="trash-2"></i> Excluir Grupo
                    </button>
                </div>
            </div>
            <form id="editor-adgroup-form" class="campaign-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Nome do Grupo *</label>
                        <input type="text" name="ad_group_name" value="${adGroup.nome || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select name="ad_group_status">
                            <option value="Ativo" ${adGroup.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                            <option value="Pausado" ${adGroup.status === 'Pausado' ? 'selected' : ''}>Pausado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Marca</label>
                        <select id="adgroup-marca" name="adgroup_marca_id">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Modelo</label>
                        <select id="adgroup-modelo" name="adgroup_modelo_id">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                </div>
                 <div class="form-actions" style="justify-content: space-between; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="campanhasManager.goBack()">
                        <i data-lucide="arrow-left"></i>
                        Voltar
                    </button>
                    <button type="button" class="btn btn-primary" onclick="campanhasManager.handleAdGroupsSaveAndNext()">
                        Salvar e Adicionar Criativo
                        <i data-lucide="arrow-right"></i>
                    </button>
                </div>
            </form>
        `;
        editorPanel.innerHTML = formHtml;

        // Popular selects de marca e modelo
        this.populateAdGroupFormSelects(campaignMarcaId, selectedModeloId);
        this.addRealtimeUpdateListeners();
    }

    populateAdGroupFormSelects(campaignMarcaId = null, selectedModeloId = '') {
        const marcaSelect = document.getElementById('adgroup-marca');
        const modeloSelect = document.getElementById('adgroup-modelo');

        // Popular marca
        if (marcaSelect) {
            marcaSelect.innerHTML = '<option value="">Selecione...</option>';
            this.brands.forEach(brand => {
                const selected = campaignMarcaId && String(brand.id) === String(campaignMarcaId) ? 'selected' : '';
                marcaSelect.innerHTML += `<option value="${brand.id}" ${selected}>${brand.nome}</option>`;
            });
        }

        // Popular modelo baseado na marca da campanha ou marca selecionada
        this.updateAdGroupModeloSelect(campaignMarcaId, selectedModeloId);

        // Adicionar listener para atualizar modelos quando marca mudar
        if (marcaSelect) {
            marcaSelect.addEventListener('change', () => {
                const selectedMarcaId = marcaSelect.value;
                this.updateAdGroupModeloSelect(selectedMarcaId);
            });
        }
    }

    updateAdGroupModeloSelect(marcaId = null, currentValue = '') {
        const modeloSelect = document.getElementById('adgroup-modelo');
        if (!modeloSelect) return;

        modeloSelect.innerHTML = '<option value="">Selecione...</option>';

        // Filtrar modelos pela marca selecionada
        const filteredModelos = marcaId
            ? this.modelos.filter(modelo => String(modelo.marca_id) === String(marcaId))
            : this.modelos;

        filteredModelos.forEach(modelo => {
            const selected = currentValue && String(modelo.id) === String(currentValue) ? 'selected' : '';
            modeloSelect.innerHTML += `<option value="${modelo.id}" ${selected}>${modelo.nome}</option>`;
        });

        // Se não houver marca selecionada ou o modelo atual não pertence à marca, limpar seleção
        if (marcaId && currentValue) {
            const currentModelo = this.modelos.find(m => String(m.id) === String(currentValue));
            if (!currentModelo || String(currentModelo.marca_id) !== String(marcaId)) {
                modeloSelect.value = '';
            }
        }
    }

    renderCreativeForm() {
        const editorPanel = document.getElementById('campaign-content-editor');
        const adGroup = this.campaignData.ad_groups.find(g => g.id === this.selectedItem.groupId);
        if (!adGroup) {
            editorPanel.innerHTML = '<p class="error-message">Grupo de anúncio do criativo não encontrado.</p>';
            return;
        }
        const creative = adGroup.creatives.find(c => c.id === this.selectedItem.id);
        if (!creative) {
            editorPanel.innerHTML = '<p class="error-message">Criativo não encontrado.</p>';
            return;
        }

        const creativeTitle = (creative.titulos && creative.titulos[0]) || '';
        const creativeUrl = (creative.urls_criativo && creative.urls_criativo[0]) || '';
        const creativeType = creative.tipo || '';

        // Obter marca da campanha para filtrar modelos
        const campaignMarcaId = this.campaignData.marca_id?.id || this.campaignData.marca_id;
        const selectedModeloId = creative.modelo_id?.id || creative.modelo_id || '';

        const formHtml = `
            <div class="form-section-header">
                <h3>Detalhes do Criativo</h3>
                <button type="button" class="btn btn-sm btn-danger" onclick="campanhasManager.removeItem()">
                    <i data-lucide="trash-2"></i> Excluir Criativo
                </button>
            </div>
            <form id="editor-creative-form" class="campaign-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label>Tipo *</label>
                        <select name="creative_type" required>
                            <option value="">Selecione...</option>
                            <option value="Imagem" ${creativeType === 'Imagem' ? 'selected' : ''}>Imagem</option>
                            <option value="Vídeo" ${creativeType === 'Vídeo' ? 'selected' : ''}>Vídeo</option>
                            <option value="Carrossel" ${creativeType === 'Carrossel' ? 'selected' : ''}>Carrossel</option>
                            <option value="Texto" ${creativeType === 'Texto' ? 'selected' : ''}>Texto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Marca</label>
                        <select id="creative-marca" name="creative_marca_id">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Modelo</label>
                        <select id="creative-modelo" name="creative_modelo_id">
                            <option value="">Selecione...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Título</label>
                        <input type="text" name="creative_title" value="${creativeTitle}">
                    </div>
                    <div class="form-group full-width">
                        <label>URL do Criativo</label>
                        <input type="url" name="creative_url" value="${creativeUrl}">
                    </div>
                </div>
                <div class="form-actions" style="justify-content: space-between; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="campanhasManager.goBack()">
                        <i data-lucide="arrow-left"></i>
                        Voltar
                    </button>
                    <button type="button" class="btn btn-success" onclick="campanhasManager.handleCreativesSaveAndFinish()">
                        Salvar e Finalizar
                        <i data-lucide="check-circle"></i>
                    </button>
                </div>
            </form>
        `;
        editorPanel.innerHTML = formHtml;

        // Popular selects de marca e modelo
        this.populateCreativeFormSelects(campaignMarcaId, selectedModeloId);
        this.addRealtimeUpdateListeners();
    }

    populateCreativeFormSelects(campaignMarcaId = null, selectedModeloId = '') {
        const marcaSelect = document.getElementById('creative-marca');
        const modeloSelect = document.getElementById('creative-modelo');

        // Popular marca
        if (marcaSelect) {
            marcaSelect.innerHTML = '<option value="">Selecione...</option>';
            this.brands.forEach(brand => {
                const selected = campaignMarcaId && String(brand.id) === String(campaignMarcaId) ? 'selected' : '';
                marcaSelect.innerHTML += `<option value="${brand.id}" ${selected}>${brand.nome}</option>`;
            });
        }

        // Popular modelo baseado na marca da campanha ou marca selecionada
        this.updateCreativeModeloSelect(campaignMarcaId, selectedModeloId);

        // Adicionar listener para atualizar modelos quando marca mudar
        if (marcaSelect) {
            marcaSelect.addEventListener('change', () => {
                const selectedMarcaId = marcaSelect.value;
                this.updateCreativeModeloSelect(selectedMarcaId);
            });
        }
    }

    updateCreativeModeloSelect(marcaId = null, currentValue = '') {
        const modeloSelect = document.getElementById('creative-modelo');
        if (!modeloSelect) return;

        modeloSelect.innerHTML = '<option value="">Selecione...</option>';

        // Filtrar modelos pela marca selecionada
        const filteredModelos = marcaId
            ? this.modelos.filter(modelo => String(modelo.marca_id) === String(marcaId))
            : this.modelos;

        filteredModelos.forEach(modelo => {
            const selected = currentValue && String(modelo.id) === String(currentValue) ? 'selected' : '';
            modeloSelect.innerHTML += `<option value="${modelo.id}" ${selected}>${modelo.nome}</option>`;
        });

        // Se não houver marca selecionada ou o modelo atual não pertence à marca, limpar seleção
        if (marcaId && currentValue) {
            const currentModelo = this.modelos.find(m => String(m.id) === String(currentValue));
            if (!currentModelo || String(currentModelo.marca_id) !== String(marcaId)) {
                modeloSelect.value = '';
            }
        }
    }

    resetFormState() {
        this.currentStep = 1;
        this.newCampaignId = null;
        this.newAdGroups = [];
        this.editingCampaign = null;
        this.campaignData = null;
        this.selectedItem = null;
        this.originalCampaignData = null;

        // Reset form
        const form = document.getElementById('campaign-form-step1');
        if (form) {
            form.reset();
            // Reset account dropdown to its initial state
            const accountSelect = document.getElementById('campaign-ad-account');
            if (accountSelect) {
                accountSelect.innerHTML = '<option value="">Selecione marca e plataforma</option>';
                accountSelect.disabled = true;
            }

            // Important: We should NOT re-clone the form as it removes our specific event listeners.
            // The logic to add/remove submit listeners is now handled in showFormView.
        }

        // Update title
        const title = document.getElementById('campaign-form-title');
        if (title) {
            title.textContent = 'Nova Campanha';
        }

        // Reset step 2 and 3 visibility if needed
        const step2 = document.getElementById('campaign-step-2');
        const step3 = document.getElementById('campaign-step-3');
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'none';

        // Clear ad groups and creatives containers
        const adGroupsContainer = document.getElementById('ad-groups-container');
        if (adGroupsContainer) {
            adGroupsContainer.innerHTML = '';
        }
        const creativesContainer = document.getElementById('creatives-container');
        if (creativesContainer) {
            creativesContainer.innerHTML = '';
        }

        // Clear new editor panels
        const navPanel = document.getElementById('campaign-hierarchy-nav');
        const editorPanel = document.getElementById('campaign-content-editor');
        if (navPanel) navPanel.innerHTML = '';
        if (editorPanel) editorPanel.innerHTML = '';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    goToStep(stepNumber) {
        // This function is now obsolete and will be removed later.
        // console.warn('goToStep is deprecated');
        // return;

        this.currentStep = stepNumber;

        // Hide all steps
        for (let i = 1; i <= 3; i++) {
            const step = document.getElementById(`campaign-step-${i}`);
            if (step) {
                step.style.display = i === stepNumber ? 'block' : 'none';
            }
        }

        // Update step indicators
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < stepNumber) {
                step.classList.add('completed');
            } else if (index + 1 === stepNumber) {
                step.classList.add('active');
            }
        });
    }

    async loadCampaigns() {
        try {
            if (!window.campanhasService || !window.gruposDeAnunciosService || !window.criativosService) {
                throw new Error('Serviços não estão disponíveis');
            }

            // Usar apenas os serviços existentes
            return this.loadCampaignsLegacy();
        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.showError('Erro ao carregar campanhas');
        }
    }

    async loadCampaignsLegacy() {
        try {
            if (!window.campanhasService || !window.gruposDeAnunciosService || !window.criativosService || !window.configService) {
                throw new Error('Serviços não estão disponíveis');
            }

            // Buscar todas as campanhas usando o serviço
            const todasCampanhas = await window.campanhasService.buscarTodasCampanhas();

            // Buscar contas completas para mapear plataformas
            const accounts = await window.configService.buscarTodasContasDeAnuncio();

            // Adicionar contagens de grupos e criativos usando os serviços
            const campaignsWithCounts = await Promise.all(
                todasCampanhas.map(async (campaign) => {
                    // Encontrar a conta completa para ter acesso à plataforma_id
                    const contaCompleta = accounts.find(acc => acc.id === campaign.conta_de_anuncio_id);

                    // Usar serviços para buscar grupos e criativos
                    const grupos = await window.gruposDeAnunciosService.buscarGruposPorCampanha(campaign.id);
                    const adGroupsCount = grupos.length;

                    const ids = grupos.map(g => g.id);
                    let creativesCount = 0;
                    if (ids.length > 0) {
                        // Buscar criativos para cada grupo
                        const creativesPromises = ids.map(groupId =>
                            window.criativosService.buscarCriativosPorGrupo(groupId)
                        );
                        const creativesArrays = await Promise.all(creativesPromises);
                        creativesCount = creativesArrays.flat().length;
                    }

                    return {
                        ...campaign,
                        // Preservar o ID da marca e adicionar nome se disponível
                        marca_id: campaign.marca_id ? {
                            id: campaign.marca_id,
                            nome: campaign.marca?.nome || ''
                        } : null,
                        // Mapear conta com plataforma completa
                        conta_de_anuncio_id: contaCompleta ? {
                            id: contaCompleta.id,
                            nome: contaCompleta.nome,
                            plataforma_id: contaCompleta.plataforma_id ? {
                                id: contaCompleta.plataforma_id,
                                nome: contaCompleta.plataforma?.nome || ''
                            } : null
                        } : null,
                        // Preservar o ID do modelo e adicionar nome se disponível
                        modelo_id: campaign.modelo_id ? {
                            id: campaign.modelo_id,
                            nome: campaign.modelo?.nome || ''
                        } : null,
                        ad_groups_count: adGroupsCount || 0,
                        creatives_count: creativesCount || 0,
                    };
                })
            );

            this.allCampaigns = campaignsWithCounts;
            // Set default filter to "Todos" (empty value) and apply it, which will also render the list
            const statusFilter = document.getElementById('campaign-filter-status');
            if (statusFilter) {
                statusFilter.value = ''; // Todos
            }
            this.applyFilters();
        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.showError('Erro ao carregar campanhas');
        }
    }

    renderCampaignsList() {
        const container = document.getElementById('campaignsList');
        if (!container) return;

        if (this.displayedCampaigns.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>Nenhuma campanha encontrada</h3>
                    <p>Crie sua primeira campanha clicando no botão "Nova Campanha"</p>
                </div>
            `;
            return;
        }

        if (this.layout === 'grid') {
            container.innerHTML = this.displayedCampaigns.map(campaign => this.createCampaignCard(campaign)).join('');
        } else {
            container.innerHTML = this.createCampaignTable();
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    createCampaignCard(campaign) {
        const statusDisplay = getStatusDisplay(campaign.status);
        const statusClass = campaign.status ? campaign.status.toLowerCase().replace(' ', '-') : 'active';
        const brandName = campaign.marca_id?.nome || 'Sem marca';
        const platformName = campaign.conta_de_anuncio_id?.plataforma_id?.nome || 'Sem plataforma';

        return `
            <div class="campaign-card" data-campaign-id="${campaign.id}">
                <div class="campaign-card-header">
                    <h3 class="campaign-title">${campaign.nome || 'Campanha sem nome'}</h3>
                    <div class="campaign-actions">
                        <button class="actions-menu-btn" data-campaign-id="${campaign.id}">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        <div class="actions-dropdown" id="actions-${campaign.id}">
                            <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.viewDetails('${campaign.id}')">
                                <i data-lucide="eye"></i> Visualizar
                            </button>
                            <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.showFormView('${campaign.id}')">
                                <i data-lucide="edit"></i> Editar
                            </button>
                            <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.duplicateCampaign('${campaign.id}')">
                                <i data-lucide="copy"></i> Duplicar
                            </button>
                            <button class="dropdown-item danger" onclick="if(window.campanhasManager) window.campanhasManager.confirmDelete('${campaign.id}')">
                                <i data-lucide="trash-2"></i> Excluir
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="campaign-meta">
                    <span class="meta-item">
                        <i data-lucide="tag"></i>
                        ${brandName}
                    </span>
                    <span class="meta-item">
                        <i data-lucide="monitor"></i>
                        ${platformName}
                    </span>
                </div>
                
                <div class="campaign-status status-${statusClass}">
                    <i data-lucide="circle"></i>
                    ${getStatusDisplay(campaign.status)}
                </div>
                
                <div class="campaign-stats">
                    <div class="stat-item">
                        <div class="stat-value">${campaign.ad_groups_count}</div>
                        <div class="stat-label">Grupos</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${campaign.creatives_count}</div>
                        <div class="stat-label">Criativos</div>
                    </div>
                </div>
            </div>
        `;
    }

    createCampaignTable() {
        // This function now builds the new list layout, not a table.
        return this.displayedCampaigns.map(campaign => this.createCampaignListItem(campaign)).join('');
    }

    createCampaignListItem(campaign) {
        const statusDisplay = getStatusDisplay(campaign.status);
        const statusClass = campaign.status ? campaign.status.toLowerCase().replace(/\s+/g, '-') : 'active';
        const brandName = campaign.marca_id?.nome || 'Sem marca';
        const platformName = campaign.conta_de_anuncio_id?.plataforma_id?.nome || 'Sem plataforma';
        const budgetValue = campaign.orcamento?.valor ? `R$ ${parseFloat(campaign.orcamento.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
        const budgetType = (campaign.orcamento?.tipo || '').toUpperCase();

        const startDate = campaign.data_inicio ? new Date(campaign.data_inicio).toLocaleDateString('pt-BR') : '';
        const endDate = campaign.data_fim ? new Date(campaign.data_fim).toLocaleDateString('pt-BR') : 'Contínua';
        const period = startDate ? `${startDate} até ${endDate}` : 'Período não definido';

        const platformIcon = platformName.toLowerCase().includes('google') ?
            '<i data-lucide="chrome"></i>' :
            '<i data-lucide="facebook"></i>';

        return `
            <div class="campaign-list-item" data-campaign-id="${campaign.id}">
                <div class="campaign-list-status">
                    <span class="status-dot status-${statusClass}"></span>
                </div>
                <div class="campaign-list-icon">
                    ${platformIcon}
                </div>
                <div class="campaign-list-details">
                    <div class="campaign-name">${campaign.nome || 'Campanha sem nome'}</div>
                    <div class="campaign-meta">${brandName} • ${platformName}</div>
                </div>
                <div class="campaign-groups" data-campaign-id="${campaign.id}">
                    <span>${campaign.ad_groups_count || 0} ${campaign.ad_groups_count === 1 ? 'grupo' : 'grupos'}</span>
                    <div class="groups-popup"></div>
                </div>
                <div class="campaign-budget">
                    <div class="budget-value">${budgetValue}</div>
                    <div class="budget-period">${budgetType}</div>
                </div>
                <div class="campaign-period">
                    <span>${period}</span>
                </div>
                <div class="campaign-list-actions">
                    <button class="actions-menu-btn" data-campaign-id="${campaign.id}">
                        <i data-lucide="more-horizontal"></i>
                    </button>
                    <div class="actions-dropdown" id="actions-${campaign.id}">
                        <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.viewDetails('${campaign.id}')"><i data-lucide="eye"></i> Visualizar</button>
                        <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.showFormView('${campaign.id}')"><i data-lucide="edit"></i> Editar</button>
                        <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.duplicateCampaign('${campaign.id}')"><i data-lucide="copy"></i> Duplicar</button>
                        <button class="dropdown-item danger" onclick="if(window.campanhasManager) window.campanhasManager.confirmDelete('${campaign.id}')"><i data-lucide="trash-2"></i> Excluir</button>
                    </div>
                </div>
            </div>
        `;
    }

    createCampaignRow(campaign) {
        // This function is for the old table view, which we are replacing.
        // For now, let's keep it but it won't be called if layout is 'list'.
        const statusDisplay = getStatusDisplay(campaign.status);
        const statusClass = campaign.status ? campaign.status.toLowerCase().replace(' ', '-') : 'active';
        const brandName = campaign.marca_id?.nome || 'Sem marca';
        const platformName = campaign.conta_de_anuncio_id?.plataforma_id?.nome || 'Sem plataforma';

        return `
            <tr data-campaign-id="${campaign.id}">
                <td>${campaign.nome || 'Campanha sem nome'}</td>
                <td>${brandName}</td>
                <td>${platformName}</td>
                <td>
                    <div class="campaign-status status-${statusClass}">
                        <i data-lucide="circle"></i>
                        ${statusDisplay}
                    </div>
                </td>
                <td>${campaign.ad_groups_count}</td>
                <td>${campaign.creatives_count}</td>
                <td>
                    <div class="campaign-actions">
                        <button class="actions-menu-btn" data-campaign-id="${campaign.id}">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        <div class="actions-dropdown" id="actions-${campaign.id}">
                            <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.viewDetails('${campaign.id}')">
                                <i data-lucide="eye"></i> Visualizar
                            </button>
                            <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.showFormView('${campaign.id}')">
                                <i data-lucide="edit"></i> Editar
                            </button>
                            <button class="dropdown-item" onclick="if(window.campanhasManager) window.campanhasManager.duplicateCampaign('${campaign.id}')">
                                <i data-lucide="copy"></i> Duplicar
                            </button>
                            <button class="dropdown-item danger" onclick="if(window.campanhasManager) window.campanhasManager.confirmDelete('${campaign.id}')">
                                <i data-lucide="trash-2"></i> Excluir
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    toggleActionsMenu(button) {
        const campaignId = button.getAttribute('data-campaign-id');
        const dropdown = document.getElementById(`actions-${campaignId}`);

        // Close all other dropdowns
        document.querySelectorAll('.actions-dropdown').forEach(d => {
            if (d !== dropdown) {
                d.classList.remove('active');
            }
        });

        // Toggle current dropdown
        if (dropdown) {
            dropdown.classList.toggle('active');
        }

        // Update icons after rendering
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 0);
    }

    closeAllActionMenus() {
        document.querySelectorAll('.actions-dropdown').forEach(d => {
            d.classList.remove('active');
        });
    }

    async handleStep1Submit(e) {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const budgetValue = formData.get('orcamento') ? parseFloat(formData.get('orcamento')) : null;

            const campaignData = {
                nome: formData.get('nome'),
                marca_id: formData.get('marca_id') || null,
                conta_de_anuncio_id: formData.get('conta_de_anuncio_id') || null,
                modelo_id: formData.get('modelo_id') || null,
                status: formData.get('status') || 'active',
                orcamento: budgetValue !== null ? { "valor": budgetValue, "tipo": "total" } : null,
                data_inicio: formData.get('data_inicio') || null,
                data_fim: formData.get('data_fim') || null,
                objetivo: formData.get('objetivo') || null,
                conversao_desejada: {},
                criado_em: new Date().toISOString()
            };

            if (!campaignData.conta_de_anuncio_id) {
                this.showError('Por favor, selecione uma conta de anúncio.');
                return;
            }

            if (!window.campanhasService) {
                throw new Error('Serviço de campanhas não está disponível');
            }

            const data = await window.campanhasService.criarCampanha(campaignData);
            if (!data) throw new Error('Erro ao criar campanha');

            this.newCampaignId = data.id;
            this.goToStep(2);
            this.showSuccess('Campanha criada! Configure os grupos de anúncio.');
        } catch (error) {
            console.error('Error creating campaign:', error);
            this.showError('Erro ao criar campanha');
        }
    }

    async handleUpdateSubmit(e) {
        e.preventDefault();
        if (!this.editingCampaign) return;

        try {
            const formData = new FormData(e.target);
            const budgetValue = formData.get('orcamento') ? parseFloat(formData.get('orcamento')) : null;

            const campaignData = {
                nome: formData.get('nome'),
                marca_id: formData.get('marca_id') || null,
                conta_de_anuncio_id: formData.get('conta_de_anuncio_id') || null,
                status: formData.get('status') || 'active',
                orcamento: budgetValue !== null ? { "valor": budgetValue, "tipo": "total" } : null,
                data_inicio: formData.get('data_inicio') || null,
                data_fim: formData.get('data_fim') || null,
                objetivo: formData.get('objetivo') || null,
                conversao_desejada: this.editingCampaign.conversao_desejada || {}, // Manter valor existente ou usar padrão
                atualizado_em: new Date().toISOString()
            };

            if (!campaignData.conta_de_anuncio_id) {
                this.showError('Por favor, selecione uma conta de anúncio.');
                return;
            }

            if (!window.campanhasService) {
                throw new Error('Serviço de campanhas não está disponível');
            }

            const updated = await window.campanhasService.atualizarCampanha(this.editingCampaign.id, campaignData);
            if (!updated) throw new Error('Erro ao atualizar campanha');

            this.showSuccess('Campanha atualizada! Prossiga para os grupos de anúncio.');

            // Manter o contexto da campanha que está sendo editada
            this.newCampaignId = this.editingCampaign.id;

            // Carregar os grupos de anúncio existentes para que o passo 3 funcione corretamente
            if (!window.gruposDeAnunciosService) {
                throw new Error('Serviço de grupos não está disponível');
            }
            const existingAdGroups = await window.gruposDeAnunciosService.buscarGruposPorCampanha(this.newCampaignId);

            if (adGroupsError) throw adGroupsError;
            this.newAdGroups = existingAdGroups || [];

            this.populateAdGroupsForEdit();

            this.goToStep(2);

        } catch (error) {
            console.error('Error updating campaign:', error);
            this.showError('Erro ao atualizar campanha');
        }
    }

    populateAdGroupsForEdit() {
        const container = document.getElementById('ad-groups-container');
        if (!container) return;
        container.innerHTML = ''; // Limpar container

        this.newAdGroups.forEach((adGroup, index) => {
            const adGroupHtml = `
                <div class="ad-group-item" data-index="${index}" data-group-id="${adGroup.id}">
                    <div class="ad-group-header">
                        <h4 class="ad-group-title">Editar Grupo: ${adGroup.nome}</h4>
                        <button type="button" class="remove-item-btn" onclick="campanhasManager.removeAdGroup(${index})">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Nome do Grupo *</label>
                            <input type="text" name="ad_group_name_${index}" value="${adGroup.nome || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select name="ad_group_status_${index}">
                                <option value="Ativo" ${adGroup.status === 'Ativo' ? 'selected' : ''}>Ativo</option>
                                <option value="Pausado" ${adGroup.status === 'Pausado' ? 'selected' : ''}>Pausado</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
            container.insertAdjacentHTML('beforeend', adGroupHtml);
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async populateFormForEdit() {
        if (!this.editingCampaign) return;

        document.getElementById('campaign-name').value = this.editingCampaign.nome || '';
        document.getElementById('campaign-brand').value = this.editingCampaign.marca_id?.id || '';
        document.getElementById('campaign-status').value = this.editingCampaign.status || 'active';
        document.getElementById('campaign-budget').value = this.editingCampaign.orcamento?.valor || '';
        document.getElementById('campaign-start-date').value = this.editingCampaign.data_inicio ? this.editingCampaign.data_inicio.split('T')[0] : '';
        document.getElementById('campaign-end-date').value = this.editingCampaign.data_fim ? this.editingCampaign.data_fim.split('T')[0] : '';
        document.getElementById('campaign-objective').value = this.editingCampaign.objetivo || '';
        document.getElementById('campaign-modelo').value = this.editingCampaign.modelo_id?.id || this.editingCampaign.modelo_id || '';

        const platformSelect = document.getElementById('campaign-platform');
        const accountSelect = document.getElementById('campaign-ad-account');

        const brandId = this.editingCampaign.marca_id?.id;
        const platformId = this.editingCampaign.conta_de_anuncio_id?.plataforma_id?.id;

        // Preencher os selects de marca e plataforma
        if (brandId) {
            document.getElementById('campaign-brand').value = brandId;
            // Atualizar modelos após definir a marca
            this.updateModeloFormSelect();
        }
        if (platformId) {
            platformSelect.value = platformId;
        }

        // Se ambos estiverem definidos, carregar as contas de anúncio
        if (brandId && platformId) {
            await this._updateAccountSelect();

            // Agora que a lista está populada, podemos selecionar a conta correta
            const accountId = this.editingCampaign.conta_de_anuncio_id?.id;
            if (accountId) {
                accountSelect.value = accountId;
            }
        }
    }

    addAdGroup() {
        if (!this.campaignData) return;

        if (!this.campaignData.ad_groups) {
            this.campaignData.ad_groups = [];
        }

        const newGroup = {
            id: `new_g_${Date.now()}`,
            nome: 'Novo Grupo de Anúncios',
            status: 'Ativo',
            creatives: []
        };

        this.campaignData.ad_groups.push(newGroup);
        this.selectNavItem('ad_group', newGroup.id);
    }

    addCreative(adGroupId) {
        if (!this.campaignData || !adGroupId) return;
        const adGroup = this.campaignData.ad_groups.find(g => g.id === adGroupId);
        if (!adGroup) return;

        if (!adGroup.creatives) {
            adGroup.creatives = [];
        }

        const newCreative = {
            id: `new_c_${Date.now()}`,
            nome: 'Novo Criativo',
            tipo: 'Imagem',
            status: 'Ativo',
            titulos: [''],
            urls_criativo: ['']
        };

        adGroup.creatives.push(newCreative);
        this.selectNavItem('creative', newCreative.id, adGroup.id);
    }

    deleteAdGroup(id) {
        if (!this.campaignData || !id) return;
        if (!String(id).startsWith('new_')) {
            if (!this.adGroupsToDelete) this.adGroupsToDelete = [];
            this.adGroupsToDelete.push(id);
        }
        this.campaignData.ad_groups = this.campaignData.ad_groups.filter(g => g.id !== id);
        this.selectedItem = { type: 'campaign', id: this.campaignData.id };
        this.renderAll();
        this.showSuccess('Grupo de anúncios removido. Salve para aplicar.');
    }

    deleteCreative(id, groupId) {
        if (!this.campaignData || !id || !groupId) return;
        if (!String(id).startsWith('new_')) {
            if (!this.creativesToDelete) this.creativesToDelete = [];
            this.creativesToDelete.push(id);
        }
        const adGroup = this.campaignData.ad_groups.find(g => g.id === groupId);
        if (adGroup && adGroup.creatives) {
            adGroup.creatives = adGroup.creatives.filter(c => c.id !== id);
        }
        this.selectedItem = { type: 'ad_group', id: groupId };
        this.renderAll();
        this.showSuccess('Criativo removido. Salve para aplicar.');
    }

    async saveAndAddAdGroup() {
        // Força o salvamento para garantir que o fluxo continue
        await this.saveCampaign(true);

        // If saving was successful and we are still in the form view...
        if (document.getElementById('campaigns-form-view').style.display === 'block' && this.campaignData) {
            // Second, perform the "add" logic directly
            this.addAdGroup(); // Reutiliza a nova função
        }
    }

    async saveAndAddCreative() {
        // First, ensure the current ad group data is saved and IDs are updated.
        await this.saveCampaign(true);

        // After saving, the state is refreshed. We can now safely add the new creative.
        if (this.campaignData && this.selectedItem?.type === 'ad_group') {
            const currentAdGroupId = this.selectedItem.id;
            this.addCreative(currentAdGroupId);
        } else {
            console.error("Cannot add creative: No ad group is selected.", this.selectedItem);
            this.showError("Não foi possível adicionar um criativo pois nenhum grupo está selecionado.");
        }
    }

    async saveAndAddAnotherCreative() {
        // Força o salvamento para garantir que o fluxo continue
        await this.saveCampaign(true);

        if (document.getElementById('campaigns-form-view').style.display === 'block' && this.campaignData) {
            if (!this.selectedItem || this.selectedItem.type !== 'creative') return;
            this.addCreative(this.selectedItem.groupId);
        }
    }

    removeItem() {
        if (!this.selectedItem) return;
        this.updateDataFromForm(); // Persist changes before removing item
        const { type, id, groupId } = this.selectedItem;

        if (type === 'ad_group') {
            this.campaignData.ad_groups = this.campaignData.ad_groups.filter(g => g.id !== id);
            // Select the campaign after deleting a group
            this.selectedItem = { type: 'campaign', id: this.campaignData.id };
        } else if (type === 'creative') {
            const adGroup = this.campaignData.ad_groups.find(g => g.id === groupId);
            if (adGroup) {
                adGroup.creatives = adGroup.creatives.filter(c => c.id !== id);
                // Select the parent group after deleting a creative
                this.selectedItem = { type: 'ad_group', id: adGroup.id };
            }
        }
        this.renderEditor();
    }

    removeAdGroup(index) {
        showConfirmationModal('Tem certeza que deseja excluir este grupo de anúncio?', () => {
            const container = document.getElementById('ad-groups-container');
            const itemToRemove = container.querySelector(`[data-index="${index}"]`);
            if (itemToRemove) {
                const adGroupId = itemToRemove.dataset.adGroupId;
                if (adGroupId) {
                    this.adGroupsToDelete.push(adGroupId);
                }
                itemToRemove.remove();

                // Re-indexar os grupos de anúncio restantes
                const remainingItems = container.querySelectorAll('.ad-group-item');
                remainingItems.forEach((item, newIndex) => {
                    item.dataset.index = newIndex;
                    item.querySelector('.ad-group-title').textContent = `Grupo de Anúncio ${newIndex + 1}`;
                    const removeButton = item.querySelector('.remove-item-btn');
                    if (removeButton) {
                        removeButton.setAttribute('onclick', `campanhasManager.removeAdGroup(${newIndex})`);
                    }
                });
            }
        });
    }

    removeCreative(element) {
        showConfirmationModal('Tem certeza que deseja excluir este criativo?', () => {
            const creativeItem = element.closest('.creative-item');
            if (creativeItem) {
                creativeItem.remove();
            }
        });
    }

    async saveAdGroupsAndNext() {
        try {
            const container = document.getElementById('ad-groups-container');
            if (!container) return;

            const adGroupItems = container.querySelectorAll('.ad-group-item');
            if (adGroupItems.length === 0) {
                return this.showError('Adicione pelo menos um grupo de anúncio.');
            }

            const groupsToInsert = [];
            adGroupItems.forEach((item, index) => {
                const nameInput = item.querySelector(`[name="ad_group_name_${index}"]`);
                const statusSelect = item.querySelector(`[name="ad_group_status_${index}"]`);
                if (nameInput && nameInput.value) {
                    groupsToInsert.push({
                        nome: nameInput.value,
                        status: statusSelect ? statusSelect.value : 'Ativo',
                        campanha_id: this.newCampaignId
                    });
                }
            });

            if (groupsToInsert.length === 0) {
                return this.showError('Preencha o nome dos grupos de anúncio.');
            }

            if (!window.gruposDeAnunciosService) {
                throw new Error('Serviço de grupos não está disponível');
            }
            // Inserir grupos um por um usando o serviço
            const data = [];
            for (const group of groupsToInsert) {
                const created = await window.gruposDeAnunciosService.criarGrupoDeAnuncio(group);
                if (created) {
                    data.push({ id: created.id, nome: created.nome });
                }
            }

            if (error) throw error;

            this.newAdGroups = data || [];
            this.goToStep(3);
            await this.prepareStep3();
            this.showSuccess('Grupos de anúncio salvos! Configure os criativos.');
        } catch (error) {
            console.error('Error saving ad groups:', error);
            this.showError('Erro ao salvar grupos de anúncio');
        }
    }

    async prepareStep3() {
        const container = document.getElementById('creatives-container');
        if (!container) return;
        container.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div> Carregando criativos...</div>';

        try {
            const adGroupIds = this.newAdGroups.map(g => g.id);
            let allCreatives = [];
            if (adGroupIds.length > 0) {
                if (!window.criativosService) {
                    throw new Error('Serviço de criativos não está disponível');
                }
                // Buscar criativos para cada grupo
                const creativesPromises = adGroupIds.map(groupId =>
                    window.criativosService.buscarCriativosPorGrupo(groupId)
                );
                const creativesArrays = await Promise.all(creativesPromises);
                allCreatives = creativesArrays.flat();
            }

            container.innerHTML = '';

            this.newAdGroups.forEach(adGroup => {
                const creativesForGroup = allCreatives.filter(c => c.grupo_de_anuncio_id === adGroup.id);

                const groupHtml = `
                    <div class="ad-group-creatives" data-group-id="${adGroup.id}">
                        <div class="creative-group-header">
                            <h4>Criativos para: ${adGroup.nome}</h4>
                        </div>
                        <div class="creatives-list" id="creatives-${adGroup.id}"></div>
                        <div class="add-creative-footer" style="text-align: right; margin-top: 1rem;">
                             <button type="button" class="btn btn-sm btn-primary" onclick="campanhasManager.addCreative('${adGroup.id}')">
                                <i data-lucide="plus"></i>
                                Adicionar Criativo
                            </button>
                        </div>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', groupHtml);

                if (creativesForGroup.length > 0) {
                    creativesForGroup.forEach(creative => {
                        this.addCreative(adGroup.id, creative);
                    });
                }
            });

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error("Error preparing step 3:", error);
            container.innerHTML = '<p class="error-message">Erro ao carregar criativos existentes.</p>';
        }
    }

    addCreative(adGroupId, creative = null) {
        const container = document.getElementById(`creatives-${adGroupId}`);
        if (!container) return;

        const creativeIndex = container.children.length;
        const creativeId = creative ? creative.id : '';
        const creativeType = creative ? creative.tipo : '';
        const creativeTitle = creative ? (creative.titulos && creative.titulos[0]) || '' : '';
        const creativeUrl = creative ? (creative.urls_criativo && creative.urls_criativo[0]) || '' : '';

        const creativeHtml = `
            <div class="creative-item" data-creative-index="${creativeIndex}" data-creative-id="${creativeId || ''}">
                <div class="creative-header">
                    <h5 class="creative-title">Criativo ${creativeIndex + 1}</h5>
                    <button type="button" class="remove-item-btn">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Tipo *</label>
                        <select name="creative_type_${adGroupId}_${creativeIndex}" required>
                            <option value="">Selecione...</option>
                            <option value="Imagem" ${creativeType === 'Imagem' ? 'selected' : ''}>Imagem</option>
                            <option value="Vídeo" ${creativeType === 'Vídeo' ? 'selected' : ''}>Vídeo</option>
                            <option value="Carrossel" ${creativeType === 'Carrossel' ? 'selected' : ''}>Carrossel</option>
                            <option value="Texto" ${creativeType === 'Texto' ? 'selected' : ''}>Texto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Título</label>
                        <input type="text" name="creative_title_${adGroupId}_${creativeIndex}" value="${creativeTitle}">
                    </div>
                    <div class="form-group full-width">
                        <label>URL do Criativo</label>
                        <input type="url" name="creative_url_${adGroupId}_${creativeIndex}" value="${creativeUrl}">
                    </div>
                </div>
                <div class="form-actions" style="justify-content: space-between; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="campanhasManager.goBack()">
                        <i data-lucide="arrow-left"></i>
                        Voltar
                    </button>
                    <button type="button" class="btn btn-primary" onclick="campanhasManager.addAnotherCreative()">
                        Salvar e Adicionar Outro
                        <i data-lucide="plus"></i>
                    </button>
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', creativeHtml);

        const newItem = container.lastElementChild;
        if (newItem) {
            const removeButton = newItem.querySelector('.remove-item-btn');
            if (removeButton) {
                removeButton.addEventListener('click', () => this.removeCreative(removeButton));
            }
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async saveCreativesAndFinish() {
        try {
            const creativesToInsert = [];
            for (const adGroup of this.newAdGroups) {
                const container = document.getElementById(`creatives-${adGroup.id}`);
                if (!container) continue;

                const creativeItems = container.querySelectorAll('.creative-item');
                creativeItems.forEach((item, index) => {
                    const type = item.querySelector(`[name="creative_type_${adGroup.id}_${index}"]`)?.value;
                    const title = item.querySelector(`[name="creative_title_${adGroup.id}_${index}"]`)?.value;
                    const url = item.querySelector(`[name="creative_url_${adGroup.id}_${index}"]`)?.value;

                    if (type) {
                        creativesToInsert.push({
                            tipo: type,
                            titulos: title ? [title] : [],
                            urls_criativo: url ? [url] : [],
                            grupo_de_anuncio_id: adGroup.id,
                            campanha_id: this.newCampaignId
                        });
                    }
                });
            }

            if (creativesToInsert.length > 0) {
                const { error } = await this.supabase.from('criativos').insert(creativesToInsert);
                if (error) throw error;
            }

            this.showSuccess('Campanha salva com sucesso!');
            this.showListView(); // Volta para a tela de lista
            this.loadCampaigns(); // <<< PONTO CRÍTICO: Força a atualização da lista.
        } catch (error) {
            console.error('Error saving creatives:', error);
            this.showError('Erro ao salvar criativos');
        }
    }

    // Filter functions
    applyFilters() {
        const brandFilter = document.getElementById('campaign-filter-brand')?.value;
        const platformFilter = document.getElementById('campaign-filter-platform')?.value;
        const statusFilter = document.getElementById('campaign-filter-status')?.value;
        const modeloFilter = document.getElementById('campaign-filter-modelo')?.value;

        let filteredCampaigns = this.allCampaigns;

        if (brandFilter) {
            filteredCampaigns = filteredCampaigns.filter(c => {
                const marcaId = c.marca_id?.id || c.marca_id;
                return String(marcaId) === String(brandFilter);
            });
        }

        if (platformFilter) {
            filteredCampaigns = filteredCampaigns.filter(c => {
                const plataformaId = c.conta_de_anuncio_id?.plataforma_id?.id || c.conta_de_anuncio_id?.plataforma_id;
                return String(plataformaId) === String(platformFilter);
            });
        }

        if (statusFilter) {
            filteredCampaigns = filteredCampaigns.filter(c => {
                // Comparar com o valor em inglês do banco
                return c.status === statusFilter;
            });
        }

        if (modeloFilter) {
            filteredCampaigns = filteredCampaigns.filter(c => {
                const modeloId = c.modelo_id?.id || c.modelo_id;
                return String(modeloId) === String(modeloFilter);
            });
        }

        this.displayedCampaigns = filteredCampaigns;
        this.updateCampaignCount();
        this.renderCampaignsList();
    }

    updateCampaignCount() {
        const countDisplay = document.getElementById('campaign-count-display');
        if (countDisplay) {
            const count = this.displayedCampaigns.length;
            countDisplay.textContent = count === 1 ? '1 campanha' : `${count} campanhas`;
        }
    }

    clearFilters() {
        document.getElementById('campaign-filter-brand').value = '';
        document.getElementById('campaign-filter-platform').value = '';
        document.getElementById('campaign-filter-status').value = ''; // Default to Todos on clear
        document.getElementById('campaign-filter-modelo').value = '';
        this.applyFilters();
    }

    // Modal functions
    async viewDetails(campaignId) {
        const campaign = this.allCampaigns.find(c => c.id === campaignId);
        if (!campaign) {
            this.showError('Campanha não encontrada.');
            return;
        }

        const modal = document.getElementById('campaignDetailsModal');
        const content = document.getElementById('campaignDetailsContent');
        if (!modal || !content) return;

        content.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div> Carregando detalhes...</div>';
        modal.classList.add('is-active');

        try {
            // Fetch ad groups and creatives
            const { data: adGroups, error: adGroupsError } = await this.supabase
                .from('grupos_de_anuncios')
                .select('*, criativos(*)')
                .eq('campanha_id', campaignId);

            if (adGroupsError) throw adGroupsError;

            const brandName = campaign.marca_id?.nome || 'N/A';
            const accountName = campaign.conta_de_anuncio_id?.nome || 'N/A';
            const platformName = campaign.conta_de_anuncio_id?.plataforma_id?.nome || 'N/A';
            const budget = campaign.orcamento?.valor ? `R$ ${campaign.orcamento.valor.toFixed(2)}` : 'N/A';

            let detailsHtml = `
                <div class="campaign-details-grid">
                    <div class="detail-item"><strong>Nome:</strong> ${campaign.nome}</div>
                    <div class="detail-item"><strong>Status:</strong> <span class="status-badge status-${campaign.status ? campaign.status.toLowerCase() : 'active'}">${getStatusDisplay(campaign.status)}</span></div>
                    <div class="detail-item"><strong>Marca:</strong> ${brandName}</div>
                    <div class="detail-item"><strong>Plataforma:</strong> ${platformName}</div>
                    <div class="detail-item"><strong>Conta de Anúncio:</strong> ${accountName}</div>
                    <div class="detail-item"><strong>Orçamento Total:</strong> ${budget}</div>
                    <div class="detail-item"><strong>Data de Início:</strong> ${new Date(campaign.data_inicio).toLocaleDateString()}</div>
                    <div class="detail-item"><strong>Data de Fim:</strong> ${campaign.data_fim ? new Date(campaign.data_fim).toLocaleDateString() : 'Contínuo'}</div>
                    <div class="detail-item full-width"><strong>Objetivo:</strong> ${campaign.objetivo || 'N/A'}</div>
                </div>
                <hr>
                <h4>Grupos de Anúncio (${adGroups.length})</h4>
            `;

            if (adGroups.length > 0) {
                detailsHtml += '<div class="ad-groups-details">';
                adGroups.forEach(group => {
                    detailsHtml += `
                        <div class="ad-group-detail-item">
                            <div class="ad-group-detail-header">
                                <h5>${group.nome}</h5>
                                <span class="status-badge status-${group.status.toLowerCase()}">${group.status}</span>
                            </div>
                            <p><strong>Criativos (${group.criativos.length}):</strong></p>
                            <ul>
                                ${group.criativos.length > 0
                            ? group.criativos.map(c => `<li>${c.tipo}: ${c.titulos ? c.titulos[0] : 'Sem título'}</li>`).join('')
                            : '<li>Nenhum criativo encontrado.</li>'
                        }
                            </ul>
                        </div>
                    `;
                });
                detailsHtml += '</div>';
            } else {
                detailsHtml += '<p>Nenhum grupo de anúncio encontrado para esta campanha.</p>';
            }

            content.innerHTML = detailsHtml;

        } catch (error) {
            console.error('Error fetching campaign details:', error);
            this.showError('Erro ao carregar detalhes da campanha.');
            content.innerHTML = '<p class="error-message">Não foi possível carregar os detalhes. Tente novamente.</p>';
        }

        this.closeAllActionMenus();
    }

    editCampaign(campaignId) {
        // This is now handled by showFormView(campaignId)
        console.log('Edit campaign:', campaignId);
        this.showFormView(campaignId);
        this.closeAllActionMenus();
    }

    duplicateCampaign(campaignId) {
        // Implementation for duplicating campaign
        console.log('Duplicate campaign:', campaignId);
        this.closeAllActionMenus();
    }

    confirmDelete(campaignId) {
        const campaign = this.allCampaigns.find(c => c.id === campaignId);
        if (!campaign) return;

        this.showCustomAlert(
            'Confirmar Exclusão',
            `Tem certeza que deseja excluir a campanha "${campaign.nome}"? Esta ação não pode ser desfeita.`,
            () => this.deleteCampaign(campaignId)
        );
        this.closeAllActionMenus();
    }

    async handleMouseOverGroups(targetElement) {
        const campaignId = targetElement.dataset.campaignId;
        const popup = targetElement.querySelector('.groups-popup');

        if (!campaignId || !popup) return;

        // Hide any other visible popups
        document.querySelectorAll('.groups-popup.visible').forEach(p => {
            if (!targetElement.contains(p)) {
                p.classList.remove('visible');
            }
        });

        // Debounce to prevent flickering
        if (targetElement.getAttribute('data-loading') === 'true') return;
        targetElement.setAttribute('data-loading', 'true');

        if (this.adGroupCache[campaignId]) {
            this.renderPopupContent(popup, this.adGroupCache[campaignId]);
        } else {
            popup.innerHTML = '<div class="popup-loading">Carregando...</div>';
            popup.classList.add('visible');

            try {
                const { data, error } = await this.supabase
                    .from('grupos_de_anuncios')
                    .select('nome, status')
                    .eq('campanha_id', campaignId);

                if (error) throw error;

                this.adGroupCache[campaignId] = data || [];
                this.renderPopupContent(popup, data || []);
            } catch (error) {
                console.error('Failed to fetch ad groups:', error);
                popup.innerHTML = '<div class="popup-error">Erro ao carregar.</div>';
            }
        }

        // Use a short timeout to allow the popup to appear before removing the loading flag
        setTimeout(() => {
            targetElement.removeAttribute('data-loading');
        }, 200);
    }

    handleMouseOutFromGroups(targetElement) {
        const popup = targetElement.querySelector('.groups-popup');
        if (popup) {
            popup.classList.remove('visible');
        }
    }

    renderPopupContent(popup, adGroups) {
        if (adGroups.length === 0) {
            popup.innerHTML = '<span>Nenhum grupo de anúncio encontrado.</span>';
        } else {
            popup.innerHTML = adGroups.map(group => `
                <div class="popup-group-item">
                    <span class="popup-group-name">${group.nome}</span>
                    <span class="status-badge status-${(group.status || '').toLowerCase()}">${group.status}</span>
                </div>
            `).join('');
        }
        popup.classList.add('visible');
    }

    async deleteCampaign(campaignId) {
        try {
            // Para evitar erros de chave estrangeira, é preciso deletar os registros na ordem correta:
            if (!window.criativosService || !window.gruposDeAnunciosService || !window.campanhasService) {
                throw new Error('Serviços não estão disponíveis');
            }

            // 1. Buscar grupos da campanha para deletar criativos
            const grupos = await window.gruposDeAnunciosService.buscarGruposPorCampanha(campaignId);
            for (const grupo of grupos) {
                // Buscar criativos do grupo e deletar um por um
                const criativos = await window.criativosService.buscarCriativosPorGrupo(grupo.id);
                for (const criativo of criativos) {
                    await window.criativosService.deletarCriativo(criativo.id);
                }
                // Deletar o grupo
                await window.gruposDeAnunciosService.deletarGrupoDeAnuncio(grupo.id);
            }

            // 2. Finalmente, deletar a campanha.
            const deleted = await window.campanhasService.deletarCampanha(campaignId);
            if (!deleted) throw new Error('Erro ao deletar campanha');

            if (campaignError) throw campaignError;

            this.showSuccess('Campanha excluída com sucesso');
            this.loadCampaigns();
        } catch (error) {
            console.error('Error deleting campaign:', error);
            this.showError('Erro ao excluir campanha. Verifique o console.');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('is-active');
        }
    }

    showCustomAlert(title, message, onConfirm) {
        const modal = document.getElementById('customAlert');
        const titleEl = document.getElementById('customAlertTitle');
        const messageEl = document.getElementById('customAlertMessage');
        const confirmBtn = document.getElementById('customAlertConfirm');

        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;

        if (confirmBtn) {
            // Clone and replace the button to remove old event listeners
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

            newConfirmBtn.onclick = () => {
                if (onConfirm) onConfirm();
                this.closeModal('customAlert');
            };
        }

        if (modal) modal.classList.add('is-active');
    }

    showSuccess(message) {
        const notification = document.getElementById('campaignsSuccessNotification');
        const messageEl = document.getElementById('campaignsSuccessMessage');

        if (messageEl) messageEl.textContent = message;
        if (notification) {
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    showError(message) {
        // Use the same notification but with error styling
        console.error(message);
        // Could implement a separate error notification here
        this.showSuccess(`Erro: ${message}`);
    }

    updateDataFromForm() {
        if (!this.campaignData || !this.selectedItem) return;

        const { type, id, groupId } = this.selectedItem;

        if (type === 'campaign') {
            const form = document.getElementById('editor-campaign-form');
            if (!form) return;
            const formData = new FormData(form);
            this.campaignData.nome = formData.get('nome');
            this.campaignData.status = formData.get('status');

            // Defensively update foreign keys only if a valid value exists in the form.
            // This prevents wiping the model's state during UI transitions where the
            // select inputs might be temporarily empty or disabled before being repopulated.
            const marcaId = formData.get('marca_id');
            if (marcaId) {
                this.campaignData.marca_id = marcaId;
            }

            const contaId = formData.get('conta_de_anuncio_id');
            if (contaId) {
                this.campaignData.conta_de_anuncio_id = contaId;
            }

            const modeloId = formData.get('modelo_id');
            if (modeloId) {
                this.campaignData.modelo_id = modeloId;
            } else {
                this.campaignData.modelo_id = null;
            }

            this.campaignData.orcamento = { valor: parseFloat(formData.get('orcamento')) || 0, tipo: 'Total' }; // Assuming 'Total' for now
            this.campaignData.data_inicio = formData.get('data_inicio') || null;
            this.campaignData.data_fim = formData.get('data_fim') || null;
            this.campaignData.objetivo = formData.get('objetivo') || '';
        } else if (type === 'ad_group') {
            const form = document.getElementById('editor-adgroup-form');
            if (!form) return;
            const formData = new FormData(form);
            const adGroup = this.campaignData.ad_groups.find(g => g.id === id);
            if (adGroup) {
                adGroup.nome = formData.get('ad_group_name') || '';
                adGroup.status = formData.get('ad_group_status');
                const marcaId = formData.get('adgroup_marca_id');
                if (marcaId) {
                    adGroup.marca_id = marcaId;
                } else {
                    adGroup.marca_id = null;
                }
                const modeloId = formData.get('adgroup_modelo_id');
                if (modeloId) {
                    adGroup.modelo_id = modeloId;
                } else {
                    adGroup.modelo_id = null;
                }
            }
        } else if (type === 'creative') {
            const form = document.getElementById('editor-creative-form');
            if (!form) return;
            const formData = new FormData(form);
            const adGroup = this.campaignData.ad_groups.find(g => g.id === groupId);
            if (adGroup) {
                const creative = adGroup.creatives.find(c => c.id === id);
                if (creative) {
                    creative.tipo = formData.get('creative_type');
                    creative.status = formData.get('creative_status'); // Captura o status
                    creative.titulos = [formData.get('creative_title') || ''];
                    creative.urls_criativo = [formData.get('creative_url') || ''];
                    // Let's add a name property for consistency
                    creative.nome = formData.get('creative_title') || '';
                    const marcaId = formData.get('creative_marca_id');
                    if (marcaId) {
                        creative.marca_id = marcaId;
                    } else {
                        creative.marca_id = null;
                    }
                    const modeloId = formData.get('creative_modelo_id');
                    if (modeloId) {
                        creative.modelo_id = modeloId;
                    } else {
                        creative.modelo_id = null;
                    }
                }
            }
        }
    }

    async saveCampaign(forceSave = false) {
        if (this.isSaving) {
            console.log("Save already in progress.");
            return;
        }

        this.updateDataFromForm(); // Persist any final changes from the form

        // Se não for forçado, verifique se há alterações.
        if (!forceSave && !this.hasChanges()) {
            console.log("Nenhuma alteração detectada, pulando o salvamento.");
            this.showInfo('Nenhuma alteração foi detectada para salvar.');
            return;
        }

        this.isSaving = true;
        const wasNewCampaign = String(this.campaignData.id).startsWith('new_');

        // Find the object that is currently selected so we can track its ID changes
        const { type, id, groupId } = this.selectedItem || {};
        let selectedObjectBeforeSave = null;
        if (type === 'campaign') {
            selectedObjectBeforeSave = this.campaignData;
        } else if (type === 'ad_group') {
            selectedObjectBeforeSave = this.campaignData.ad_groups.find(g => g.id === id);
        } else if (type === 'creative') {
            const group = this.campaignData.ad_groups.find(g => g.id === groupId);
            selectedObjectBeforeSave = group ? group.creatives.find(c => c.id === id) : null;
        }

        try {
            // 1. Deletar criativos marcados
            if (this.creativesToDelete && this.creativesToDelete.length > 0) {
                if (!window.criativosService) {
                    throw new Error('Serviço de criativos não está disponível');
                }
                for (const id of this.creativesToDelete) {
                    await window.criativosService.deletarCriativo(id);
                }
                console.log('Criativos deletados:', this.creativesToDelete);
                this.creativesToDelete = []; // Limpa após a operação
            }

            // 2. Deletar grupos de anúncios marcados (e seus criativos associados, se o DB for configurado com cascade)
            if (this.adGroupsToDelete && this.adGroupsToDelete.length > 0) {
                if (!window.gruposDeAnunciosService) {
                    throw new Error('Serviço de grupos não está disponível');
                }
                for (const id of this.adGroupsToDelete) {
                    await window.gruposDeAnunciosService.deletarGrupoDeAnuncio(id);
                }
                console.log('Grupos de anúncios deletados:', this.adGroupsToDelete);
                this.adGroupsToDelete = []; // Limpa após a operação
            }

            // Se for uma nova campanha, garanta que a conta de anúncio padrão seja usada.
            const isNewCampaign = String(this.campaignData.id).startsWith('new_');

            // 1. Salva a Campanha
            const campaignDataForUpsert = {
                id: isNewCampaign ? undefined : this.campaignData.id,
                nome: this.campaignData.nome,
                marca_id: this.campaignData.marca_id?.id || this.campaignData.marca_id,
                conta_de_anuncio_id: this.campaignData.conta_de_anuncio_id?.id || this.campaignData.conta_de_anuncio_id,
                modelo_id: this.campaignData.modelo_id?.id || this.campaignData.modelo_id || null,
                status: this.campaignData.status || 'active',
                objetivo: this.campaignData.objetivo || 'Reconhecimento', // Valor padrão para evitar erro de nulo
                conversao_desejada: this.campaignData.conversao_desejada || 'Visitas ao Perfil', // Valor padrão
                orcamento: this.campaignData.orcamento || { tipo: 'Diário', valor: 0 }, // Valor padrão
                data_inicio: this.campaignData.data_inicio || new Date().toISOString() // Valor padrão
            };

            // Usar o serviço de campanhas para garantir consistência e evitar duplicação
            let savedCampaign;
            if (isNewCampaign) {
                if (!window.campanhasService) {
                    throw new Error('Serviço de campanhas não está disponível');
                }
                // Remover id undefined para criação
                const { id, ...createData } = campaignDataForUpsert;
                savedCampaign = await window.campanhasService.criarCampanha(createData);
            } else {
                if (!window.campanhasService) {
                    throw new Error('Serviço de campanhas não está disponível');
                }
                savedCampaign = await window.campanhasService.atualizarCampanha(this.campaignData.id, campaignDataForUpsert);
            }

            if (!savedCampaign) {
                throw new Error('Erro ao salvar campanha');
            }

            if (isNewCampaign) {
                this.isCreating = false;
                this.campaignData.id = savedCampaign.id;
                console.log("Campaign created successfully, new ID:", savedCampaign.id);
            }

            // 2. Salva os Grupos de Anúncios e seus Criativos
            if (this.campaignData.ad_groups && this.campaignData.ad_groups.length > 0) {
                for (const group of this.campaignData.ad_groups) {
                    const isNewGroup = String(group.id).startsWith('new_');
                    const adGroupDataForUpsert = {
                        id: isNewGroup ? undefined : group.id,
                        campanha_id: savedCampaign.id,
                        nome: group.nome,
                        status: group.status,
                        modelo_id: group.modelo_id?.id || group.modelo_id || null
                    };

                    let savedAdGroup;
                    if (isNewGroup) {
                        if (!window.gruposDeAnunciosService) {
                            throw new Error('Serviço de grupos não está disponível');
                        }
                        savedAdGroup = await window.gruposDeAnunciosService.criarGrupoDeAnuncio(adGroupDataForUpsert);
                    } else {
                        if (!window.gruposDeAnunciosService) {
                            throw new Error('Serviço de grupos não está disponível');
                        }
                        savedAdGroup = await window.gruposDeAnunciosService.atualizarGrupoDeAnuncio(group.id, adGroupDataForUpsert);
                    }

                    if (!savedAdGroup) {
                        console.error(`Error saving ad group ${group.nome}`);
                        throw new Error(`Erro ao salvar grupo ${group.nome}`);
                    }

                    if (isNewGroup) {
                        group.id = savedAdGroup.id;
                    }

                    // 3. Salva os Criativos para o Grupo de Anúncios atual
                    if (group.creatives && group.creatives.length > 0) {
                        for (const creative of group.creatives) {
                            const isNewCreative = String(creative.id).startsWith('new_');
                            const creativeDataForUpsert = {
                                id: isNewCreative ? undefined : creative.id,
                                grupo_de_anuncio_id: savedAdGroup.id,
                                campanha_id: savedCampaign.id,
                                nome: creative.nome,
                                tipo: creative.tipo,
                                // status: creative.status, // Campo não existe na tabela criativos
                                titulos: creative.titulos,
                                urls_criativo: creative.urls_criativo,
                                modelo_id: creative.modelo_id?.id || creative.modelo_id || null
                            };

                            let savedCreative;
                            if (isNewCreative) {
                                if (!window.criativosService) {
                                    throw new Error('Serviço de criativos não está disponível');
                                }
                                savedCreative = await window.criativosService.criarCriativo(creativeDataForUpsert);
                            } else {
                                if (!window.criativosService) {
                                    throw new Error('Serviço de criativos não está disponível');
                                }
                                savedCreative = await window.criativosService.atualizarCriativo(creative.id, creativeDataForUpsert);
                            }

                            if (!savedCreative) {
                                console.error(`Error saving creative ${creative.nome}`);
                                throw new Error(`Erro ao salvar criativo ${creative.nome}`);
                            }
                            if (isNewCreative) {
                                creative.id = savedCreative.id;
                            }
                        }
                    }
                }
            }

            // After saving and mutating IDs, update selectedItem if it was pointing to a new item
            if (selectedObjectBeforeSave && this.selectedItem) {
                this.selectedItem.id = selectedObjectBeforeSave.id;
            }

            const adGroupJustSaved = this.selectedItem && this.selectedItem.type === 'ad_group';

            if (adGroupJustSaved) {
                this.showSuccess('Grupo de anúncio salvo com sucesso!');
                this.addCreative(); // Navega para a criação de criativos
            } else if (wasNewCampaign) {
                this.showSuccess('Campanha salva com sucesso! Crie seu primeiro grupo de anúncios.');
                this.addAdGroup();
            } else {
                this.showSuccess('Dados salvos com sucesso!');
            }

            // After saving, update the original data snapshot to prevent incorrect "unsaved changes" prompts
            this.originalCampaignData = JSON.parse(JSON.stringify(this.campaignData));

        } catch (error) {
            console.error('Error saving campaign:', error);
            this.showError(`Erro ao salvar campanha: ${error.message}`);
        } finally {
            this.isSaving = false;
        }
    }

    hasChanges() {
        // Basic check, can be improved with deep-diff library for accuracy
        return JSON.stringify(this.campaignData) !== JSON.stringify(this.originalCampaignData);
    }

    showInfo(message) {
        // This is just a placeholder. You might want to implement a proper info notification.
        console.info(message);
        this.showSuccess(message); // Reusing success for now
    }

    addRealtimeUpdateListeners() {
        const editorPanel = document.getElementById('campaign-content-editor');
        if (!editorPanel) return;

        // Use event delegation to handle inputs on the editor panel
        editorPanel.addEventListener('input', (e) => {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA')) {
                // Debounce or throttle this if it causes performance issues
                this.updateDataFromForm();
                this.renderHierarchyNav(); // To update names in real-time
                this.renderBreadcrumbs();
            }
        });
    }

    goBack() {
        if (!this.selectedItem) {
            this.showListView();
            return;
        }

        this.updateDataFromForm();

        const { type, groupId } = this.selectedItem;

        if (type === 'creative') {
            this.selectNavItem('ad_group', groupId);
        } else if (type === 'ad_group') {
            this.selectNavItem('campaign', this.campaignData.id);
        } else {
            this.showListView();
        }
    }

    async handleCampaignSaveAndNext() {
        this.updateDataFromForm();

        const campaignPayload = {
            nome: this.campaignData.nome,
            marca_id: this.campaignData.marca_id,
            conta_de_anuncio_id: this.campaignData.conta_de_anuncio_id,
            modelo_id: this.campaignData.modelo_id || null,
            status: this.campaignData.status,
            orcamento: this.campaignData.orcamento,
            data_inicio: this.campaignData.data_inicio,
            data_fim: this.campaignData.data_fim,
            objetivo: this.campaignData.objetivo,
            conversao_desejada: this.campaignData.conversao_desejada || {}
        };

        const isNewCampaign = String(this.campaignData.id).startsWith('new_');
        if (!isNewCampaign) {
            campaignPayload.id = this.campaignData.id;
        }

        try {
            // Usar saveCampaign para evitar duplicação e garantir consistência
            await this.saveCampaign(true);

            this.showSuccess('Campanha salva! Agora, adicione os grupos.');
            this.renderHierarchyNav();

            // Navigate to add new ad group
            this.addAdGroup();

        } catch (error) {
            console.error('Error saving campaign:', error);
            this.showError('Erro ao salvar a campanha.');
        }
    }

    async handleAdGroupsSaveAndNext() {
        this.updateDataFromForm();

        const currentAdGroup = this.campaignData.ad_groups.find(g => g.id === this.selectedItem.id);
        if (!currentAdGroup) {
            this.showError('Nenhum grupo de anúncio selecionado para salvar.');
            return;
        }

        const adGroupPayload = {
            nome: currentAdGroup.nome,
            status: currentAdGroup.status,
            campanha_id: this.campaignData.id,
            modelo_id: currentAdGroup.modelo_id?.id || currentAdGroup.modelo_id || null
        };

        const isNew = String(currentAdGroup.id).startsWith('new_');
        if (!isNew) {
            adGroupPayload.id = currentAdGroup.id;
        }

        try {
            const { data, error } = await this.supabase
                .from('grupos_de_anuncios')
                .upsert(adGroupPayload)
                .select()
                .single();

            if (error) throw error;

            currentAdGroup.id = data.id;
            this.originalCampaignData = JSON.parse(JSON.stringify(this.campaignData));
            this.showSuccess('Grupo de anúncio salvo! Agora, adicione os criativos.');
            this.renderHierarchyNav();

            // Próxima etapa: criar um criativo em branco e navegar para ele (fluxo editor)
            const targetGroup = this.campaignData.ad_groups.find(g => g.id === currentAdGroup.id);
            if (targetGroup) {
                if (!Array.isArray(targetGroup.creatives)) targetGroup.creatives = [];
                const newCreative = {
                    id: `new_c_${Date.now()}`,
                    nome: 'Novo Criativo',
                    tipo: 'Imagem',
                    status: 'Ativo',
                    titulos: [''],
                    urls_criativo: ['']
                };
                targetGroup.creatives.push(newCreative);
                this.selectNavItem('creative', newCreative.id, targetGroup.id);
            } else {
                this.selectNavItem('ad_group', currentAdGroup.id);
            }

        } catch (error) {
            console.error('Error saving ad group:', error);
            this.showError('Erro ao salvar o grupo de anúncios.');
        }
    }

    async handleCreativesSaveAndFinish() {
        this.updateDataFromForm();

        const adGroup = this.campaignData.ad_groups.find(g => g.id === this.selectedItem.groupId);
        const currentCreative = adGroup?.creatives.find(c => c.id === this.selectedItem.id);

        if (!currentCreative) {
            this.showError('Nenhum criativo selecionado para salvar.');
            return;
        }

        const creativePayload = {
            tipo: currentCreative.tipo,
            titulos: currentCreative.titulos,
            urls_criativo: currentCreative.urls_criativo,
            grupo_de_anuncio_id: adGroup.id,
            campanha_id: this.campaignData.id,
            nome: currentCreative.nome,
            modelo_id: currentCreative.modelo_id?.id || currentCreative.modelo_id || null
        };

        const isNew = String(currentCreative.id).startsWith('new_');
        if (!isNew) {
            creativePayload.id = currentCreative.id;
        }

        try {
            const { data, error } = await this.supabase
                .from('criativos')
                .upsert(creativePayload)
                .select()
                .single();

            if (error) throw error;

            currentCreative.id = data.id;
            this.originalCampaignData = JSON.parse(JSON.stringify(this.campaignData));
            this.showSuccess('Criativo salvo com sucesso!');
            this.renderHierarchyNav();

            // Go back to the main list and refresh
            this.showListView();
            this.loadCampaigns();

        } catch (error) {
            console.error('Error saving creative:', error);
            this.showError('Erro ao salvar o criativo.');
        }
    }

    initImporter() {
        this.importerModal = document.getElementById('meta-importer-modal');
        this.openImporterBtn = document.getElementById('open-import-modal-btn');
        this.closeImporterBtn = document.getElementById('close-importer-modal-btn');
        this.adAccountSelect = document.getElementById('importer-ad-account-modal');
        this.campaignsFileInput = document.getElementById('importer-campaigns-file-modal');
        this.adsetsFileInput = document.getElementById('importer-adsets-file-modal');
        this.adsFileInput = document.getElementById('importer-ads-file-modal');
        this.startImportBtn = document.getElementById('start-import-btn-modal');
        this.feedbackLog = document.getElementById('importer-log-modal');
        this.btnText = this.startImportBtn ? this.startImportBtn.querySelector('.btn-text') : null;
        this.spinner = this.startImportBtn ? this.startImportBtn.querySelector('.spinner') : null;

        this.importerStep2 = document.getElementById('importer-step-2-modal');
        this.importerStep3 = document.getElementById('importer-step-3-modal');

        this.selectedAdAccountId = null;
        this.files = {
            campaigns: null,
            adsets: null,
            ads: null,
        };

        if (this.startImportBtn) {
            this.btnText = this.startImportBtn.querySelector('.btn-text');
            this.spinner = this.startImportBtn.querySelector('.spinner');
        }

        if (this.openImporterBtn) {
            this.openImporterBtn.addEventListener('click', () => this.openImporterModal());
        }
        if (this.closeImporterBtn) {
            this.closeImporterBtn.addEventListener('click', () => this.closeImporterModal());
        }
        if (this.adAccountSelect) {
            this.adAccountSelect.addEventListener('change', (e) => this.handleAdAccountChange(e));
        }
        if (this.campaignsFileInput) {
            this.campaignsFileInput.addEventListener('change', (e) => this.handleFileChange(e, 'campaigns'));
        }
        if (this.adsetsFileInput) {
            this.adsetsFileInput.addEventListener('change', (e) => this.handleFileChange(e, 'adsets'));
        }
        if (this.adsFileInput) {
            this.adsFileInput.addEventListener('change', (e) => this.handleFileChange(e, 'ads'));
        }
        if (this.startImportBtn) {
            this.startImportBtn.addEventListener('click', () => this.handleImport());
        }
    }

    handleAdAccountChange(event) {
        this.selectedAdAccountId = event.target.value;
        const isDisabled = !this.selectedAdAccountId;

        // Habilita/desabilita os passos 2 e 3
        this.importerStep2.querySelectorAll('input, button').forEach(el => el.disabled = isDisabled);
        this.importerStep3.querySelectorAll('input, button').forEach(el => el.disabled = isDisabled);

        if (isDisabled) {
            // Limpa os arquivos se nenhuma conta for selecionada
            this.files = { campaigns: null, adsets: null, ads: null };
            this.campaignsFileInput.value = '';
            this.adsetsFileInput.value = '';
            this.adsFileInput.value = '';
        }

        // A checagem final do botão (considerando os arquivos) é feita aqui
        this.checkImportButtonState();
    }

    handleFileChange(event, fileType) {
        this.files[fileType] = event.target.files[0] || null;
        this.checkImportButtonState();
    }

    checkImportButtonState() {
        const accountSelected = !!this.selectedAdAccountId;
        const allFilesSelected = this.files.campaigns && this.files.adsets && this.files.ads;

        // O botão só é habilitado se uma conta E todos os arquivos estiverem selecionados.
        this.startImportBtn.disabled = !(accountSelected && allFilesSelected);
    }

    async openImporterModal() {
        this.importerModal.style.display = 'flex';
        this.resetImporter();
        await this.loadAdAccountsForImporter();
    }

    closeImporterModal() {
        this.importerModal.style.display = 'none';
    }

    resetImporter() {
        this.adAccountSelect.value = '';
        this.campaignsFileInput.value = '';
        this.adsetsFileInput.value = '';
        this.adsFileInput.value = '';
        this.feedbackLog.textContent = '';
        this.files = { campaigns: null, adsets: null, ads: null };
        this.selectedAdAccountId = null;
        this.startImportBtn.disabled = true;
        this.importerStep2.querySelectorAll('input, button').forEach(el => el.disabled = true);
        this.importerStep3.querySelectorAll('input, button').forEach(el => el.disabled = true);
        this.setLoading(false);
    }

    async loadAdAccountsForImporter() {
        try {
            const { data, error } = await this.supabase
                .from('contas_de_anuncio')
                .select('id, nome');

            if (error) throw error;

            this.adAccountSelect.innerHTML = '<option value="">Selecione uma conta...</option>';
            data.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = account.nome;
                this.adAccountSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading ad accounts for importer:', error);
            this.logFeedback('ERRO: Não foi possível carregar as contas de anúncio.');
        }
    }

    setLoading(isLoading) {
        if (isLoading) {
            this.spinner.style.display = 'inline-block';
            this.btnText.textContent = 'Importando...';
            this.startImportBtn.disabled = true;
            this.adAccountSelect.disabled = true;
            this.campaignsFileInput.disabled = true;
            this.adsetsFileInput.disabled = true;
            this.adsFileInput.disabled = true;
        } else {
            this.spinner.style.display = 'none';
            this.btnText.textContent = 'Iniciar Importação';
            this.startImportBtn.disabled = false;
            this.adAccountSelect.disabled = false;
            this.campaignsFileInput.disabled = false;
            this.adsetsFileInput.disabled = false;
            this.adsFileInput.disabled = false;
        }
    }

    logFeedback(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.feedbackLog.textContent += `[${timestamp}] ${message}\n`;
        this.feedbackLog.scrollTop = this.feedbackLog.scrollHeight;
    }

    async parseCsv(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data);
                },
                error: (error) => {
                    reject(error);
                },
            });
        });
    }

    async handleImport() {
        // Funcionalidade de importação desabilitada - requer serviços RPC que não estão disponíveis
        this.showError('Funcionalidade de importação não está disponível. Use os serviços da pasta services-apis para criar campanhas.');
        this.logFeedback('ERRO: Importação via RPC não está disponível. Use os serviços existentes.');
    }

    showAlert(message, type = 'info', onConfirm = null) {
        const modal = document.getElementById('customAlert');
        if (!modal) {
            // Fallback: usar console se o modal não existir
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        const content = document.getElementById('customAlertMessage');
        if (!content) {
            console.error('Elemento #customAlertMessage não encontrado');
            console.log(`[${type.toUpperCase()}] ${message}`);
            return;
        }

        content.textContent = message;

        const confirmBtn = document.getElementById('customAlertConfirm');
        const cancelBtn = modal.querySelector('.btn-secondary');

        if (onConfirm && confirmBtn) {
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
            if (confirmBtn) confirmBtn.style.display = 'inline-block';
            confirmBtn.onclick = () => {
                onConfirm();
                this.closeModal('customAlert');
            };
        } else {
            if (confirmBtn) confirmBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'none';
        }

        modal.classList.add('is-active');
    }

    showSuccess(message) {
        // Tentar usar o sistema de notificação primeiro
        const notification = document.getElementById('campaignsSuccessNotification');
        const messageEl = document.getElementById('campaignsSuccessMessage');

        if (messageEl && notification) {
            messageEl.textContent = message;
            notification.classList.add('show');
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        } else {
            // Fallback para showAlert
            this.showAlert(message, 'success');
        }
    }

    showError(message) {
        // Tentar usar o sistema de notificação primeiro
        const notification = document.getElementById('campaignsSuccessNotification');
        const messageEl = document.getElementById('campaignsSuccessMessage');

        if (messageEl && notification) {
            messageEl.textContent = `Erro: ${message}`;
            notification.classList.add('show', 'error');
            setTimeout(() => {
                notification.classList.remove('show', 'error');
            }, 5000);
        } else {
            // Fallback para showAlert
            console.error(message);
            this.showAlert(message, 'error');
        }
    }

    showInfo(message) {
        this.showAlert(message, 'info');
    }
}

// Global instance
window.campanhasManager = new CampanhasManager();

// Initialize Lucide icons after page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
});
