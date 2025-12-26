class RelatoriosManager {
    constructor() {
        this.supabase = null;
        this.currentMode = 'performance'; // 'performance' or 'comparison'
        this.currentData = null;
        this.previousData = null;
        this.allItems = []; // Para busca no modo comparação
        this.selectedItems = []; // Itens selecionados para comparação
        this.isLoading = false;
        this.init();
    }

    async init() {
        if (window.getSupabaseClient) {
            this.supabase = window.getSupabaseClient();
            await this.initializePage();
        } else {
            console.error('Failed to load Supabase library');
            this.showError('Erro ao conectar com o banco de dados');
        }
    }

    async initializePage() {
        // Set default date range (first day of current month to today)
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        document.getElementById('report-start-date').value = firstDayOfMonth.toISOString().split('T')[0];
        document.getElementById('report-end-date').value = today.toISOString().split('T')[0];
        document.getElementById('comparison-start-date').value = firstDayOfMonth.toISOString().split('T')[0];
        document.getElementById('comparison-end-date').value = today.toISOString().split('T')[0];

        // Setup event listeners
        this.setupEventListeners();

        // Load initial data
        await this.loadAccountsForFilter();
        await this.loadReportData();
    }

    setupEventListeners() {
        // Period preset for performance mode
        const periodPreset = document.getElementById('period-preset');
        periodPreset.addEventListener('change', (e) => {
            this.handlePeriodPresetChange(e.target.value);
        });

        // Search functionality for comparison mode
        const itemSearch = document.getElementById('item-search');
        itemSearch.addEventListener('input', (e) => {
            this.handleItemSearch(e.target.value);
        });
    }

    toggleMode() {
        const isPerformance = this.currentMode === 'performance';
        this.currentMode = isPerformance ? 'comparison' : 'performance';

        // Update UI elements
        const performanceFilters = document.getElementById('performance-filters');
        const comparisonFilters = document.getElementById('comparison-filters');
        const performanceKpis = document.getElementById('performance-kpis');
        const comparisonKpis = document.getElementById('comparison-kpis');
        const modeToggleText = document.getElementById('mode-toggle-text');
        const reportTitle = document.getElementById('report-section-title');

        if (isPerformance) {
            // Switch to comparison mode
            performanceFilters.style.display = 'none';
            comparisonFilters.style.display = 'block';
            performanceKpis.style.display = 'none';
            comparisonKpis.style.display = 'grid';
            modeToggleText.textContent = 'Modo Performance';
            reportTitle.textContent = 'Comparação Direta de Itens';

            // Load items for search
            this.loadAllItemsForSearch();
            this.clearReport();
        } else {
            // Switch to performance mode
            performanceFilters.style.display = 'block';
            comparisonFilters.style.display = 'none';
            performanceKpis.style.display = 'grid';
            comparisonKpis.style.display = 'none';
            modeToggleText.textContent = 'Comparar';
            reportTitle.textContent = 'Relatório Detalhado - Performance vs Período Anterior';

            // Load performance data
            this.loadReportData();
        }
    }

    async loadAccountsForFilter() {
        try {
            const { data, error } = await this.supabase
                .from('contas_de_anuncio')
                .select('id, nome, plataformas(nome)')
                .order('nome');

            if (error) throw error;

            const accountSelect = document.getElementById('filter-account');
            accountSelect.innerHTML = '<option value="">Todas as Contas</option>';

            data.forEach(account => {
                const option = document.createElement('option');
                option.value = account.id;
                option.textContent = `${account.nome} (${account.plataformas?.nome || 'N/A'})`;
                accountSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    }

    async loadAllItemsForSearch() {
        try {
            const { data, error } = await this.supabase
                .from('campanhas')
                .select(`
                    id, nome,
                    marcas(nome),
                    contas_de_anuncio(nome, plataformas(nome)),
                    grupos_de_anuncios(id, nome),
                    criativos(id, tipo, titulos)
                `);

            if (error) throw error;

            this.allItems = [];

            data.forEach(campaign => {
                // Add campaign
                this.allItems.push({
                    id: campaign.id,
                    type: 'campanha',
                    name: campaign.nome,
                    displayName: `${campaign.nome} (Campanha)`,
                    marca: campaign.marcas?.nome,
                    conta: campaign.contas_de_anuncio?.nome,
                    plataforma: campaign.contas_de_anuncio?.plataformas?.nome
                });

                // Add ad groups
                campaign.grupos_de_anuncios?.forEach(group => {
                    this.allItems.push({
                        id: group.id,
                        type: 'grupo_de_anuncio',
                        name: group.nome,
                        displayName: `${group.nome} (Grupo de Anúncio)`,
                        campaign: campaign.nome,
                        marca: campaign.marcas?.nome,
                        conta: campaign.contas_de_anuncio?.nome
                    });
                });

                // Add creatives
                campaign.criativos?.forEach(creative => {
                    const creativeName = creative.titulos ?
                        creative.titulos.split(',')[0] :
                        `${creative.tipo} Creative`;

                    this.allItems.push({
                        id: creative.id,
                        type: 'criativo',
                        name: creativeName,
                        displayName: `${creativeName} (Criativo)`,
                        campaign: campaign.nome,
                        marca: campaign.marcas?.nome,
                        conta: campaign.contas_de_anuncio?.nome
                    });
                });
            });
        } catch (error) {
            console.error('Error loading items for search:', error);
        }
    }

    handleItemSearch(query) {
        const resultsContainer = document.getElementById('search-results');

        if (!query || query.length < 2) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
            return;
        }

        const filteredItems = this.allItems.filter(item =>
            item.displayName.toLowerCase().includes(query.toLowerCase()) ||
            item.marca?.toLowerCase().includes(query.toLowerCase()) ||
            item.conta?.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10); // Limit to 10 results

        if (filteredItems.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">Nenhum item encontrado</div>';
        } else {
            resultsContainer.innerHTML = filteredItems.map(item => `
                <div class="search-result-item" onclick="relatoriosManager.selectItem('${item.type}', ${item.id}, '${item.displayName.replace(/'/g, "\\'")}')">
                    <div class="item-name">${item.displayName}</div>
                    <div class="item-details">${item.marca} • ${item.conta}</div>
                </div>
            `).join('');
        }

        resultsContainer.style.display = 'block';
    }

    selectItem(type, id, displayName) {
        // Check if item already selected
        const exists = this.selectedItems.some(item => item.type === type && item.id === id);
        if (exists) return;

        // Add to selected items
        this.selectedItems.push({ type, id, displayName });

        // Update UI
        this.updateSelectedItemsUI();

        // Clear search
        document.getElementById('item-search').value = '';
        document.getElementById('search-results').style.display = 'none';
    }

    removeSelectedItem(index) {
        this.selectedItems.splice(index, 1);
        this.updateSelectedItemsUI();
    }

    updateSelectedItemsUI() {
        const container = document.getElementById('selected-items-container');

        if (this.selectedItems.length === 0) {
            container.innerHTML = '<div class="no-items">Nenhum item selecionado</div>';
            return;
        }

        container.innerHTML = this.selectedItems.map((item, index) => `
            <div class="selected-item-tag">
                <span>${item.displayName}</span>
                <button onclick="relatoriosManager.removeSelectedItem(${index})" class="remove-item">
                    <i data-lucide="x"></i>
                </button>
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    handlePeriodPresetChange(preset) {
        if (!preset) return; // Custom period selected

        const today = new Date();
        let startDate, endDate;

        switch (preset) {
            case 'last7days':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 6);
                endDate = new Date(today);
                break;
            case 'last15days':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 14);
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
            case 'last6months':
                startDate = new Date(today);
                startDate.setMonth(today.getMonth() - 6);
                endDate = new Date(today);
                break;
            default:
                return;
        }

        document.getElementById('report-start-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('report-end-date').value = endDate.toISOString().split('T')[0];

        // Auto-apply filters when preset is selected
        this.loadReportData();
    }

    calculatePreviousPeriod(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = end.getTime() - start.getTime();

        const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000); // Day before start
        const prevStart = new Date(prevEnd.getTime() - diffTime);

        return {
            start: prevStart.toISOString().split('T')[0],
            end: prevEnd.toISOString().split('T')[0]
        };
    }

    async applyFilters() {
        document.getElementById('period-preset').value = '';
        await this.loadReportData();
    }

    async applyComparisonFilters() {
        if (this.selectedItems.length === 0) {
            this.showError('Selecione pelo menos um item para comparar');
            return;
        }
        await this.loadComparisonData();
    }

    async loadReportData() {
        if (this.currentMode !== 'performance') return;

        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        const accountFilter = document.getElementById('filter-account').value;

        if (!startDate || !endDate) {
            this.showError('Por favor, selecione as datas de início e fim');
            return;
        }

        if (startDate > endDate) {
            this.showError('A data de início deve ser anterior à data de fim');
            return;
        }

        this.showLoading();

        try {
            // Calculate previous period
            const previousPeriod = this.calculatePreviousPeriod(startDate, endDate);

            // Build query
            let query = this.supabase
                .from('relatorio_performance')
                .select(`
                    *,
                    campanhas!inner(
                        id, nome,
                        marca_id,
                        marcas!inner(nome),
                        conta_de_anuncio_id,
                        contas_de_anuncio!inner(
                            nome,
                            plataforma_id,
                            plataformas!inner(nome)
                        )
                    )
                `);

            // Apply account filter if selected
            if (accountFilter) {
                query = query.eq('campanhas.conta_de_anuncio_id', accountFilter);
            }

            // Get current period data
            const { data: currentData, error: currentError } = await query
                .gte('data_relatorio', startDate)
                .lte('data_relatorio', endDate)
                .order('data_relatorio', { ascending: false });

            if (currentError) throw currentError;

            // Get previous period data
            const { data: previousData, error: previousError } = await query
                .gte('data_relatorio', previousPeriod.start)
                .lte('data_relatorio', previousPeriod.end)
                .order('data_relatorio', { ascending: false });

            if (previousError) throw previousError;

            this.currentData = currentData || [];
            this.previousData = previousData || [];

            this.processAndRenderPerformanceData();
            this.hideLoading();

        } catch (error) {
            console.error('Error loading report data:', error);
            this.showError('Erro ao carregar dados do relatório');
            this.hideLoading();
        }
    }

    async loadComparisonData() {
        if (this.currentMode !== 'comparison') return;

        const startDate = document.getElementById('comparison-start-date').value;
        const endDate = document.getElementById('comparison-end-date').value;

        if (!startDate || !endDate) {
            this.showError('Por favor, selecione as datas de início e fim');
            return;
        }

        this.showLoading();

        try {
            // Build WHERE clause for selected items
            const campaignIds = this.selectedItems.filter(item => item.type === 'campanha').map(item => item.id);

            if (campaignIds.length === 0) {
                this.showError('Selecione pelo menos uma campanha para comparar');
                this.hideLoading();
                return;
            }

            const { data, error } = await this.supabase
                .from('relatorio_performance')
                .select(`
                    *,
                    campanhas!inner(
                        id, nome,
                        marcas(nome),
                        contas_de_anuncio(nome, plataformas(nome))
                    )
                `)
                .in('campanha_id', campaignIds)
                .gte('data_relatorio', startDate)
                .lte('data_relatorio', endDate)
                .order('data_relatorio', { ascending: false });

            if (error) throw error;

            this.currentData = data || [];
            this.processAndRenderComparisonData();
            this.hideLoading();

        } catch (error) {
            console.error('Error loading comparison data:', error);
            this.showError('Erro ao carregar dados de comparação');
            this.hideLoading();
        }
    }

    processAndRenderPerformanceData() {
        const currentTotals = this.calculateTotals(this.currentData);
        const previousTotals = this.calculateTotals(this.previousData);

        this.updatePerformanceKPIs(currentTotals, previousTotals);
        this.renderHierarchicalPerformanceReport(this.currentData, this.previousData);
    }

    processAndRenderComparisonData() {
        const totals = this.calculateTotals(this.currentData);
        this.updateComparisonKPIs(totals);
        this.renderComparisonReport(this.currentData);
    }

    updatePerformanceKPIs(current, previous) {
        const metrics = ['custo', 'impressoes', 'cliques', 'conversoes'];

        metrics.forEach(metric => {
            const currentValue = current[metric] || 0;
            const previousValue = previous[metric] || 0;
            const variation = previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;

            document.getElementById(`kpi-total-${metric === 'custo' ? 'investido' : metric === 'conversoes' ? 'conversoes' : metric}`).textContent =
                metric === 'custo' ? this.formatCurrency(currentValue) : this.formatNumber(currentValue);

            document.getElementById(`kpi-total-${metric === 'custo' ? 'investido' : metric === 'conversoes' ? 'conversoes' : metric}-prev`).textContent =
                metric === 'custo' ? this.formatCurrency(previousValue) : this.formatNumber(previousValue);

            const variationElement = document.getElementById(`kpi-total-${metric === 'custo' ? 'investido' : metric === 'conversoes' ? 'conversoes' : metric}-var`);
            variationElement.textContent = this.formatVariation(variation);
            variationElement.className = `kpi-value ${variation >= 0 ? 'positive' : 'negative'}`;
        });

        // Calculate and update derived metrics
        const currentCTR = current.impressoes > 0 ? (current.cliques / current.impressoes) * 100 : 0;
        const previousCTR = previous.impressoes > 0 ? (previous.cliques / previous.impressoes) * 100 : 0;
        const ctrVariation = previousCTR > 0 ? ((currentCTR - previousCTR) / previousCTR) * 100 : 0;

        const currentCPC = current.cliques > 0 ? current.custo / current.cliques : 0;
        const previousCPC = previous.cliques > 0 ? previous.custo / previous.cliques : 0;
        const cpcVariation = previousCPC > 0 ? ((currentCPC - previousCPC) / previousCPC) * 100 : 0;

        document.getElementById('kpi-ctr-medio').textContent = this.formatPercentage(currentCTR);
        document.getElementById('kpi-ctr-medio-prev').textContent = this.formatPercentage(previousCTR);
        const ctrVarElement = document.getElementById('kpi-ctr-medio-var');
        ctrVarElement.textContent = this.formatVariation(ctrVariation);
        ctrVarElement.className = `kpi-value ${ctrVariation >= 0 ? 'positive' : 'negative'}`;

        document.getElementById('kpi-cpc-medio').textContent = this.formatCurrency(currentCPC);
        document.getElementById('kpi-cpc-medio-prev').textContent = this.formatCurrency(previousCPC);
        const cpcVarElement = document.getElementById('kpi-cpc-medio-var');
        cpcVarElement.textContent = this.formatVariation(cpcVariation);
        cpcVarElement.className = `kpi-value ${cpcVariation <= 0 ? 'positive' : 'negative'}`; // Lower CPC is better
    }

    updateComparisonKPIs(totals) {
        const ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;
        const cpc = totals.cliques > 0 ? totals.custo / totals.cliques : 0;

        document.getElementById('kpi-comparison-investido').textContent = this.formatCurrency(totals.custo);
        document.getElementById('kpi-comparison-impressoes').textContent = this.formatNumber(totals.impressoes);
        document.getElementById('kpi-comparison-cliques').textContent = this.formatNumber(totals.cliques);
        document.getElementById('kpi-comparison-conversoes').textContent = this.formatNumber(totals.conversoes);
        document.getElementById('kpi-comparison-ctr').textContent = this.formatPercentage(ctr);
        document.getElementById('kpi-comparison-cpc').textContent = this.formatCurrency(cpc);
    }

    renderHierarchicalPerformanceReport(currentData, previousData) {
        const container = document.getElementById('detailed-report-container');

        if (!currentData || currentData.length === 0) {
            this.showEmptyState();
            return;
        }

        const hierarchicalData = this.buildHierarchy(currentData, previousData);

        let html = '<div class="hierarchical-report">';

        for (const accountKey in hierarchicalData) {
            html += this.buildAccountSection(hierarchicalData[accountKey]);
        }

        html += '</div>';
        container.innerHTML = html;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    buildHierarchy(currentData, previousData) {
        const hierarchy = {};

        const processData = (data, period) => {
            if (!data) return;

            data.forEach(item => {
                const campaignInfo = item.campanhas;
                if (!campaignInfo || !campaignInfo.contas_de_anuncio || !campaignInfo.marcas) return;

                const account = campaignInfo.contas_de_anuncio;
                const platform = account.plataformas;
                const brand = campaignInfo.marcas;

                const accountKey = `${account.nome} (${platform.nome})`;
                const brandKey = brand.nome;
                const campaignKey = campaignInfo.id;

                // Account Level
                if (!hierarchy[accountKey]) {
                    hierarchy[accountKey] = {
                        name: account.nome,
                        platform: platform.nome,
                        brands: {},
                        current: { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 },
                        previous: { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 }
                    };
                }

                // Brand Level
                if (!hierarchy[accountKey].brands[brandKey]) {
                    hierarchy[accountKey].brands[brandKey] = {
                        name: brand.nome,
                        campaigns: {},
                        current: { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 },
                        previous: { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 }
                    };
                }

                // Campaign Level
                if (!hierarchy[accountKey].brands[brandKey].campaigns[campaignKey]) {
                    hierarchy[accountKey].brands[brandKey].campaigns[campaignKey] = {
                        id: campaignInfo.id,
                        name: campaignInfo.nome,
                        current: { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 },
                        previous: { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 }
                    };
                }

                // Aggregate metrics
                const metrics = {
                    custo: parseFloat(item.custo) || 0,
                    impressoes: parseInt(item.impressoes) || 0,
                    cliques: parseInt(item.cliques) || 0,
                    conversoes: parseInt(item.conversoes) || 0,
                };

                hierarchy[accountKey][period].custo += metrics.custo;
                hierarchy[accountKey].brands[brandKey][period].custo += metrics.custo;
                hierarchy[accountKey].brands[brandKey].campaigns[campaignKey][period].custo += metrics.custo;

                hierarchy[accountKey][period].impressoes += metrics.impressoes;
                hierarchy[accountKey].brands[brandKey][period].impressoes += metrics.impressoes;
                hierarchy[accountKey].brands[brandKey].campaigns[campaignKey][period].impressoes += metrics.impressoes;

                hierarchy[accountKey][period].cliques += metrics.cliques;
                hierarchy[accountKey].brands[brandKey][period].cliques += metrics.cliques;
                hierarchy[accountKey].brands[brandKey].campaigns[campaignKey][period].cliques += metrics.cliques;

                hierarchy[accountKey][period].conversoes += metrics.conversoes;
                hierarchy[accountKey].brands[brandKey][period].conversoes += metrics.conversoes;
                hierarchy[accountKey].brands[brandKey].campaigns[campaignKey][period].conversoes += metrics.conversoes;
            });
        };

        processData(currentData, 'current');
        processData(previousData, 'previous');

        return hierarchy;
    }

    buildAccountSection(accountData) {
        let brandsHtml = '';
        for (const brandKey in accountData.brands) {
            brandsHtml += this.buildBrandSection(accountData.brands[brandKey]);
        }
        return `
            <div class="account-section">
                <div class="account-header">
                    <h3>${accountData.name} (${accountData.platform})</h3>
                </div>
                <div class="account-body">
                    ${brandsHtml}
                </div>
            </div>
        `;
    }

    buildBrandSection(brandData) {
        let campaignsHtml = this.buildPerformanceTableHeader('campaign-level');
        for (const campaignKey in brandData.campaigns) {
            campaignsHtml += this.buildCampaignRow(brandData.campaigns[campaignKey]);
        }
        campaignsHtml += '</tbody></table>';

        return `
            <div class="brand-section">
                <div class="brand-header">
                    <h4>${brandData.name}</h4>
                </div>
                <div class="brand-body">
                    ${campaignsHtml}
                </div>
            </div>
        `;
    }

    buildCampaignRow(campaignData) {
        const { current, previous } = campaignData;
        const metrics = this.calculateAllMetrics(current, previous);

        return `
            <tr>
                <td class="campaign-name">${campaignData.name}</td>
                ${this.buildMetricCells(metrics)}
            </tr>
        `;
    }

    calculateAllMetrics(current, previous) {
        const currentCTR = current.impressoes > 0 ? (current.cliques / current.impressoes) * 100 : 0;
        const previousCTR = previous.impressoes > 0 ? (previous.cliques / previous.impressoes) * 100 : 0;
        const currentCPC = current.cliques > 0 ? current.custo / current.cliques : 0;
        const previousCPC = previous.cliques > 0 ? previous.custo / previous.cliques : 0;

        return {
            current, previous,
            variations: {
                custo: this.calculateVariation(current.custo, previous.custo),
                impressoes: this.calculateVariation(current.impressoes, previous.impressoes),
                cliques: this.calculateVariation(current.cliques, previous.cliques),
                conversoes: this.calculateVariation(current.conversoes, previous.conversoes),
                ctr: this.calculateVariation(currentCTR, previousCTR),
                cpc: this.calculateVariation(currentCPC, previousCPC, true) // Lower is better
            },
            derived: {
                currentCTR, previousCTR, currentCPC, previousCPC
            }
        };
    }

    buildMetricCells(metrics) {
        const { current, previous, variations, derived } = metrics;

        return `
            <td class="metric-currency">${this.formatCurrency(current.custo)}</td>
            <td class="metric-currency">${this.formatCurrency(previous.custo)}</td>
            <td class="metric-variation ${variations.custo.type}">${this.formatVariation(variations.custo.value)}</td>
            <td class="metric-number">${this.formatNumber(current.impressoes)}</td>
            <td class="metric-number">${this.formatNumber(previous.impressoes)}</td>
            <td class="metric-variation ${variations.impressoes.type}">${this.formatVariation(variations.impressoes.value)}</td>
            <td class="metric-number">${this.formatNumber(current.cliques)}</td>
            <td class="metric-number">${this.formatNumber(previous.cliques)}</td>
            <td class="metric-variation ${variations.cliques.type}">${this.formatVariation(variations.cliques.value)}</td>
            <td class="metric-number">${this.formatNumber(current.conversoes)}</td>
            <td class="metric-number">${this.formatNumber(previous.conversoes)}</td>
            <td class="metric-variation ${variations.conversoes.type}">${this.formatVariation(variations.conversoes.value)}</td>
            <td class="metric-percentage">${this.formatPercentage(derived.currentCTR)}</td>
            <td class="metric-percentage">${this.formatPercentage(previousCTR)}</td>
            <td class="metric-variation ${variations.ctr.type}">${this.formatVariation(variations.ctr.value)}</td>
            <td class="metric-currency">${this.formatCurrency(derived.currentCPC)}</td>
            <td class="metric-currency">${this.formatCurrency(previousCPC)}</td>
            <td class="metric-variation ${variations.cpc.type}">${this.formatVariation(variations.cpc.value)}</td>
        `;
    }

    renderPerformanceReport(currentData, previousData) {
        const container = document.getElementById('detailed-report-container');

        if (currentData.length === 0 && previousData.length === 0) {
            this.showEmptyState();
            return;
        }

        // Group data by account and brand
        const currentGrouped = this.groupDataByAccountAndBrand(currentData);
        const previousGrouped = this.groupDataByAccountAndBrand(previousData);

        let html = '<div class="performance-comparison-table">';
        html += this.buildPerformanceTableHeader();

        // Combine all accounts from both periods
        const allAccounts = new Set([...Object.keys(currentGrouped), ...Object.keys(previousGrouped)]);

        allAccounts.forEach(accountKey => {
            const currentAccountData = currentGrouped[accountKey];
            const previousAccountData = previousGrouped[accountKey];

            html += this.buildAccountPerformanceRow(accountKey, currentAccountData, previousAccountData);
        });

        html += '</table></div>';
        container.innerHTML = html;
    }

    renderComparisonReport(data) {
        const container = document.getElementById('detailed-report-container');

        if (data.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>Nenhum dado encontrado para os itens selecionados no período especificado.</p></div>';
            return;
        }

        // Group by campaign
        const groupedByCampaign = {};
        data.forEach(item => {
            const campaignName = item.campanhas.nome;
            if (!groupedByCampaign[campaignName]) {
                groupedByCampaign[campaignName] = [];
            }
            groupedByCampaign[campaignName].push(item);
        });

        let html = '<div class="comparison-table-container">';
        html += `
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Investimento</th>
                        <th>Impressões</th>
                        <th>Cliques</th>
                        <th>Conversões</th>
                        <th>CTR</th>
                        <th>CPC</th>
                        <th>CPR</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.entries(groupedByCampaign).forEach(([campaignName, campaignData]) => {
            const totals = this.calculateTotals(campaignData);
            const ctr = totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0;
            const cpc = totals.cliques > 0 ? totals.custo / totals.cliques : 0;
            const cpr = totals.conversoes > 0 ? totals.custo / totals.conversoes : 0;

            html += `
                <tr class="campaign-row">
                    <td class="item-name">${campaignName}</td>
                    <td class="metric-currency">${this.formatCurrency(totals.custo)}</td>
                    <td class="metric-number">${this.formatNumber(totals.impressoes)}</td>
                    <td class="metric-number">${this.formatNumber(totals.cliques)}</td>
                    <td class="metric-number">${this.formatNumber(totals.conversoes)}</td>
                    <td class="metric-percentage">${this.formatPercentage(ctr)}</td>
                    <td class="metric-currency">${this.formatCurrency(cpc)}</td>
                    <td class="metric-currency">${this.formatCurrency(cpr)}</td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;
    }

    buildPerformanceTableHeader(level = 'account') {
        const firstColumnHeader = {
            'account': 'Conta / Marca',
            'campaign-level': 'Campanha'
        }[level];

        return `
            <table class="performance-table performance-table-${level}">
                <thead>
                    <tr>
                        <th rowspan="2" class="first-column">${firstColumnHeader}</th>
                        <th colspan="3">Investimento</th>
                        <th colspan="3">Impressões</th>
                        <th colspan="3">Cliques</th>
                        <th colspan="3">Conversões</th>
                        <th colspan="3">CTR</th>
                        <th colspan="3">CPC</th>
                    </tr>
                    <tr>
                        <th>Atual</th>
                        <th>Anterior</th>
                        <th>Variação</th>
                        <th>Atual</th>
                        <th>Anterior</th>
                        <th>Variação</th>
                        <th>Atual</th>
                        <th>Anterior</th>
                        <th>Variação</th>
                        <th>Atual</th>
                        <th>Anterior</th>
                        <th>Variação</th>
                        <th>Atual</th>
                        <th>Anterior</th>
                        <th>Variação</th>
                        <th>Atual</th>
                        <th>Anterior</th>
                        <th>Variação</th>
                    </tr>
                </thead>
                <tbody>
        `;
    }

    buildAccountPerformanceRow(accountKey, currentData, previousData) {
        const current = currentData?.totals || { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 };
        const previous = previousData?.totals || { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 };

        const currentCTR = current.impressoes > 0 ? (current.cliques / current.impressoes) * 100 : 0;
        const previousCTR = previous.impressoes > 0 ? (previous.cliques / previous.impressoes) * 100 : 0;
        const currentCPC = current.cliques > 0 ? current.custo / current.cliques : 0;
        const previousCPC = previous.cliques > 0 ? previous.custo / previous.cliques : 0;

        const variations = {
            custo: this.calculateVariation(current.custo, previous.custo, false),
            impressoes: this.calculateVariation(current.impressoes, previous.impressoes, false),
            cliques: this.calculateVariation(current.cliques, previous.cliques, false),
            conversoes: this.calculateVariation(current.conversoes, previous.conversoes, false),
            ctr: this.calculateVariation(currentCTR, previousCTR, false),
            cpc: this.calculateVariation(currentCPC, previousCPC, true) // Lower is better
        };

        const accountName = currentData?.accountName || previousData?.accountName || accountKey;
        const platformName = currentData?.platformName || previousData?.platformName || '';

        return `
            <tr class="account-row">
                <td class="account-name">${accountName} (${platformName})</td>
                <td class="metric-currency">${this.formatCurrency(current.custo)}</td>
                <td class="metric-currency">${this.formatCurrency(previous.custo)}</td>
                <td class="metric-variation ${variations.custo.type}">${this.formatVariation(variations.custo.value)}</td>
                <td class="metric-number">${this.formatNumber(current.impressoes)}</td>
                <td class="metric-number">${this.formatNumber(previous.impressoes)}</td>
                <td class="metric-variation ${variations.impressoes.type}">${this.formatVariation(variations.impressoes.value)}</td>
                <td class="metric-number">${this.formatNumber(current.cliques)}</td>
                <td class="metric-number">${this.formatNumber(previous.cliques)}</td>
                <td class="metric-variation ${variations.cliques.type}">${this.formatVariation(variations.cliques.value)}</td>
                <td class="metric-number">${this.formatNumber(current.conversoes)}</td>
                <td class="metric-number">${this.formatNumber(previous.conversoes)}</td>
                <td class="metric-variation ${variations.conversoes.type}">${this.formatVariation(variations.conversoes.value)}</td>
                <td class="metric-percentage">${this.formatPercentage(currentCTR)}</td>
                <td class="metric-percentage">${this.formatPercentage(previousCTR)}</td>
                <td class="metric-variation ${variations.ctr.type}">${this.formatVariation(variations.ctr.value)}</td>
                <td class="metric-currency">${this.formatCurrency(currentCPC)}</td>
                <td class="metric-currency">${this.formatCurrency(previousCPC)}</td>
                <td class="metric-variation ${variations.cpc.type}">${this.formatVariation(variations.cpc.value)}</td>
            </tr>
        `;
    }

    calculateVariation(current, previous, lowerIsBetter = false) {
        if (previous === 0) {
            return { value: current > 0 ? Infinity : 0, type: current > 0 ? 'positive' : '' };
        }
        const value = ((current - previous) / previous) * 100;
        let type = '';

        if (lowerIsBetter) {
            type = value <= 0 ? 'positive' : 'negative';
        } else {
            type = value >= 0 ? 'positive' : 'negative';
        }

        return { value, type };
    }

    groupDataByAccountAndBrand(data) {
        if (!data || data.length === 0) {
            return {};
        }

        const grouped = {};

        data.forEach(item => {
            // Defensive checks for data structure
            if (!item.campanhas || !item.campanhas.contas_de_anuncio || !item.campanhas.marcas) {
                console.warn('Invalid data structure:', item);
                return;
            }

            const campaign = item.campanhas;
            const account = campaign.contas_de_anuncio;
            const brand = campaign.marcas;
            const platform = account.plataformas;

            if (!platform) {
                console.warn('Missing platform data:', account);
                return;
            }

            const accountKey = `${account.nome} (${platform.nome})`;

            if (!grouped[accountKey]) {
                grouped[accountKey] = {
                    accountName: account.nome,
                    platformName: platform.nome,
                    brands: {},
                    totals: {
                        custo: 0,
                        impressoes: 0,
                        cliques: 0,
                        conversoes: 0,
                        alcance: 0
                    }
                };
            }

            // Update account totals
            const accountTotals = grouped[accountKey].totals;
            accountTotals.custo += parseFloat(item.custo) || 0;
            accountTotals.impressoes += parseInt(item.impressoes) || 0;
            accountTotals.cliques += parseInt(item.cliques) || 0;
            accountTotals.conversoes += parseInt(item.conversoes) || 0;
            accountTotals.alcance += parseInt(item.alcance) || 0;
        });

        return grouped;
    }

    calculateTotals(data) {
        if (!data || data.length === 0) {
            return {
                custo: 0,
                impressoes: 0,
                cliques: 0,
                conversoes: 0,
                alcance: 0
            };
        }

        return data.reduce((totals, item) => {
            totals.custo += parseFloat(item.custo) || 0;
            totals.impressoes += parseInt(item.impressoes) || 0;
            totals.cliques += parseInt(item.cliques) || 0;
            totals.conversoes += parseInt(item.conversoes) || 0;
            totals.alcance += parseInt(item.alcance) || 0;
            return totals;
        }, {
            custo: 0,
            impressoes: 0,
            cliques: 0,
            conversoes: 0,
            alcance: 0
        });
    }

    clearReport() {
        document.getElementById('detailed-report-container').innerHTML = '';
        // Reset KPIs
        if (this.currentMode === 'comparison') {
            this.updateComparisonKPIs({ custo: 0, impressoes: 0, cliques: 0, conversoes: 0 });
        }
    }

    showLoading() {
        this.isLoading = true;
        document.getElementById('report-loading').style.display = 'block';
        document.getElementById('report-error').style.display = 'none';
        document.getElementById('detailed-report-container').innerHTML = '';
    }

    hideLoading() {
        this.isLoading = false;
        document.getElementById('report-loading').style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('report-error');
        errorElement.querySelector('p').textContent = message;
        errorElement.style.display = 'block';
        document.getElementById('report-loading').style.display = 'none';
    }

    showEmptyState() {
        const container = document.getElementById('detailed-report-container');
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="database"></i>
                <h3>Nenhum dado encontrado</h3>
                <p>Não há dados de performance para o período selecionado.</p>
                <p class="empty-state-suggestion">Tente selecionar um período diferente ou verifique se há campanhas ativas.</p>
            </div>
        `;

        // Reset KPI cards to zero
        const kpiElements = [
            'kpi-total-investido', 'kpi-total-impressoes', 'kpi-total-cliques',
            'kpi-total-conversoes', 'kpi-ctr-medio', 'kpi-cpc-medio'
        ];

        kpiElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('investido') || id.includes('cpc')) {
                    element.textContent = 'R$ 0,00';
                } else if (id.includes('ctr')) {
                    element.textContent = '0,00%';
                } else {
                    element.textContent = '0';
                }
            }
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
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

    formatVariation(value) {
        if (value === Infinity) return "+∞%";
        const sign = value >= 0 ? '+' : '';
        return `${sign}${new Intl.NumberFormat('pt-BR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format((value || 0) / 100)}`;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }
}

// Global instance
window.relatoriosManager = new RelatoriosManager();

// Initialize Lucide icons after page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
});