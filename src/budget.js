class BudgetManager {
    constructor() {
        this.deleteTargetId = null;
        this.supabase = null;
        this.originalRowData = {}; // Store original values for reversion
        this.eventListenersSetup = false; // Flag to prevent duplicate listeners
    }

    async initialize() {
        try {
            if (window.getSupabaseClient) {
                this.supabase = window.getSupabaseClient();
                console.log('BudgetManager initialized with Supabase client');
            } else {
                throw new Error('Supabase client not available');
            }
        } catch (error) {
            console.error('Failed to initialize BudgetManager:', error);
            throw error;
        }
    }

    async renderBudgetPage() {
        // Ensure Supabase is initialized
        if (!this.supabase) {
            try {
                await this.initialize();
            } catch (error) {
                this.renderError('Erro ao inicializar sistema');
                return;
            }
        }

        const pageContent = document.querySelector('.page-content');
        pageContent.innerHTML = `
            <div class="budget-header">
                <h1>Orçamento</h1>
                <div class="budget-actions">
                    <button class="btn btn-secondary" data-action="add-budget-header">
                        <i data-lucide="plus"></i>
                        Adicionar Verba
                    </button>
                    <button class="btn btn-primary" onclick="app.navigate('/orcamento/novo', 'orcamento-novo')">
                        <i data-lucide="plus"></i>
                        Adicionar Orçamento de Modelo
                    </button>
                </div>
            </div>
            <div id="budget-content">
                <div class="loading">Carregando dados...</div>
            </div>
            
            <!-- Modals -->
            <div id="addBudgetModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Adicionar Verba Mensal</h2>
                        <button class="close-btn" data-action="close-modal" data-modal="addBudgetModal">&times;</button>
                    </div>
                    <form id="addBudgetForm">
                        <div class="form-group">
                            <label for="marca_id">Marca</label>
                            <select id="marca_id" name="marca_id" required>
                                <option value="">Selecione uma marca</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="meta_investimento_google">Meta Google Ads (R$)</label>
                            <input type="number" id="meta_investimento_google" name="meta_investimento_google" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="meta_investimento_meta">Meta Meta Ads (R$)</label>
                            <input type="number" id="meta_investimento_meta" name="meta_investimento_meta" step="0.01" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" data-action="close-modal" data-modal="addBudgetModal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="editInvestmentModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Editar Investimento</h2>
                        <button class="close-btn" data-action="close-modal" data-modal="editInvestmentModal">&times;</button>
                    </div>
                    <form id="editInvestmentForm">
                        <input type="hidden" id="edit_orcamento_id">
                        <div class="form-group">
                            <label for="edit_meta_google">Meta Google Ads (R$)</label>
                            <input type="number" id="edit_meta_google" name="meta_investimento_google" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="edit_meta_meta">Meta Meta Ads (R$)</label>
                            <input type="number" id="edit_meta_meta" name="meta_investimento_meta" step="0.01" required>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" data-action="close-modal" data-modal="editInvestmentModal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="deleteConfirmModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Confirmar Exclusão</h2>
                        <button class="close-btn" data-action="close-modal" data-modal="deleteConfirmModal">&times;</button>
                    </div>
                    <p>Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.</p>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary" data-action="close-modal" data-modal="deleteConfirmModal">Cancelar</button>
                        <button type="button" class="btn btn-danger" data-action="confirm-delete">Excluir</button>
                    </div>
                </div>
            </div>

            <div id="editBudgetModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Editar Orçamento</h2>
                        <button class="close-btn" data-action="close-modal" data-modal="editBudgetModal">&times;</button>
                    </div>
                    <form id="editBudgetForm">
                        <input type="hidden" id="edit_budget_id">
                        <div class="form-group">
                            <label for="edit_modelo_nome">Modelo</label>
                            <input type="text" id="edit_modelo_nome" readonly style="background: #f3f4f6;">
                        </div>
                        <div class="form-group">
                            <label for="edit_orcamento_diario">Orçamento Diário (R$)</label>
                            <input type="number" id="edit_orcamento_diario" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="edit_orcamento_total_readonly">Orçamento Total (R$)</label>
                            <input type="text" id="edit_orcamento_total_readonly" readonly style="background: #f3f4f6;">
                        </div>
                        <div class="form-group">
                            <label for="edit_resultados">Resultados Planejados</label>
                            <input type="number" id="edit_resultados" step="1" required>
                        </div>
                        <div class="form-group">
                            <label for="edit_observacoes_modal">Observações</label>
                            <textarea id="edit_observacoes_modal" rows="4"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-danger" data-action="open-delete-confirm">Excluir Orçamento</button>
                            <button type="button" class="btn btn-secondary" data-action="close-modal" data-modal="editBudgetModal">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>

            <div id="detailsModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Detalhes do Orçamento</h2>
                        <button class="close-btn" data-action="close-modal" data-modal="detailsModal">&times;</button>
                    </div>
                    <div style="padding: 1.5rem;">
                        <div class="details-info">
                            <div class="detail-row">
                                <span class="detail-label">Orçamento Semanal:</span>
                                <span class="detail-value" id="detail-weekly">-</span>
                            </div>
                            <div class="detail-row">
                                <span class="detail-label">Orçamento Total:</span>
                                <span class="detail-value" id="detail-total">-</span>
                            </div>
                        </div>
                        <form id="observationForm">
                            <input type="hidden" id="detail-budget-id">
                            <div class="form-group">
                                <label for="detail-observacoes">Observações:</label>
                                <textarea id="detail-observacoes" name="observacoes" rows="4" placeholder="Adicione suas observações aqui..."></textarea>
                            </div>
                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" data-action="close-modal" data-modal="detailsModal">Fechar</button>
                                <button type="submit" class="btn btn-primary">Salvar Observação</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        await this.loadBudgetData();
        await this.loadBrands();
        this.setupBudgetEventListeners();
        this.setupGlobalEventListeners();
        this.setupModalCloseListeners();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderError(message) {
        const pageContent = document.querySelector('.page-content');
        pageContent.innerHTML = `
            <div class="budget-header">
                <h1>Orçamento</h1>
            </div>
            <div class="error">
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

    async renderNewBudgetPage() {
        const pageContent = document.querySelector('.page-content');
        pageContent.innerHTML = `
            <div class="budget-header">
                <button class="btn btn-secondary" onclick="app.navigate('/orcamento', 'orcamento')">
                    <i data-lucide="arrow-left"></i>
                    Voltar
                </button>
                <h1>Novo Orçamento de Modelo</h1>
            </div>
            <form id="newBudgetModelForm" class="budget-form">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="orcamento_mensal_id">Orçamento Mensal</label>
                        <select id="orcamento_mensal_id" name="orcamento_mensal_id" required>
                            <option value="">Selecione um orçamento mensal</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="modelo_id">Modelo</label>
                        <select id="modelo_id" name="modelo_id" required>
                            <option value="">Selecione um modelo</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="conta_de_anuncio_id">Conta de Anúncio</label>
                        <select id="conta_de_anuncio_id" name="conta_de_anuncio_id" required>
                            <option value="">Selecione uma conta</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="orcamento_diario_planejado">Orçamento Diário (R$)</label>
                        <input type="number" id="orcamento_diario_planejado" name="orcamento_diario_planejado" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="orcamento_total_planejado">Orçamento Total (R$)</label>
                        <input type="number" id="orcamento_total_planejado" name="orcamento_total_planejado" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="resultados_planejados">Resultados Planejados</label>
                        <input type="number" id="resultados_planejados" name="resultados_planejados" step="1" required>
                    </div>
                    <div class="form-group full-width">
                        <label for="observacoes">Observações</label>
                        <textarea id="observacoes" name="observacoes" rows="3"></textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="app.navigate('/orcamento', 'orcamento')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Criar Orçamento</button>
                </div>
            </form>
        `;

        await this.loadNewBudgetFormData();
        this.setupNewBudgetFormListeners();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    async loadBudgetData() {
        try {
            // Verify user authentication before making database calls
            const user = await window.verifyUserSession();
            if (!user) {
                document.getElementById('budget-content').innerHTML = `
                    <div class="error">
                        <p>Você precisa estar logado para acessar os dados de orçamento.</p>
                        <button class="btn btn-primary" onclick="app.openAuthPanel()">Fazer Login</button>
                    </div>
                `;
                return;
            }

            console.log('Loading budget data for authenticated user:', user.email);
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            console.log(`Loading budgets for ${currentMonth}/${currentYear}`);

            // Load ad accounts with related data
            const { data: adAccounts, error: accountsError } = await this.supabase
                .from('contas_de_anuncio')
                .select(`
                    *,
                    plataformas(id, nome),
                    marcas_contas(marca_id, marcas(id, nome))
                `);

            if (accountsError) {
                console.error('Error loading ad accounts:', accountsError);
                throw accountsError;
            }
            console.log('Ad accounts:', adAccounts);

            // Load monthly budgets for current month/year
            const { data: monthlyBudgets, error: monthlyError } = await this.supabase
                .from('orcamento_mensal')
                .select(`
                    *,
                    marcas(nome)
                `)
                .eq('mes', currentMonth)
                .eq('ano', currentYear);

            if (monthlyError) {
                console.error('Error loading monthly budgets:', monthlyError);
                throw monthlyError;
            }
            console.log('Monthly budgets:', monthlyBudgets);

            // Load detailed budgets with joins
            const { data: detailedBudgets, error: detailedError } = await this.supabase
                .from('orcamento_detalhado')
                .select(`
                    *,
                    modelos(nome),
                    contas_de_anuncio(nome, plataforma_id, plataformas(nome))
                `);

            if (detailedError) {
                console.error('Error loading detailed budgets:', detailedError);
                throw detailedError;
            }
            console.log('Detailed budgets:', detailedBudgets);

            // Calculate brand totals for overview
            const brandTotals = this.calculateBrandTotals(monthlyBudgets);

            // Group data by ad accounts
            const accountGroups = this.groupDataByAccounts(adAccounts, monthlyBudgets, detailedBudgets);
            console.log('Account groups:', accountGroups);

            this.renderBudgetContent(brandTotals, accountGroups);

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } catch (error) {
            console.error('Error loading budget data:', error);

            let errorMessage = 'Erro ao carregar dados do orçamento';
            if (error.message.includes('permission denied')) {
                errorMessage = 'Acesso negado. Verifique se você está logado e tem as permissões necessárias.';
            }

            document.getElementById('budget-content').innerHTML = `
                <div class="error">
                    <p>${errorMessage}</p>
                    <button class="btn btn-primary" data-action="reload-budget">
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

    calculateBrandTotals(monthlyBudgets) {
        const brandTotals = {};

        monthlyBudgets.forEach(budget => {
            const brandName = budget.marcas?.nome;
            if (brandName) {
                if (!brandTotals[brandName]) {
                    brandTotals[brandName] = {
                        total: 0,
                        google: 0,
                        meta: 0
                    };
                }
                brandTotals[brandName].total += budget.meta_investimento_total || 0;
                brandTotals[brandName].google += budget.meta_investimento_google || 0;
                brandTotals[brandName].meta += budget.meta_investimento_meta || 0;
            }
        });

        return brandTotals;
    }

    groupDataByAccounts(adAccounts, monthlyBudgets, detailedBudgets) {
        const accountGroups = [];

        adAccounts.forEach(account => {
            // Get all brands associated with this account
            const accountBrands = account.marcas_contas?.map(mc => mc.marcas) || [];
            const brandIds = accountBrands.map(brand => brand.id);

            // Get monthly budgets for these brands
            const accountMonthlyBudgets = monthlyBudgets.filter(mb =>
                brandIds.includes(mb.marca_id)
            );

            // Get detailed budgets for this account
            const accountDetailedBudgets = detailedBudgets.filter(db =>
                db.conta_de_anuncio_id === account.id
            );

            // Calculate planned budget (sum of detailed budgets)
            const plannedBudget = accountDetailedBudgets.reduce((sum, db) =>
                sum + (db.orcamento_total_planejado || 0), 0
            );

            // Calculate platform-specific target investment
            const platformName = account.plataformas?.nome?.toLowerCase() || '';
            let platformTarget = 0;

            accountMonthlyBudgets.forEach(mb => {
                if (platformName.includes('meta')) {
                    platformTarget += mb.meta_investimento_meta || 0;
                } else {
                    platformTarget += mb.meta_investimento_google || 0;
                }
            });

            // Calculate balance
            const balance = platformTarget - plannedBudget;

            accountGroups.push({
                account: account,
                brands: accountBrands,
                monthlyBudgets: accountMonthlyBudgets,
                detailedBudgets: accountDetailedBudgets,
                investments: {
                    planned: plannedBudget,
                    target: platformTarget,
                    balance: balance
                }
            });
        });

        return accountGroups.filter(group => group.monthlyBudgets.length > 0 || group.detailedBudgets.length > 0);
    }

    renderBudgetContent(brandTotals, accountGroups) {
        const budgetContent = document.getElementById('budget-content');

        if (!accountGroups || accountGroups.length === 0) {
            budgetContent.innerHTML = `
                <div class="empty-state">
                    <p>Nenhum orçamento encontrado para este mês.</p>
                    <p>Use o botão "Adicionar Verba" para criar um novo orçamento mensal.</p>
                </div>
            `;
            return;
        }

        let html = '';

        // Brand Overview Section - Enhanced
        if (Object.keys(brandTotals).length > 0) {
            html += `
                <div class="budget-section brand-overview">
                    <div class="section-header">
                        <h2>Visão Geral de Investimentos por Marca</h2>
                    </div>
                    <div class="investment-cards">
            `;

            Object.entries(brandTotals).forEach(([brandName, totals]) => {
                html += `
                    <div class="investment-card">
                        <div class="card-header">
                            <h3>${brandName}</h3>
                            <span class="amount">R$ ${totals.total.toFixed(2)}</span>
                        </div>
                        <div class="card-breakdown">
                            <div class="breakdown-item">
                                <span class="breakdown-label">Google Ads:</span>
                                <span class="breakdown-value">R$ ${totals.google.toFixed(2)}</span>
                            </div>
                            <div class="breakdown-item">
                                <span class="breakdown-label">Meta Ads:</span>
                                <span class="breakdown-value">R$ ${totals.meta.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        }

        // Account Groups - Remove status class from planned budget card
        accountGroups.forEach(group => {
            const statusClass = group.investments.balance >= 0 ? 'status-ok' : 'status-over';

            html += `
                <div class="budget-section" data-account="${group.account.nome}">
                    <div class="section-header">
                        <h2>${group.account.nome}</h2>
                    </div>
                    
                    <div class="investment-cards">
                        <div class="investment-card">
                            <div class="card-header">
                                <h3>Orçamento Planejado</h3>
                                <span class="amount">R$ ${group.investments.planned.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="investment-card">
                            <div class="card-header">
                                <h3>Meta da Plataforma</h3>
                                <span class="amount">R$ ${group.investments.target.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="investment-card">
                            <div class="card-header">
                                <h3>Saldo</h3>
                                <span class="amount ${statusClass}">R$ ${group.investments.balance.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div class="budget-table-container">
                        <table class="budget-table">
                            <thead>
                                <tr>
                                    <th>Status</th>
                                    <th>Modelo</th>
                                    <th>Orç. Diário</th>
                                    <th>Orç. Total</th>
                                    <th>Results</th>
                                    <th>Custo/Res.</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderBudgetRows(group.detailedBudgets)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        budgetContent.innerHTML = html;

        // Setup event listeners for dynamically added buttons
        this.setupDynamicEventListeners();

        // Initialize lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderBudgetRows(detailedBudgets) {
        if (!detailedBudgets || detailedBudgets.length === 0) {
            return `
                <tr>
                    <td colspan="7" class="empty-state">
                        Nenhum orçamento detalhado encontrado. Use o botão "Adicionar Orçamento de Modelo" para criar um novo.
                    </td>
                </tr>
            `;
        }

        return detailedBudgets.map(budget => {
            const costPerResult = budget.resultados_planejados > 0 ?
                (budget.orcamento_total_planejado || 0) / budget.resultados_planejados : 0;

            return `
                <tr data-budget-id="${budget.id}">
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${budget.ativo ? 'checked' : ''} 
                                   data-action="toggle-status" data-budget-id="${budget.id}">
                            <span class="slider"></span>
                        </label>
                    </td>
                    <td>${budget.modelos?.nome || '-'}</td>
                    <td>
                        <input type="number" class="budget-input" value="${budget.orcamento_diario_planejado || 0}" 
                               step="0.01" data-field="orcamento_diario_planejado" data-budget-id="${budget.id}">
                    </td>
                    <td>
                        <span class="calculated-total" data-budget-id="${budget.id}">R$ ${(budget.orcamento_total_planejado || 0).toFixed(2)}</span>
                    </td>
                    <td>
                        <input type="number" class="budget-input results-input" value="${budget.resultados_planejados || 0}" 
                               step="1" data-field="resultados_planejados" data-budget-id="${budget.id}">
                    </td>
                    <td class="calculated">R$ ${costPerResult.toFixed(2)}</td>
                    <td style="position: relative;">
                        <div class="actions-menu">
                            <button class="btn-icon actions-trigger" data-action="toggle-menu" data-budget-id="${budget.id}">
                                <i data-lucide="more-vertical"></i>
                            </button>
                            <div class="actions-dropdown" id="actions-${budget.id}">
                                <button onclick="if(window.budgetManager) { window.budgetManager.openEditModal('${budget.id}'); }">
                                    <i data-lucide="edit"></i>
                                    Editar
                                </button>
                                <button onclick="if(window.budgetManager) { window.budgetManager.openDeleteConfirmModal('${budget.id}'); }" class="danger">
                                    <i data-lucide="trash-2"></i>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async loadBrands() {
        try {
            const user = await window.verifyUserSession();
            if (!user) {
                console.log('User not authenticated, skipping brands load');
                return;
            }

            const { data: brands, error } = await this.supabase
                .from('marcas')
                .select('id, nome')
                .order('nome');

            if (error) throw error;

            const marcaSelect = document.getElementById('marca_id');
            if (marcaSelect) {
                marcaSelect.innerHTML = '<option value="">Selecione uma marca</option>';
                brands.forEach(brand => {
                    marcaSelect.innerHTML += `<option value="${brand.id}">${brand.nome}</option>`;
                });
            }
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }

    async loadNewBudgetFormData() {
        try {
            const user = await window.verifyUserSession();
            if (!user) {
                this.renderError('Você precisa estar logado para criar novos orçamentos.');
                return;
            }

            // Load monthly budgets - Fix ordering syntax
            const { data: monthlyBudgets, error: monthlyError } = await this.supabase
                .from('orcamento_mensal')
                .select('id, marcas(nome), mes, ano')
                .order('ano', { ascending: false })
                .order('mes', { ascending: false });

            if (monthlyError) throw monthlyError;

            const orcamentoSelect = document.getElementById('orcamento_mensal_id');
            orcamentoSelect.innerHTML = '<option value="">Selecione um orçamento mensal</option>';
            monthlyBudgets.forEach(budget => {
                orcamentoSelect.innerHTML += `<option value="${budget.id}">${budget.marcas.nome} - ${budget.mes}/${budget.ano}</option>`;
            });

            // Load models
            const { data: models, error: modelsError } = await this.supabase
                .from('modelos')
                .select('id, nome')
                .order('nome');

            if (modelsError) throw modelsError;

            const modeloSelect = document.getElementById('modelo_id');
            modeloSelect.innerHTML = '<option value="">Selecione um modelo</option>';
            models.forEach(model => {
                modeloSelect.innerHTML += `<option value="${model.id}">${model.nome}</option>`;
            });

            // Load ad accounts
            const { data: accounts, error: accountsError } = await this.supabase
                .from('contas_de_anuncio')
                .select('id, nome, plataforma_id, plataformas(nome)')
                .order('nome');

            if (accountsError) throw accountsError;

            const contaSelect = document.getElementById('conta_de_anuncio_id');
            contaSelect.innerHTML = '<option value="">Selecione uma conta</option>';
            accounts.forEach(account => {
                contaSelect.innerHTML += `<option value="${account.id}">${account.nome} (${account.plataformas.nome})</option>`;
            });
        } catch (error) {
            console.error('Error loading form data:', error);
            this.renderError('Erro ao carregar dados do formulário: ' + error.message);
        }
    }

    setupBudgetEventListeners() {
        const addBudgetForm = document.getElementById('addBudgetForm');
        if (addBudgetForm) {
            addBudgetForm.addEventListener('submit', (e) => this.handleAddBudget(e));
        }

        const editInvestmentForm = document.getElementById('editInvestmentForm');
        if (editInvestmentForm) {
            editInvestmentForm.addEventListener('submit', (e) => this.handleEditInvestment(e));
        }

        const editBudgetForm = document.getElementById('editBudgetForm');
        if (editBudgetForm) {
            editBudgetForm.addEventListener('submit', (e) => this.handleEditBudget(e));
        }
    }

    setupHeaderEventListeners() {
        // This method is kept for compatibility but listeners are set up globally
    }

    setupDynamicEventListeners() {
        // Event listeners are set up globally in setupGlobalEventListeners
        // This method is kept for compatibility
    }

    setupGlobalEventListeners() {
        // Set up event listeners only once
        if (this.eventListenersSetup) {
            return;
        }
        this.eventListenersSetup = true;

        const manager = this;

        // Header Add Budget button
        document.addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="add-budget-header"]');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Header Add Budget button clicked');
                if (window.budgetManager && typeof window.budgetManager.openAddBudgetModal === 'function') {
                    window.budgetManager.openAddBudgetModal();
                } else {
                    console.error('budgetManager not available or openAddBudgetModal not found');
                }
            }
        });

        // Add Budget buttons in sections
        document.addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="add-budget"]');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add Budget button clicked');
                if (window.budgetManager && typeof window.budgetManager.openAddBudgetModal === 'function') {
                    window.budgetManager.openAddBudgetModal();
                } else {
                    console.error('budgetManager not available or openAddBudgetModal not found');
                }
            }
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', function (e) {
            if (!e.target.closest('.actions-menu')) {
                document.querySelectorAll('.actions-dropdown').forEach(menu => {
                    menu.classList.remove('active');
                });
            }
        });

        // Toggle Status checkboxes
        document.addEventListener('change', function (e) {
            const target = e.target.closest('[data-action="toggle-status"]');
            if (target) {
                const budgetId = target.getAttribute('data-budget-id');
                const isChecked = target.checked;
                console.log('Toggle status for:', budgetId, isChecked);
                if (budgetId) {
                    const mgr = manager || window.budgetManager;
                    if (mgr && typeof mgr.toggleBudgetStatus === 'function') {
                        mgr.toggleBudgetStatus(budgetId, isChecked);
                    }
                }
            }
        });

        // Input field changes
        document.addEventListener('input', function (e) {
            const target = e.target;
            if (target.classList.contains('budget-input')) {
                const budgetId = target.getAttribute('data-budget-id');
                const field = target.getAttribute('data-field');
                const value = target.value;
                if (budgetId && field) {
                    const mgr = manager || window.budgetManager;
                    if (mgr && typeof mgr.handleFieldChange === 'function') {
                        mgr.handleFieldChange(budgetId, field, value, target);
                    }
                }
            }
        });

        // Confirm changes button
        document.addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="confirm-changes"]');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                const budgetId = target.getAttribute('data-budget-id');
                console.log('Confirm changes for:', budgetId);
                if (budgetId) {
                    const mgr = manager || window.budgetManager;
                    if (mgr && typeof mgr.confirmRowChanges === 'function') {
                        mgr.confirmRowChanges(budgetId);
                    }
                }
            }
        });

        // Close modal buttons
        document.addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="close-modal"]');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                const modalId = target.getAttribute('data-modal');
                console.log('Close modal:', modalId);
                if (modalId) {
                    const mgr = manager || window.budgetManager;
                    if (mgr && typeof mgr.closeModal === 'function') {
                        mgr.closeModal(modalId);
                    }
                }
            }
        });

        // Confirm delete button
        document.addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="confirm-delete"]');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Confirm delete clicked');
                const mgr = manager || window.budgetManager;
                if (mgr && typeof mgr.confirmDelete === 'function') {
                    mgr.confirmDelete();
                }
            }
        });

        // Open delete confirm modal
        document.addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="open-delete-confirm"]');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Open delete confirm clicked');
                const mgr = manager || window.budgetManager;
                if (mgr && typeof mgr.openDeleteConfirmModal === 'function') {
                    mgr.openDeleteConfirmModal();
                }
            }
        });

        // Reload budget button
        document.addEventListener('click', function (e) {
            const target = e.target.closest('[data-action="reload-budget"]');
            if (target) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Reload budget clicked');
                const mgr = manager || window.budgetManager;
                if (mgr && typeof mgr.loadBudgetData === 'function') {
                    mgr.loadBudgetData();
                }
            }
        });
    }

    async openDetailsModal(budgetId) {
        try {
            // Get budget details
            const { data: budget, error } = await this.supabase
                .from('orcamento_detalhado')
                .select('*')
                .eq('id', budgetId)
                .single();

            if (error) throw error;

            // Calculate weekly budget
            const weeklyBudget = (budget.orcamento_diario_planejado || 0) * 7;

            // Populate modal fields
            document.getElementById('detail-budget-id').value = budgetId;
            document.getElementById('detail-weekly').textContent = `R$ ${weeklyBudget.toFixed(2)}`;
            document.getElementById('detail-total').textContent = `R$ ${(budget.orcamento_total_planejado || 0).toFixed(2)}`;
            document.getElementById('detail-observacoes').value = budget.observacoes || '';

            // Show modal
            const detailsModal = document.getElementById('detailsModal');
            if (detailsModal) {
                detailsModal.classList.add('is-active');
            }
        } catch (error) {
            console.error('Error loading budget details:', error);
            alert('Erro ao carregar detalhes: ' + error.message);
        }
    }

    async saveObservation(e) {
        e.preventDefault();
        try {
            const budgetId = document.getElementById('detail-budget-id').value;
            const observacoes = document.getElementById('detail-observacoes').value;

            const { error } = await this.supabase
                .from('orcamento_detalhado')
                .update({ observacoes })
                .eq('id', budgetId);

            if (error) throw error;

            this.closeModal('detailsModal');
            await this.loadBudgetData();
        } catch (error) {
            console.error('Error saving observation:', error);
            alert('Erro ao salvar observação: ' + error.message);
        }
    }

    setupNewBudgetFormListeners() {
        const newBudgetForm = document.getElementById('newBudgetModelForm');
        if (newBudgetForm) {
            newBudgetForm.addEventListener('submit', (e) => this.handleNewBudgetModel(e));
        }

        // Auto-calculate totals
        const diarioInput = document.getElementById('orcamento_diario_planejado');
        const totalInput = document.getElementById('orcamento_total_planejado');

        if (diarioInput && totalInput) {
            diarioInput.addEventListener('input', () => {
                const diario = parseFloat(diarioInput.value) || 0;
                totalInput.value = (diario * 30).toFixed(2);
            });

            totalInput.addEventListener('input', () => {
                const total = parseFloat(totalInput.value) || 0;
                diarioInput.value = (total / 30).toFixed(2);
            });
        }
    }

    async handleAddBudget(e) {
        e.preventDefault();
        try {
            const user = await window.verifyUserSession();
            if (!user) {
                alert('Você precisa estar logado para adicionar orçamentos.');
                return;
            }

            const formData = new FormData(e.target);
            const currentDate = new Date();

            const budgetData = {
                marca_id: formData.get('marca_id'),
                mes: currentDate.getMonth() + 1,
                ano: currentDate.getFullYear(),
                meta_investimento_google: parseFloat(formData.get('meta_investimento_google')),
                meta_investimento_meta: parseFloat(formData.get('meta_investimento_meta')),
                meta_investimento_total: parseFloat(formData.get('meta_investimento_google')) + parseFloat(formData.get('meta_investimento_meta'))
            };

            const { error } = await this.supabase
                .from('orcamento_mensal')
                .upsert(budgetData, {
                    onConflict: 'marca_id,mes,ano',
                    ignoreDuplicates: false
                });

            if (error) throw error;

            this.closeModal('addBudgetModal');
            await this.loadBudgetData();
        } catch (error) {
            console.error('Error adding budget:', error);
            alert('Erro ao adicionar orçamento: ' + error.message);
        }
    }

    async handleEditInvestment(e) {
        e.preventDefault();
        try {
            const formData = new FormData(e.target);
            const id = document.getElementById('edit_orcamento_id').value;

            const updateData = {
                meta_investimento_google: parseFloat(formData.get('meta_investimento_google')),
                meta_investimento_meta: parseFloat(formData.get('meta_investimento_meta'))
            };

            updateData.meta_investimento_total = updateData.meta_investimento_google + updateData.meta_investimento_meta;

            const { error } = await this.supabase
                .from('orcamento_mensal')
                .update(updateData)
                .eq('id', id);

            if (error) throw error;

            this.closeModal('editInvestmentModal');
            await this.loadBudgetData();
        } catch (error) {
            console.error('Error updating investment:', error);
            alert('Erro ao atualizar investimento: ' + error.message);
        }
    }

    async handleEditBudget(e) {
        e.preventDefault();
        try {
            const budgetId = document.getElementById('edit_budget_id').value;
            const dailyValue = parseFloat(document.getElementById('edit_orcamento_diario').value) || 0;
            const resultsValue = parseInt(document.getElementById('edit_resultados').value) || 0;
            const observacoes = document.getElementById('edit_observacoes_modal').value;

            const updateData = {
                orcamento_diario_planejado: dailyValue,
                orcamento_total_planejado: dailyValue * 30,
                resultados_planejados: resultsValue,
                observacoes: observacoes
            };

            const { error } = await this.supabase
                .from('orcamento_detalhado')
                .update(updateData)
                .eq('id', budgetId);

            if (error) throw error;

            this.closeModal('editBudgetModal');
            await this.loadBudgetData();
        } catch (error) {
            console.error('Error updating budget:', error);
            alert('Erro ao atualizar orçamento: ' + error.message);
        }
    }

    async toggleBudgetStatus(budgetId, isActive) {
        try {
            const { error } = await this.supabase
                .from('orcamento_detalhado')
                .update({ ativo: isActive })
                .eq('id', budgetId);

            if (error) throw error;
        } catch (error) {
            console.error('Error toggling budget status:', error);
            alert('Erro ao atualizar status: ' + error.message);
        }
    }

    async updateBudgetField(budgetId, field, value) {
        try {
            let updateData = {};

            if (field === 'orcamento_diario_planejado') {
                updateData.orcamento_diario_planejado = parseFloat(value) || 0;
                updateData.orcamento_total_planejado = (parseFloat(value) || 0) * 30;
            } else if (field === 'orcamento_total_planejado') {
                updateData.orcamento_total_planejado = parseFloat(value) || 0;
                updateData.orcamento_diario_planejado = (parseFloat(value) || 0) / 30;
            } else if (field === 'resultados_planejados') {
                updateData.resultados_planejados = parseInt(value) || 0;
            } else {
                updateData[field] = value;
            }

            const { error } = await this.supabase
                .from('orcamento_detalhado')
                .update(updateData)
                .eq('id', budgetId);

            if (error) throw error;

            // Update UI for calculated fields
            if (field === 'orcamento_diario_planejado' || field === 'orcamento_total_planejado') {
                const row = document.querySelector(`tr[data-budget-id="${budgetId}"]`);
                if (row) {
                    const diarioInput = row.querySelector('input[data-field="orcamento_diario_planejado"]');
                    const totalSpan = row.querySelector('span.calculated-total[data-budget-id]');

                    if (field === 'orcamento_diario_planejado' && totalSpan) {
                        totalSpan.textContent = `R$ ${updateData.orcamento_total_planejado.toFixed(2)}`;
                    } else if (field === 'orcamento_total_planejado' && diarioInput) {
                        diarioInput.value = updateData.orcamento_diario_planejado.toFixed(2);
                    }
                }
            }
        } catch (error) {
            console.error('Error updating budget field:', error);
            alert('Erro ao atualizar campo: ' + error.message);
        }
    }

    handleFieldChange(budgetId, field, value, inputElement) {
        // Store original data if not already stored
        if (!this.originalRowData[budgetId]) {
            const row = inputElement.closest('tr');
            if (!row) {
                console.error('Could not find row for budget:', budgetId);
                return;
            }

            const dailyInput = row.querySelector('input[data-field="orcamento_diario_planejado"]');
            const resultsInput = row.querySelector('input[data-field="resultados_planejados"]');

            if (!dailyInput || !resultsInput) {
                console.error('Could not find required inputs in row for budget:', budgetId);
                return;
            }

            this.originalRowData[budgetId] = {
                orcamento_diario_planejado: parseFloat(dailyInput.value) || 0,
                resultados_planejados: parseInt(resultsInput.value) || 0
            };
        }

        // Update calculated total in real-time
        if (field === 'orcamento_diario_planejado') {
            const totalSpan = document.querySelector(`span.calculated-total[data-budget-id="${budgetId}"]`);
            if (totalSpan) {
                const totalValue = (parseFloat(value) || 0) * 30;
                totalSpan.textContent = `R$ ${totalValue.toFixed(2)}`;

                // Update group cards in real-time
                this.updateGroupCardsRealTime();
            }
        }

        // Change action button to confirmation icon
        const actionBtn = document.querySelector(`button.action-btn[data-budget-id="${budgetId}"]`);
        if (actionBtn) {
            const icon = actionBtn.querySelector('i');
            if (icon) {
                icon.setAttribute('data-lucide', 'check');
                actionBtn.setAttribute('data-action', 'confirm-changes');
                actionBtn.setAttribute('data-budget-id', budgetId);

                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        }

        // Add blur event listener to inputs for reversion
        const row = inputElement.closest('tr');
        const dailyInput = row.querySelector('input[data-field="orcamento_diario_planejado"]');
        const resultsInput = row.querySelector('input[data-field="resultados_planejados"]');

        [dailyInput, resultsInput].forEach(input => {
            if (input) {
                input.addEventListener('blur', (e) => {
                    setTimeout(() => {
                        // Check if focus moved to another input in the same row
                        const activeElement = document.activeElement;
                        const activeRow = activeElement ? activeElement.closest('tr') : null;
                        const currentRow = input.closest('tr');

                        if (activeRow !== currentRow) {
                            this.revertRowChanges(budgetId);
                        }
                    }, 100);
                }, { once: true });
            }
        });
    }

    updateGroupCardsRealTime() {
        const sections = document.querySelectorAll('.budget-section[data-account]');

        sections.forEach(section => {
            const rows = section.querySelectorAll('tbody tr[data-budget-id]');
            let totalPlanned = 0;

            rows.forEach(row => {
                const totalSpan = row.querySelector('.calculated-total');
                const value = parseFloat(totalSpan.textContent.replace('R$ ', '').replace(',', '.')) || 0;
                totalPlanned += value;
            });

            const plannedCard = section.querySelector('.investment-card:first-child .amount');
            const balanceCard = section.querySelector('.investment-card:last-child .amount');
            const targetValue = parseFloat(section.querySelector('.investment-card:nth-child(2) .amount').textContent.replace('R$ ', '').replace(',', '.')) || 0;
            const balance = targetValue - totalPlanned;

            // Update planned card (remove status classes)
            plannedCard.textContent = `R$ ${totalPlanned.toFixed(2)}`;
            plannedCard.className = 'amount';

            // Update balance card
            const balanceStatusClass = balance >= 0 ? 'status-ok' : 'status-over';
            balanceCard.textContent = `R$ ${balance.toFixed(2)}`;
            balanceCard.className = `amount ${balanceStatusClass}`;
        });
    }

    async confirmRowChanges(budgetId) {
        try {
            const row = document.querySelector(`tr[data-budget-id="${budgetId}"]`);
            const dailyInput = row.querySelector('input[data-field="orcamento_diario_planejado"]');
            const resultsInput = row.querySelector('input[data-field="resultados_planejados"]');

            const dailyValue = parseFloat(dailyInput.value) || 0;
            const resultsValue = parseInt(resultsInput.value) || 0;
            const totalValue = dailyValue * 30;

            const updateData = {
                orcamento_diario_planejado: dailyValue,
                orcamento_total_planejado: totalValue,
                resultados_planejados: resultsValue
            };

            const { error } = await this.supabase
                .from('orcamento_detalhado')
                .update(updateData)
                .eq('id', budgetId);

            if (error) throw error;

            // Clear stored original data
            delete this.originalRowData[budgetId];

            // Reload page data to ensure consistency
            await this.loadBudgetData();
        } catch (error) {
            console.error('Error saving row changes:', error);
            alert('Erro ao salvar alterações: ' + error.message);
        }
    }

    revertRowChanges(budgetId) {
        const originalData = this.originalRowData[budgetId];
        if (!originalData) return;

        const row = document.querySelector(`tr[data-budget-id="${budgetId}"]`);
        if (!row) return;

        const dailyInput = row.querySelector('input[data-field="orcamento_diario_planejado"]');
        const resultsInput = row.querySelector('input[data-field="resultados_planejados"]');
        const totalSpan = row.querySelector('.calculated-total');
        const actionBtn = row.querySelector('.action-btn');

        if (!dailyInput || !resultsInput || !totalSpan || !actionBtn) return;

        // Revert values
        dailyInput.value = originalData.orcamento_diario_planejado;
        resultsInput.value = originalData.resultados_planejados;
        totalSpan.textContent = `R$ ${(originalData.orcamento_diario_planejado * 30).toFixed(2)}`;

        // Revert action button
        const icon = actionBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', 'more-vertical');
            actionBtn.setAttribute('data-action', 'edit-budget');
            actionBtn.setAttribute('data-budget-id', budgetId);
        }

        // Clear stored original data
        delete this.originalRowData[budgetId];

        // Update group cards
        this.updateGroupCardsRealTime();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    toggleActionsMenu(event, budgetId) {
        if (event) {
            event.stopPropagation();
        }

        // Close all other menus
        document.querySelectorAll('.actions-dropdown').forEach(menu => {
            if (menu.id !== `actions-${budgetId}`) {
                menu.classList.remove('active');
            }
        });

        // Toggle current menu
        const menu = document.getElementById(`actions-${budgetId}`);
        if (menu) {
            menu.classList.toggle('active');
        }
    }

    openAddBudgetModal() {
        console.log('openAddBudgetModal called');
        const modal = document.getElementById('addBudgetModal');
        if (modal) {
            modal.classList.add('is-active');
            console.log('Modal displayed with is-active class');
        } else {
            console.error('addBudgetModal not found');
        }
    }

    openEditInvestmentModal(id, googleMeta, metaMeta) {
        document.getElementById('edit_orcamento_id').value = id;
        document.getElementById('edit_meta_google').value = googleMeta;
        document.getElementById('edit_meta_meta').value = metaMeta;
        const editInvestmentModal = document.getElementById('editInvestmentModal');
        if (editInvestmentModal) {
            editInvestmentModal.classList.add('is-active');
        }
    }

    async openEditModal(budgetId) {
        try {
            console.log('openEditModal called with budgetId:', budgetId);

            // Close dropdown menu
            document.querySelectorAll('.actions-dropdown').forEach(menu => {
                menu.classList.remove('active');
            });

            // Get budget details
            const { data: budget, error } = await this.supabase
                .from('orcamento_detalhado')
                .select('*, modelos(nome)')
                .eq('id', budgetId)
                .single();

            if (error) throw error;

            console.log('Budget data loaded:', budget);

            // Populate modal fields
            const editBudgetIdField = document.getElementById('edit_budget_id');
            const editModeloNomeField = document.getElementById('edit_modelo_nome');
            const editOrcamentoDiarioField = document.getElementById('edit_orcamento_diario');
            const editOrcamentoTotalField = document.getElementById('edit_orcamento_total_readonly');
            const editResultadosField = document.getElementById('edit_resultados');
            const editObservacoesField = document.getElementById('edit_observacoes_modal');

            if (!editBudgetIdField || !editModeloNomeField || !editOrcamentoDiarioField ||
                !editOrcamentoTotalField || !editResultadosField || !editObservacoesField) {
                console.error('Modal fields not found');
                alert('Erro: Campos do modal não encontrados');
                return;
            }

            editBudgetIdField.value = budgetId;
            editModeloNomeField.value = budget.modelos?.nome || '-';
            editOrcamentoDiarioField.value = budget.orcamento_diario_planejado || 0;
            editOrcamentoTotalField.value = `R$ ${(budget.orcamento_total_planejado || 0).toFixed(2)}`;
            editResultadosField.value = budget.resultados_planejados || 0;
            editObservacoesField.value = budget.observacoes || '';

            // Remove existing listeners to avoid duplicates
            const dailyInput = editOrcamentoDiarioField;
            const totalInput = editOrcamentoTotalField;
            const newDailyInput = dailyInput.cloneNode(true);
            dailyInput.parentNode.replaceChild(newDailyInput, dailyInput);

            newDailyInput.addEventListener('input', () => {
                const dailyValue = parseFloat(newDailyInput.value) || 0;
                totalInput.value = `R$ ${(dailyValue * 30).toFixed(2)}`;
            });

            // Show modal
            const modal = document.getElementById('editBudgetModal');
            if (modal) {
                modal.classList.add('is-active');
                console.log('Edit modal displayed with is-active class');
            } else {
                console.error('editBudgetModal not found');
                alert('Erro: Modal de edição não encontrado');
            }
        } catch (error) {
            console.error('Error loading budget for edit:', error);
            alert('Erro ao carregar dados: ' + error.message);
        }
    }

    openDeleteConfirmModal(budgetId = null) {
        // If budgetId is provided directly (from dropdown), use it
        // Otherwise, get from edit modal
        if (!budgetId) {
            budgetId = document.getElementById('edit_budget_id')?.value;
        }

        if (!budgetId) {
            console.error('No budget ID provided for deletion');
            return;
        }

        this.deleteTargetId = budgetId;
        const modal = document.getElementById('deleteConfirmModal');
        if (modal) {
            modal.classList.add('is-active');
        } else {
            console.error('deleteConfirmModal not found');
        }
    }

    async confirmDelete() {
        try {
            if (!this.deleteTargetId) return;

            const { error } = await this.supabase
                .from('orcamento_detalhado')
                .delete()
                .eq('id', this.deleteTargetId);

            if (error) throw error;

            this.closeModal('deleteConfirmModal');
            this.closeModal('editBudgetModal');
            await this.loadBudgetData();
            this.deleteTargetId = null;
        } catch (error) {
            console.error('Error deleting budget:', error);
            alert('Erro ao excluir orçamento: ' + error.message);
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('is-active');
        }
    }

    setupModalCloseListeners() {
        // Close modal when clicking on overlay (outside modal content)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.classList.contains('is-active')) {
                e.target.classList.remove('is-active');
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.is-active').forEach(modal => {
                    modal.classList.remove('is-active');
                });
            }
        });
    }
}

// Initialize budget manager
// Global instance
window.budgetManager = new BudgetManager();