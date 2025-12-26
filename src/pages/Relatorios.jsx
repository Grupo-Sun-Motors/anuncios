import React, { useState, useEffect } from 'react';
import {
    Search, DollarSign, Target, TrendingUp, Calculator,
    Loader2, AlertCircle, Building2, RefreshCw, Upload, Monitor, CreditCard
} from 'lucide-react';
import * as relatorioAnunciosService from '../services-apis/supabase/relatorioAnunciosService';
import { buscarRelatorioCompletoMarcas, buscarPlataformas } from '../services-apis/supabase/configService';
import { buscarTodosModelos } from '../services-apis/supabase/modelosService';
import { useToast } from '../contexts/ToastContext';
import ImportadorCSV from '../components/relatorios/ImportadorCSV';
import Preloader from '../components/Preloader';

const Relatorios = () => {
    const { addToast } = useToast();

    // Estados de Loading e Erro
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estado dos Filtros
    const [filters, setFilters] = useState({
        marca_id: '',
        plataforma_id: '',
        conta_de_anuncio_id: '',
        modelo_id: '',
        data_inicio: '',
        data_fim: '',
        periodPreset: 'thisMonth'
    });

    // Dados da View relatorio_completo_marcas
    const [relatorioCompletoMarcas, setRelatorioCompletoMarcas] = useState([]);
    const [plataformas, setPlataformas] = useState([]);
    const [modelos, setModelos] = useState([]);

    // Dados Filtrados para Dropdowns em Cascata
    const [marcasFiltradas, setMarcasFiltradas] = useState([]);
    const [plataformasFiltradas, setPlataformasFiltradas] = useState([]);
    const [contasFiltradas, setContasFiltradas] = useState([]);
    const [modelosFiltrados, setModelosFiltrados] = useState([]);

    // Dados de Estatísticas
    const [estatisticas, setEstatisticas] = useState({
        totalInvestido: 0,
        totalConversoes: 0,
        ctrMedio: 0,
        cpcMedio: 0,
        totalRegistros: 0
    });
    const [investimentoPorMarca, setInvestimentoPorMarca] = useState([]);
    const [tendenciaSemanal, setTendenciaSemanal] = useState([]);
    const [showImportador, setShowImportador] = useState(false);

    // Carrega dados iniciais
    useEffect(() => {
        loadInitialData();
    }, []);

    // Atualiza filtros em cascata quando mudam os dados
    useEffect(() => {
        processarFiltrosEmCascata();
    }, [relatorioCompletoMarcas, filters.marca_id, filters.plataforma_id, modelos]);

    const loadInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Carrega dados da view para popular filtros
            const [viewData, plataformasData, modelosData] = await Promise.all([
                buscarRelatorioCompletoMarcas(),
                buscarPlataformas(),
                buscarTodosModelos()
            ]);

            setRelatorioCompletoMarcas(viewData || []);
            setPlataformas(plataformasData || []);
            setModelos(modelosData || []);

            // Define período padrão (este mês)
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const newFilters = {
                ...filters,
                data_inicio: firstDay.toISOString().split('T')[0],
                data_fim: lastDay.toISOString().split('T')[0]
            };
            setFilters(newFilters);

            // Carrega estatísticas
            await loadStats(newFilters);
        } catch (err) {
            console.error('Erro ao carregar dados iniciais:', err);
            setError('Erro ao carregar dados. Verifique sua conexão.');
        } finally {
            setLoading(false);
        }
    };

    // Processa filtros em cascata baseado na view relatorio_completo_marcas
    const processarFiltrosEmCascata = () => {
        // 1. Extrai todas as marcas únicas da view
        const marcasUnicas = [...new Map(
            relatorioCompletoMarcas.map(item => [item.marca_id, { id: item.marca_id, nome: item.marca }])
        ).values()];
        setMarcasFiltradas(marcasUnicas);

        // 2. Filtra plataformas baseado na marca selecionada
        let dadosFiltrados = relatorioCompletoMarcas;
        if (filters.marca_id) {
            dadosFiltrados = relatorioCompletoMarcas.filter(item => item.marca_id === filters.marca_id);
        }
        const plataformasUnicas = [...new Map(
            dadosFiltrados.map(item => [item.plataforma_id, { id: item.plataforma_id, nome: item.plataforma }])
        ).values()];
        setPlataformasFiltradas(plataformasUnicas);

        // 3. Filtra contas baseado na marca E plataforma selecionadas
        if (filters.plataforma_id) {
            dadosFiltrados = dadosFiltrados.filter(item => item.plataforma_id === filters.plataforma_id);
        }
        const contasUnicas = [...new Map(
            dadosFiltrados.map(item => [item.conta_id, { id: item.conta_id, nome: item.conta_nome }])
        ).values()];
        setContasFiltradas(contasUnicas);

        // 4. Filtra modelos baseado na marca selecionada
        let modelosFiltradosTemp = modelos;
        if (filters.marca_id) {
            modelosFiltradosTemp = modelos.filter(m => m.marca_id === filters.marca_id);
        }
        setModelosFiltrados(modelosFiltradosTemp);
    };

    const loadStats = async (currentFilters = filters) => {
        try {
            const filtrosAPI = {};
            if (currentFilters.marca_id) filtrosAPI.marca_id = currentFilters.marca_id;
            if (currentFilters.plataforma_id) filtrosAPI.plataforma_id = currentFilters.plataforma_id;
            if (currentFilters.conta_de_anuncio_id) filtrosAPI.conta_de_anuncio_id = currentFilters.conta_de_anuncio_id;
            if (currentFilters.modelo_id) filtrosAPI.modelo_id = currentFilters.modelo_id;
            if (currentFilters.data_inicio) filtrosAPI.data_inicio = currentFilters.data_inicio;
            if (currentFilters.data_fim) filtrosAPI.data_fim = currentFilters.data_fim;

            const [stats, porMarca, semanal] = await Promise.all([
                relatorioAnunciosService.calcularEstatisticasAgregadas(filtrosAPI),
                relatorioAnunciosService.calcularInvestimentoPorMarca(filtrosAPI),
                relatorioAnunciosService.buscarTendenciaSemanal(filtrosAPI)
            ]);

            setEstatisticas(stats);
            setInvestimentoPorMarca(porMarca);
            setTendenciaSemanal(semanal);
        } catch (err) {
            console.error('Erro ao carregar estatísticas:', err);
            throw err;
        }
    };

    // Handlers de Mudança de Filtro
    const handleMarcaChange = (marcaId) => {
        setFilters(prev => ({
            ...prev,
            marca_id: marcaId,
            plataforma_id: '', // Reseta plataforma
            conta_de_anuncio_id: '', // Reseta conta
            modelo_id: '' // Reseta modelo
        }));
    };

    const handlePlataformaChange = (plataformaId) => {
        setFilters(prev => ({
            ...prev,
            plataforma_id: plataformaId,
            conta_de_anuncio_id: '' // Reseta conta
        }));
    };

    const handleContaChange = (contaId) => {
        setFilters(prev => ({
            ...prev,
            conta_de_anuncio_id: contaId
        }));
    };

    const handleModeloChange = (modeloId) => {
        setFilters(prev => ({
            ...prev,
            modelo_id: modeloId
        }));
    };

    const handlePeriodChange = (preset) => {
        const now = new Date();
        let startDate, endDate;

        switch (preset) {
            case 'thisMonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last7days':
                endDate = now;
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'last15days':
                endDate = now;
                startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
                break;
            case 'lastMonth':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last6months':
                endDate = now;
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                break;
            default:
                return; // Personalizado - não muda
        }

        setFilters(prev => ({
            ...prev,
            periodPreset: preset,
            data_inicio: startDate.toISOString().split('T')[0],
            data_fim: endDate.toISOString().split('T')[0]
        }));
    };

    const handleApplyFilters = async () => {
        setLoading(true);
        setError(null);
        try {
            await loadStats();
            addToast('Filtros aplicados com sucesso!', 'success');
        } catch (err) {
            setError('Erro ao aplicar filtros.');
            addToast('Erro ao carregar dados', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        await loadInitialData();
        addToast('Dados atualizados!', 'success');
    };

    // Formatadores
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0);
    };

    const formatPercentage = (value) => {
        return `${(value || 0).toFixed(2).replace('.', ',')}%`;
    };

    const formatNumber = (value) => {
        return new Intl.NumberFormat('pt-BR').format(Math.round(value || 0));
    };

    return (
        <div id="view-relatorios" className="page-view">
            <div className="page-header">
                <h1>Relatório de Anúncios</h1>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setShowImportador(true)}>
                        <Upload size={16} style={{ marginRight: '8px' }} />
                        Importar CSV
                    </button>
                    <button className="btn btn-secondary" onClick={handleRefresh}>
                        <RefreshCw size={16} style={{ marginRight: '8px' }} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Sidemenu de Importação */}
            {showImportador && (
                <ImportadorCSV
                    onImportSuccess={() => {
                        loadInitialData();
                    }}
                    onClose={() => setShowImportador(false)}
                />
            )}

            {/* Área de Filtros */}
            <section className="report-filters-section">
                <div className="filters-container">
                    {/* Filtro: Marca */}
                    <div className="filter-group">
                        <label htmlFor="filter-marca">
                            <Building2 size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            Marca
                        </label>
                        <select
                            id="filter-marca"
                            className="filter-input"
                            value={filters.marca_id}
                            onChange={(e) => handleMarcaChange(e.target.value)}
                        >
                            <option value="">Todas as Marcas</option>
                            {marcasFiltradas.map(m => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro: Plataforma */}
                    <div className="filter-group">
                        <label htmlFor="filter-plataforma">
                            <Monitor size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            Plataforma
                        </label>
                        <select
                            id="filter-plataforma"
                            className="filter-input"
                            value={filters.plataforma_id}
                            onChange={(e) => handlePlataformaChange(e.target.value)}
                        >
                            <option value="">Todas as Plataformas</option>
                            {plataformasFiltradas.map(p => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro: Conta de Anúncio */}
                    <div className="filter-group">
                        <label htmlFor="filter-conta">
                            <CreditCard size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            Conta de Anúncio
                        </label>
                        <select
                            id="filter-conta"
                            className="filter-input"
                            value={filters.conta_de_anuncio_id}
                            onChange={(e) => handleContaChange(e.target.value)}
                        >
                            <option value="">Todas as Contas</option>
                            {contasFiltradas.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro: Período */}
                    <div className="filter-group">
                        <label htmlFor="period-preset">Período</label>
                        <select
                            id="period-preset"
                            className="filter-input"
                            value={filters.periodPreset}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                        >
                            <option value="thisMonth">Este Mês</option>
                            <option value="last7days">Últimos 7 dias</option>
                            <option value="last15days">Últimos 15 dias</option>
                            <option value="lastMonth">Mês Passado</option>
                            <option value="last6months">Últimos 6 meses</option>
                            <option value="">Personalizado</option>
                        </select>
                    </div>

                    {/* Filtro: Data Início */}
                    <div className="filter-group">
                        <label htmlFor="report-start-date">Data de Início</label>
                        <input
                            type="date"
                            id="report-start-date"
                            className="filter-input"
                            value={filters.data_inicio}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                data_inicio: e.target.value,
                                periodPreset: ''
                            }))}
                        />
                    </div>

                    {/* Filtro: Data Fim */}
                    <div className="filter-group">
                        <label htmlFor="report-end-date">Data de Fim</label>
                        <input
                            type="date"
                            id="report-end-date"
                            className="filter-input"
                            value={filters.data_fim}
                            onChange={(e) => setFilters(prev => ({
                                ...prev,
                                data_fim: e.target.value,
                                periodPreset: ''
                            }))}
                        />
                    </div>

                    {/* Botão Aplicar */}
                    <div className="filter-actions">
                        <button className="btn btn-primary" onClick={handleApplyFilters} disabled={loading}>
                            <Search size={16} style={{ marginRight: '8px' }} />
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </section>

            {/* Loading State */}
            {/* Loading State */}
            {loading && <Preloader message="Carregando Relatório..." />}

            {/* Error State */}
            {error && !loading && (
                <div className="error-state">
                    <div className="error-icon">
                        <AlertCircle size={48} />
                    </div>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={loadInitialData}>
                        Tentar Novamente
                    </button>
                </div>
            )}

            {/* Conteúdo Principal - Apenas exibe quando não está carregando e sem erro */}
            {!loading && !error && (
                <>
                    {/* Cards de Estatísticas Principais */}
                    <section className="kpi-section">
                        <div className="kpi-grid">
                            {/* Total Investido */}
                            <div className="kpi-card">
                                <div className="kpi-header">
                                    <h3>Total Investido</h3>
                                    <DollarSign size={20} color="#2563eb" />
                                </div>
                                <div className="kpi-value" style={{ color: '#059669' }}>
                                    {formatCurrency(estatisticas.totalInvestido)}
                                </div>
                            </div>

                            {/* Total de Conversões */}
                            <div className="kpi-card">
                                <div className="kpi-header">
                                    <h3>Total de Conversões</h3>
                                    <Target size={20} color="#2563eb" />
                                </div>
                                <div className="kpi-value">
                                    {formatNumber(estatisticas.totalConversoes)}
                                </div>
                            </div>

                            {/* CTR Médio */}
                            <div className="kpi-card">
                                <div className="kpi-header">
                                    <h3>CTR Médio</h3>
                                    <TrendingUp size={20} color="#2563eb" />
                                </div>
                                <div className="kpi-value" style={{ color: '#2563eb' }}>
                                    {formatPercentage(estatisticas.ctrMedio)}
                                </div>
                            </div>

                            {/* CPC Médio */}
                            <div className="kpi-card">
                                <div className="kpi-header">
                                    <h3>CPC Médio</h3>
                                    <Calculator size={20} color="#2563eb" />
                                </div>
                                <div className="kpi-value" style={{ color: '#f59e0b' }}>
                                    {formatCurrency(estatisticas.cpcMedio)}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Investimento por Marca */}
                    <section className="detailed-report-section">
                        <div className="section-header">
                            <h2>
                                <Building2 size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Investimento por Marca
                            </h2>
                        </div>
                        <div id="detailed-report-container">
                            {investimentoPorMarca.length === 0 ? (
                                <div className="empty-state">
                                    <Building2 size={48} color="#d1d5db" />
                                    <h3>Nenhum dado encontrado</h3>
                                    <p>Não há dados de investimento por marca para o período selecionado.</p>
                                </div>
                            ) : (
                                <div className="brand-investment-grid">
                                    {investimentoPorMarca.map((marca, index) => (
                                        <div key={marca.marca_id || index} className="brand-investment-card">
                                            <div className="brand-card-header">
                                                <h4>{marca.marca_nome}</h4>
                                            </div>
                                            <div className="brand-card-metrics">
                                                <div className="brand-metric-item">
                                                    <span className="metric-label">Investido</span>
                                                    <span className="metric-value currency">
                                                        {formatCurrency(marca.totalInvestido)}
                                                    </span>
                                                </div>
                                                <div className="brand-metric-item">
                                                    <span className="metric-label">Conversões</span>
                                                    <span className="metric-value">
                                                        {formatNumber(marca.totalConversoes)}
                                                    </span>
                                                </div>
                                                <div className="brand-metric-item">
                                                    <span className="metric-label">CTR</span>
                                                    <span className="metric-value percentage">
                                                        {formatPercentage(marca.ctrMedio)}
                                                    </span>
                                                </div>
                                                <div className="brand-metric-item">
                                                    <span className="metric-label">CPC</span>
                                                    <span className="metric-value">
                                                        {formatCurrency(marca.cpcMedio)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Tendência Semanal */}
                    {tendenciaSemanal.length > 0 && (
                        <section className="detailed-report-section" style={{ marginTop: '1.5rem' }}>
                            <div className="section-header">
                                <h2>
                                    <TrendingUp size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                    Tendência Semanal
                                </h2>
                            </div>
                            <div className="performance-comparison-table">
                                <table className="performance-table">
                                    <thead>
                                        <tr>
                                            <th>Semana</th>
                                            <th>Investido</th>
                                            <th>Conversões</th>
                                            <th>CTR Médio</th>
                                            <th>CPC Médio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tendenciaSemanal.map((semana, index) => (
                                            <tr key={index}>
                                                <td style={{ textAlign: 'left' }}>
                                                    {new Date(semana.semana).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="metric-currency">
                                                    {formatCurrency(semana.totalInvestido)}
                                                </td>
                                                <td className="metric-number">
                                                    {formatNumber(semana.totalConversoes)}
                                                </td>
                                                <td className="metric-percentage">
                                                    {formatPercentage(semana.ctrMedio)}
                                                </td>
                                                <td className="metric-currency">
                                                    {formatCurrency(semana.cpcMedio)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Resumo de Registros */}
                    {estatisticas.totalRegistros > 0 && (
                        <div className="report-summary" style={{
                            marginTop: '1rem',
                            padding: '0.75rem 1rem',
                            background: '#f0f9ff',
                            borderRadius: '0.5rem',
                            color: '#0369a1',
                            fontSize: '0.875rem'
                        }}>
                            Total de {estatisticas.totalRegistros} registro(s) de anúncio encontrado(s) no período selecionado.
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Relatorios;
