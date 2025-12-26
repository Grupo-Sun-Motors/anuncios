import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, ArrowLeft, MoreVertical, Edit, Trash2, X, DollarSign, Save } from 'lucide-react';
import Preloader from '../components/Preloader';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import {
    buscarTodosOrcamentosMensais,
    buscarTodosOrcamentosDetalhados,
    atualizarOrcamentoDetalhado,
    deletarOrcamentoDetalhado,
    upsertOrcamentoMensal,
    criarOrcamentoDetalhado
} from '../services-apis/supabase/orcamentoService';
import { buscarContasDeAnuncioComMarcas } from '../services-apis/supabase/contasDeAnuncioService';
import { buscarMarcas, buscarPlataformas, buscarRelatorioCompletoMarcas } from '../services-apis/supabase/configService';
import { buscarTodosModelos } from '../services-apis/supabase/modelosService';
import CurrencyInput from '../components/CurrencyInput';

const Budget = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    // State
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        brandTotals: {},
        accountGroups: [],
        brands: [],
        platforms: [],
        relatorioMarcas: [],
        models: []
    });

    // UI State
    const [activeMenuId, setActiveMenuId] = useState(null);
    const menuRef = useRef(null);

    // Modals State
    const [isAddMonthlyModalOpen, setIsAddMonthlyModalOpen] = useState(false);
    const [isEditDetailedModalOpen, setIsEditDetailedModalOpen] = useState(false);
    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
    const [isAddModelBudgetModalOpen, setIsAddModelBudgetModalOpen] = useState(false);

    const [currentDetailedBudget, setCurrentDetailedBudget] = useState(null);

    // Monthly Budget Form State
    const [monthlyFormData, setMonthlyFormData] = useState({
        marca_id: '',
        plataforma_tipo: 'google', // 'google' or 'meta'
        valor: ''
    });

    // Edit Detailed Budget Form State
    const [detailedFormData, setDetailedFormData] = useState({
        orcamento_diario_planejado: '',
        resultados_planejados: '',
        observacoes: ''
    });

    // New Model Budget Form State
    const [modelBudgetFormData, setModelBudgetFormData] = useState({
        plataforma_id: '',
        marca_id: '',
        conta_de_anuncio_id: '',
        modelo_id: '',
        orcamento_diario_planejado: '',
        orcamento_total_planejado: '',
        resultados_planejados: '',
        observacoes: ''
    });

    // Derived State
    const [availableBrandsForMonthly, setAvailableBrandsForMonthly] = useState([]);
    const [availableBrandsForModel, setAvailableBrandsForModel] = useState([]);
    const [availableModelsForBudget, setAvailableModelsForBudget] = useState([]);

    // Helpers
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter Brands for Monthly Modal based on Platform
    useEffect(() => {
        if (monthlyFormData.plataforma_tipo && data.relatorioMarcas.length > 0) {
            const platformName = monthlyFormData.plataforma_tipo === 'google' ? 'Google Ads' : 'Meta Ads';

            // Find brands that have an account on this platform
            const validBrandIds = [...new Set(
                data.relatorioMarcas
                    .filter(item => item.plataforma === platformName)
                    .map(item => item.marca_id)
            )];

            const filtered = data.brands.filter(b => validBrandIds.includes(b.id));
            setAvailableBrandsForMonthly(filtered);

            // Reset brand if not in new list
            if (monthlyFormData.marca_id && !validBrandIds.includes(monthlyFormData.marca_id)) {
                setMonthlyFormData(prev => ({ ...prev, marca_id: '' }));
            }
        } else {
            setAvailableBrandsForMonthly(data.brands);
        }
    }, [monthlyFormData.plataforma_tipo, data.relatorioMarcas, data.brands]);

    // -------- Logic for Model Budget Form --------

    // Filter Brands for Model Budget based on Platform
    useEffect(() => {
        if (modelBudgetFormData.plataforma_id && data.relatorioMarcas.length > 0) {
            // Get unique brand IDs that have an account on this platform
            const brandIdsOnPlatform = [...new Set(
                data.relatorioMarcas
                    .filter(item => item.plataforma_id === modelBudgetFormData.plataforma_id)
                    .map(item => item.marca_id)
            )];

            const filteredBrands = data.brands.filter(b => brandIdsOnPlatform.includes(b.id));
            setAvailableBrandsForModel(filteredBrands);

            // Reset brand if not in new list
            if (modelBudgetFormData.marca_id && !brandIdsOnPlatform.includes(modelBudgetFormData.marca_id)) {
                setModelBudgetFormData(prev => ({ ...prev, marca_id: '' }));
            }
        } else {
            setAvailableBrandsForModel([]);
        }
    }, [modelBudgetFormData.plataforma_id, data.relatorioMarcas, data.brands]);

    // Filter Models for Model Budget based on Brand
    useEffect(() => {
        if (modelBudgetFormData.marca_id) {
            const filteredModels = data.models.filter(m => m.marca_id === modelBudgetFormData.marca_id);
            setAvailableModelsForBudget(filteredModels);

            // Reset model if not in new list
            if (modelBudgetFormData.modelo_id && !filteredModels.find(m => m.id === modelBudgetFormData.modelo_id)) {
                setModelBudgetFormData(prev => ({ ...prev, modelo_id: '' }));
            }
        } else {
            setAvailableModelsForBudget([]);
        }
    }, [modelBudgetFormData.marca_id, data.models]);

    // Auto-select Ad Account for Model Budget
    useEffect(() => {
        if (modelBudgetFormData.plataforma_id && modelBudgetFormData.marca_id && data.relatorioMarcas.length > 0) {
            const match = data.relatorioMarcas.find(
                item => item.plataforma_id === modelBudgetFormData.plataforma_id && item.marca_id === modelBudgetFormData.marca_id
            );

            if (match) {
                setModelBudgetFormData(prev => ({ ...prev, conta_de_anuncio_id: match.conta_id }));
            } else {
                setModelBudgetFormData(prev => ({ ...prev, conta_de_anuncio_id: '' }));
            }
        } else {
            setModelBudgetFormData(prev => ({ ...prev, conta_de_anuncio_id: '' }));
        }
    }, [modelBudgetFormData.plataforma_id, modelBudgetFormData.marca_id, data.relatorioMarcas]);

    // Auto-calculate Total Budget for Model Budget
    useEffect(() => {
        if (modelBudgetFormData.orcamento_diario_planejado) {
            const daily = parseFloat(modelBudgetFormData.orcamento_diario_planejado);
            const total = daily * 30.4;
            setModelBudgetFormData(prev => ({ ...prev, orcamento_total_planejado: total.toFixed(2) }));
        } else {
            setModelBudgetFormData(prev => ({ ...prev, orcamento_total_planejado: '' }));
        }
    }, [modelBudgetFormData.orcamento_diario_planejado]);


    // Data Processing Logic (Ported from reference)
    const processData = (monthlyBudgets, detailedBudgets, adAccounts, brands) => {
        // 1. Calculate Brand Totals
        const brandTotals = {};
        monthlyBudgets.forEach(budget => {
            const brandName = budget.marcas?.nome;
            if (brandName) {
                if (!brandTotals[brandName]) {
                    brandTotals[brandName] = { total: 0, google: 0, meta: 0 };
                }
                brandTotals[brandName].total += budget.meta_investimento_total || 0;
                brandTotals[brandName].google += budget.meta_investimento_google || 0;
                brandTotals[brandName].meta += budget.meta_investimento_meta || 0;
            }
        });

        // 2. Group by Accounts
        const accountGroups = [];
        adAccounts.forEach(account => {
            // Get brands for this account
            const accountBrands = account.marcas_contas?.map(mc => mc.marcas) || [];
            const brandIds = accountBrands.map(b => b.id);

            // Filter monthly budgets
            const accountMonthlyBudgets = monthlyBudgets.filter(mb => brandIds.includes(mb.marca_id));

            // Filter detailed budgets
            const accountDetailedBudgets = detailedBudgets.filter(db => db.conta_de_anuncio_id === account.id);

            // Calculate Planned Budget (Sum of detailed)
            const plannedBudget = accountDetailedBudgets.reduce((sum, db) => sum + (db.orcamento_total_planejado || 0), 0);

            // Calculate Platform Target
            const platformName = account.plataformas?.nome?.toLowerCase() || '';
            let platformTarget = 0;
            accountMonthlyBudgets.forEach(mb => {
                if (platformName.includes('meta') || platformName.includes('facebook') || platformName.includes('instagram')) {
                    platformTarget += mb.meta_investimento_meta || 0;
                } else {
                    platformTarget += mb.meta_investimento_google || 0;
                }
            });

            const balance = platformTarget - plannedBudget;

            // Only add if there's relevant data
            if (accountMonthlyBudgets.length > 0 || accountDetailedBudgets.length > 0) {
                accountGroups.push({
                    account,
                    brands: accountBrands,
                    monthlyBudgets: accountMonthlyBudgets,
                    detailedBudgets: accountDetailedBudgets,
                    investments: {
                        planned: plannedBudget,
                        target: platformTarget,
                        balance: balance
                    }
                });
            }
        });

        return { brandTotals, accountGroups, brands };
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [monthly, detailed, accounts, brands, platforms, relatorio, modelsData] = await Promise.all([
                buscarTodosOrcamentosMensais(),
                buscarTodosOrcamentosDetalhados(),
                buscarContasDeAnuncioComMarcas(),
                buscarMarcas(),
                buscarPlataformas(),
                buscarRelatorioCompletoMarcas(),
                buscarTodosModelos()
            ]);

            // Filter for current month/year
            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1;
            const currentYear = currentDate.getFullYear();

            const filteredMonthly = (monthly || []).filter(b => b.mes === currentMonth && b.ano === currentYear);

            const processed = processData(filteredMonthly, detailed || [], accounts || [], brands || []);
            setData({
                ...processed,
                platforms: platforms || [],
                relatorioMarcas: relatorio || [],
                models: modelsData || [],
                allMonthlyBudgets: monthly || [] // Keep all for lookup in model creation
            });

        } catch (error) {
            console.error("Error fetching budget data:", error);
            addToast("Erro ao carregar dados de orçamento", "error");
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handlers
    const handleToggleStatus = async (budget) => {
        try {
            const newStatus = !budget.ativo;
            await atualizarOrcamentoDetalhado(budget.id, { ativo: newStatus });
            addToast(`Orçamento ${newStatus ? 'ativado' : 'desativado'}`, "success");
            fetchData();
        } catch (error) {
            addToast("Erro ao atualizar status", "error");
        }
    };

    const handleEditDetailedClick = (budget) => {
        setCurrentDetailedBudget(budget);
        setDetailedFormData({
            orcamento_diario_planejado: budget.orcamento_diario_planejado,
            resultados_planejados: budget.resultados_planejados,
            observacoes: budget.observacoes || ''
        });
        setIsEditDetailedModalOpen(true);
        setActiveMenuId(null);
    };

    const handleEditDetailedSubmit = async (e) => {
        e.preventDefault();
        if (!currentDetailedBudget) return;

        try {
            const daily = parseFloat(detailedFormData.orcamento_diario_planejado);
            const total = daily * 30.4; // Approx monthly calculation

            await atualizarOrcamentoDetalhado(currentDetailedBudget.id, {
                orcamento_diario_planejado: daily,
                orcamento_total_planejado: total,
                resultados_planejados: parseInt(detailedFormData.resultados_planejados),
                observacoes: detailedFormData.observacoes
            });

            addToast("Orçamento atualizado com sucesso!", "success");
            setIsEditDetailedModalOpen(false);
            fetchData();
        } catch (error) {
            addToast("Erro ao atualizar orçamento", "error");
        }
    };

    const handleDeleteDetailedClick = (budget) => {
        setCurrentDetailedBudget(budget);
        setIsDeleteConfirmModalOpen(true);
        setActiveMenuId(null);
    };

    const handleDeleteDetailedConfirm = async () => {
        if (!currentDetailedBudget) return;
        try {
            await deletarOrcamentoDetalhado(currentDetailedBudget.id);
            addToast("Orçamento excluído com sucesso!", "success");
            setIsDeleteConfirmModalOpen(false);
            fetchData();
        } catch (error) {
            addToast("Erro ao excluir orçamento", "error");
        }
    };

    const handleAddMonthlySubmit = async (e) => {
        e.preventDefault();
        try {
            const currentDate = new Date();
            const payload = {
                marca_id: monthlyFormData.marca_id,
                mes: currentDate.getMonth() + 1,
                ano: currentDate.getFullYear()
            };

            // Set the appropriate field based on platform selection
            if (monthlyFormData.plataforma_tipo === 'google') {
                payload.meta_investimento_google = parseFloat(monthlyFormData.valor);
            } else {
                payload.meta_investimento_meta = parseFloat(monthlyFormData.valor);
            }

            // Use upsert to handle existing records
            await upsertOrcamentoMensal(payload);

            addToast("Verba mensal atualizada!", "success");
            setIsAddMonthlyModalOpen(false);
            setMonthlyFormData({ marca_id: '', plataforma_tipo: 'google', valor: '' });
            fetchData();
        } catch (error) {
            console.error("Error adding monthly budget:", error);
            addToast("Erro ao adicionar verba", "error");
        }
    };

    const handleAddModelBudgetSubmit = async (e) => {
        e.preventDefault();

        if (!modelBudgetFormData.conta_de_anuncio_id) {
            addToast("Conta de anúncio não identificada. Verifique a seleção de Marca e Plataforma.", "error");
            return;
        }

        // Find corresponding monthly budget
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        // Need to check against all monthly budgets, not just filtered ones
        const monthlyBudget = (data.allMonthlyBudgets || []).find(mb =>
            mb.marca_id === modelBudgetFormData.marca_id &&
            mb.mes === currentMonth &&
            mb.ano === currentYear
        );

        if (!monthlyBudget) {
            addToast("Não há verba mensal definida para esta marca neste mês. Adicione uma verba mensal primeiro.", "error");
            return;
        }

        try {
            const payload = {
                orcamento_mensal_id: monthlyBudget.id,
                conta_de_anuncio_id: modelBudgetFormData.conta_de_anuncio_id,
                modelo_id: modelBudgetFormData.modelo_id,
                orcamento_diario_planejado: parseFloat(modelBudgetFormData.orcamento_diario_planejado),
                orcamento_total_planejado: parseFloat(modelBudgetFormData.orcamento_total_planejado),
                resultados_planejados: parseInt(modelBudgetFormData.resultados_planejados),
                observacoes: modelBudgetFormData.observacoes,
                ativo: true
            };

            const newBudget = await criarOrcamentoDetalhado(payload);

            if (newBudget) {
                addToast("Orçamento de modelo criado com sucesso!", "success");
                setIsAddModelBudgetModalOpen(false);
                // Reset form
                setModelBudgetFormData({
                    plataforma_id: '',
                    marca_id: '',
                    conta_de_anuncio_id: '',
                    modelo_id: '',
                    orcamento_diario_planejado: '',
                    orcamento_total_planejado: '',
                    resultados_planejados: '',
                    observacoes: ''
                });
                fetchData();
            } else {
                throw new Error("Falha ao criar orçamento");
            }
        } catch (error) {
            console.error("Error creating model budget:", error);
            addToast("Erro ao criar orçamento de modelo", "error");
        }
    };

    if (loading) {
        return <Preloader message="Carregando orçamento..." />;
    }

    return (
        <div id="view-orcamento" className="page-view">
            <div className="budget-header">
                <h1>Orçamento</h1>
                <div className="budget-actions">
                    <button className="btn btn-secondary" onClick={(e) => {
                        e.preventDefault();
                        setIsAddMonthlyModalOpen(true);
                    }}>
                        <Plus size={16} style={{ marginRight: '8px' }} />
                        Adicionar Verba
                    </button>
                    <button className="btn btn-primary" onClick={() => setIsAddModelBudgetModalOpen(true)}>
                        <Plus size={16} style={{ marginRight: '8px' }} />
                        Adicionar Orçamento de Modelo
                    </button>
                </div>
            </div>

            <div id="budget-content">
                {/* Brand Overview */}
                {Object.keys(data.brandTotals).length > 0 && (
                    <div className="budget-section brand-overview">
                        <div className="section-header">
                            <h2>Visão Geral de Investimentos por Marca</h2>
                        </div>
                        <div className="investment-cards">
                            {Object.entries(data.brandTotals).map(([brandName, totals]) => (
                                <div key={brandName} className="investment-card">
                                    <div className="card-header">
                                        <h3>{brandName}</h3>
                                        <span className="amount">{formatCurrency(totals.total)}</span>
                                    </div>
                                    <div className="card-breakdown">
                                        <div className="breakdown-item">
                                            <span className="breakdown-label">Google Ads:</span>
                                            <span className="breakdown-value">{formatCurrency(totals.google)}</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span className="breakdown-label">Meta Ads:</span>
                                            <span className="breakdown-value">{formatCurrency(totals.meta)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Account Groups */}
                {data.accountGroups.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhum orçamento encontrado para este mês.</p>
                    </div>
                ) : (
                    data.accountGroups.map((group, index) => (
                        <div key={group.account.id} className="budget-section" style={{ overflow: 'visible' }}>
                            <div className="section-header">
                                <h2>{group.account.nome}</h2>
                            </div>

                            <div className="investment-cards">
                                <div className="investment-card">
                                    <div className="card-header">
                                        <h3>Orçamento Planejado</h3>
                                        <span className="amount">{formatCurrency(group.investments.planned)}</span>
                                    </div>
                                </div>
                                <div className="investment-card">
                                    <div className="card-header">
                                        <h3>Meta da Plataforma</h3>
                                        <span className="amount">{formatCurrency(group.investments.target)}</span>
                                    </div>
                                </div>
                                <div className="investment-card">
                                    <div className="card-header">
                                        <h3>Saldo</h3>
                                        <span className={`amount ${group.investments.balance >= 0 ? 'status-ok' : 'status-over'}`}>
                                            {formatCurrency(group.investments.balance)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="budget-table-container" style={{ overflow: 'visible' }}>
                                <table className="budget-table">
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
                                        {group.detailedBudgets.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="empty-state">
                                                    Nenhum orçamento detalhado encontrado.
                                                </td>
                                            </tr>
                                        ) : (
                                            group.detailedBudgets.map(budget => {
                                                const costPerResult = budget.resultados_planejados > 0 ?
                                                    (budget.orcamento_total_planejado || 0) / budget.resultados_planejados : 0;

                                                return (
                                                    <tr key={budget.id}>
                                                        <td>
                                                            <label className="switch">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={budget.ativo}
                                                                    onChange={() => handleToggleStatus(budget)}
                                                                />
                                                                <span className="slider"></span>
                                                            </label>
                                                        </td>
                                                        <td>{budget.modelos?.nome || '-'}</td>
                                                        <td>{formatCurrency(budget.orcamento_diario_planejado)}</td>
                                                        <td>{formatCurrency(budget.orcamento_total_planejado)}</td>
                                                        <td>{budget.resultados_planejados}</td>
                                                        <td>{formatCurrency(costPerResult)}</td>
                                                        <td style={{ position: 'relative' }}>
                                                            <button
                                                                className="btn-icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveMenuId(activeMenuId === budget.id ? null : budget.id);
                                                                }}
                                                            >
                                                                <MoreVertical size={18} />
                                                            </button>

                                                            {activeMenuId === budget.id && (
                                                                <div className="actions-dropdown active" ref={menuRef} style={{ zIndex: 1000 }}>
                                                                    <button onClick={() => handleEditDetailedClick(budget)}>
                                                                        <Edit size={16} />
                                                                        Editar
                                                                    </button>
                                                                    <button className="danger" onClick={() => handleDeleteDetailedClick(budget)}>
                                                                        <Trash2 size={16} />
                                                                        Excluir
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Monthly Budget Side Menu */}
            <div id="add-monthly-sidemenu-overlay" className={`details-overlay ${isAddMonthlyModalOpen ? 'active' : ''}`} onClick={() => setIsAddMonthlyModalOpen(false)}>
                <div id="add-monthly-sidemenu" className="details-sidemenu" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxWidth: '500px', height: '100%' }}>

                    {/* Header - Fixed */}
                    <div className="details-header" style={{ flexShrink: 0 }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Adicionar Verba Mensal</h2>
                        <button className="btn-icon" onClick={() => setIsAddMonthlyModalOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Wrapper - Flexible */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <form onSubmit={handleAddMonthlySubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                            {/* Scrollable Form Body */}
                            <div className="form-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                <div className="form-group">
                                    <label htmlFor="plataforma_tipo">Plataforma</label>
                                    <select
                                        id="plataforma_tipo"
                                        name="plataforma_tipo"
                                        value={monthlyFormData.plataforma_tipo}
                                        onChange={(e) => setMonthlyFormData({ ...monthlyFormData, plataforma_tipo: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    >
                                        <option value="google">Google Ads</option>
                                        <option value="meta">Meta Ads</option>
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="marca_id">Marca</label>
                                    <select
                                        id="marca_id"
                                        name="marca_id"
                                        value={monthlyFormData.marca_id}
                                        onChange={(e) => setMonthlyFormData({ ...monthlyFormData, marca_id: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">Selecione uma marca</option>
                                        {availableBrandsForMonthly.map(brand => (
                                            <option key={brand.id} value={brand.id}>{brand.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="valor">Meta de Investimento (R$)</label>
                                    <CurrencyInput
                                        id="valor"
                                        name="valor"
                                        value={monthlyFormData.valor}
                                        onChange={(e) => setMonthlyFormData({ ...monthlyFormData, valor: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                <div className="form-info" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '6px' }}>
                                    <p>Nota: Se já existir uma verba definida para esta marca neste mês, o valor será atualizado para a plataforma selecionada.</p>
                                </div>
                            </div>

                            {/* Fixed Footer Actions */}
                            <div className="form-actions" style={{
                                flexShrink: 0,
                                marginTop: 'auto',
                                borderTop: '1px solid #eee',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '1rem',
                                backgroundColor: '#fff'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsAddMonthlyModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Edit Detailed Budget Side Menu */}
            <div id="edit-detailed-sidemenu-overlay" className={`details-overlay ${isEditDetailedModalOpen ? 'active' : ''}`} onClick={() => setIsEditDetailedModalOpen(false)}>
                <div id="edit-detailed-sidemenu" className="details-sidemenu" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxWidth: '500px', height: '100%' }}>

                    {/* Header - Fixed */}
                    <div className="details-header" style={{ flexShrink: 0 }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Editar Orçamento</h2>
                        <button className="btn-icon" onClick={() => setIsEditDetailedModalOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Wrapper - Flexible */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <form onSubmit={handleEditDetailedSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                            {/* Scrollable Form Body */}
                            <div className="form-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                <div className="form-group">
                                    <label>Modelo</label>
                                    <input
                                        type="text"
                                        value={currentDetailedBudget?.modelos?.nome || ''}
                                        readOnly
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', background: '#f3f4f6' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="edit_orcamento_diario">Orçamento Diário (R$)</label>
                                    <CurrencyInput
                                        id="edit_orcamento_diario"
                                        name="orcamento_diario_planejado"
                                        value={detailedFormData.orcamento_diario_planejado}
                                        onChange={(e) => setDetailedFormData({ ...detailedFormData, orcamento_diario_planejado: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="edit_resultados">Resultados Planejados</label>
                                    <input
                                        type="number"
                                        id="edit_resultados"
                                        name="resultados_planejados"
                                        value={detailedFormData.resultados_planejados}
                                        onChange={(e) => setDetailedFormData({ ...detailedFormData, resultados_planejados: e.target.value })}
                                        step="1"
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="edit_observacoes">Observações</label>
                                    <textarea
                                        id="edit_observacoes"
                                        name="observacoes"
                                        value={detailedFormData.observacoes}
                                        onChange={(e) => setDetailedFormData({ ...detailedFormData, observacoes: e.target.value })}
                                        rows="4"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }}
                                    ></textarea>
                                </div>
                            </div>

                            {/* Fixed Footer Actions */}
                            <div className="form-actions" style={{
                                flexShrink: 0,
                                marginTop: 'auto',
                                borderTop: '1px solid #eee',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '1rem',
                                backgroundColor: '#fff'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsEditDetailedModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Add Model Budget Side Menu */}
            <div id="add-model-sidemenu-overlay" className={`details-overlay ${isAddModelBudgetModalOpen ? 'active' : ''}`} onClick={() => setIsAddModelBudgetModalOpen(false)}>
                <div id="add-model-sidemenu" className="details-sidemenu" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxWidth: '500px', height: '100%' }}>

                    {/* Header - Fixed */}
                    <div className="details-header" style={{ flexShrink: 0 }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Novo Orçamento de Modelo</h2>
                        <button className="btn-icon" onClick={() => setIsAddModelBudgetModalOpen(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Wrapper - Flexible */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <form onSubmit={handleAddModelBudgetSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                            {/* Scrollable Form Body */}
                            <div className="form-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                {/* Platform Selection */}
                                <div className="form-group">
                                    <label htmlFor="model_plataforma_id">Plataforma</label>
                                    <select
                                        id="model_plataforma_id"
                                        value={modelBudgetFormData.plataforma_id}
                                        onChange={(e) => setModelBudgetFormData({ ...modelBudgetFormData, plataforma_id: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">Selecione uma plataforma</option>
                                        {data.platforms.map(p => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Brand Selection */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="model_marca_id">Marca</label>
                                    <select
                                        id="model_marca_id"
                                        value={modelBudgetFormData.marca_id}
                                        onChange={(e) => setModelBudgetFormData({ ...modelBudgetFormData, marca_id: e.target.value })}
                                        required
                                        disabled={!modelBudgetFormData.plataforma_id}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">Selecione uma marca</option>
                                        {availableBrandsForModel.map(b => (
                                            <option key={b.id} value={b.id}>{b.nome}</option>
                                        ))}
                                    </select>
                                    {!modelBudgetFormData.plataforma_id && <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem', color: '#6b7280' }}>Selecione uma plataforma primeiro</small>}
                                </div>

                                {/* Model Selection */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="model_modelo_id">Modelo</label>
                                    <select
                                        id="model_modelo_id"
                                        name="modelo_id"
                                        value={modelBudgetFormData.modelo_id}
                                        onChange={(e) => setModelBudgetFormData({ ...modelBudgetFormData, modelo_id: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">Selecione um modelo</option>
                                        {availableModelsForBudget.map(model => (
                                            <option key={model.id} value={model.id}>{model.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Daily Budget */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="model_orcamento_diario">Orçamento Diário (R$)</label>
                                    <CurrencyInput
                                        id="model_orcamento_diario"
                                        name="orcamento_diario_planejado"
                                        value={modelBudgetFormData.orcamento_diario_planejado}
                                        onChange={(e) => setModelBudgetFormData({ ...modelBudgetFormData, orcamento_diario_planejado: e.target.value })}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                {/* Total Budget (Read Only) */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="model_orcamento_total">Orçamento Total (R$)</label>
                                    <input
                                        type="text"
                                        id="model_orcamento_total"
                                        value={modelBudgetFormData.orcamento_total_planejado ? `R$ ${parseFloat(modelBudgetFormData.orcamento_total_planejado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                                        readOnly
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', background: '#f3f4f6' }}
                                    />
                                </div>

                                {/* Planned Results */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="model_resultados">Resultados Planejados</label>
                                    <input
                                        type="number"
                                        id="model_resultados"
                                        name="resultados_planejados"
                                        value={modelBudgetFormData.resultados_planejados}
                                        onChange={(e) => setModelBudgetFormData({ ...modelBudgetFormData, resultados_planejados: e.target.value })}
                                        step="1"
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                {/* Observations */}
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="model_observacoes">Observações</label>
                                    <textarea
                                        id="model_observacoes"
                                        name="observacoes"
                                        value={modelBudgetFormData.observacoes}
                                        onChange={(e) => setModelBudgetFormData({ ...modelBudgetFormData, observacoes: e.target.value })}
                                        rows="4"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }}
                                    ></textarea>
                                </div>
                            </div>

                            {/* Fixed Footer Actions */}
                            <div className="form-actions" style={{
                                flexShrink: 0,
                                marginTop: 'auto',
                                borderTop: '1px solid #eee',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '1rem',
                                backgroundColor: '#fff'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModelBudgetModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={16} style={{ marginRight: '8px' }} />
                                    Salvar Orçamento
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Delete Confirm Modal */}
            {isDeleteConfirmModalOpen && (
                <div className="modal is-active">
                    <div className="modal-content" style={{ padding: '2rem', maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Confirmar Exclusão</h2>
                            <button className="close-btn" onClick={() => setIsDeleteConfirmModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <p style={{ margin: '1.5rem 0' }}>Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.</p>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteConfirmModalOpen(false)}>Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteDetailedConfirm}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Budget;
