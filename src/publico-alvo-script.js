class PublicoAlvoManager {
    constructor() {
        this.supabase = null;
        this.brandsData = {};
        this.audiencesData = {};
        this.modelsData = {};
        this.currentEditingBrand = null;
        this.currentEditingAction = null; // 'edit' ou 'new'
        this.currentEditingModel = null;
        this.pendingDeleteId = null;
    }

    async init() {
        try {
            this.supabase = window.getSupabaseClient();
            await this.loadData();
            this.renderContent();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Erro ao inicializar Público-Alvo:', error);
            this.renderError('Erro ao carregar dados do público-alvo');
        }
    }

    async loadData() {
        try {
            // Buscar marcas
            const { data: brands, error: brandsError } = await this.supabase
                .from('marcas')
                .select('*');

            if (brandsError) throw brandsError;

            // Buscar audiências com join de modelos
            const { data: audiences, error: audiencesError } = await this.supabase
                .from('audiencias')
                .select(`
                    *,
                    modelos (
                        id,
                        nome,
                        segmento,
                        marca_id,
                        marcas (nome)
                    )
                `);

            if (audiencesError) throw audiencesError;

            // Buscar modelos
            const { data: models, error: modelsError } = await this.supabase
                .from('modelos')
                .select(`
                    *,
                    marcas (nome)
                `);

            if (modelsError) throw modelsError;

            // Organizar dados por marca
            this.brandsData = {};
            brands.forEach(brand => {
                this.brandsData[brand.nome.toLowerCase()] = brand;
            });

            // Organizar audiências por modelo/marca
            this.audiencesData = {};
            audiences.forEach(audience => {
                if (audience.modelos) {
                    const brandName = audience.modelos.marcas.nome.toLowerCase();
                    if (!this.audiencesData[brandName]) {
                        this.audiencesData[brandName] = [];
                    }
                    this.audiencesData[brandName].push({
                        ...audience,
                        modelo: audience.modelos
                    });
                }
            });

            // Organizar modelos por marca
            this.modelsData = {};
            models.forEach(model => {
                const brandName = model.marcas.nome.toLowerCase();
                if (!this.modelsData[brandName]) {
                    this.modelsData[brandName] = [];
                }
                this.modelsData[brandName].push(model);
            });

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    renderContent() {
        // Renderizar cards de resumo e tabelas para cada marca
        this.renderBrandSection('kia');
        this.renderBrandSection('suzuki');
        this.renderBrandSection('zontes');
        this.renderBrandSection('haojue');
    }

    renderBrandSection(brandKey) {
        // Renderizar cards de resumo
        this.renderSummaryCards(brandKey);

        // Renderizar tabela de modelos
        this.renderModelsTable(brandKey);
    }

    renderSummaryCards(brandKey) {
        const container = document.getElementById(`${brandKey}-summary-cards`);
        if (!container) return;

        const brand = this.brandsData[brandKey];
        if (!brand) {
            container.innerHTML = `
                <div class="summary-card primary">
                    <h5>Perfil não configurado</h5>
                    <p class="value">N/A</p>
                </div>
            `;
            return;
        }

        // Render qualitative profile cards
        const interesses = Array.isArray(brand.interesses) ? brand.interesses.slice(0, 2).join(', ') : 'Não definido';
        const comportamentos = Array.isArray(brand.comportamentos) ? brand.comportamentos.slice(0, 2).join(', ') : 'Não definido';

        container.innerHTML = `
            <div class="summary-card primary">
                <h5>Demografia Principal</h5>
                <p class="value">${brand.faixa_etaria || 'Não definido'}</p>
            </div>
            <div class="summary-card secondary">
                <h5>Motivações</h5>
                <p class="value">${interesses}</p>
            </div>
            <div class="summary-card accent">
                <h5>Comportamento</h5>
                <p class="value">${comportamentos}</p>
            </div>
        `;
    }

    renderModelsTable(brandKey) {
        const tableBody = document.getElementById(`${brandKey}-table-body`);
        if (!tableBody) return;

        const audiences = this.audiencesData[brandKey] || [];

        if (audiences.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        Nenhum modelo configurado ainda
                    </td>
                </tr>
            `;
            return;
        }

        const rows = audiences.map(audience => `
            <tr onclick="publicoAlvoManager.openDetails('${brandKey}', '${audience.id}')">
                <td>${audience.modelo.nome}</td>
                <td>${audience.modelo.segmento}</td>
                <td>${audience.faixa_etaria || 'Não definido'}</td>
                <td>${audience.genero}</td>
                <td class="actions" onclick="event.stopPropagation()">
                    <div class="actions-menu">
                        <button class="btn-icon actions-trigger" onclick="publicoAlvoManager.toggleActionsMenu(event, '${audience.id}')">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        <div class="actions-dropdown" id="actions-${audience.id}">
                            <button onclick="publicoAlvoManager.openDetails('${brandKey}', '${audience.id}')">
                                <i data-lucide="eye"></i>
                                Visualizar
                            </button>
                            <button onclick="publicoAlvoManager.openEditModal('${brandKey}', 'edit', '${audience.id}')">
                                <i data-lucide="edit"></i>
                                Editar
                            </button>
                            <button onclick="publicoAlvoManager.showDeleteConfirmation('${audience.id}')" class="danger">
                                <i data-lucide="trash-2"></i>
                                Excluir
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        tableBody.innerHTML = rows;

        // Recriar ícones após renderizar
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Close any open menus when clicking outside
        document.addEventListener('click', this.handleOutsideClick.bind(this));
    }

    toggleActionsMenu(event, audienceId) {
        event.stopPropagation();

        // Close all other menus first
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            if (menu.id !== `actions-${audienceId}`) {
                menu.classList.remove('active');
            }
        });

        // Toggle current menu
        const menu = document.getElementById(`actions-${audienceId}`);
        if (menu) {
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

    showDeleteConfirmation(audienceId) {
        this.pendingDeleteId = audienceId;
        const modal = document.getElementById('delete-confirmation-modal');
        if (!modal) {
            console.error('Modal de confirmação de exclusão não encontrado');
            return;
        }
        modal.classList.add('is-active');

        // Close any open action menus
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });
    }

    closeDeleteModal() {
        const modal = document.getElementById('delete-confirmation-modal');
        if (modal) {
            modal.classList.remove('is-active');
        }
        this.pendingDeleteId = null;
    }

    async executeDelete() {
        if (!this.pendingDeleteId) return;

        if (!this.supabase) {
            console.error('Supabase client não inicializado');
            alert('Erro: Cliente Supabase não inicializado');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('audiencias')
                .delete()
                .eq('id', this.pendingDeleteId);

            if (error) throw error;

            this.closeDeleteModal();
            this.showSuccess('Público-alvo excluído com sucesso!');
            await this.loadData();
            this.renderContent();

            // Recriar ícones após renderizar
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Erro ao excluir:', error);
            alert('Erro ao excluir: ' + (error.message || 'Erro desconhecido'));
        }
    }

    openDetails(brandKey, audienceId = null) {
        // Fechar menu de ações se estiver aberto
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });

        const overlay = document.getElementById('details-overlay');
        const sidemenu = document.getElementById('details-sidemenu');
        const title = document.getElementById('details-title');
        const content = document.getElementById('details-content');

        if (!overlay || !sidemenu || !title || !content) {
            console.error('Elementos do modal de detalhes não encontrados');
            return;
        }

        if (audienceId) {
            // Detalhes de uma audiência específica
            const audience = this.findAudienceById(audienceId);
            if (!audience) {
                console.error('Audiência não encontrada:', audienceId);
                return;
            }

            const modeloNome = audience.modelo?.nome || 'N/A';
            const marcaNome = audience.modelo?.marcas?.nome || brandKey;
            title.textContent = `${modeloNome} - ${marcaNome}`;
            content.innerHTML = this.renderAudienceDetails(audience);
        } else {
            // Detalhes gerais da marca
            const brand = this.brandsData[brandKey];

            if (!brand) {
                console.error('Marca não encontrada:', brandKey);
                return;
            }

            title.textContent = `${brand?.nome_perfil || brand?.nome || brandKey} - Perfil Completo`;
            content.innerHTML = this.renderBrandDetails(brand);
        }

        // Configurar event listeners uma única vez se ainda não existirem
        if (!this.detailsOverlayListener) {
            this.detailsOverlayListener = (e) => {
                // Se o clique foi no overlay (não no sidemenu), fechar
                if (e.target === overlay) {
                    this.closeDetails();
                }
            };
            overlay.addEventListener('click', this.detailsOverlayListener);
        }

        // Prevenir que cliques no sidemenu fechem o overlay
        if (!this.detailsSidemenuListener) {
            this.detailsSidemenuListener = (e) => {
                e.stopPropagation();
            };
            sidemenu.addEventListener('click', this.detailsSidemenuListener);
        }

        // Remover qualquer estilo inline que possa interferir
        sidemenu.style.transform = '';
        sidemenu.style.display = '';
        sidemenu.style.visibility = '';

        // Adicionar classe active ao overlay - o CSS vai fazer a animação
        overlay.classList.add('active');

        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderAudienceDetails(audience) {
        const interesses = Array.isArray(audience.interesses)
            ? audience.interesses.join(', ')
            : audience.interesses || 'Não informado';

        const comportamentos = Array.isArray(audience.comportamentos)
            ? audience.comportamentos.join(', ')
            : audience.comportamentos || 'Não informado';

        const modeloNome = audience.modelo?.nome || 'N/A';
        const modeloSegmento = audience.modelo?.segmento || 'N/A';
        const genero = audience.genero || 'Não informado';

        return `
            <div class="detail-section">
                <h4>Informações Básicas</h4>
                <div class="detail-item">
                    <span class="detail-label">Modelo:</span>
                    <span class="detail-value primary">${modeloNome}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Segmento:</span>
                    <span class="detail-value">${modeloSegmento}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Faixa Etária:</span>
                    <span class="detail-value">${audience.faixa_etaria || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Gênero:</span>
                    <span class="detail-value">${genero}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Perfil do Público</h4>
                <div class="detail-item">
                    <span class="detail-label">Nome do Perfil:</span>
                    <span class="detail-value">${audience.nome_perfil || 'Não informado'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Descrição</h4>
                <p class="detail-value">${audience.descricao || 'Não informado'}</p>
            </div>
            
            <div class="detail-section">
                <h4>Interesses</h4>
                <p class="detail-value">${interesses}</p>
            </div>
            
            <div class="detail-section">
                <h4>Comportamentos</h4>
                <p class="detail-value">${comportamentos}</p>
            </div>
            
            <div class="detail-section">
                <h4>Localização</h4>
                <p class="detail-value">${audience.localizacao || 'Não informado'}</p>
            </div>
        `;
    }

    renderBrandDetails(brand) {
        if (!brand) {
            return `
                <div class="detail-section">
                    <h4>Perfil da Marca</h4>
                    <p class="detail-value">Perfil não configurado para esta marca.</p>
                </div>
            `;
        }

        const interesses = Array.isArray(brand.interesses)
            ? brand.interesses.join(', ')
            : brand.interesses || 'Não informado';

        const comportamentos = Array.isArray(brand.comportamentos)
            ? brand.comportamentos.join(', ')
            : brand.comportamentos || 'Não informado';

        return `
            <div class="detail-section">
                <h4>Perfil da Marca</h4>
                <div class="detail-item">
                    <span class="detail-label">Nome do Perfil:</span>
                    <span class="detail-value primary">${brand.nome_perfil || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Marca:</span>
                    <span class="detail-value">${brand.nome}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Descrição Completa</h4>
                <p class="detail-value">${brand.descricao || 'Não informado'}</p>
            </div>
            
            <div class="detail-section">
                <h4>Demografia</h4>
                <div class="detail-item">
                    <span class="detail-label">Faixa Etária:</span>
                    <span class="detail-value">${brand.faixa_etaria || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Gênero:</span>
                    <span class="detail-value">${brand.genero || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Localização:</span>
                    <span class="detail-value">${brand.localizacao || 'Não informado'}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Interesses Completos</h4>
                <p class="detail-value">${interesses}</p>
            </div>
            
            <div class="detail-section">
                <h4>Comportamentos Completos</h4>
                <p class="detail-value">${comportamentos}</p>
            </div>
        `;
    }

    closeDetails() {
        const overlay = document.getElementById('details-overlay');
        const sidemenu = document.getElementById('details-sidemenu');

        if (overlay) {
            overlay.classList.remove('active');
        }

        // Remover estilos inline para deixar o CSS controlar
        if (sidemenu) {
            sidemenu.style.transform = '';
            sidemenu.style.display = '';
            sidemenu.style.visibility = '';
            sidemenu.onclick = null;
        }

        document.body.style.overflow = '';

        // Recriar ícones após fechar
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async openEditModal(brandKey, action, audienceId = null) {
        // Fechar menu de ações se estiver aberto
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });

        this.currentEditingBrand = brandKey;
        this.currentEditingAction = action;
        this.currentEditingModel = audienceId;

        const overlay = document.getElementById('edit-overlay');
        const sidemenu = document.getElementById('edit-sidemenu');
        const title = document.getElementById('edit-modal-title');
        const formFields = document.getElementById('edit-form-fields');

        if (!overlay || !sidemenu || !title || !formFields) {
            console.error('Elementos do sidemenu de edição não encontrados');
            return;
        }

        // Definir título
        if (action === 'new') {
            title.textContent = `Adicionar Novo Público-Alvo - ${this.brandsData[brandKey]?.nome || brandKey}`;
        } else if (action === 'edit' && !audienceId) {
            const brandName = this.brandsData[brandKey]?.nome || brandKey;
            title.textContent = `Editar Perfil da Marca - ${brandName}`;
        } else {
            title.textContent = `Editar Público-Alvo`;
        }

        // Renderizar campos do formulário
        await this.renderEditForm(formFields, action, audienceId);

        // Configurar event listeners uma única vez se ainda não existirem
        if (!this.editOverlayListener) {
            this.editOverlayListener = (e) => {
                // Se o clique foi no overlay (não no sidemenu), fechar
                if (e.target === overlay) {
                    this.closeEditModal();
                }
            };
            overlay.addEventListener('click', this.editOverlayListener);
        }

        // Prevenir que cliques no sidemenu fechem o overlay
        if (!this.editSidemenuListener) {
            this.editSidemenuListener = (e) => {
                e.stopPropagation();
            };
            sidemenu.addEventListener('click', this.editSidemenuListener);
        }

        // Remover qualquer estilo inline que possa interferir
        sidemenu.style.transform = '';
        sidemenu.style.display = '';
        sidemenu.style.visibility = '';

        // Adicionar classe active ao overlay - o CSS vai fazer a animação
        overlay.classList.add('active');

        document.body.style.overflow = 'hidden';

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async renderEditForm(container, action, audienceId) {
        let audience = null;
        let brand = this.brandsData[this.currentEditingBrand];

        if (action === 'edit' && audienceId) {
            audience = this.findAudienceById(audienceId);
        }

        // Se estamos editando perfil da marca
        const isEditingBrand = action === 'edit' && !audienceId;

        // Buscar modelos disponíveis da marca para audiências
        const brandModels = this.modelsData[this.currentEditingBrand] || [];

        if (isEditingBrand) {
            // Formulário para editar perfil da marca
            const interesses = Array.isArray(brand?.interesses) ? brand.interesses.join(', ') : brand?.interesses || '';
            const comportamentos = Array.isArray(brand?.comportamentos) ? brand.comportamentos.join(', ') : brand?.comportamentos || '';
            const genero = brand?.genero?.toLowerCase() || '';

            container.innerHTML = `
                <div class="form-group full-width">
                    <label for="nome-perfil-input">Nome do Perfil</label>
                    <input type="text" id="nome-perfil-input" placeholder="Ex: Jovens Aventureiros" value="${brand?.nome_perfil || ''}" required>
                </div>
                
                <div class="form-group full-width">
                    <label for="descricao-textarea">Descrição</label>
                    <textarea id="descricao-textarea" rows="4" placeholder="Descrição detalhada do perfil da marca...">${brand?.descricao || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="faixa-etaria-input">Faixa Etária</label>
                    <input type="text" id="faixa-etaria-input" placeholder="Ex: 25-45 anos" value="${brand?.faixa_etaria || ''}">
                </div>
                
                <div class="form-group">
                    <label for="genero-select">Gênero</label>
                    <select id="genero-select">
                        <option value="">Selecione</option>
                        <option value="Masculino" ${genero === 'masculino' ? 'selected' : ''}>Masculino</option>
                        <option value="Feminino" ${genero === 'feminino' ? 'selected' : ''}>Feminino</option>
                        <option value="Todos" ${genero === 'homem ou mulher' || genero === 'todos' ? 'selected' : ''}>Todos</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="localizacao-input">Localização</label>
                    <input type="text" id="localizacao-input" placeholder="Ex: São Paulo, SP" value="${brand?.localizacao || ''}">
                </div>
                
                <div class="form-group full-width">
                    <label for="interesses-textarea">Interesses (separados por vírgula)</label>
                    <textarea id="interesses-textarea" rows="3" placeholder="Ex: Automóveis, Tecnologia...">${interesses}</textarea>
                </div>
                
                <div class="form-group full-width">
                    <label for="comportamentos-textarea">Comportamentos (separados por vírgula)</label>
                    <textarea id="comportamentos-textarea" rows="3" placeholder="Ex: Pesquisa online antes da compra...">${comportamentos}</textarea>
                </div>
            `;
        } else {
            // Formulário para audiência/modelo
            const interesses = Array.isArray(audience?.interesses) ? audience.interesses.join(', ') : audience?.interesses || '';
            const comportamentos = Array.isArray(audience?.comportamentos) ? audience.comportamentos.join(', ') : audience?.comportamentos || '';
            const genero = audience?.genero?.toLowerCase() || '';

            container.innerHTML = `
                <div class="form-group">
                    <label for="modelo-select">Modelo</label>
                    <select id="modelo-select" required>
                        <option value="">Selecione um modelo</option>
                        ${brandModels.map(model => `
                            <option value="${model.id}" ${audience?.modelo_id === model.id ? 'selected' : ''}>
                                ${model.nome} - ${model.segmento}
                            </option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group full-width">
                    <label for="nome-perfil-input">Nome do Perfil</label>
                    <input type="text" id="nome-perfil-input" placeholder="Ex: Jovens Urbanos" value="${audience?.nome_perfil || ''}" required>
                </div>
                
                <div class="form-group full-width">
                    <label for="descricao-textarea">Descrição</label>
                    <textarea id="descricao-textarea" rows="3" placeholder="Descrição do público-alvo...">${audience?.descricao || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label for="faixa-etaria-input">Faixa Etária</label>
                    <input type="text" id="faixa-etaria-input" placeholder="Ex: 18-35 anos" value="${audience?.faixa_etaria || ''}" required>
                </div>
                
                <div class="form-group">
                    <label for="genero-select">Gênero</label>
                    <select id="genero-select" required>
                        <option value="">Selecione</option>
                        <option value="Masculino" ${genero === 'masculino' ? 'selected' : ''}>Masculino</option>
                        <option value="Feminino" ${genero === 'feminino' ? 'selected' : ''}>Feminino</option>
                        <option value="Todos" ${genero === 'homem ou mulher' || genero === 'todos' ? 'selected' : ''}>Todos</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="localizacao-input">Localização</label>
                    <input type="text" id="localizacao-input" placeholder="Ex: São Paulo, SP" value="${audience?.localizacao || ''}">
                </div>
                
                <div class="form-group full-width">
                    <label for="interesses-textarea">Interesses (separados por vírgula)</label>
                    <textarea id="interesses-textarea" rows="3" placeholder="Ex: Automóveis, Tecnologia...">${interesses}</textarea>
                </div>
                
                <div class="form-group full-width">
                    <label for="comportamentos-textarea">Comportamentos (separados por vírgula)</label>
                    <textarea id="comportamentos-textarea" rows="3" placeholder="Ex: Pesquisa online antes da compra...">${comportamentos}</textarea>
                </div>
            `;
        }
    }

    closeEditModal() {
        const overlay = document.getElementById('edit-overlay');
        const sidemenu = document.getElementById('edit-sidemenu');

        if (overlay) {
            overlay.classList.remove('active');
        }

        // Remover estilos inline para deixar o CSS controlar
        if (sidemenu) {
            sidemenu.style.transform = '';
            sidemenu.style.display = '';
            sidemenu.style.visibility = '';
        }

        document.body.style.overflow = '';

        // Reset form
        this.currentEditingBrand = null;
        this.currentEditingAction = null;
        this.currentEditingModel = null;

        // Recriar ícones após fechar
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();

        try {
            const formData = this.getFormData();

            // Verificar se estamos editando marca ou audiência
            const isEditingBrand = this.currentEditingAction === 'edit' && !this.currentEditingModel;

            if (isEditingBrand) {
                // Atualizar marca
                await this.updateBrand(this.currentEditingBrand, formData);
                this.showSuccess('Perfil da marca atualizado com sucesso!');
            } else if (this.currentEditingAction === 'new') {
                await this.createAudience(formData);
                this.showSuccess('Público-alvo criado com sucesso!');
            } else {
                await this.updateAudience(this.currentEditingModel, formData);
                this.showSuccess('Público-alvo atualizado com sucesso!');
            }

            this.closeEditModal();
            await this.loadData();
            this.renderContent();

            // Recriar ícones após renderizar
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Erro ao salvar dados: ' + (error.message || 'Erro desconhecido'));
        }
    }

    getFormData() {
        // Processar campos de arrays (vírgulas para array)
        const processArrayField = (value) => {
            if (!value || typeof value !== 'string') return [];
            return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
        };

        const isEditingBrand = this.currentEditingAction === 'edit' && !this.currentEditingModel;

        if (isEditingBrand) {
            // Dados para atualização da marca
            return {
                nome_perfil: document.getElementById('nome-perfil-input').value,
                descricao: document.getElementById('descricao-textarea').value,
                faixa_etaria: document.getElementById('faixa-etaria-input').value,
                genero: document.getElementById('genero-select').value,
                localizacao: document.getElementById('localizacao-input').value,
                interesses: processArrayField(document.getElementById('interesses-textarea').value),
                comportamentos: processArrayField(document.getElementById('comportamentos-textarea').value)
            };
        } else {
            // Dados para audiência
            return {
                modelo_id: document.getElementById('modelo-select').value,
                nome_perfil: document.getElementById('nome-perfil-input').value,
                descricao: document.getElementById('descricao-textarea').value,
                faixa_etaria: document.getElementById('faixa-etaria-input').value,
                genero: document.getElementById('genero-select').value,
                localizacao: document.getElementById('localizacao-input').value,
                interesses: processArrayField(document.getElementById('interesses-textarea').value),
                comportamentos: processArrayField(document.getElementById('comportamentos-textarea').value)
            };
        }
    }

    async createAudience(data) {
        if (!this.supabase) {
            throw new Error('Supabase client não inicializado');
        }

        const { data: result, error } = await this.supabase
            .from('audiencias')
            .insert([data])
            .select();

        if (error) throw error;
        return result?.[0];
    }

    async updateAudience(audienceId, data) {
        if (!this.supabase) {
            throw new Error('Supabase client não inicializado');
        }

        const { data: result, error } = await this.supabase
            .from('audiencias')
            .update(data)
            .eq('id', audienceId)
            .select();

        if (error) throw error;
        return result?.[0];
    }

    async updateBrand(brandKey, data) {
        const brand = this.brandsData[brandKey];
        if (!brand) throw new Error('Marca não encontrada');

        const { error } = await this.supabase
            .from('marcas')
            .update(data)
            .eq('id', brand.id);

        if (error) throw error;
    }

    async confirmDelete(audienceId) {
        this.showDeleteConfirmation(audienceId);
    }

    findAudienceById(audienceId) {
        for (const brandKey in this.audiencesData) {
            const audience = this.audiencesData[brandKey].find(a => a.id === audienceId);
            if (audience) return audience;
        }
        return null;
    }

    renderError(message) {
        const view = document.getElementById('view-publico-alvo');
        if (view) {
            view.innerHTML = `
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

    exportData() {
        // Placeholder for export functionality
        console.log('Export functionality to be implemented');
        alert('Funcionalidade de exportação será implementada em breve');
    }

    showSuccess(message) {
        const notification = document.getElementById('publicoAlvoSuccessNotification');
        const messageEl = document.getElementById('publicoAlvoSuccessMessage');

        if (notification && messageEl) {
            messageEl.textContent = message;
            notification.classList.remove('show');
            notification.classList.add('success');

            // Force reflow to restart animation
            void notification.offsetWidth;

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
}

// Instância global do manager
window.publicoAlvoManager = new PublicoAlvoManager();

// Setup form submit handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-form');
    if (editForm) {
        editForm.onsubmit = (e) => window.publicoAlvoManager.handleFormSubmit(e);
    }
});