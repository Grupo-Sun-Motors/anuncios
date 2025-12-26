import React, { useState, useEffect } from 'react';
import { Calendar, Search, X, ArrowRight, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { supabase } from '../services-apis/supabase/client';
import * as configService from '../services-apis/supabase/configService';

const Reports = () => {
    const [mode, setMode] = useState('performance'); // 'performance' | 'comparison'
    const [loading, setLoading] = useState(false);

    // Date State
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [periodPreset, setPeriodPreset] = useState('thisMonth');

    // Performance Mode State
    const [performanceData, setPerformanceData] = useState({ current: [], previous: [] });
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');

    // Comparison Mode State
    const [comparisonData, setComparisonData] = useState([]);
    const [allItems, setAllItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (mode === 'performance') {
            loadPerformanceData();
        } else {
            loadComparisonData();
        }
    }, [mode, dateRange, selectedAccount]);

    useEffect(() => {
        if (mode === 'comparison' && allItems.length === 0) {
            loadAllItems();
        }
    }, [mode]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const filtered = allItems.filter(item =>
                item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.conta?.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 10);
            setSearchResults(filtered);
        } else {
            setSearchResults([]);
        }
    }, [searchQuery, allItems]);

    const loadInitialData = async () => {
        try {
            const accountsData = await configService.buscarTodasContasDeAnuncio();
            setAccounts(accountsData || []);
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    };

    const loadAllItems = async () => {
        try {
            const { data, error } = await supabase
                .from('campanhas')
                .select(`
          id, nome,
          marcas(nome),
          contas_de_anuncio(nome, plataformas(nome)),
          grupos_de_anuncios(id, nome),
          criativos(id, tipo, titulos)
        `);

            if (error) throw error;

            const items = [];
            data.forEach(campaign => {
                items.push({
                    id: campaign.id,
                    type: 'campanha',
                    displayName: `${campaign.nome} (Campanha)`,
                    marca: campaign.marcas?.nome,
                    conta: campaign.contas_de_anuncio?.nome
                });

                campaign.grupos_de_anuncios?.forEach(group => {
                    items.push({
                        id: group.id,
                        type: 'grupo_de_anuncio',
                        displayName: `${group.nome} (Grupo)`,
                        marca: campaign.marcas?.nome,
                        conta: campaign.contas_de_anuncio?.nome
                    });
                });

                campaign.criativos?.forEach(creative => {
                    const name = creative.titulos?.[0] || `${creative.tipo} Creative`;
                    items.push({
                        id: creative.id,
                        type: 'criativo',
                        displayName: `${name} (Criativo)`,
                        marca: campaign.marcas?.nome,
                        conta: campaign.contas_de_anuncio?.nome
                    });
                });
            });
            setAllItems(items);
        } catch (error) {
            console.error('Error loading items:', error);
        }
    };

    const calculatePreviousPeriod = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffTime = endDate.getTime() - startDate.getTime();
        const prevEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
        const prevStart = new Date(prevEnd.getTime() - diffTime);
        return {
            start: prevStart.toISOString().split('T')[0],
            end: prevEnd.toISOString().split('T')[0]
        };
    };

    const loadPerformanceData = async () => {
        if (!dateRange.start || !dateRange.end) return;
        setLoading(true);
        try {
            const prevPeriod = calculatePreviousPeriod(dateRange.start, dateRange.end);

            let query = supabase
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

            if (selectedAccount) {
                query = query.eq('campanhas.conta_de_anuncio_id', selectedAccount);
            }

            const { data: current, error: currError } = await query
                .gte('data_relatorio', dateRange.start)
                .lte('data_relatorio', dateRange.end);

            if (currError) throw currError;

            // Re-create query for previous period because Supabase query objects are mutable/single-use
            let prevQuery = supabase
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

            if (selectedAccount) {
                prevQuery = prevQuery.eq('campanhas.conta_de_anuncio_id', selectedAccount);
            }

            const { data: previous, error: prevError } = await prevQuery
                .gte('data_relatorio', prevPeriod.start)
                .lte('data_relatorio', prevPeriod.end);

            if (prevError) throw prevError;

            setPerformanceData({ current: current || [], previous: previous || [] });

        } catch (error) {
            console.error('Error loading performance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadComparisonData = async () => {
        if (selectedItems.length === 0 || !dateRange.start || !dateRange.end) {
            setComparisonData([]);
            return;
        }
        setLoading(true);
        try {
            const campaignIds = selectedItems
                .filter(i => i.type === 'campanha')
                .map(i => i.id);

            if (campaignIds.length === 0) {
                setComparisonData([]);
                return;
            }

            const { data, error } = await supabase
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
                .gte('data_relatorio', dateRange.start)
                .lte('data_relatorio', dateRange.end);

            if (error) throw error;
            setComparisonData(data || []);

        } catch (error) {
            console.error('Error loading comparison data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePresetChange = (preset) => {
        setPeriodPreset(preset);
        const today = new Date();
        let start, end;

        switch (preset) {
            case 'last7days':
                start = new Date(today);
                start.setDate(today.getDate() - 6);
                end = new Date(today);
                break;
            case 'last15days':
                start = new Date(today);
                start.setDate(today.getDate() - 14);
                end = new Date(today);
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'last6months':
                start = new Date(today);
                start.setMonth(today.getMonth() - 6);
                end = new Date(today);
                break;
            default:
                return;
        }
        setDateRange({
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        });
    };

    const calculateTotals = (data) => {
        return data.reduce((acc, item) => ({
            custo: acc.custo + (parseFloat(item.custo) || 0),
            impressoes: acc.impressoes + (parseInt(item.impressoes) || 0),
            cliques: acc.cliques + (parseInt(item.cliques) || 0),
            conversoes: acc.conversoes + (parseInt(item.conversoes) || 0)
        }), { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 });
    };

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const formatNumber = (val) => new Intl.NumberFormat('pt-BR').format(val);
    const formatPercentage = (val) => `${val.toFixed(2)}%`;

    const renderVariation = (current, previous, inverse = false) => {
        if (!previous) return <span className="variation neutral">-</span>;
        const diff = ((current - previous) / previous) * 100;
        const isPositive = inverse ? diff < 0 : diff > 0;
        const Icon = diff > 0 ? ArrowUp : (diff < 0 ? ArrowDown : Minus);
        const colorClass = diff === 0 ? 'neutral' : (isPositive ? 'positive' : 'negative');

        return (
            <span className={`variation ${colorClass}`}>
                <Icon size={12} /> {Math.abs(diff).toFixed(1)}%
            </span>
        );
    };

    const renderPerformanceKPIs = () => {
        const currentTotals = calculateTotals(performanceData.current);
        const previousTotals = calculateTotals(performanceData.previous);

        const metrics = [
            { key: 'custo', label: 'Investimento', format: formatCurrency },
            { key: 'impressoes', label: 'Impressões', format: formatNumber },
            { key: 'cliques', label: 'Cliques', format: formatNumber },
            { key: 'conversoes', label: 'Conversões', format: formatNumber }
        ];

        // Derived metrics
        const currentCTR = currentTotals.impressoes ? (currentTotals.cliques / currentTotals.impressoes) * 100 : 0;
        const previousCTR = previousTotals.impressoes ? (previousTotals.cliques / previousTotals.impressoes) * 100 : 0;

        const currentCPC = currentTotals.cliques ? currentTotals.custo / currentTotals.cliques : 0;
        const previousCPC = previousTotals.cliques ? previousTotals.custo / previousTotals.cliques : 0;

        return (
            <div className="kpi-grid">
                {metrics.map(m => (
                    <div key={m.key} className="kpi-card">
                        <span className="kpi-label">{m.label}</span>
                        <div className="kpi-value-group">
                            <span className="kpi-value">{m.format(currentTotals[m.key])}</span>
                            {renderVariation(currentTotals[m.key], previousTotals[m.key])}
                        </div>
                        <span className="kpi-prev">Anterior: {m.format(previousTotals[m.key])}</span>
                    </div>
                ))}
                <div className="kpi-card">
                    <span className="kpi-label">CTR Médio</span>
                    <div className="kpi-value-group">
                        <span className="kpi-value">{formatPercentage(currentCTR)}</span>
                        {renderVariation(currentCTR, previousCTR)}
                    </div>
                    <span className="kpi-prev">Anterior: {formatPercentage(previousCTR)}</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-label">CPC Médio</span>
                    <div className="kpi-value-group">
                        <span className="kpi-value">{formatCurrency(currentCPC)}</span>
                        {renderVariation(currentCPC, previousCPC, true)}
                    </div>
                    <span className="kpi-prev">Anterior: {formatCurrency(previousCPC)}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="page-view" style={{ display: 'block' }}>
            <div className="page-header">
                <h1>{mode === 'performance' ? 'Relatório de Performance' : 'Comparação de Itens'}</h1>
                <div className="header-actions">
                    <button
                        className={`btn ${mode === 'performance' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMode('performance')}
                    >
                        Performance
                    </button>
                    <button
                        className={`btn ${mode === 'comparison' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setMode('comparison')}
                    >
                        Comparação
                    </button>
                </div>
            </div>

            <div className="filters-bar">
                <div className="filter-group">
                    <label>Período:</label>
                    <select value={periodPreset} onChange={(e) => handlePresetChange(e.target.value)}>
                        <option value="thisMonth">Este Mês</option>
                        <option value="lastMonth">Mês Passado</option>
                        <option value="last7days">Últimos 7 dias</option>
                        <option value="last15days">Últimos 15 dias</option>
                        <option value="last6months">Últimos 6 meses</option>
                        <option value="">Personalizado</option>
                    </select>
                </div>
                <div className="filter-group">
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setPeriodPreset(''); }}
                    />
                    <span>até</span>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setPeriodPreset(''); }}
                    />
                </div>

                {mode === 'performance' && (
                    <div className="filter-group">
                        <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
                            <option value="">Todas as Contas</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.nome} ({acc.plataformas?.nome})</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {mode === 'performance' ? (
                <>
                    {renderPerformanceKPIs()}
                    {/* Hierarchical Table would go here - simplified for now */}
                    <div className="report-content">
                        {loading ? <div className="loading">Carregando dados...</div> : (
                            <div className="empty-state">
                                <p>Tabela detalhada em desenvolvimento (use os KPIs acima por enquanto)</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="comparison-view">
                    <div className="search-box">
                        <div className="search-input-wrapper">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Buscar campanhas, grupos ou criativos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {searchResults.length > 0 && (
                            <div className="search-results">
                                {searchResults.map(item => (
                                    <div
                                        key={`${item.type}-${item.id}`}
                                        className="search-result-item"
                                        onClick={() => {
                                            if (!selectedItems.some(i => i.id === item.id && i.type === item.type)) {
                                                setSelectedItems([...selectedItems, item]);
                                            }
                                            setSearchQuery('');
                                        }}
                                    >
                                        <div className="item-name">{item.displayName}</div>
                                        <div className="item-details">{item.marca} • {item.conta}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="selected-items">
                        {selectedItems.map((item, idx) => (
                            <div key={idx} className="selected-item-tag">
                                <span>{item.displayName}</span>
                                <button onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="comparison-content">
                        {loading ? <div className="loading">Carregando comparação...</div> : (
                            comparisonData.length > 0 ? (
                                <div className="comparison-table-wrapper">
                                    {/* Simplified comparison table */}
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Campanha</th>
                                                <th>Investimento</th>
                                                <th>Impressões</th>
                                                <th>Cliques</th>
                                                <th>Conversões</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(comparisonData.reduce((acc, item) => {
                                                const name = item.campanhas.nome;
                                                if (!acc[name]) acc[name] = { custo: 0, impressoes: 0, cliques: 0, conversoes: 0 };
                                                acc[name].custo += parseFloat(item.custo) || 0;
                                                acc[name].impressoes += parseInt(item.impressoes) || 0;
                                                acc[name].cliques += parseInt(item.cliques) || 0;
                                                acc[name].conversoes += parseInt(item.conversoes) || 0;
                                                return acc;
                                            }, {})).map(([name, totals]) => (
                                                <tr key={name}>
                                                    <td>{name}</td>
                                                    <td>{formatCurrency(totals.custo)}</td>
                                                    <td>{formatNumber(totals.impressoes)}</td>
                                                    <td>{formatNumber(totals.cliques)}</td>
                                                    <td>{formatNumber(totals.conversoes)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p>Selecione itens e um período para comparar</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
