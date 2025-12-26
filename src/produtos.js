class ProdutosManager {
    constructor() {
        this.supabase = null;
        this.currentEditingModel = null;
        this.pendingDeleteId = null;
        this.brandsData = {};
        this.modelsData = [];
    }

    async init() {
        if (this.initialized) return;
        try {
            this.supabase = window.getSupabaseClient();
            await this.loadData();
            this.renderContent();
            this.setupEventListeners();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            this.initialized = true;
        } catch (error) {
            console.error('Erro ao inicializar página de produtos:', error);
            this.renderError('Erro ao carregar dados dos produtos');
        }
    }

    async loadData() {
        try {
            // Buscar modelos com informações das marcas
            const { data: models, error: modelsError } = await this.supabase
                .from('modelos')
                .select(`
                    *,
                    marcas (
                        id,
                        nome
                    )
                `)
                .order('nome');

            if (modelsError) throw modelsError;

            // Buscar todas as marcas para garantir que temos todas
            const { data: brands, error: brandsError } = await this.supabase
                .from('marcas')
                .select('*')
                .order('nome');

            if (brandsError) throw brandsError;

            // Organizar dados
            this.modelsData = models || [];

            // Criar mapa de marcas
            this.brandsData = {};
            brands.forEach(brand => {
                this.brandsData[brand.nome.toLowerCase()] = {
                    ...brand,
                    models: models.filter(model => model.marca_id === brand.id) || []
                };
            });

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    renderContent() {
        const container = document.getElementById('brandsContainer');
        if (!container) return;

        if (Object.keys(this.brandsData).length === 0) {
            container.innerHTML = `
                <div class="loading-brands">
                    <div class="loading-spinner"></div>
                    Carregando marcas...
                </div>
            `;
            return;
        }

        let html = '';

        // Definir slogans e ordem das marcas
        const brandConfig = {
            kia: { name: 'Kia', slogan: 'The Power to Surprise' },
            suzuki: { name: 'Suzuki', slogan: 'Way of Life!' },
            zontes: { name: 'Zontes', slogan: 'Born to be Different' },
            haojue: { name: 'Haojue', slogan: 'Confiança em Movimento' }
        };

        // Renderizar cada marca
        Object.entries(brandConfig).forEach(([key, config]) => {
            const brandData = this.brandsData[key];
            const models = brandData?.models || [];

            html += `
                <div class="brand-section" data-brand="${key}">
                    <div class="brand-header ${key}">
                        <div class="brand-info">
                            <h2>${config.name}</h2>
                            <p class="brand-slogan">${config.slogan}</p>
                        </div>
                        <button class="add-model-btn" onclick="produtosManager.openAddModal('${key}')">
                            <i data-lucide="plus"></i>
                            Adicionar Modelo
                        </button>
                    </div>
                    
                    <div class="models-table-container">
                        ${this.renderModelsTable(models, key)}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderModelsTable(models, brandKey) {
        if (!models || models.length === 0) {
            return `
                <div class="empty-models">
                    <i data-lucide="car"></i>
                    <h3>Nenhum modelo cadastrado</h3>
                    <p>Clique em "Adicionar Modelo" para começar</p>
                </div>
            `;
        }

        return `
            <table class="models-table">
                <thead>
                    <tr>
                        <th>Modelo</th>
                        <th>Segmento</th>
                        <th>Preço</th>
                        <th width="60">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${models.map(model => this.renderModelRow(model)).join('')}
                </tbody>
            </table>
        `;
    }

    renderModelRow(model) {
        const price = model.preco ? `R$ ${parseFloat(model.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Não informado';

        return `
            <tr>
                <td class="model-name">${model.nome}</td>
                <td><span class="model-segment">${model.segmento}</span></td>
                <td class="model-price">${price}</td>
                <td class="actions-cell">
                    <div class="actions-menu">
                        <button class="actions-trigger" onclick="produtosManager.toggleActionsMenu(event, '${model.id}')">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        <div class="actions-dropdown" id="actions-${model.id}">
                            <button onclick="produtosManager.openDetailsModal('${model.id}')">
                                <i data-lucide="eye"></i>
                                Visualizar Detalhes
                            </button>
                            <button onclick="produtosManager.openEditModal('${model.id}')">
                                <i data-lucide="edit"></i>
                                Editar
                            </button>
                            <button onclick="produtosManager.showDeleteConfirmation('${model.id}')" class="danger">
                                <i data-lucide="trash-2"></i>
                                Excluir
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    setupEventListeners() {
        // Form submission
        const modelForm = document.getElementById('modelForm');
        if (modelForm) {
            modelForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Setup price input formatting (will be called when modal opens)
        this.setupPriceInputFormatting();

        // Close menus when clicking outside
        document.addEventListener('click', (e) => this.handleOutsideClick(e));
    }

    setupPriceInputFormatting() {
        const priceInput = document.getElementById('modelPrice');
        if (priceInput) {
            // Remove existing listeners to avoid duplicates
            const newInput = priceInput.cloneNode(true);
            priceInput.parentNode.replaceChild(newInput, priceInput);

            // Add event listeners
            newInput.addEventListener('input', (e) => this.formatCurrencyInput(e));
            newInput.addEventListener('blur', (e) => this.formatCurrencyOnBlur(e));
            newInput.addEventListener('focus', (e) => this.formatCurrencyOnFocus(e));
        }
    }

    formatCurrencyInput(e) {
        let value = e.target.value;

        // Se já está formatado como BRL, remove a formatação primeiro
        value = value.replace(/[^\d]/g, '');

        if (value === '') {
            e.target.value = '';
            return;
        }

        // Converte para número e divide por 100 para ter centavos
        const number = parseFloat(value) / 100;

        // Formata como moeda BRL
        e.target.value = this.formatToBRL(number);
    }

    formatCurrencyOnBlur(e) {
        let value = e.target.value.replace(/[^\d]/g, '');

        if (value === '') {
            e.target.value = '';
            return;
        }

        const number = parseFloat(value) / 100;
        e.target.value = this.formatToBRL(number);
    }

    formatCurrencyOnFocus(e) {
        // Mantém a formatação, mas seleciona o texto para facilitar substituição
        e.target.select();
    }

    formatToBRL(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    parseBRLToNumber(value) {
        if (!value || value.trim() === '') return null;

        // Remove todos os caracteres não numéricos exceto vírgula e ponto
        let cleanValue = value.toString().replace(/[^\d,.]/g, '');

        // Se tem vírgula, assume formato brasileiro (1.000,50)
        if (cleanValue.includes(',')) {
            // Remove pontos (milhares) e substitui vírgula por ponto
            cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
        }
        // Se só tem ponto, pode ser formato internacional ou decimal
        else if (cleanValue.includes('.')) {
            // Se tem mais de um ponto, assume que são milhares (formato internacional)
            const parts = cleanValue.split('.');
            if (parts.length > 2) {
                // Remove todos os pontos (milhares)
                cleanValue = cleanValue.replace(/\./g, '');
            }
            // Caso contrário, mantém o ponto como decimal
        }

        const number = parseFloat(cleanValue);
        return isNaN(number) ? null : number;
    }

    toggleActionsMenu(event, modelId) {
        event.stopPropagation();

        // Close all other menus
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            if (menu.id !== `actions-${modelId}`) {
                menu.classList.remove('active');
                menu.classList.remove('bottom-up');
            }
        });

        // Toggle current menu
        const menu = document.getElementById(`actions-${modelId}`);
        if (menu) {
            const isActive = menu.classList.contains('active');

            // Remove bottom-up class first
            menu.classList.remove('bottom-up');

            if (!isActive) {
                // Check if menu should open upward
                const trigger = event.currentTarget;
                const rect = trigger.getBoundingClientRect();
                const menuHeight = 150; // Approximate height of dropdown
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;

                // If not enough space below but enough space above, open upward
                if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                    menu.classList.add('bottom-up');
                }
            }

            menu.classList.toggle('active');
        }
    }

    handleOutsideClick(event) {
        if (!event.target.closest('.actions-menu')) {
            document.querySelectorAll('.actions-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    }

    openAddModal(brandKey) {
        this.currentEditingModel = null;

        const title = document.getElementById('modelModalTitle');
        const form = document.getElementById('modelForm');

        title.textContent = `Adicionar Modelo - ${brandKey.charAt(0).toUpperCase() + brandKey.slice(1)}`;

        // Clear form
        form.reset();
        form.dataset.brandKey = brandKey;

        // Setup price input formatting
        this.setupPriceInputFormatting();

        this.showModal('modelModal');
    }

    async openEditModal(modelId) {
        try {
            const model = this.modelsData.find(m => m.id === modelId);
            if (!model) {
                throw new Error('Modelo não encontrado');
            }

            this.currentEditingModel = model;

            const title = document.getElementById('modelModalTitle');
            const form = document.getElementById('modelForm');

            title.textContent = 'Editar Modelo';

            // Fill form with model data
            document.getElementById('modelName').value = model.nome || '';
            document.getElementById('modelSegment').value = model.segmento || '';
            const priceInput = document.getElementById('modelPrice');
            if (priceInput && model.preco) {
                priceInput.value = this.formatToBRL(model.preco);
            } else if (priceInput) {
                priceInput.value = '';
            }

            form.dataset.brandKey = '';

            // Setup price input formatting
            this.setupPriceInputFormatting();

            this.showModal('modelModal');

            // Close any open menus
            document.querySelectorAll('.actions-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });

        } catch (error) {
            console.error('Erro ao abrir modal de edição:', error);
            this.showNotification('Erro ao carregar dados do modelo', 'error');
        }
    }

    async openDetailsModal(modelId) {
        try {
            // Find the model
            const model = this.modelsData.find(m => m.id === modelId);
            if (!model) {
                throw new Error('Modelo não encontrado');
            }

            // Get audience data from Supabase
            const { data: audience, error } = await this.supabase
                .from('audiencias')
                .select('*')
                .eq('modelo_id', modelId)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
                throw error;
            }

            // Fill the sidemenu content
            const detailsContent = document.getElementById('productDetailsContent');
            if (audience) {
                detailsContent.innerHTML = `
                    <div class="detail-section">
                        <h4>Informações do Modelo</h4>
                        <div class="detail-item">
                            <span class="detail-label">Modelo:</span>
                            <span class="detail-value">${model.nome}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Segmento:</span>
                            <span class="detail-value">${model.segmento || 'Não informado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Preço:</span>
                            <span class="detail-value">${model.preco ? this.formatToBRL(model.preco) : 'Não informado'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h4>Perfil do Público-Alvo</h4>
                        <div class="detail-item">
                            <span class="detail-label">Nome do Perfil:</span>
                            <span class="detail-value">${audience.nome_perfil || 'Não informado'}</span>
                        </div>
                        <div class="detail-item" style="flex-direction: column; align-items: flex-start;">
                            <span class="detail-label">Descrição:</span>
                            <span class="detail-value">${audience.descricao || 'Não informado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Faixa Etária:</span>
                            <span class="detail-value">${audience.faixa_etaria || 'Não informado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Gênero:</span>
                            <span class="detail-value">${audience.genero || 'Não informado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Localização:</span>
                            <span class="detail-value">${audience.localizacao || 'Não informado'}</span>
                        </div>
                        
                        ${audience.interesses && audience.interesses.length > 0 ? `
                            <div class="detail-item" style="flex-direction: column; align-items: flex-start;">
                                <span class="detail-label" style="margin-bottom: 0.5rem;">Interesses:</span>
                                <ul class="interests-list" style="margin: 0; padding-left: 1.5rem; text-align: left;">
                                    ${audience.interesses.map(interest => `<li style="text-align: left;">${interest}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${audience.comportamentos && audience.comportamentos.length > 0 ? `
                            <div class="detail-item" style="flex-direction: column; align-items: flex-start;">
                                <span class="detail-label" style="margin-bottom: 0.5rem;">Comportamentos:</span>
                                <ul class="behaviors-list" style="margin: 0; padding-left: 1.5rem; text-align: left;">
                                    ${audience.comportamentos.map(behavior => `<li style="text-align: left;">${behavior}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `;
            } else {
                detailsContent.innerHTML = `
                    <div class="detail-section">
                        <h4>Informações do Modelo</h4>
                        <div class="detail-item">
                            <span class="detail-label">Modelo:</span>
                            <span class="detail-value">${model.nome}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Segmento:</span>
                            <span class="detail-value">${model.segmento || 'Não informado'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Preço:</span>
                            <span class="detail-value">${model.preco ? this.formatToBRL(model.preco) : 'Não informado'}</span>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <div class="empty-state" style="text-align: left;">
                            <i data-lucide="users"></i>
                            <h4 style="text-align: left;">Nenhum público-alvo cadastrado</h4>
                            <p style="text-align: left;">Este modelo ainda não possui informações de público-alvo definidas.</p>
                        </div>
                    </div>
                `;
            }

            // Open sidemenu
            this.openDetails();

            // Close any open menus
            document.querySelectorAll('.actions-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Erro ao carregar detalhes do modelo:', error);
            this.showNotification('Erro ao carregar detalhes do modelo', 'error');
        }
    }

    openDetails() {
        const overlay = document.getElementById('product-details-overlay');
        const sidemenu = document.getElementById('product-details-sidemenu');

        if (!overlay || !sidemenu) return;

        // Setup overlay click listener
        if (!this.detailsOverlayListener) {
            this.detailsOverlayListener = () => {
                this.closeDetails();
            };
            overlay.addEventListener('click', this.detailsOverlayListener);
        }

        // Prevent clicks on sidemenu from closing overlay
        if (!this.detailsSidemenuListener) {
            this.detailsSidemenuListener = (e) => {
                e.stopPropagation();
            };
            sidemenu.addEventListener('click', this.detailsSidemenuListener);
        }

        // Remove any inline styles that might interfere
        sidemenu.style.transform = '';
        sidemenu.style.display = '';
        sidemenu.style.visibility = '';

        // Add active class to overlay - CSS will handle animation
        overlay.classList.add('active');

        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeDetails() {
        const overlay = document.getElementById('product-details-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
    }

    showDeleteConfirmation(modelId) {
        this.pendingDeleteId = modelId;
        const model = this.modelsData.find(m => m.id === modelId);

        const message = document.getElementById('confirmMessage');
        message.textContent = `Tem certeza que deseja excluir o modelo "${model?.nome}"? Esta ação não pode ser desfeita.`;

        this.showModal('confirmModal');

        // Close any open menus
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);
            const brandKey = e.target.dataset.brandKey;

            const modelData = {
                nome: formData.get('nome'),
                segmento: formData.get('segmento'),
                preco: this.parseBRLToNumber(formData.get('preco'))
            };

            if (this.currentEditingModel) {
                // Update existing model
                const { error } = await this.supabase
                    .from('modelos')
                    .update(modelData)
                    .eq('id', this.currentEditingModel.id);

                if (error) throw error;

                this.showNotification('Modelo atualizado com sucesso!');
            } else {
                // Create new model
                const brandData = this.brandsData[brandKey];
                if (!brandData) {
                    throw new Error('Marca não encontrada');
                }

                modelData.marca_id = brandData.id;

                const { error } = await this.supabase
                    .from('modelos')
                    .insert(modelData);

                if (error) throw error;

                this.showNotification('Modelo adicionado com sucesso!');
            }

            this.closeModal('modelModal');
            await this.loadData();
            this.renderContent();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Erro ao salvar modelo:', error);
            this.showNotification('Erro ao salvar modelo: ' + error.message, 'error');
        }
    }

    async confirmDelete() {
        if (!this.pendingDeleteId) return;

        try {
            const { error } = await this.supabase
                .from('modelos')
                .delete()
                .eq('id', this.pendingDeleteId);

            if (error) throw error;

            this.showNotification('Modelo excluído com sucesso!');
            this.closeModal('confirmModal');

            await this.loadData();
            this.renderContent();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Erro ao excluir modelo:', error);
            this.showNotification('Erro ao excluir modelo: ' + error.message, 'error');
        } finally {
            this.pendingDeleteId = null;
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('is-active');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('is-active');
        }

        // Reset form if it's the model modal
        if (modalId === 'modelModal') {
            const form = document.getElementById('modelForm');
            if (form) {
                form.reset();
                // Clear price input explicitly
                const priceInput = document.getElementById('modelPrice');
                if (priceInput) {
                    priceInput.value = '';
                }
            }
            this.currentEditingModel = null;
        }

        // Reset pending delete
        if (modalId === 'confirmModal') {
            this.pendingDeleteId = null;
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('successNotification');
        const messageEl = document.getElementById('successMessage');

        if (notification && messageEl) {
            messageEl.textContent = message;
            notification.classList.remove('success', 'error');
            notification.classList.add(type);
            notification.classList.add('show');

            // Auto hide after 3 seconds
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    renderError(message) {
        const container = document.getElementById('brandsContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-state">
                    <p>${message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i data-lucide="refresh-cw"></i>
                        Tentar Novamente
                    </button>
                </div>
            `;

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
}

// Global instance
// Global instance
window.produtosManager = new ProdutosManager();

// Initialize Lucide icons after page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
});