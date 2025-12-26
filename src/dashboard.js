class DashboardManager {
    constructor() {
        this.supabase = null;
        this.currentPeriod = 'thisMonth';
        this.selectedBrand = '';
        this.isLoading = false;
        this.dashboardData = {
            performance: [],
            budget: [],
            activities: [],
            campaigns: [],
            brands: []
        };
        this.charts = {};
        this.init();
    }

    async init() {
        // Aguardar os serviços estarem disponíveis
        await this.waitForServices();

        if (window.getSupabaseClient) {
            this.supabase = window.getSupabaseClient();
            await this.initializeDashboard();
        } else {
            console.error('Failed to load Supabase library');
            this.showError('Erro ao conectar com o banco de dados');
        }
    }

    async waitForServices(maxAttempts = 50, delay = 100) {
        for (let i = 0; i < maxAttempts; i++) {
            if (window.relatoriosService &&
                window.orcamentoService &&
                window.historicoOtimizacoesService &&
                window.campanhasService &&
                window.configService) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        console.warn('Services not fully loaded after waiting');
        return false;
    }

    async initializeDashboard() {
        this.setupEventListeners();

        // Use preloaded brands if available
        if (window.app?.dataStore?.brands.length > 0) {
            this.dashboardData.brands = window.app.dataStore.brands;
            this.populateBrandsFilter();
            await this.loadAllDashboardData();
        } else {
            await this.loadInitialData(); // Fallback if not preloaded
        }
    }

    setupEventListeners() {
        // Period filter
        const periodSelect = document.getElementById('dashboard-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.currentPeriod = e.target.value;
                this.updateDashboardData();
            });
        }

        // Brand filter
        const brandSelect = document.getElementById('dashboard-brand');
        if (brandSelect) {
            brandSelect.addEventListener('change', (e) => {
                this.selectedBrand = e.target.value;
                this.updateDashboardData();
            });
        }
    }

    populateBrandsFilter() {
        const brandSelect = document.getElementById('dashboard-brand');
        if (brandSelect) {
            brandSelect.innerHTML = '<option value="">Todas as Marcas</option>';
            this.dashboardData.brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.id;
                option.textContent = brand.nome;
                brandSelect.appendChild(option);
            });
        }
    }

    async loadInitialData() {
        this.showLoading();
        try {
            await this.loadBrandsFilter();
            await this.loadAllDashboardData();
        } catch (error) {
            console.error('Error during initial data load:', error);
            this.showError('Erro ao carregar dados iniciais');
        } finally {
            this.hideLoading();
        }
    }

    async loadBrandsFilter() {
        try {
            if (window.configService && window.configService.buscarMarcas) {
                const brands = await window.configService.buscarMarcas();
                this.dashboardData.brands = brands || [];
                this.populateBrandsFilter();
            } else {
                console.error('configService.buscarMarcas not available');
            }
        } catch (error) {
            console.error('Error loading brands:', error);
        }
    }

    getDateRange() {
        const today = new Date();
        let startDate, endDate;

        switch (this.currentPeriod) {
            case 'last7days':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6);
                endDate = new Date(today);
                break;
            case 'last30days':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 29);
                endDate = new Date(today);
                break;
            case 'thisMonth':
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
                break;
            case 'lastMonth':
                startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'thisYear':
                startDate = new Date(today.getFullYear(), 0, 1);
                endDate = new Date(today);
                break;
            default:
                startDate = new Date(today.getFullYear(), today.getMonth(), 1);
                endDate = new Date(today);
        }

        return {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        };
    }

    async updateDashboardData() {
        if (this.isLoading) return;
        this.showLoading();
        try {
            const dateRange = this.getDateRange();

            const [performanceData, campaignsData] = await Promise.all([
                this.loadPerformanceData(dateRange),
                this.loadCampaignsData(dateRange)
            ]);

            this.dashboardData.performance = performanceData;
            this.dashboardData.campaigns = campaignsData;

            this.renderAllWidgets();

        } catch (error) {
            console.error('Error updating dashboard data:', error);
            this.showError('Erro ao atualizar dados do dashboard');
        } finally {
            this.hideLoading();
        }
    }

    async loadAllDashboardData() {
        if (this.isLoading) return;
        this.showLoading();

        try {
            const dateRange = this.getDateRange();

            // Load all data in parallel
            const [
                performanceData,
                budgetData,
                activitiesData,
                campaignsData
            ] = await Promise.all([
                this.loadPerformanceData(dateRange),
                this.loadBudgetData(),
                this.loadActivitiesData(),
                this.loadCampaignsData(dateRange)
            ]);

            this.dashboardData = {
                ...this.dashboardData,
                performance: performanceData,
                budget: budgetData,
                activities: activitiesData,
                campaigns: campaignsData
            };

            this.renderAllWidgets();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Erro ao carregar dados da dashboard');
        } finally {
            this.hideLoading();
        }
    }

    async loadPerformanceData(dateRange) {
        try {
            if (!window.relatoriosService) {
                console.error('relatoriosService not available');
                return [];
            }

            // Buscar todos os relatórios usando o serviço
            const allReports = await window.relatoriosService.buscarTodosRelatorios();

            if (!allReports || allReports.length === 0) {
                return [];
            }

            // Filtrar por data
            let filteredReports = allReports.filter(report => {
                const reportDate = new Date(report.data_relatorio);
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                return reportDate >= startDate && reportDate <= endDate;
            });

            // Filtrar por marca se selecionada
            if (this.selectedBrand) {
                // Precisamos buscar as campanhas para filtrar por marca
                const campaigns = await window.campanhasService.buscarTodasCampanhas();
                const brandCampaignIds = campaigns
                    .filter(c => c.marca_id === this.selectedBrand)
                    .map(c => c.id);

                filteredReports = filteredReports.filter(report =>
                    brandCampaignIds.includes(report.campanha_id)
                );
            }

            // Ordenar por data (mais recente primeiro)
            filteredReports.sort((a, b) => {
                return new Date(b.data_relatorio) - new Date(a.data_relatorio);
            });

            return filteredReports || [];
        } catch (error) {
            console.error('Error loading performance data:', error);
            return [];
        }
    }

    async loadBudgetData() {
        try {
            if (!window.orcamentoService) {
                console.error('orcamentoService not available');
                return [];
            }

            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            // Buscar todos os orçamentos usando o serviço
            const allBudgets = await window.orcamentoService.buscarTodosOrcamentosMensais();

            if (!allBudgets || allBudgets.length === 0) {
                return [];
            }

            // Filtrar por mês e ano atual
            let filteredBudgets = allBudgets.filter(budget =>
                budget.mes === currentMonth && budget.ano === currentYear
            );

            // Filtrar por marca se selecionada
            if (this.selectedBrand) {
                filteredBudgets = filteredBudgets.filter(budget =>
                    budget.marca_id === this.selectedBrand
                );
            }

            // Buscar informações das marcas para cada orçamento
            if (window.configService && window.configService.buscarMarcas) {
                const brands = await window.configService.buscarMarcas();
                filteredBudgets = filteredBudgets.map(budget => {
                    const brand = brands.find(b => b.id === budget.marca_id);
                    return {
                        ...budget,
                        marcas: brand ? { nome: brand.nome } : null
                    };
                });
            }

            // Ordenar por meta_investimento_total (decrescente)
            filteredBudgets.sort((a, b) => {
                return (b.meta_investimento_total || 0) - (a.meta_investimento_total || 0);
            });

            return filteredBudgets || [];
        } catch (error) {
            console.error('Error loading budget data:', error);
            return [];
        }
    }

    async loadActivitiesData() {
        try {
            if (!window.historicoOtimizacoesService) {
                console.error('historicoOtimizacoesService not available');
                return [];
            }

            // Buscar histórico usando o serviço
            let activities = await window.historicoOtimizacoesService.buscarTodoHistorico();

            if (!activities || activities.length === 0) {
                return [];
            }

            // Filtrar por marca se selecionada
            if (this.selectedBrand) {
                activities = activities.filter(activity =>
                    activity.marca_id === this.selectedBrand
                );
            }

            // Ordenar por data_alteracao (mais recente primeiro) e limitar a 5
            activities.sort((a, b) => {
                const dateA = new Date(a.data_alteracao || a.criado_em);
                const dateB = new Date(b.data_alteracao || b.criado_em);
                return dateB - dateA;
            });

            return activities.slice(0, 5) || [];
        } catch (error) {
            console.error('Error loading activities data:', error);
            return [];
        }
    }

    async loadCampaignsData(dateRange) {
        try {
            if (!window.campanhasService) {
                console.error('campanhasService not available');
                return [];
            }

            // Buscar todas as campanhas usando o serviço
            let campaigns = await window.campanhasService.buscarTodasCampanhas();

            if (!campaigns || campaigns.length === 0) {
                return [];
            }

            // Filtrar por marca se selecionada
            if (this.selectedBrand) {
                campaigns = campaigns.filter(campaign =>
                    campaign.marca_id === this.selectedBrand
                );
            }

            // Ordenar por orçamento (decrescente)
            campaigns.sort((a, b) => {
                return (b.orcamento || 0) - (a.orcamento || 0);
            });

            return campaigns || [];
        } catch (error) {
            console.error('Error loading campaigns data:', error);
            return [];
        }
    }

    renderAllWidgets() {
        this.renderKPIs();
        this.renderBudget();
        this.renderCampaignPerformance();
        this.renderPerformanceChart();
        this.renderActivities();
    }

    renderKPIs() {
        const performanceData = this.dashboardData.performance;

        if (!performanceData) {
            this.renderEmptyKPIs();
            return;
        }

        const totals = this.calculateTotals(performanceData);
        const previousTotals = this.calculatePreviousPeriodTotals();

        // Total Investment
        const investmentChange = this.calculateChange(totals.custo, previousTotals.custo);
        document.getElementById('kpi-investment-value').textContent = this.formatCurrency(totals.custo);
        document.getElementById('kpi-investment-change').innerHTML = this.formatChangeIndicator(investmentChange);

        // Total Impressions
        const impressionsChange = this.calculateChange(totals.impressoes, previousTotals.impressoes);
        document.getElementById('kpi-impressions-value').textContent = this.formatNumber(totals.impressoes);
        document.getElementById('kpi-impressions-change').innerHTML = this.formatChangeIndicator(impressionsChange);

        // Total Clicks
        const clicksChange = this.calculateChange(totals.cliques, previousTotals.cliques);
        document.getElementById('kpi-clicks-value').textContent = this.formatNumber(totals.cliques);
        document.getElementById('kpi-clicks-change').innerHTML = this.formatChangeIndicator(clicksChange);

        // Total Conversions
        const conversionsChange = this.calculateChange(totals.conversoes, previousTotals.conversoes);
        document.getElementById('kpi-conversions-value').textContent = this.formatNumber(totals.conversoes);
        document.getElementById('kpi-conversions-change').innerHTML = this.formatChangeIndicator(conversionsChange);

        // CTR
        const ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;
        const previousCTR = previousTotals.impressoes > 0 ? (previousTotals.cliques / previousTotals.impressoes) * 100 : 0;
        const ctrChange = this.calculateChange(ctr, previousCTR);
        document.getElementById('kpi-ctr-value').textContent = this.formatPercentage(ctr);
        document.getElementById('kpi-ctr-change').innerHTML = this.formatChangeIndicator(ctrChange);

        // CPC
        const cpc = totals.cliques > 0 ? totals.custo / totals.cliques : 0;
        const previousCPC = previousTotals.cliques > 0 ? previousTotals.custo / previousTotals.cliques : 0;
        const cpcChange = this.calculateChange(cpc, previousCPC);
        document.getElementById('kpi-cpc-value').textContent = this.formatCurrency(cpc);
        document.getElementById('kpi-cpc-change').innerHTML = this.formatChangeIndicator(cpcChange, true); // Inverse for CPC
    }

    renderEmptyKPIs() {
        const kpiElements = [
            'kpi-investment-value', 'kpi-impressions-value', 'kpi-clicks-value',
            'kpi-conversions-value', 'kpi-ctr-value', 'kpi-cpc-value'
        ];

        kpiElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('investment') || id.includes('cpc')) {
                    element.textContent = 'R$ 0,00';
                } else if (id.includes('ctr')) {
                    element.textContent = '0,00%';
                } else {
                    element.textContent = '0';
                }
            }
        });

        const changeElements = [
            'kpi-investment-change', 'kpi-impressions-change', 'kpi-clicks-change',
            'kpi-conversions-change', 'kpi-ctr-change', 'kpi-cpc-change'
        ];

        changeElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '<span class="kpi-change neutral">Sem dados</span>';
            }
        });
    }

    renderBudget() {
        const budgetData = this.dashboardData.budget;
        const budgetContainer = document.getElementById('budget-overview-content');

        if (!budgetData) {
            budgetContainer.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="dollar-sign"></i>
                    <p>Nenhum orçamento encontrado para este período</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        if (budgetData.length === 0) {
            budgetContainer.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="dollar-sign"></i>
                    <p>Nenhum orçamento encontrado para este período</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        let html = '';
        let totalBudget = 0;
        let totalSpent = 0; // This would come from actual spending data

        budgetData.forEach(budget => {
            const total = budget.meta_investimento_total || 0;
            const spent = total * 0.65; // Simulated spending data - 65% spent
            const percentage = total > 0 ? (spent / total) * 100 : 0;

            totalBudget += total;
            totalSpent += spent;

            let statusClass = '';
            if (percentage >= 90) statusClass = 'danger';
            else if (percentage >= 75) statusClass = 'warning';

            html += `
                <div class="budget-item">
                    <div>
                        <div class="budget-label">${budget.marcas?.nome || 'Marca'}</div>
                        <div class="budget-amount">
                            ${this.formatCurrency(spent)} / ${this.formatCurrency(total)}
                        </div>
                        <div class="budget-bar">
                            <div class="budget-fill ${statusClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });

        // Add total summary
        const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        let totalStatusClass = '';
        if (totalPercentage >= 90) totalStatusClass = 'danger';
        else if (totalPercentage >= 75) totalStatusClass = 'warning';

        html = `
            <div class="budget-item" style="margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">
                <div>
                    <div class="budget-label" style="font-weight: 600;">Total Geral</div>
                    <div class="budget-amount" style="font-size: 1.125rem; font-weight: 700;">
                        ${this.formatCurrency(totalSpent)} / ${this.formatCurrency(totalBudget)}
                    </div>
                    <div class="budget-bar">
                        <div class="budget-fill ${totalStatusClass}" style="width: ${Math.min(totalPercentage, 100)}%"></div>
                    </div>
                </div>
            </div>
        ` + html;

        budgetContainer.innerHTML = html;
    }

    renderCampaignPerformance() {
        const campaignsData = this.dashboardData.campaigns;
        const performanceData = this.dashboardData.performance;
        const container = document.getElementById('campaign-performance-content');

        if (!campaignsData) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="trending-up"></i>
                    <p>Nenhuma campanha encontrada</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        if (campaignsData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="trending-up"></i>
                    <p>Nenhuma campanha encontrada</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        // Get top 5 campaigns by budget
        const topCampaigns = campaignsData.slice(0, 5);

        let html = '<div class="campaign-list">';

        topCampaigns.forEach(campaign => {
            // Find performance data for this campaign
            const campaignPerf = performanceData.find(p => p.campanha_id === campaign.id);
            const cost = campaignPerf?.custo || campaign.orcamento || 0;
            const conversions = campaignPerf?.conversoes || 0;

            // Buscar nome da marca
            const brandName = campaign.marca?.nome || campaign.marcas?.nome || 'Marca';
            // Buscar nome da plataforma
            const platformName = campaign.contas_de_anuncio?.plataformas?.nome ||
                campaign.conta_de_anuncio?.plataformas?.nome ||
                'Plataforma';

            html += `
                <div class="campaign-item">
                    <div class="campaign-info">
                        <h4>${campaign.nome || 'Campanha'}</h4>
                        <p>${brandName} • ${platformName}</p>
                    </div>
                    <div class="campaign-metrics">
                        <div class="metric-value">${this.formatCurrency(cost)}</div>
                        <div class="metric-label">${conversions} conversões</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderPerformanceChart() {
        const chartContainer = document.getElementById('performance-chart-content');

        // Placeholder for chart - would integrate with Chart.js or similar
        chartContainer.innerHTML = `
            <div class="chart-placeholder">
                <div style="text-align: center;">
                    <i data-lucide="bar-chart-3" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                    <p>Gráfico de Performance</p>
                    <p style="font-size: 0.875rem; color: #9ca3af;">
                        Integração com Chart.js será implementada aqui
                    </p>
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderActivities() {
        const activitiesData = this.dashboardData.activities;
        const container = document.getElementById('recent-activities-content');

        if (!activitiesData) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="activity"></i>
                    <p>Nenhuma atividade recente</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        if (activitiesData.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="activity"></i>
                    <p>Nenhuma atividade recente</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        let html = '<div class="activity-list">';

        activitiesData.forEach(activity => {
            const dateField = activity.data_alteracao || activity.criado_em;
            const timeAgo = this.getTimeAgo(dateField);
            const icon = this.getActivityIcon(activity.tipo_alteracao);
            const description = activity.descricao || activity.tipo_alteracao || 'Atividade';
            const entityName = activity.campanhas?.nome ||
                activity.marcas?.nome ||
                activity.plataformas?.nome ||
                'Sistema';

            html += `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i data-lucide="${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${description}</h4>
                        <p>${entityName}</p>
                    </div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    getActivityIcon(tipo) {
        switch (tipo) {
            case 'Orçamento': return 'dollar-sign';
            case 'Público': return 'users';
            case 'Criativo': return 'image';
            case 'Palavra-chave': return 'search';
            default: return 'edit';
        }
    }

    getTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays}d atrás`;
        } else if (diffHours > 0) {
            return `${diffHours}h atrás`;
        } else {
            return 'Agora';
        }
    }

    calculateChange(current, previous) {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    }

    calculateTotals(performanceData) {
        return performanceData.reduce((acc, report) => {
            acc.custo += report.custo || 0;
            acc.impressoes += report.impressoes || 0;
            acc.cliques += report.cliques || 0;
            acc.conversoes += report.conversoes || 0;
            return acc;
        }, { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 });
    }

    calculatePreviousPeriodTotals() {
        // This would ideally fetch data from the previous period
        // For now, return empty totals
        return {
            custo: 0,
            impressoes: 0,
            cliques: 0,
            conversoes: 0
        };
    }

    formatChangeIndicator(change, inverse = false) {
        if (change === 0) {
            return '<span class="kpi-change neutral">0%</span>';
        }

        const isPositive = inverse ? change < 0 : change > 0;
        const icon = isPositive ? 'arrow-up' : 'arrow-down';
        const className = isPositive ? 'positive' : 'negative';

        return `
            <span class="kpi-change ${className}">
                <i data-lucide="${icon}"></i>
                ${Math.abs(change).toFixed(1)}%
            </span>
        `;
    }

    showLoading() {
        this.isLoading = true;
        const loadingElement = document.getElementById('dashboard-loading');
        if (loadingElement) {
            loadingElement.style.display = 'flex';
        }
    }

    hideLoading() {
        this.isLoading = false;
        const loadingElement = document.getElementById('dashboard-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }

    showError(message) {
        const errorElement = document.getElementById('dashboard-error');
        if (errorElement) {
            errorElement.innerHTML = `<p>${message}</p>`;
            errorElement.style.display = 'block';
        }
        console.error('Dashboard Error:', message);
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(value || 0);
    }

    formatNumber(value) {
        return new Intl.NumberFormat('pt-BR').format(value || 0);
    }

    formatPercentage(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format((value || 0) / 100);
    }
}

// Global instance
window.dashboardManager = new DashboardManager();