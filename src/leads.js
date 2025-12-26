class LeadsManager {
    constructor() {
        this.supabase = null;
        this.leadsData = [];
        this.contasDeAnuncio = [];
        this.currentEditingLead = null;
        this.pendingDeleteId = null;
        this.isSaving = false;
        this.bulkImportFiles = [];
        this.bulkImportPreview = [];
        this.bulkImportContaChangeHandler = null;
        this.pagination = {
            currentPage: 1,
            itemsPerPage: 50,
            totalPages: 1
        };
        this.filters = {
            conta_de_anuncio_id: '',
            estagio: '',
            nome_formulario: '',
            data_inicio: null,
            data_fim: null
        };
        this.formulariosDisponiveis = [];
    }

    async init() {
        try {
            // Aguardar o cliente Supabase estar disponível
            if (!window.getSupabaseClient) {
                console.error('getSupabaseClient não está disponível');
                this.renderError('Erro: Cliente Supabase não inicializado');
                return;
            }

            this.supabase = window.getSupabaseClient();

            if (!this.supabase) {
                console.error('Cliente Supabase não encontrado');
                this.renderError('Erro: Cliente Supabase não encontrado');
                return;
            }

            // Aguardar configService estar disponível (pode levar um tempo para carregar)
            let attempts = 0;
            while (!window.configService && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (!window.configService) {
                console.warn('configService não disponível, usando fallback');
            }

            await this.loadContasDeAnuncio();
            this.renderContasDeAnuncioSelects(); // Renderizar após carregar contas
            await this.loadData();
            this.renderContent();
            this.setupEventListeners();
            // Setup searchbox após carregar dados e extrair formulários
            this.setupFormularioSearchbox();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Erro ao inicializar página de leads:', error);
            this.renderError(`Erro ao carregar dados dos leads: ${error.message}`);
        }
    }

    async loadContasDeAnuncio() {
        try {
            // Aguardar configService estar disponível
            let attempts = 0;
            while (!window.configService && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            // Usar o serviço existente configService
            if (window.configService && window.configService.buscarTodasContasDeAnuncio) {
                const contas = await window.configService.buscarTodasContasDeAnuncio();
                this.contasDeAnuncio = contas || [];
                console.log('Contas de anúncio carregadas:', this.contasDeAnuncio.length);
            } else {
                // Fallback: carregar diretamente se o serviço não estiver disponível
                console.warn('configService não disponível, usando fallback direto');
                const { data, error } = await this.supabase
                    .from('contas_de_anuncio')
                    .select('*')
                    .order('nome');

                if (error) throw error;
                this.contasDeAnuncio = data || [];
            }
        } catch (error) {
            console.error('Erro ao carregar contas de anúncio:', error);
            this.contasDeAnuncio = [];
        }
    }

    async loadData() {
        try {
            if (!window.leadsService) {
                throw new Error('Serviço de leads não está disponível');
            }

            // Por padrão, carregar apenas o mês atual
            const hoje = new Date();
            const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

            // Formatar datas para YYYY-MM-DD (formato esperado pelo input type="date")
            // Usar formatação manual para evitar problemas de timezone com toISOString()
            const dataInicio = `${primeiroDiaMes.getFullYear()}-${String(primeiroDiaMes.getMonth() + 1).padStart(2, '0')}-${String(primeiroDiaMes.getDate()).padStart(2, '0')}`;
            const dataFim = `${ultimoDiaMes.getFullYear()}-${String(ultimoDiaMes.getMonth() + 1).padStart(2, '0')}-${String(ultimoDiaMes.getDate()).padStart(2, '0')}`;

            // Definir filtros padrão para o mês atual
            this.filters.data_inicio = dataInicio;
            this.filters.data_fim = dataFim;

            // Atualizar campos de data no formulário
            const filterDataInicio = document.getElementById('leads-filter-data-inicio');
            const filterDataFim = document.getElementById('leads-filter-data-fim');
            if (filterDataInicio) filterDataInicio.value = dataInicio;
            if (filterDataFim) filterDataFim.value = dataFim;

            // Atualizar dropdown de filtros rápidos para mostrar "Mês Atual"
            const quickFilterSelect = document.getElementById('leads-quick-filter-select');
            if (quickFilterSelect) quickFilterSelect.value = 'current-month';

            // Buscar dados do mês atual
            await this.loadDataWithDateFilters();
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            throw error;
        }
    }

    extractFormulariosDisponiveis() {
        const formulariosSet = new Set();
        this.leadsData.forEach(lead => {
            if (lead.nome_formulario && lead.nome_formulario.trim()) {
                formulariosSet.add(lead.nome_formulario.trim());
            }
        });
        this.formulariosDisponiveis = Array.from(formulariosSet).sort();
        console.log('Formulários extraídos:', this.formulariosDisponiveis.length, this.formulariosDisponiveis);
        // Renderizar dropdown se o componente já estiver configurado
        const dropdownContent = document.getElementById('leads-filter-nome-formulario-dropdown')?.querySelector('.searchbox-dropdown-content');
        if (dropdownContent) {
            this.renderFormulariosDropdown();
        }
    }

    renderContent() {
        const container = document.getElementById('leads-list-container');
        if (!container) return;

        const filteredLeads = this.applyFilters();
        const countDisplay = document.getElementById('leads-count-display');
        if (countDisplay) {
            countDisplay.textContent = `${filteredLeads.length} lead(s)`;
        }

        if (filteredLeads.length === 0) {
            container.innerHTML = `
                <div class="empty-leads">
                    <i data-lucide="users"></i>
                    <h3>Nenhum lead encontrado</h3>
                    <p>Clique em "Novo Lead" para adicionar ou importe uma planilha CSV</p>
                </div>
            `;
            this.renderPagination(filteredLeads.length);
            return;
        }

        // Calcular paginação
        this.pagination.totalPages = Math.ceil(filteredLeads.length / this.pagination.itemsPerPage);
        if (this.pagination.currentPage > this.pagination.totalPages && this.pagination.totalPages > 0) {
            this.pagination.currentPage = this.pagination.totalPages;
        }

        // Obter leads da página atual
        const startIndex = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
        const endIndex = startIndex + this.pagination.itemsPerPage;
        const paginatedLeads = filteredLeads.slice(startIndex, endIndex);

        container.innerHTML = `
            <table class="leads-table">
                <thead>
                    <tr>
                        <th style="width: 100px;">Estágio</th>
                        <th>Nome</th>
                        <th style="width: 180px;">Telefone</th>
                        <th style="width: 60px;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedLeads.map(lead => this.renderLeadRow(lead)).join('')}
                </tbody>
            </table>
        `;

        // Renderizar paginação
        this.renderPagination(filteredLeads.length);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderPagination(totalItems) {
        const paginationContainer = document.getElementById('leads-pagination');
        if (!paginationContainer) return;

        if (totalItems === 0) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';

        // Atualizar informações de paginação
        const infoText = document.getElementById('pagination-info-text');
        const currentPageEl = document.getElementById('pagination-current-page');
        const totalPagesEl = document.getElementById('pagination-total-pages');

        if (infoText) {
            const startIndex = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage + 1;
            const endIndex = Math.min(this.pagination.currentPage * this.pagination.itemsPerPage, totalItems);
            infoText.textContent = `Mostrando ${startIndex} a ${endIndex} de ${totalItems} lead(s)`;
        }

        if (currentPageEl) {
            currentPageEl.textContent = this.pagination.currentPage;
        }

        if (totalPagesEl) {
            totalPagesEl.textContent = this.pagination.totalPages;
        }

        // Atualizar estado dos botões
        const firstBtn = document.getElementById('pagination-first');
        const prevBtn = document.getElementById('pagination-prev');
        const nextBtn = document.getElementById('pagination-next');
        const lastBtn = document.getElementById('pagination-last');

        if (firstBtn) {
            firstBtn.disabled = this.pagination.currentPage === 1;
        }
        if (prevBtn) {
            prevBtn.disabled = this.pagination.currentPage === 1;
        }
        if (nextBtn) {
            nextBtn.disabled = this.pagination.currentPage === this.pagination.totalPages;
        }
        if (lastBtn) {
            lastBtn.disabled = this.pagination.currentPage === this.pagination.totalPages;
        }

        // Atualizar select de itens por página
        const perPageSelect = document.getElementById('pagination-per-page-select');
        if (perPageSelect) {
            perPageSelect.value = this.pagination.itemsPerPage.toString();
        }

        // Update icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.pagination.totalPages) return;

        this.pagination.currentPage = page;
        this.renderContent();
        this.scrollToTop();
    }

    goToPreviousPage() {
        if (this.pagination.currentPage > 1) {
            this.goToPage(this.pagination.currentPage - 1);
        }
    }

    goToNextPage() {
        if (this.pagination.currentPage < this.pagination.totalPages) {
            this.goToPage(this.pagination.currentPage + 1);
        }
    }

    goToLastPage() {
        this.goToPage(this.pagination.totalPages);
    }

    scrollToTop() {
        // Encontrar o elemento da view de leads
        const leadsView = document.getElementById('view-leads');
        if (leadsView) {
            // Scroll para o topo da view de leads
            leadsView.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Fallback: scroll para o topo da página
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    getEstagioIcon(estagio) {
        const estagios = {
            'Em análise': { icon: 'search', color: '#6366f1', tooltip: 'Em análise' },
            'Em negociação': { icon: 'handshake', color: '#f59e0b', tooltip: 'Em negociação' },
            'Convertido': { icon: 'check-circle', color: '#10b981', tooltip: 'Convertido' },
            'Perdido': { icon: 'ban', color: '#ef4444', tooltip: 'Perdido' }
        };

        // Mapear estágios antigos para os novos
        const mapeamento = {
            'Novo': 'Em análise',
            'Em contato': 'Em análise',
            'Cadastrado': 'Em análise',
            'Fechado': 'Convertido',
            'Qualificado': 'Convertido',
            'Não convertido': 'Perdido'
        };

        const estagioNormalizado = mapeamento[estagio] || estagio;
        const defaultEstagio = { icon: 'file-text', color: '#6b7280', tooltip: estagioNormalizado || 'Sem estágio' };
        return estagios[estagioNormalizado] || defaultEstagio;
    }

    getEstagiosDisponiveis() {
        return [
            { value: '', label: 'Selecione...' },
            { value: 'Em análise', label: 'Em análise' },
            { value: 'Em negociação', label: 'Em negociação' },
            { value: 'Convertido', label: 'Convertido' },
            { value: 'Perdido', label: 'Perdido' }
        ];
    }

    renderLeadRow(lead) {
        // Normalizar estágio para os valores padronizados
        const mapeamento = {
            'Novo': 'Em análise',
            'Em contato': 'Em análise',
            'Cadastrado': 'Em análise',
            'Fechado': 'Convertido',
            'Qualificado': 'Convertido',
            'Não convertido': 'Perdido'
        };
        const estagioNormalizado = mapeamento[lead.estagio] || lead.estagio;
        const estagioInfo = this.getEstagioIcon(estagioNormalizado);
        const telefone = lead.telefone || lead.whatsapp || '-';
        const whatsappNumber = lead.whatsapp || lead.telefone;
        const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}` : '#';

        const estagiosOptions = this.getEstagiosDisponiveis()
            .filter(e => e.value !== '')
            .map(estagio => {
                const estagioIcon = this.getEstagioIcon(estagio.value);
                const isSelected = (mapeamento[lead.estagio] || lead.estagio) === estagio.value;
                const selectedClass = isSelected ? 'class="selected"' : '';
                const estagioValueEscaped = estagio.value.replace(/'/g, "\\'");
                return `<button onclick="leadsManager.updateEstagio('${lead.id}', '${estagioValueEscaped}')" ${selectedClass}>
                    <i data-lucide="${estagioIcon.icon}" style="color: ${estagioIcon.color}; width: 16px; height: 16px;"></i>
                    ${estagio.label}
                </button>`;
            }).join('');

        return `
            <tr>
                <td>
                    <div class="estagio-cell" style="display: flex; align-items: center; justify-content: center; position: relative; gap: 4px;">
                        <div class="estagio-icon-wrapper" onclick="leadsManager.toggleEstagioMenu(event, '${lead.id}')" title="Clique para alterar o estágio">
                            <i data-lucide="${estagioInfo.icon}" style="color: ${estagioInfo.color}; width: 20px; height: 20px;"></i>
                            <i data-lucide="chevron-down" style="width: 12px; height: 12px; color: #9ca3af; margin-left: 2px;"></i>
                        </div>
                        <div class="estagio-dropdown" id="estagio-${lead.id}">
                            ${estagiosOptions}
                        </div>
                    </div>
                </td>
                <td>${lead.nome || '-'}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${telefone !== '-' ? `
                            <span class="copyable-text" onclick="leadsManager.copyToClipboard(event, '${telefone}', 'Telefone copiado!')" title="Clique para copiar" style="cursor: pointer;">${telefone}</span>
                        ` : '<span>-</span>'}
                        ${whatsappNumber ? `
                            <a href="${whatsappLink}" target="_blank" class="whatsapp-link" title="Abrir WhatsApp">
                                <i data-lucide="message-circle"></i>
                            </a>
                        ` : ''}
                    </div>
                </td>
                <td style="position: relative;">
                    <div class="actions-menu">
                        <button class="btn-icon actions-trigger" data-action="toggle-menu" data-lead-id="${lead.id}" onclick="leadsManager.toggleActionsMenu(event, '${lead.id}')">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        <div class="actions-dropdown" id="actions-${lead.id}">
                            <button onclick="leadsManager.openDetails('${lead.id}')">
                                <i data-lucide="eye"></i>
                                Visualizar
                            </button>
                            <button onclick="leadsManager.openEditSideMenu('${lead.id}')">
                                <i data-lucide="edit"></i>
                                Editar
                            </button>
                            <button onclick="leadsManager.showDeleteConfirmation('${lead.id}')" class="danger">
                                <i data-lucide="trash-2"></i>
                                Excluir
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }

    applyFilters() {
        return this.leadsData.filter(lead => {
            // Filtro de conta de anúncio
            if (this.filters.conta_de_anuncio_id && lead.conta_de_anuncio_id !== this.filters.conta_de_anuncio_id) {
                return false;
            }

            // Filtro de estágio (normalizar antes de comparar)
            if (this.filters.estagio) {
                const mapeamento = {
                    'Novo': 'Em análise',
                    'Em contato': 'Em análise',
                    'Cadastrado': 'Em análise',
                    'Fechado': 'Convertido',
                    'Qualificado': 'Convertido',
                    'Não convertido': 'Perdido'
                };
                const leadEstagioNormalizado = mapeamento[lead.estagio] || lead.estagio;
                if (leadEstagioNormalizado !== this.filters.estagio) {
                    return false;
                }
            }

            // Filtro de nome do formulário
            if (this.filters.nome_formulario) {
                const leadFormulario = lead.nome_formulario ? lead.nome_formulario.trim().toLowerCase() : '';
                const filterFormulario = this.filters.nome_formulario.trim().toLowerCase();
                if (!leadFormulario || !leadFormulario.includes(filterFormulario)) {
                    return false;
                }
            }

            // NOTA: Filtros de data são aplicados na API (loadDataWithDateFilters)
            // Os dados já vêm filtrados pelo período completo (data_inicio E data_fim),
            // então não precisamos filtrar novamente aqui no cliente

            return true;
        });
    }

    setupEventListeners() {
        // Form submit
        const form = document.getElementById('lead-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Edit form submit
        const editForm = document.getElementById('lead-edit-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditFormSubmit(e));
        }

        // Filter inputs - apenas conta de anúncio e estágio filtram automaticamente
        const filterContaAnuncio = document.getElementById('leads-filter-conta-anuncio');
        if (filterContaAnuncio) {
            filterContaAnuncio.addEventListener('change', () => {
                this.filters.conta_de_anuncio_id = filterContaAnuncio.value || '';
                this.pagination.currentPage = 1; // Resetar para primeira página
                this.renderContent();
            });
        }

        const filterEstagio = document.getElementById('leads-filter-estagio');
        if (filterEstagio) {
            filterEstagio.addEventListener('change', () => {
                this.filters.estagio = filterEstagio.value || '';
                this.pagination.currentPage = 1; // Resetar para primeira página
                this.renderContent();
            });
        }

        // Pagination per page select
        const perPageSelect = document.getElementById('pagination-per-page-select');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.pagination.itemsPerPage = parseInt(e.target.value);
                this.pagination.currentPage = 1; // Reset to first page
                this.renderContent();
            });
        }

        // Close menus when clicking outside
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Close details overlay
        const detailsOverlay = document.getElementById('lead-details-overlay');
        if (detailsOverlay) {
            detailsOverlay.addEventListener('click', (e) => {
                if (e.target === detailsOverlay) {
                    this.closeDetails();
                }
            });
        }

        // Close edit overlay
        const editOverlay = document.getElementById('lead-edit-overlay');
        if (editOverlay) {
            editOverlay.addEventListener('click', (e) => {
                if (e.target === editOverlay) {
                    this.closeEditSideMenu();
                }
            });
        }

        // Close bulk import overlay
        const bulkImportOverlay = document.getElementById('bulk-import-overlay');
        if (bulkImportOverlay) {
            bulkImportOverlay.addEventListener('click', (e) => {
                if (e.target === bulkImportOverlay) {
                    this.closeBulkImportSideMenu();
                }
            });
        }
    }

    async handleEditFormSubmit(e) {
        e.preventDefault();

        // Prevenir múltiplos cliques
        if (this.isSaving) {
            return;
        }

        if (!window.leadsService) {
            this.showNotification('Serviço de leads não está disponível', 'error');
            return;
        }

        // Desabilitar botão e mostrar loading
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalButtonText = submitButton?.textContent || 'Salvar';
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Salvando...';
        }
        this.isSaving = true;

        const formData = new FormData(e.target);
        const leadData = {
            conta_de_anuncio_id: formData.get('conta_de_anuncio_id') || null,
            nome: formData.get('nome') || null,
            email: formData.get('email') || null,
            telefone: formData.get('telefone') || null,
            telefone_secundario: formData.get('telefone_secundario') || null,
            whatsapp: formData.get('whatsapp') || null,
            fonte: formData.get('fonte') || null,
            nome_formulario: formData.get('nome_formulario') || null,
            canal: formData.get('canal') || null,
            estagio: formData.get('estagio') || null,
            proprietario: formData.get('proprietario') || null,
            rotulos: formData.get('rotulos') || null
        };

        try {
            if (this.currentEditingLead) {
                // Atualizar lead existente
                const updated = await window.leadsService.atualizarLead(this.currentEditingLead.id, leadData, this.supabase);
                if (!updated) throw new Error('Erro ao atualizar lead');
                this.showNotification('Lead atualizado com sucesso!', 'success');
            } else {
                // Criar novo lead
                const created = await window.leadsService.criarLead(leadData, this.supabase);
                if (!created) throw new Error('Erro ao criar lead');
                this.showNotification('Lead criado com sucesso!', 'success');
            }

            // Fechar sidemenu primeiro
            this.closeEditSideMenu();

            // Recarregar dados e renderizar
            await this.loadData();
            this.renderContent();
            this.setupFormularioSearchbox(); // Atualizar formulários após editar

        } catch (error) {
            console.error('Erro ao salvar lead:', error);
            this.showNotification('Erro ao salvar lead. Tente novamente.', 'error');
        } finally {
            // Reabilitar botão
            this.isSaving = false;
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            }
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const leadData = {
            conta_de_anuncio_id: formData.get('conta_de_anuncio_id') || null,
            nome: formData.get('nome') || null,
            email: formData.get('email') || null,
            telefone: formData.get('telefone') || null,
            telefone_secundario: formData.get('telefone_secundario') || null,
            whatsapp: formData.get('whatsapp') || null,
            fonte: formData.get('fonte') || null,
            nome_formulario: formData.get('nome_formulario') || null,
            canal: formData.get('canal') || null,
            estagio: formData.get('estagio') || null,
            proprietario: formData.get('proprietario') || null,
            rotulos: formData.get('rotulos') || null
        };

        try {
            if (!window.leadsService) {
                this.showNotification('Serviço de leads não está disponível', 'error');
                return;
            }

            if (this.currentEditingLead) {
                const updated = await window.leadsService.atualizarLead(this.currentEditingLead.id, leadData, this.supabase);
                if (!updated) throw new Error('Erro ao atualizar lead');
                this.showNotification('Lead atualizado com sucesso!', 'success');
            } else {
                const created = await window.leadsService.criarLead(leadData, this.supabase);
                if (!created) throw new Error('Erro ao criar lead');
                this.showNotification('Lead criado com sucesso!', 'success');
            }

            await this.loadData();
            this.renderContent();
            this.setupFormularioSearchbox(); // Atualizar formulários após criar/editar
            this.closeModal('leadModal');
            this.resetForm();
        } catch (error) {
            console.error('Erro ao salvar lead:', error);
            this.showNotification('Erro ao salvar lead. Tente novamente.', 'error');
        }
    }

    async openEditModal(leadId) {
        try {
            if (!window.leadsService) {
                this.showNotification('Serviço de leads não está disponível', 'error');
                return;
            }

            // Garantir que as contas estão carregadas
            if (!this.contasDeAnuncio || this.contasDeAnuncio.length === 0) {
                await this.loadContasDeAnuncio();
            }

            const lead = await window.leadsService.buscarLeadPorId(leadId, this.supabase);

            if (!lead) {
                this.showNotification('Lead não encontrado', 'error');
                return;
            }

            // Log para debug
            console.log('Lead carregado para edição:', lead);

            this.currentEditingLead = lead;
            this.renderEditContasSelect(); // Renderizar selects no sidemenu
        } catch (error) {
            console.error('Erro ao abrir modal de edição:', error);
            this.showNotification('Erro ao carregar dados do lead', 'error');
        }
    }

    renderEditContasSelect() {
        const select = document.getElementById('edit-lead-conta-anuncio');
        if (select) {
            let html = '<option value="">Selecione...</option>';
            if (this.contasDeAnuncio && this.contasDeAnuncio.length > 0) {
                this.contasDeAnuncio.forEach(conta => {
                    html += `<option value="${conta.id}">${conta.nome || conta.id}</option>`;
                });
            }
            select.innerHTML = html;
        }
    }

    populateForm(lead) {
        // Os selects já devem estar renderizados antes de chamar este método
        const contaSelect = document.getElementById('lead-conta-anuncio');
        if (contaSelect) {
            contaSelect.value = lead.conta_de_anuncio_id || '';
        }

        if (document.getElementById('lead-nome')) document.getElementById('lead-nome').value = lead.nome || '';
        if (document.getElementById('lead-email')) document.getElementById('lead-email').value = lead.email || '';
        if (document.getElementById('lead-telefone')) document.getElementById('lead-telefone').value = lead.telefone || '';
        if (document.getElementById('lead-telefone-secundario')) document.getElementById('lead-telefone-secundario').value = lead.telefone_secundario || '';
        if (document.getElementById('lead-whatsapp')) document.getElementById('lead-whatsapp').value = lead.whatsapp || '';
        if (document.getElementById('lead-fonte')) document.getElementById('lead-fonte').value = lead.fonte || '';
        if (document.getElementById('lead-nome-formulario')) document.getElementById('lead-nome-formulario').value = lead.nome_formulario || '';
        if (document.getElementById('lead-canal')) document.getElementById('lead-canal').value = lead.canal || '';
        if (document.getElementById('lead-estagio')) document.getElementById('lead-estagio').value = lead.estagio || '';
        if (document.getElementById('lead-proprietario')) document.getElementById('lead-proprietario').value = lead.proprietario || '';
        if (document.getElementById('lead-rotulos')) document.getElementById('lead-rotulos').value = lead.rotulos || '';
    }

    resetForm() {
        document.getElementById('lead-form').reset();
        this.currentEditingLead = null;
        document.getElementById('leadModalTitle').textContent = 'Novo Lead';
    }

    async openNewLeadModal() {
        // Resetar lead atual
        this.currentEditingLead = null;

        // Garantir que as contas estão carregadas
        if (!this.contasDeAnuncio || this.contasDeAnuncio.length === 0) {
            await this.loadContasDeAnuncio();
        }

        // Abrir sidemenu de edição
        const overlay = document.getElementById('lead-edit-overlay');
        const sidemenu = document.getElementById('lead-edit-sidemenu');

        if (!overlay || !sidemenu) {
            console.error('Elementos do sidemenu de edição não encontrados');
            return;
        }

        // Limpar formulário e popular selects
        const form = document.getElementById('lead-edit-form');
        if (form) {
            form.reset();
        }

        // Atualizar título do sidemenu
        const title = sidemenu.querySelector('.details-header h3');
        if (title) {
            title.textContent = 'Novo Lead';
        }

        // Renderizar selects de contas
        this.renderEditContasSelect();

        // Abrir sidemenu
        overlay.classList.add('active');

        // Update icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async openDeleteModal(leadId) {
        this.pendingDeleteId = leadId;
        this.openModal('deleteLeadModal');
    }

    async confirmDelete() {
        if (!this.pendingDeleteId) return;

        if (!window.leadsService) {
            this.showNotification('Serviço de leads não está disponível', 'error');
            return;
        }

        try {
            const deleted = await window.leadsService.deletarLead(this.pendingDeleteId, this.supabase);
            if (!deleted) throw new Error('Erro ao excluir lead');

            this.closeDeleteModal();
            this.showNotification('Lead excluído com sucesso!', 'success');
            await this.loadData();
            this.renderContent();
            this.setupFormularioSearchbox(); // Atualizar formulários após deletar

            // Update icons after rendering
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Erro ao excluir lead:', error);
            this.showNotification('Erro ao excluir lead. Tente novamente.', 'error');
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async applyFiltersAndRender() {
        // Aplicar filtros de data
        const dataInicio = document.getElementById('leads-filter-data-inicio')?.value || '';
        const dataFim = document.getElementById('leads-filter-data-fim')?.value || '';

        // Validar que se há data início, deve haver data fim e vice-versa
        if ((dataInicio && !dataFim) || (!dataInicio && dataFim)) {
            this.showNotification('Por favor, selecione ambas as datas (início e fim) para filtrar', 'error');
            return;
        }

        this.filters.data_inicio = dataInicio || null;
        this.filters.data_fim = dataFim || null;

        // Se houver filtros de data (ambos preenchidos), fazer requisição à API
        if (this.filters.data_inicio && this.filters.data_fim) {
            await this.loadDataWithDateFilters();
        } else {
            // Se não houver filtros de data, carregar mês atual
            await this.loadData();
        }

        // Resetar para primeira página ao aplicar filtros
        this.pagination.currentPage = 1;
        this.renderContent();
    }

    applyQuickFilter(period) {
        if (!period) return;

        const hoje = new Date();
        let dataInicio, dataFim;

        switch (period) {
            case 'current-month':
                // Mês atual
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                break;
            case 'last-month':
                // Mês passado
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
                break;
            case 'last-3-months':
                // Últimos 3 meses
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
                dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                break;
            default:
                return;
        }

        // Formatar datas para YYYY-MM-DD (formato esperado pelo input type="date")
        // Usar formatação manual para evitar problemas de timezone com toISOString()
        const inicioStr = `${dataInicio.getFullYear()}-${String(dataInicio.getMonth() + 1).padStart(2, '0')}-${String(dataInicio.getDate()).padStart(2, '0')}`;
        const fimStr = `${dataFim.getFullYear()}-${String(dataFim.getMonth() + 1).padStart(2, '0')}-${String(dataFim.getDate()).padStart(2, '0')}`;

        // Atualizar campos de data
        const filterDataInicio = document.getElementById('leads-filter-data-inicio');
        const filterDataFim = document.getElementById('leads-filter-data-fim');
        if (filterDataInicio) filterDataInicio.value = inicioStr;
        if (filterDataFim) filterDataFim.value = fimStr;

        // Manter o valor selecionado no dropdown (não resetar)
        // O dropdown já mostra o valor selecionado automaticamente
    }

    async loadDataWithDateFilters() {
        const loadingOverlay = this.showLoadingOverlay();

        try {
            if (!window.leadsService) {
                throw new Error('Serviço de leads não está disponível');
            }

            // Callback para atualizar progresso
            const onProgress = (progress) => {
                this.updateLoadingProgress(loadingOverlay, progress);
            };

            // Buscar leads com filtros usando a nova função
            const data = await window.leadsService.buscarLeadsComFiltros(
                {
                    data_inicio: this.filters.data_inicio,
                    data_fim: this.filters.data_fim,
                    conta_de_anuncio_id: this.filters.conta_de_anuncio_id || null,
                    estagio: this.filters.estagio || null,
                    nome_formulario: this.filters.nome_formulario || null
                },
                this.supabase,
                onProgress
            );

            this.leadsData = data || [];

            // Extrair formulários dos dados filtrados
            this.extractFormulariosDisponiveis();

        } catch (error) {
            console.error('Erro ao carregar dados com filtros:', error);
            this.showNotification('Erro ao carregar leads filtrados', 'error');
        } finally {
            this.hideLoadingOverlay(loadingOverlay);
        }
    }

    showLoadingOverlay() {
        // Remover overlay existente se houver
        const existing = document.getElementById('leads-loading-overlay');
        if (existing) {
            existing.remove();
        }

        // Criar novo overlay de loading
        const overlay = document.createElement('div');
        overlay.id = 'leads-loading-overlay';
        overlay.className = 'leads-loading-overlay';
        overlay.innerHTML = `
            <div class="leads-loading-content">
                <div class="leads-loading-spinner">
                    <div class="spinner"></div>
                </div>
                <div class="leads-loading-text">
                    <p id="leads-loading-status">Carregando leads...</p>
                    <div class="leads-loading-progress">
                        <div class="leads-progress-bar">
                            <div class="leads-progress-fill" id="leads-progress-fill"></div>
                        </div>
                        <span class="leads-progress-text" id="leads-progress-text">0%</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Trigger animation
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);

        return overlay;
    }

    updateLoadingProgress(overlay, progress) {
        if (!overlay) return;

        const progressFill = overlay.querySelector('#leads-progress-fill');
        const progressText = overlay.querySelector('#leads-progress-text');
        const statusText = overlay.querySelector('#leads-loading-status');

        if (progressFill && progressText) {
            let percentage = 0;
            let displayText = '0%';

            if (progress.total > 0) {
                percentage = Math.min(100, Math.round((progress.loaded / progress.total) * 100));
                displayText = `${percentage}%`;
            } else if (progress.status) {
                // Se não temos total ainda, mostrar status
                displayText = progress.status;
            }

            progressFill.style.width = `${percentage}%`;
            progressText.textContent = displayText;

            // Atualizar texto de status
            if (statusText) {
                if (progress.status) {
                    statusText.textContent = progress.status;
                } else if (progress.total > 0) {
                    statusText.textContent = `Carregando leads... ${progress.loaded} de ${progress.total}`;
                } else {
                    statusText.textContent = 'Carregando leads...';
                }
            }
        }
    }

    hideLoadingOverlay(overlay) {
        if (overlay) {
            overlay.classList.remove('active');
            // Remover após animação
            setTimeout(() => {
                if (overlay && !overlay.classList.contains('active')) {
                    overlay.remove();
                }
            }, 300);
        }
    }

    async clearFilters() {
        // Limpar filtros de conta, estágio e formulário
        this.filters.conta_de_anuncio_id = '';
        this.filters.estagio = '';
        this.filters.nome_formulario = '';

        const filterContaAnuncio = document.getElementById('leads-filter-conta-anuncio');
        if (filterContaAnuncio) filterContaAnuncio.value = '';

        const filterEstagio = document.getElementById('leads-filter-estagio');
        if (filterEstagio) filterEstagio.value = '';

        const filterNomeFormulario = document.getElementById('leads-filter-nome-formulario');
        if (filterNomeFormulario) filterNomeFormulario.value = '';

        // Fechar dropdown se estiver aberto
        const dropdown = document.getElementById('leads-filter-nome-formulario-dropdown');
        if (dropdown) dropdown.classList.remove('active');

        // Resetar para mês atual (não limpar datas, mas voltar ao padrão)
        await this.loadData(); // Isso já define o mês atual

        // Resetar para primeira página ao limpar filtros
        this.pagination.currentPage = 1;
        this.renderContent();
    }

    renderFormulariosDropdown() {
        const dropdownContent = document.getElementById('leads-filter-nome-formulario-dropdown')?.querySelector('.searchbox-dropdown-content');
        if (!dropdownContent) return;

        if (this.formulariosDisponiveis.length === 0) {
            dropdownContent.innerHTML = '<div class="searchbox-no-results">Nenhum formulário encontrado</div>';
            return;
        }

        dropdownContent.innerHTML = this.formulariosDisponiveis.map(formulario => {
            const escaped = formulario.replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<div class="searchbox-option" data-value="${escaped}">${escaped}</div>`;
        }).join('');
    }

    setupFormularioSearchbox() {
        const input = document.getElementById('leads-filter-nome-formulario');
        const toggle = document.getElementById('leads-filter-nome-formulario-toggle');
        const dropdown = document.getElementById('leads-filter-nome-formulario-dropdown');

        if (!input || !toggle || !dropdown) {
            console.warn('Elementos do searchbox de formulário não encontrados');
            return;
        }

        // Evitar adicionar listeners múltiplas vezes
        if (input.dataset.initialized === 'true') {
            // Apenas atualizar o dropdown se já estiver inicializado
            this.renderFormulariosDropdown();
            return;
        }

        input.dataset.initialized = 'true';

        // Toggle dropdown
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            if (dropdown.classList.contains('active')) {
                this.filterFormulariosDropdown(input.value);
            }
        });

        // Input events
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            this.filters.nome_formulario = value;
            this.pagination.currentPage = 1;
            this.filterFormulariosDropdown(value);
            dropdown.classList.add('active');
            this.renderContent();
        });

        input.addEventListener('focus', () => {
            dropdown.classList.add('active');
            this.filterFormulariosDropdown(input.value);
        });

        // Click em opção do dropdown
        dropdown.addEventListener('click', (e) => {
            const option = e.target.closest('.searchbox-option');
            if (option) {
                const value = option.dataset.value;
                input.value = value;
                this.filters.nome_formulario = value;
                this.pagination.currentPage = 1;
                dropdown.classList.remove('active');
                this.renderContent();
            }
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target) && !toggle.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });

        // Renderizar dropdown inicial
        this.renderFormulariosDropdown();

        // Update icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    filterFormulariosDropdown(searchTerm) {
        const dropdownContent = document.getElementById('leads-filter-nome-formulario-dropdown')?.querySelector('.searchbox-dropdown-content');
        if (!dropdownContent) return;

        const options = dropdownContent.querySelectorAll('.searchbox-option');
        const term = searchTerm.toLowerCase().trim();

        let visibleCount = 0;
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            if (!term || text.includes(term)) {
                option.style.display = '';
                visibleCount++;
            } else {
                option.style.display = 'none';
            }
        });

        // Mostrar mensagem se não houver resultados
        let noResults = dropdownContent.querySelector('.searchbox-no-results');
        if (visibleCount === 0 && term) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.className = 'searchbox-no-results';
                dropdownContent.appendChild(noResults);
            }
            noResults.textContent = 'Nenhum formulário encontrado';
            noResults.style.display = '';
        } else if (noResults) {
            noResults.style.display = 'none';
        }
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

    mapCsvToLeadData(csvRow) {
        // Mapear campos do CSV para os campos da tabela
        // CSV: Criado em, Nome, Email, Fonte, Formulário, Canal, Estágio, Proprietário, Rótulos, Telefone, Número de telefone secundário, Número do WhatsApp

        // Converter data do CSV para ISO
        // Suporta dois formatos:
        // 1. DD/MM/YYYY HH:MM (formato brasileiro 24h) - ex: "12/01/2025 08:25"
        // 2. MM/DD/YYYY H:MMam/pm (formato americano 12h) - ex: "11/30/2025 8:11pm"
        let criadoEm = null;
        if (csvRow['Criado em']) {
            try {
                const dateStr = csvRow['Criado em'].trim();
                const parts = dateStr.split(' ');
                const datePart = parts[0];
                const timePart = parts[1] || '';

                const dateParts = datePart.split('/');
                if (dateParts.length !== 3) {
                    throw new Error('Formato de data inválido');
                }

                let day, month, year;
                let hour = 0, minute = 0;

                // Detectar formato: se o primeiro número > 12, é formato brasileiro DD/MM/YYYY
                // Caso contrário, verificar qual formato faz mais sentido
                const firstPart = parseInt(dateParts[0], 10);
                const secondPart = parseInt(dateParts[1], 10);
                const thirdPart = parseInt(dateParts[2], 10);

                if (firstPart > 12) {
                    // Formato brasileiro: DD/MM/YYYY
                    day = firstPart;
                    month = secondPart;
                    year = thirdPart;
                } else if (secondPart > 12) {
                    // Formato americano: MM/DD/YYYY
                    month = firstPart;
                    day = secondPart;
                    year = thirdPart;
                } else {
                    // Ambíguo: assumir formato americano MM/DD/YYYY por padrão,
                    // pois é o que parece ser usado no arquivo de exemplo.
                    month = firstPart;
                    day = secondPart;
                    year = thirdPart;
                }

                // Validar valores
                if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
                    throw new Error('Valores de data fora do range válido');
                }

                // Parse do horário
                if (timePart) {
                    // Formato 24h: HH:MM
                    const time24Match = timePart.match(/^(\d{1,2}):(\d{2})$/);
                    if (time24Match) {
                        hour = parseInt(time24Match[1], 10);
                        minute = parseInt(time24Match[2], 10);
                    } else {
                        // Formato 12h: H:MMam/pm
                        const time12Match = timePart.match(/(\d+):(\d+)(am|pm)/i);
                        if (time12Match) {
                            hour = parseInt(time12Match[1], 10);
                            minute = parseInt(time12Match[2], 10);
                            const period = time12Match[3].toLowerCase();

                            // Converter para formato 24h
                            if (period === 'pm' && hour !== 12) {
                                hour += 12;
                            } else if (period === 'am' && hour === 12) {
                                hour = 0;
                            }
                        }
                    }
                }

                // Validar hora e minuto
                if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                    throw new Error('Valores de hora inválidos');
                }

                // Criar data usando UTC para evitar problemas de timezone
                const dateObj = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));

                // Validar se a data criada é válida
                if (isNaN(dateObj.getTime())) {
                    throw new Error('Data inválida após conversão');
                }

                criadoEm = dateObj.toISOString();
            } catch (e) {
                console.error('Erro ao converter data do CSV:', csvRow['Criado em'], e);
                // Não definir criadoEm, deixar null para não quebrar a importação
            }
        }

        // Data de importação (timestamp atual)
        const importadoEm = new Date().toISOString();

        return {
            nome: csvRow['Nome'] || null,
            email: csvRow['Email'] || null,
            telefone: csvRow['Telefone'] || null,
            telefone_secundario: csvRow['Número de telefone secundário'] || null,
            whatsapp: csvRow['Número do WhatsApp'] || null,
            fonte: csvRow['Fonte'] || null,
            nome_formulario: csvRow['Formulário'] || null,
            canal: csvRow['Canal'] || null,
            estagio: csvRow['Estágio'] || null,
            proprietario: csvRow['Proprietário'] || null,
            rotulos: csvRow['Rótulos'] || null,
            criado_em: criadoEm, // Data que o usuário se cadastrou (do CSV)
            importado_em: importadoEm // Data que a planilha foi importada
        };
    }


    renderError(message) {
        const container = document.getElementById('leads-list-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i data-lucide="alert-circle"></i>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('leadsNotification');
        const messageEl = notification?.querySelector('span');

        if (notification && messageEl) {
            messageEl.textContent = message;
            notification.classList.remove('show', 'success', 'error');
            notification.classList.add(type);

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

    async copyToClipboard(event, text, successMessage = 'Copiado!') {
        event.stopPropagation();
        const element = event.target;

        try {
            await navigator.clipboard.writeText(text);
            // Mostrar confirmação visual imediata
            this.showCopyFeedback(element);
            this.showNotification(successMessage, 'success');
        } catch (err) {
            // Fallback para navegadores mais antigos
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                this.showCopyFeedback(element);
                this.showNotification(successMessage, 'success');
            } catch (err) {
                console.error('Erro ao copiar:', err);
                this.showNotification('Erro ao copiar', 'error');
            }
            document.body.removeChild(textArea);
        }
    }

    showCopyFeedback(element) {
        if (!element) return;
        const originalText = element.textContent;
        const originalColor = element.style.color || '';
        element.textContent = 'Copiado!';
        element.style.color = '#10b981';
        element.style.fontWeight = '600';

        setTimeout(() => {
            element.textContent = originalText;
            element.style.color = originalColor;
            element.style.fontWeight = '';
        }, 1500);
    }

    renderContasDeAnuncioSelects() {
        console.log('Renderizando selects de contas de anúncio. Total:', this.contasDeAnuncio.length);

        // Renderizar no filtro
        const filterSelect = document.getElementById('leads-filter-conta-anuncio');
        if (filterSelect) {
            let html = '<option value="">Todas</option>';
            if (this.contasDeAnuncio && this.contasDeAnuncio.length > 0) {
                this.contasDeAnuncio.forEach(conta => {
                    html += `<option value="${conta.id}">${conta.nome || conta.id}</option>`;
                });
            }
            filterSelect.innerHTML = html;
            console.log('Filtro de contas renderizado com', this.contasDeAnuncio.length, 'opções');
        } else {
            console.warn('Elemento leads-filter-conta-anuncio não encontrado');
        }

        // Renderizar no formulário
        const formSelect = document.getElementById('lead-conta-anuncio');
        if (formSelect) {
            let html = '<option value="">Selecione...</option>';
            if (this.contasDeAnuncio && this.contasDeAnuncio.length > 0) {
                this.contasDeAnuncio.forEach(conta => {
                    html += `<option value="${conta.id}">${conta.nome || conta.id}</option>`;
                });
            }
            formSelect.innerHTML = html;
            console.log('Formulário de contas renderizado com', this.contasDeAnuncio.length, 'opções');
        } else {
            console.warn('Elemento lead-conta-anuncio não encontrado');
        }
    }

    toggleActionsMenu(event, leadId) {
        event.stopPropagation();

        // Close all other menus first
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            if (menu.id !== `actions-${leadId}`) {
                menu.classList.remove('active');
                menu.classList.remove('bottom-up');
            }
        });

        // Toggle current menu
        const menu = document.getElementById(`actions-${leadId}`);
        if (menu) {
            const isActive = menu.classList.contains('active');

            // Remove bottom-up class first
            menu.classList.remove('bottom-up');

            if (!isActive) {
                // Get trigger button position
                const trigger = event.currentTarget;
                const rect = trigger.getBoundingClientRect();
                const menuHeight = 150; // Approximate height of dropdown
                const menuWidth = 140; // Approximate width of dropdown
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;

                // Calculate position for fixed dropdown
                let top = rect.bottom + window.scrollY;
                let right = window.innerWidth - rect.right;

                // If not enough space below but enough space above, open upward
                if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                    menu.classList.add('bottom-up');
                    top = rect.top + window.scrollY - menuHeight;
                }

                // Position the dropdown
                menu.style.top = `${top}px`;
                menu.style.right = `${right}px`;
            }

            menu.classList.toggle('active');
        }

        // Update icons after rendering
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 0);
    }

    handleOutsideClick(event) {
        if (!event.target.closest('.actions-menu')) {
            document.querySelectorAll('.actions-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });
        }
        if (!event.target.closest('.estagio-cell')) {
            document.querySelectorAll('.estagio-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });
        }
    }

    toggleEstagioMenu(event, leadId) {
        event.stopPropagation();

        // Fechar todos os outros menus primeiro
        document.querySelectorAll('.estagio-dropdown').forEach(menu => {
            if (menu.id !== `estagio-${leadId}`) {
                menu.classList.remove('active');
                menu.classList.remove('bottom-up');
            }
        });

        // Fechar menus de ações também
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });

        // Toggle do menu atual
        const menu = document.getElementById(`estagio-${leadId}`);
        if (menu) {
            const isActive = menu.classList.contains('active');

            // Remove bottom-up class first
            menu.classList.remove('bottom-up');

            if (!isActive) {
                // Obter posição do ícone
                const trigger = event.currentTarget;
                const rect = trigger.getBoundingClientRect();
                const menuHeight = 200; // Altura aproximada do dropdown
                const menuWidth = 180; // Largura aproximada do dropdown
                const spaceBelow = window.innerHeight - rect.bottom;
                const spaceAbove = rect.top;

                // Calcular posição para dropdown fixo
                let top = rect.bottom + window.scrollY;
                let left = rect.left + window.scrollX;

                // Se não houver espaço abaixo mas houver acima, abrir para cima
                if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                    menu.classList.add('bottom-up');
                    top = rect.top + window.scrollY - menuHeight;
                }

                // Posicionar o dropdown
                menu.style.top = `${top}px`;
                menu.style.left = `${left}px`;
            }

            menu.classList.toggle('active');
        }

        // Update icons after rendering
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 0);
    }

    async updateEstagio(leadId, novoEstagio) {
        // Fechar o menu
        const menu = document.getElementById(`estagio-${leadId}`);
        if (menu) {
            menu.classList.remove('active');
        }

        if (!window.leadsService) {
            this.showNotification('Serviço de leads não está disponível', 'error');
            return;
        }

        try {
            // Atualizar o lead
            const updated = await window.leadsService.atualizarLead(
                leadId,
                { estagio: novoEstagio },
                this.supabase
            );

            if (!updated) throw new Error('Erro ao atualizar estágio');

            // Atualizar o lead nos dados locais
            const leadIndex = this.leadsData.findIndex(l => l.id === leadId);
            if (leadIndex !== -1) {
                this.leadsData[leadIndex].estagio = novoEstagio;
            }

            // Re-renderizar apenas a linha afetada
            this.renderContent();

            this.showNotification('Estágio atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar estágio:', error);
            this.showNotification('Erro ao atualizar estágio. Tente novamente.', 'error');
        }
    }

    async openDetails(leadId) {
        // Close action menu
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });

        const overlay = document.getElementById('lead-details-overlay');
        const sidemenu = document.getElementById('lead-details-sidemenu');
        const content = document.getElementById('lead-details-content');

        if (!overlay || !sidemenu || !content) {
            console.error('Elementos do sidemenu não encontrados');
            return;
        }

        // Mostrar sidemenu imediatamente com loading
        content.innerHTML = '<div style="padding: 2rem; text-align: center;"><div class="spinner"></div><p>Carregando...</p></div>';
        overlay.classList.add('active');

        if (!window.leadsService) {
            content.innerHTML = '<div style="padding: 2rem; color: #ef4444;">Erro: Serviço de leads não está disponível</div>';
            return;
        }

        try {
            const lead = await window.leadsService.buscarLeadPorId(leadId, this.supabase);
            if (!lead) {
                content.innerHTML = '<div style="padding: 2rem; color: #ef4444;">Lead não encontrado</div>';
                return;
            }

            content.innerHTML = this.renderLeadDetails(lead);

            // Update icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Erro ao carregar detalhes do lead:', error);
            content.innerHTML = '<div style="padding: 2rem; color: #ef4444;">Erro ao carregar detalhes do lead</div>';
        }
    }

    renderLeadDetails(lead) {
        const criadoEm = lead.criado_em
            ? new Date(lead.criado_em).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
            : '-';

        const whatsappNumber = lead.whatsapp || lead.telefone;
        const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}` : '#';
        const estagioInfo = this.getEstagioIcon(lead.estagio);

        return `
            <div class="detail-section">
                <h4>Informações Básicas</h4>
                <div class="detail-item">
                    <span class="detail-label">Nome:</span>
                    <span class="detail-value">${lead.nome || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">
                        ${lead.email ? `
                            <div class="contact-field formatted">
                                <i data-lucide="mail" class="contact-icon"></i>
                                <span class="contact-value copyable-text" onclick="leadsManager.copyToClipboard(event, '${lead.email}', 'Email copiado!')" title="Clique para copiar">${lead.email}</span>
                                <a href="mailto:${lead.email}" target="_blank" class="contact-action" title="Abrir cliente de email">
                                    <i data-lucide="external-link"></i>
                                </a>
                            </div>
                        ` : '<span class="no-info">Não informado</span>'}
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Telefone:</span>
                    <span class="detail-value">
                        ${lead.telefone ? `
                            <div class="contact-field formatted">
                                <i data-lucide="phone" class="contact-icon"></i>
                                <span class="contact-value copyable-text" onclick="leadsManager.copyToClipboard(event, '${lead.telefone}', 'Telefone copiado!')" title="Clique para copiar">${lead.telefone}</span>
                                ${whatsappNumber ? `
                                    <a href="${whatsappLink}" target="_blank" class="contact-action whatsapp-action" title="Abrir WhatsApp">
                                        <i data-lucide="message-circle"></i>
                                    </a>
                                ` : ''}
                            </div>
                        ` : '<span class="no-info">Não informado</span>'}
                    </span>
                </div>
                ${lead.telefone_secundario ? `
                <div class="detail-item">
                    <span class="detail-label">Telefone Secundário:</span>
                    <span class="detail-value">
                        <div class="contact-field formatted">
                            <i data-lucide="phone" class="contact-icon"></i>
                            <span class="contact-value copyable-text" onclick="leadsManager.copyToClipboard(event, '${lead.telefone_secundario}', 'Telefone copiado!')" title="Clique para copiar">${lead.telefone_secundario}</span>
                        </div>
                    </span>
                </div>
                ` : ''}
                ${lead.whatsapp ? `
                <div class="detail-item">
                    <span class="detail-label">WhatsApp:</span>
                    <span class="detail-value">
                        <div class="contact-field formatted">
                            <i data-lucide="message-circle" class="contact-icon whatsapp-icon"></i>
                            <span class="contact-value copyable-text" onclick="leadsManager.copyToClipboard(event, '${lead.whatsapp}', 'WhatsApp copiado!')" title="Clique para copiar">${lead.whatsapp}</span>
                            <a href="${whatsappLink}" target="_blank" class="contact-action whatsapp-action" title="Abrir WhatsApp">
                                <i data-lucide="external-link"></i>
                            </a>
                        </div>
                    </span>
                </div>
                ` : ''}
            </div>
            
            <div class="detail-section">
                <h4>Informações de Negócio</h4>
                <div class="detail-item">
                    <span class="detail-label">Estágio:</span>
                    <span class="detail-value">
                        <span style="display: inline-flex; align-items: center; gap: 0.5rem;">
                            <i data-lucide="${estagioInfo.icon}" style="color: ${estagioInfo.color}; width: 18px; height: 18px;"></i>
                            <span>${lead.estagio || 'Não informado'}</span>
                        </span>
                    </span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fonte:</span>
                    <span class="detail-value">${lead.fonte || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Canal:</span>
                    <span class="detail-value">${lead.canal || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Proprietário:</span>
                    <span class="detail-value">${lead.proprietario || 'Não informado'}</span>
                </div>
                ${lead.nome_formulario ? `
                <div class="detail-item">
                    <span class="detail-label">Nome do Formulário:</span>
                    <span class="detail-value">${lead.nome_formulario}</span>
                </div>
                ` : ''}
                ${lead.rotulos ? `
                <div class="detail-item">
                    <span class="detail-label">Rótulos:</span>
                    <span class="detail-value">${lead.rotulos}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="detail-section">
                <h4>Informações Adicionais</h4>
                <div class="detail-item">
                    <span class="detail-label">Conta de Anúncio:</span>
                    <span class="detail-value">${lead.conta_de_anuncio?.nome || lead.conta_de_anuncio_id || 'Não vinculado'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Criado em:</span>
                    <span class="detail-value">${criadoEm}</span>
                </div>
                ${lead.importado_em ? `
                <div class="detail-item">
                    <span class="detail-label">Importado em:</span>
                    <span class="detail-value">${new Date(lead.importado_em).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</span>
                </div>
                ` : ''}
            </div>
        `;
    }

    closeDetails() {
        const overlay = document.getElementById('lead-details-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    async openEditSideMenu(leadId) {
        // Close action menu
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });

        try {
            // Load lead data first
            await this.openEditModal(leadId);

            // Open sidemenu
            const overlay = document.getElementById('lead-edit-overlay');
            const sidemenu = document.getElementById('lead-edit-sidemenu');

            if (!overlay || !sidemenu) {
                console.error('Elementos do sidemenu de edição não encontrados');
                return;
            }

            // Atualizar título
            const title = sidemenu.querySelector('.details-header h3');
            if (title) {
                title.textContent = 'Editar Lead';
            }

            // Populate form in sidemenu
            if (this.currentEditingLead) {
                this.renderEditContasSelect();
                this.populateEditForm(this.currentEditingLead);
            }

            overlay.classList.add('active');

            // Update icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Erro ao abrir sidemenu de edição:', error);
            this.showNotification('Erro ao carregar dados do lead', 'error');
        }
    }

    populateEditForm(lead) {
        const form = document.getElementById('lead-edit-form');
        if (!form) return;

        if (document.getElementById('edit-lead-conta-anuncio')) {
            document.getElementById('edit-lead-conta-anuncio').value = lead.conta_de_anuncio_id || '';
        }
        if (document.getElementById('edit-lead-nome')) document.getElementById('edit-lead-nome').value = lead.nome || '';
        if (document.getElementById('edit-lead-email')) document.getElementById('edit-lead-email').value = lead.email || '';
        if (document.getElementById('edit-lead-telefone')) document.getElementById('edit-lead-telefone').value = lead.telefone || '';
        if (document.getElementById('edit-lead-telefone-secundario')) document.getElementById('edit-lead-telefone-secundario').value = lead.telefone_secundario || '';
        if (document.getElementById('edit-lead-whatsapp')) document.getElementById('edit-lead-whatsapp').value = lead.whatsapp || '';
        if (document.getElementById('edit-lead-fonte')) document.getElementById('edit-lead-fonte').value = lead.fonte || '';
        if (document.getElementById('edit-lead-nome-formulario')) document.getElementById('edit-lead-nome-formulario').value = lead.nome_formulario || '';
        if (document.getElementById('edit-lead-canal')) document.getElementById('edit-lead-canal').value = lead.canal || '';
        if (document.getElementById('edit-lead-estagio')) document.getElementById('edit-lead-estagio').value = lead.estagio || '';
        if (document.getElementById('edit-lead-proprietario')) document.getElementById('edit-lead-proprietario').value = lead.proprietario || '';
        if (document.getElementById('edit-lead-rotulos')) document.getElementById('edit-lead-rotulos').value = lead.rotulos || '';
    }

    closeEditSideMenu() {
        const overlay = document.getElementById('lead-edit-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        this.currentEditingLead = null;
    }

    showDeleteConfirmation(leadId) {
        this.pendingDeleteId = leadId;
        const modal = document.getElementById('deleteLeadModal');
        if (!modal) {
            console.error('Modal de confirmação não encontrado');
            return;
        }

        // Close action menu
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            menu.classList.remove('active');
        });

        modal.classList.add('is-active');

        // Update icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteLeadModal');
        if (modal) {
            modal.classList.remove('is-active');
        }
        this.pendingDeleteId = null;
    }

    // Bulk Import Functions
    async openBulkImportSideMenu() {
        const overlay = document.getElementById('bulk-import-overlay');
        const sidemenu = document.getElementById('bulk-import-sidemenu');

        if (!overlay || !sidemenu) {
            console.error('Elementos do sidemenu de importação em massa não encontrados');
            return;
        }

        // Garantir que as contas estão carregadas
        if (!this.contasDeAnuncio || this.contasDeAnuncio.length === 0) {
            await this.loadContasDeAnuncio();
        }

        // Renderizar select de contas
        this.renderBulkImportContasSelect();

        // Limpar formulário e preview
        this.resetBulkImportForm();

        // Abrir sidemenu
        overlay.classList.add('active');

        // Setup file input listener
        const fileInput = document.getElementById('bulk-import-files');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleBulkImportFileSelect(e));
        }

        // Update icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderBulkImportContasSelect() {
        const select = document.getElementById('bulk-import-conta-anuncio');
        if (select) {
            let html = '<option value="">Selecione uma conta...</option>';
            if (this.contasDeAnuncio && this.contasDeAnuncio.length > 0) {
                this.contasDeAnuncio.forEach(conta => {
                    html += `<option value="${conta.id}">${conta.nome || conta.id}</option>`;
                });
            }
            select.innerHTML = html;
        }
    }

    resetBulkImportForm() {
        const form = document.getElementById('bulk-import-form');
        if (form) {
            form.reset();
        }

        const filesList = document.getElementById('bulk-import-files-list');
        if (filesList) {
            filesList.innerHTML = '';
        }

        const preview = document.getElementById('bulk-import-preview');
        if (preview) {
            preview.style.display = 'none';
        }

        const log = document.getElementById('bulk-import-log');
        if (log) {
            log.style.display = 'none';
        }

        const startBtn = document.getElementById('start-bulk-import-btn');
        if (startBtn) {
            startBtn.disabled = true;
        }

        this.bulkImportFiles = [];
        this.bulkImportPreview = [];
    }

    async handleBulkImportFileSelect(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) {
            this.resetBulkImportForm();
            return;
        }

        this.bulkImportFiles = files;

        // Mostrar lista de arquivos
        const filesList = document.getElementById('bulk-import-files-list');
        if (filesList) {
            filesList.innerHTML = files.map((file, index) => `
                <div class="file-item">
                    <i data-lucide="file-text"></i>
                    <span>${file.name}</span>
                    <span class="file-size">(${this.formatFileSize(file.size)})</span>
                </div>
            `).join('');
        }

        // Parse e preview dos arquivos
        await this.previewBulkImportFiles(files);

        // Update icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async previewBulkImportFiles(files) {
        const preview = document.getElementById('bulk-import-preview');
        const previewBody = document.getElementById('preview-table-body');
        const fileCount = document.getElementById('preview-file-count');
        const leadsCount = document.getElementById('preview-leads-count');
        const startBtn = document.getElementById('start-bulk-import-btn');

        if (!preview || !previewBody) return;

        preview.style.display = 'block';
        previewBody.innerHTML = '<tr><td colspan="3" style="text-align: center;"><div class="spinner"></div> Processando arquivos...</td></tr>';

        this.bulkImportPreview = [];
        let totalLeads = 0;

        try {
            for (const file of files) {
                try {
                    const csvData = await this.parseCsv(file);
                    const leadsCount = csvData.filter(row => row['Nome']).length;
                    totalLeads += leadsCount;

                    this.bulkImportPreview.push({
                        file: file,
                        fileName: file.name,
                        leadsCount: leadsCount,
                        csvData: csvData,
                        status: 'ready'
                    });
                } catch (error) {
                    console.error(`Erro ao processar arquivo ${file.name}:`, error);
                    this.bulkImportPreview.push({
                        file: file,
                        fileName: file.name,
                        leadsCount: 0,
                        csvData: [],
                        status: 'error',
                        error: error.message
                    });
                }
            }

            // Renderizar preview
            previewBody.innerHTML = this.bulkImportPreview.map(item => `
                <tr>
                    <td>${item.fileName}</td>
                    <td>${item.leadsCount} lead(s)</td>
                    <td>
                        ${item.status === 'ready' ?
                    '<span class="status-badge success"><i data-lucide="check-circle"></i> Pronto</span>' :
                    `<span class="status-badge error"><i data-lucide="alert-circle"></i> Erro: ${item.error || 'Desconhecido'}</span>`
                }
                    </td>
                </tr>
            `).join('');

            if (fileCount) fileCount.textContent = files.length;
            if (leadsCount) leadsCount.textContent = totalLeads;

            // Habilitar botão se houver arquivos válidos e conta selecionada
            const contaSelect = document.getElementById('bulk-import-conta-anuncio');
            const hasValidFiles = this.bulkImportPreview.some(item => item.status === 'ready');
            const hasConta = contaSelect && contaSelect.value;

            if (startBtn) {
                startBtn.disabled = !(hasValidFiles && hasConta);
            }

            // Adicionar listener para mudança de conta
            if (contaSelect) {
                contaSelect.removeEventListener('change', this.bulkImportContaChangeHandler);
                this.bulkImportContaChangeHandler = () => {
                    const hasConta = contaSelect.value;
                    if (startBtn) {
                        startBtn.disabled = !(hasValidFiles && hasConta);
                    }
                };
                contaSelect.addEventListener('change', this.bulkImportContaChangeHandler);
            }

        } catch (error) {
            console.error('Erro ao fazer preview dos arquivos:', error);
            previewBody.innerHTML = `<tr><td colspan="3" style="color: #ef4444;">Erro ao processar arquivos: ${error.message}</td></tr>`;
        }

        // Update icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    async startBulkImport() {
        const contaSelect = document.getElementById('bulk-import-conta-anuncio');
        const startBtn = document.getElementById('start-bulk-import-btn');
        const logSection = document.getElementById('bulk-import-log');
        const logContent = document.getElementById('bulk-import-log-content');

        if (!contaSelect || !contaSelect.value) {
            this.showNotification('Por favor, selecione uma conta de anúncio', 'error');
            return;
        }

        const contaId = contaSelect.value;
        const validFiles = this.bulkImportPreview.filter(item => item.status === 'ready');

        if (validFiles.length === 0) {
            this.showNotification('Nenhum arquivo válido para importar', 'error');
            return;
        }

        // Desabilitar botão e mostrar log
        if (startBtn) {
            startBtn.disabled = true;
            startBtn.innerHTML = '<span class="spinner"></span> Importando...';
        }

        if (logSection) logSection.style.display = 'block';
        if (logContent) logContent.textContent = 'Iniciando importação em massa...\n';

        let totalImported = 0;
        let totalErrors = 0;

        try {
            for (const fileItem of validFiles) {
                if (logContent) {
                    logContent.textContent += `\nProcessando arquivo: ${fileItem.fileName}\n`;
                }

                try {
                    // Mapear dados do CSV para o formato da tabela
                    const leadsToImport = fileItem.csvData
                        .map(row => this.mapCsvToLeadData(row))
                        .filter(lead => lead.nome) // Filtrar leads sem nome
                        .map(lead => ({
                            ...lead,
                            conta_de_anuncio_id: contaId // Adicionar conta de anúncio
                        }));

                    if (leadsToImport.length === 0) {
                        if (logContent) logContent.textContent += `  Nenhum lead válido encontrado\n`;
                        continue;
                    }

                    if (logContent) logContent.textContent += `  Preparando ${leadsToImport.length} lead(s)...\n`;

                    // Importar em lotes
                    const batchSize = 100;
                    let imported = 0;
                    let errors = 0;

                    if (!window.leadsService) {
                        throw new Error('Serviço de leads não está disponível');
                    }

                    for (let i = 0; i < leadsToImport.length; i += batchSize) {
                        const batch = leadsToImport.slice(i, i + batchSize);
                        try {
                            const data = await window.leadsService.criarLeadsEmMassa(batch, this.supabase);
                            if (!data || data.length === 0) throw new Error('Nenhum lead foi importado');

                            imported += data.length;
                            if (logContent) {
                                logContent.textContent += `  Importados ${imported} de ${leadsToImport.length} lead(s)...\n`;
                            }
                        } catch (error) {
                            console.error('Erro ao importar lote:', error);
                            errors += batch.length;
                            if (logContent) {
                                logContent.textContent += `  Erro ao importar lote ${Math.floor(i / batchSize) + 1}: ${error.message}\n`;
                            }
                        }
                    }

                    totalImported += imported;
                    totalErrors += errors;

                    if (logContent) {
                        logContent.textContent += `  ✓ Arquivo processado: ${imported} importado(s), ${errors} erro(s)\n`;
                    }

                } catch (error) {
                    console.error(`Erro ao importar arquivo ${fileItem.fileName}:`, error);
                    totalErrors++;
                    if (logContent) {
                        logContent.textContent += `  ✗ Erro: ${error.message}\n`;
                    }
                }
            }

            if (logContent) {
                logContent.textContent += `\n=== Importação concluída ===\n`;
                logContent.textContent += `Total importado: ${totalImported} lead(s)\n`;
                if (totalErrors > 0) {
                    logContent.textContent += `Total de erros: ${totalErrors} lead(s)\n`;
                }
            }

            this.showNotification(`Importação concluída: ${totalImported} lead(s) importado(s)`, 'success');

            // Recarregar dados
            await this.loadData();
            this.renderContent();
            this.setupFormularioSearchbox(); // Atualizar formulários após importação

            // Fechar sidemenu após 3 segundos
            setTimeout(() => {
                this.closeBulkImportSideMenu();
            }, 3000);

        } catch (error) {
            console.error('Erro na importação em massa:', error);
            if (logContent) {
                logContent.textContent += `\nErro geral: ${error.message}\n`;
            }
            this.showNotification('Erro na importação. Verifique o log para detalhes.', 'error');
        } finally {
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.innerHTML = '<i data-lucide="upload-cloud"></i> Iniciar Importação';
            }

            // Update icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    closeBulkImportSideMenu() {
        const overlay = document.getElementById('bulk-import-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        this.resetBulkImportForm();
    }
}

// Export the class for dynamic import
export { LeadsManager };

