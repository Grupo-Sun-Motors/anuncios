import React, { useState, useEffect, useCallback } from 'react';
import {
    DollarSign,
    Eye,
    MousePointer2,
    Target,
    TrendingUp,
    Calculator,
    ExternalLink,
    RefreshCw,
    ArrowUp,
    ArrowDown,
    Activity,
    BarChart3,
    Layout
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { buscarTodosRelatorios } from '../services-apis/supabase/relatoriosService';
import { buscarTodosOrcamentosMensais } from '../services-apis/supabase/orcamentoService';
import { buscarTodoHistorico } from '../services-apis/supabase/historicoOtimizacoesService';
import { buscarTodasCampanhas } from '../services-apis/supabase/campanhasService';
import { buscarMarcas } from '../services-apis/supabase/configService';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import '../styles/dashboard.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);
import Preloader from '../components/Preloader';

const Dashboard = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // State
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        period: 'thisMonth',
        brand: ''
    });
    const [data, setData] = useState({
        brands: [],
        kpis: {
            investment: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            ctr: 0,
            cpc: 0
        },
        budget: [],
        campaigns: [],
        activities: []
    });

    // Helpers
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('pt-BR').format(value || 0);
    };

    const formatPercentage = (value) => {
        return `${(value || 0).toFixed(2)}%`;
    };

    const getDateRange = useCallback(() => {
        const today = new Date();
        let startDate, endDate;

        switch (filters.period) {
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

        return { start: startDate, end: endDate };
    }, [filters.period]);

    // Data Fetching
    const fetchData = useCallback(async () => {
        setLoading(true);
        console.log('[Dashboard] Fetching data...');
        try {
            const dateRange = getDateRange();
            console.log('[Dashboard] Date range:', dateRange);

            // Fetch all data in parallel
            const [reports, budgets, activities, campaigns, brands] = await Promise.all([
                buscarTodosRelatorios(),
                buscarTodosOrcamentosMensais(),
                buscarTodoHistorico(),
                buscarTodasCampanhas(),
                buscarMarcas()
            ]);

            console.log('[Dashboard] Data fetched:', {
                reports: reports?.length || 0,
                budgets: budgets?.length || 0,
                activities: activities?.length || 0,
                campaigns: campaigns?.length || 0,
                brands: brands?.length || 0
            });

            // Process Brands
            const brandsList = brands || [];

            // Process KPIs (Reports)
            let filteredReports = reports || [];
            console.log('[Dashboard] Reports before filter:', filteredReports.length);

            // Filter by date
            filteredReports = filteredReports.filter(report => {
                const reportDate = new Date(report.data_relatorio);
                return reportDate >= dateRange.start && reportDate <= dateRange.end;
            });
            console.log('[Dashboard] Reports after date filter:', filteredReports.length);

            // Filter by brand
            if (filters.brand) {
                const brandCampaignIds = (campaigns || [])
                    .filter(c => String(c.marca_id) === String(filters.brand) || String(c.marca_id?.id) === String(filters.brand))
                    .map(c => c.id);
                filteredReports = filteredReports.filter(report => brandCampaignIds.includes(report.campanha_id));
            }

            const kpis = filteredReports.reduce((acc, report) => ({
                investment: acc.investment + (report.custo || 0),
                impressions: acc.impressions + (report.impressoes || 0),
                clicks: acc.clicks + (report.cliques || 0),
                conversions: acc.conversions + (report.conversoes || 0)
            }), { investment: 0, impressions: 0, clicks: 0, conversions: 0 });

            kpis.ctr = kpis.impressions > 0 ? (kpis.clicks / kpis.impressions) * 100 : 0;
            kpis.cpc = kpis.clicks > 0 ? kpis.investment / kpis.clicks : 0;

            // Process Budget
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            let filteredBudgets = (budgets || []).filter(b => b.mes === currentMonth && b.ano === currentYear);
            if (filters.brand) {
                filteredBudgets = filteredBudgets.filter(b => String(b.marca_id) === String(filters.brand));
            }
            // Enrich with brand name
            filteredBudgets = filteredBudgets.map(b => ({
                ...b,
                marca_nome: brandsList.find(brand => brand.id === b.marca_id)?.nome || 'Marca'
            })).sort((a, b) => (b.meta_investimento_total || 0) - (a.meta_investimento_total || 0));

            // Process Campaigns
            let filteredCampaigns = campaigns || [];
            if (filters.brand) {
                filteredCampaigns = filteredCampaigns.filter(c => String(c.marca_id) === String(filters.brand) || String(c.marca_id?.id) === String(filters.brand));
            }
            // Calculate performance for each campaign based on filtered reports
            const campaignPerformance = filteredCampaigns.map(campaign => {
                const campaignReports = filteredReports.filter(r => r.campanha_id === campaign.id);
                const cost = campaignReports.reduce((sum, r) => sum + (r.custo || 0), 0);
                const conversions = campaignReports.reduce((sum, r) => sum + (r.conversoes || 0), 0);
                return {
                    ...campaign,
                    cost: cost || campaign.orcamento || 0, // Fallback to budget if no cost data
                    conversions
                };
            }).sort((a, b) => b.conversions - a.conversions).slice(0, 5);

            // Process Activities
            let filteredActivities = activities || [];
            if (filters.brand) {
                filteredActivities = filteredActivities.filter(a => String(a.marca_id) === String(filters.brand));
            }
            filteredActivities = filteredActivities.sort((a, b) => new Date(b.data_alteracao || b.criado_em) - new Date(a.data_alteracao || a.criado_em)).slice(0, 5);

            setData({
                brands: brandsList,
                kpis,
                budget: filteredBudgets,
                campaigns: campaignPerformance,
                activities: filteredActivities
            });

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            addToast("Erro ao carregar dados do dashboard", "error");
        } finally {
            setLoading(false);
        }
    }, [filters, getDateRange, addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e) => {
        const { id, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [id === 'dashboard-period' ? 'period' : 'brand']: value
        }));
    };

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d atrás`;
        if (diffHours > 0) return `${diffHours}h atrás`;
        return 'Agora';
    };

    return (
        <div id="view-dashboard" className="page-view">
            <div className="dashboard-header">
                <h1>Dashboard de Performance</h1>
            </div>

            {/* Filters Section */}
            <div className="dashboard-filters">
                <div className="filter-group">
                    <label htmlFor="dashboard-period">Período</label>
                    <select id="dashboard-period" value={filters.period} onChange={handleFilterChange}>
                        <option value="thisMonth">Este Mês</option>
                        <option value="last7days">Últimos 7 dias</option>
                        <option value="last30days">Últimos 30 dias</option>
                        <option value="lastMonth">Mês Passado</option>
                        <option value="thisYear">Este Ano</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label htmlFor="dashboard-brand">Marca</label>
                    <select id="dashboard-brand" value={filters.brand} onChange={handleFilterChange}>
                        <option value="">Todas as Marcas</option>
                        {data.brands.map(brand => (
                            <option key={brand.id} value={brand.id}>{brand.nome}</option>
                        ))}
                    </select>
                </div>
                <button className="btn btn-primary" onClick={fetchData} disabled={loading}>
                    <RefreshCw size={16} style={{ marginRight: '8px' }} className={loading ? 'spin' : ''} />
                    Atualizar
                </button>
            </div>

            {loading && <Preloader message="Carregando dados..." />}

            {/* KPIs Section */}
            <div className="dashboard-kpis">
                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>Total Investido</h3>
                        <DollarSign size={20} />
                    </div>
                    <div className="kpi-value">{formatCurrency(data.kpis.investment)}</div>
                    {/* Change indicator placeholder - requires previous period data */}
                    <div className="kpi-change neutral">0%</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>Total de Impressões</h3>
                        <Eye size={20} />
                    </div>
                    <div className="kpi-value">{formatNumber(data.kpis.impressions)}</div>
                    <div className="kpi-change neutral">0%</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>Total de Cliques</h3>
                        <MousePointer2 size={20} />
                    </div>
                    <div className="kpi-value">{formatNumber(data.kpis.clicks)}</div>
                    <div className="kpi-change neutral">0%</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>Conversões</h3>
                        <Target size={20} />
                    </div>
                    <div className="kpi-value">{formatNumber(data.kpis.conversions)}</div>
                    <div className="kpi-change neutral">0%</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>CTR Médio</h3>
                        <TrendingUp size={20} />
                    </div>
                    <div className="kpi-value">{formatPercentage(data.kpis.ctr)}</div>
                    <div className="kpi-change neutral">0%</div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>CPC Médio</h3>
                        <Calculator size={20} />
                    </div>
                    <div className="kpi-value">{formatCurrency(data.kpis.cpc)}</div>
                    <div className="kpi-change neutral">0%</div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Campaign Performance Widget - Left (larger column) */}
                <div className="dashboard-widget campaign-performance">
                    <div className="widget-header">
                        <h3>Top Campanhas</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/campanhas')}>
                            <ExternalLink size={16} style={{ marginRight: '8px' }} />
                            Ver Todas
                        </button>
                    </div>
                    <div className="widget-content">
                        {data.campaigns.length === 0 ? (
                            <div className="empty-state">
                                <Layout size={48} color="#9ca3af" />
                                <p>Nenhuma campanha encontrada</p>
                            </div>
                        ) : (
                            <div className="campaign-list">
                                {data.campaigns.map(campaign => (
                                    <div key={campaign.id} className="campaign-item">
                                        <div className="campaign-info">
                                            <h4>{campaign.nome}</h4>
                                            <p>{campaign.marca?.nome || 'Marca'} • {campaign.conta_de_anuncio?.plataformas?.nome || 'Plataforma'}</p>
                                        </div>
                                        <div className="campaign-metrics">
                                            <div className="metric-value">{formatCurrency(campaign.cost)}</div>
                                            <div className="metric-label">{campaign.conversions} conversões</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Budget Overview Widget - Right (smaller column) */}
                <div className="dashboard-widget budget-overview">
                    <div className="widget-header">
                        <h3>Acompanhamento de Orçamento</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/orcamento')}>
                            <ExternalLink size={16} style={{ marginRight: '8px' }} />
                            Ver Detalhes
                        </button>
                    </div>
                    <div className="widget-content">
                        {data.budget.length === 0 ? (
                            <div className="empty-state">
                                <DollarSign size={48} color="#9ca3af" />
                                <p>Nenhum orçamento encontrado</p>
                            </div>
                        ) : (
                            data.budget.map((item, index) => {
                                const total = item.meta_investimento_total || 0;
                                const spent = total * 0.65; // Simulated spent
                                const percentage = total > 0 ? (spent / total) * 100 : 0;
                                let statusClass = '';
                                if (percentage >= 90) statusClass = 'danger';
                                else if (percentage >= 75) statusClass = 'warning';

                                return (
                                    <div key={index} className="budget-item">
                                        <div>
                                            <div className="budget-label">{item.marca_nome}</div>
                                            <div className="budget-amount">
                                                {formatCurrency(spent)} / {formatCurrency(total)}
                                            </div>
                                            <div className="budget-bar">
                                                <div className={`budget-fill ${statusClass}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Performance Chart Widget - Left (larger column) */}
                <div className="dashboard-widget performance-chart">
                    <div className="widget-header">
                        <h3>Gráfico de Performance</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/relatorios')}>
                            <ExternalLink size={16} style={{ marginRight: '8px' }} />
                            Ver Relatório
                        </button>
                    </div>
                    <div className="widget-content">
                        {data.campaigns.length === 0 ? (
                            <div className="empty-state">
                                <BarChart3 size={48} color="#9ca3af" />
                                <p>Sem dados suficientes para o gráfico</p>
                            </div>
                        ) : (
                            <div style={{ height: '300px', width: '100%' }}>
                                <Bar
                                    data={{
                                        labels: data.campaigns.map(c => c.nome),
                                        datasets: [
                                            {
                                                label: 'Investimento (R$)',
                                                data: data.campaigns.map(c => c.cost || 0),
                                                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                                borderColor: 'rgb(59, 130, 246)',
                                                borderWidth: 1,
                                                yAxisID: 'y',
                                            },
                                            {
                                                label: 'Conversões',
                                                data: data.campaigns.map(c => c.conversions || 0),
                                                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                                                borderColor: 'rgb(16, 185, 129)',
                                                borderWidth: 1,
                                                yAxisID: 'y1',
                                            }
                                        ]
                                    }}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        interaction: {
                                            mode: 'index',
                                            intersect: false,
                                        },
                                        plugins: {
                                            legend: {
                                                position: 'top',
                                            },
                                            title: {
                                                display: false
                                            }
                                        },
                                        scales: {
                                            y: {
                                                type: 'linear',
                                                display: true,
                                                position: 'left',
                                                title: {
                                                    display: true,
                                                    text: 'Investimento'
                                                }
                                            },
                                            y1: {
                                                type: 'linear',
                                                display: true,
                                                position: 'right',
                                                title: {
                                                    display: true,
                                                    text: 'Conversões'
                                                },
                                                grid: {
                                                    drawOnChartArea: false,
                                                },
                                            },
                                        },
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Activities Widget */}
                <div className="dashboard-widget recent-activities">
                    <div className="widget-header">
                        <h3>Atividades Recentes</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/otimizacoes')}>
                            <ExternalLink size={16} style={{ marginRight: '8px' }} />
                            Ver Histórico
                        </button>
                    </div>
                    <div className="widget-content">
                        {data.activities.length === 0 ? (
                            <div className="empty-state">
                                <Activity size={48} color="#9ca3af" />
                                <p>Nenhuma atividade recente</p>
                            </div>
                        ) : (
                            <div className="activity-list">
                                {data.activities.map((activity, index) => (
                                    <div key={index} className="activity-item">
                                        <div className="activity-icon">
                                            <Activity size={16} />
                                        </div>
                                        <div className="activity-content">
                                            <h4>{((activity.descricao || activity.tipo_alteracao || 'Atividade').length > 35
                                                ? (activity.descricao || activity.tipo_alteracao || 'Atividade').substring(0, 35) + '...'
                                                : (activity.descricao || activity.tipo_alteracao || 'Atividade'))}</h4>
                                            <p>{activity.campanhas?.nome || activity.marcas?.nome || 'Sistema'}</p>
                                        </div>
                                        <div className="activity-time">{getTimeAgo(activity.data_alteracao || activity.criado_em)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
