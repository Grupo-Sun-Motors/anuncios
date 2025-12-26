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
    Activity,
    BarChart3,
    Layout,
    Folder,
    Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { buscarTodosRelatorios } from '../services-apis/supabase/relatoriosService';
import { buscarTodosOrcamentosMensais } from '../services-apis/supabase/orcamentoService';
import { buscarTodoHistorico } from '../services-apis/supabase/historicoOtimizacoesService';
import { buscarAnuncios } from '../services-apis/supabase/anunciosService';
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
import '../styles/onboard.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);
import Preloader from '../components/Preloader';

const Onboard = () => {
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
            conversions: 0,
            cpa: 0,
            ctr: 0
        },
        budget: [],
        ads: [],
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
        try {
            const dateRange = getDateRange();

            // Fetch all data in parallel
            // We keep reports/budgets etc. for context if needed, but primary focus is ads
            const [reports, budgets, activities, ads, brands] = await Promise.all([
                buscarTodosRelatorios(),
                buscarTodosOrcamentosMensais(),
                buscarTodoHistorico(),
                buscarAnuncios(),
                buscarMarcas()
            ]);

            // Process Brands
            const brandsList = brands || [];

            // Process Ads (Primary Source for this page)
            let filteredAds = ads || [];

            // Filter Ads by Brand
            if (filters.brand) {
                filteredAds = filteredAds.filter(a => String(a.marca_id) === String(filters.brand));
            }
            // Filter Ads by Date? 
            // Ads don't strictly have a date range like reports, but we can respect created_at or updated_at 
            // OR simply show current state of all active ads (common for "Onboard/Overview").
            // Existing dashboard filtered reports by date. Here user asked to use Ad metrics.
            // Ad metrics in DB are usually "lifetime" or "current snapshot". 
            // If they are snapshot, date filtering might not apply to the *metrics values* unless we have a history table.
            // For now, I will assume we show the current state of ads that match the brand filter. 
            // If strictly needed, we could filter by 'created_at' but that would hide older running ads.
            // I will NOT filter ads by creation date for the list, but I will simulate "Activity" or just show all relevant.

            // HOWEVER, the standard Dashboard calculates KPIs from REPORTS (daily data). 
            // The user request says: "inclusive as metricas vindo das metricas dos proprios anuncios".
            // So we use 'anuncio.metricas' directly.

            // Aggregate KPIs from Ads
            const kpis = filteredAds.reduce((acc, ad) => {
                const metrics = ad.metricas || {};
                const spend = Number(metrics.spend || 0);
                const conversions = Number(metrics.conversao || 0);
                const ctr = Number(metrics.ctr || 0);
                const cpa = Number(metrics.cpa || 0);

                return {
                    investment: acc.investment + spend,
                    conversions: acc.conversions + conversions,
                    sumCtr: acc.sumCtr + ctr,
                    sumCpa: acc.sumCpa + cpa
                };
            }, {
                investment: 0,
                conversions: 0,
                sumCtr: 0,
                sumCpa: 0
            });

            // Finalize Averages
            const activeAdsCount = filteredAds.length;
            kpis.ctr = activeAdsCount > 0 ? kpis.sumCtr / activeAdsCount : 0;
            kpis.cpa = activeAdsCount > 0 ? kpis.sumCpa / activeAdsCount : 0;

            // Process Budget (Same as Dashboard)
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            let filteredBudgets = (budgets || []).filter(b => b.mes === currentMonth && b.ano === currentYear);
            if (filters.brand) {
                filteredBudgets = filteredBudgets.filter(b => String(b.marca_id) === String(filters.brand));
            }
            filteredBudgets = filteredBudgets.map(b => ({
                ...b,
                marca_nome: brandsList.find(brand => brand.id === b.marca_id)?.nome || 'Marca'
            })).sort((a, b) => (b.meta_investimento_total || 0) - (a.meta_investimento_total || 0));

            // Sort Ads for Widget (Top Ads by Conversions)
            const topAds = [...filteredAds].sort((a, b) => {
                const conversionsA = a.metricas?.conversao || 0;
                const conversionsB = b.metricas?.conversao || 0;
                return conversionsB - conversionsA;
            }).slice(0, 5);

            // Process Activities (Same as Dashboard but maybe filtered?)
            let filteredActivities = activities || [];
            if (filters.brand) {
                filteredActivities = filteredActivities.filter(a => String(a.marca_id) === String(filters.brand));
            }
            filteredActivities = filteredActivities.sort((a, b) => new Date(b.data_alteracao || b.criado_em) - new Date(a.data_alteracao || a.criado_em)).slice(0, 5);

            setData({
                brands: brandsList,
                kpis,
                budget: filteredBudgets,
                ads: topAds,
                activities: filteredActivities
            });

        } catch (error) {
            console.error("Error fetching onboard data:", error);
            addToast("Erro ao carregar dados do onboard", "error");
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
        <div id="view-onboard" className="page-view">
            <div className="dashboard-header">
                <h1>Onboard de Performance</h1>
            </div>

            {/* Filters Section */}
            <div className="dashboard-filters onboard-filters">
                <div className="onboard-filters-left">
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
                <div className="onboard-filters-links">
                    <a
                        className="onboard-icon-link"
                        href="https://drive.google.com/drive/folders/10yBNO_vmwGG0fz46BReV-G12qQ65Kh7W"
                        target="_blank"
                        rel="noreferrer"
                        title="drive"
                        aria-label="Abrir drive criativos Sun Motors"
                    >
                        <Folder size={18} />
                    </a>
                    <a
                        className="onboard-icon-link"
                        href="https://admin.appdealersites.com.br/login"
                        target="_blank"
                        rel="noreferrer"
                        title="dealers"
                        aria-label="Abrir landing pages Dealers"
                    >
                        <Globe size={18} />
                    </a>
                </div>
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

                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>Conversões</h3>
                        <Target size={20} />
                    </div>
                    <div className="kpi-value">{formatNumber(data.kpis.conversions)}</div>

                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>CPA</h3>
                        <Calculator size={20} />
                    </div>
                    <div className="kpi-value">{formatCurrency(data.kpis.cpa)}</div>

                </div>

                <div className="kpi-card">
                    <div className="kpi-header">
                        <h3>CTR Médio</h3>
                        <TrendingUp size={20} />
                    </div>
                    <div className="kpi-value">{formatPercentage(data.kpis.ctr)}</div>

                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Top Ads Widget - Left (larger column) */}
                <div className="dashboard-widget campaign-performance">
                    <div className="widget-header">
                        <h3>Top Anúncios</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/anuncios')}>
                            <ExternalLink size={16} style={{ marginRight: '8px' }} />
                            Ver Todos
                        </button>
                    </div>
                    <div className="widget-content">
                        {data.ads.length === 0 ? (
                            <div className="empty-state">
                                <Layout size={48} color="#9ca3af" />
                                <p>Nenhum anúncio encontrado</p>
                            </div>
                        ) : (
                            <div className="campaign-list">
                                {data.ads.map(ad => (
                                    <div key={ad.id} className="campaign-item">
                                        <div className="campaign-info">
                                            <h4>{ad.nome}</h4>
                                            <p>{ad.marca?.nome || ad.marca_nome || 'Marca'} • {ad.plataforma_nome || ad.plataforma || 'Plataforma'}</p>
                                        </div>
                                        <div className="campaign-metrics">
                                            <div className="metric-value">{formatCurrency(ad.metricas?.spend)}</div>
                                            <div className="metric-label">{ad.metricas?.conversao || 0} conversões</div>
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

                {/* Performance Chart Widget */}
                <div className="dashboard-widget performance-chart">
                    <div className="widget-header">
                        <h3>Gráfico de Performance</h3>
                        <button className="btn btn-sm btn-secondary" onClick={() => navigate('/relatorios')}>
                            <ExternalLink size={16} style={{ marginRight: '8px' }} />
                            Ver Relatório
                        </button>
                    </div>
                    <div className="widget-content">
                        {data.ads.length === 0 ? (
                            <div className="empty-state">
                                <BarChart3 size={48} color="#9ca3af" />
                                <p>Sem dados suficientes para o gráfico</p>
                            </div>
                        ) : (
                            <div style={{ height: '300px', width: '100%' }}>
                                <Bar
                                    data={{
                                        labels: data.ads.map(ad => ad.nome),
                                        datasets: [
                                            {
                                                label: 'Investimento (R$)',
                                                data: data.ads.map(ad => ad.metricas?.spend || 0),
                                                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                                borderColor: 'rgb(59, 130, 246)',
                                                borderWidth: 1,
                                                yAxisID: 'y',
                                            },
                                            {
                                                label: 'Conversões',
                                                data: data.ads.map(ad => ad.metricas?.conversao || 0),
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
                                        pluigns: {
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

export default Onboard;
