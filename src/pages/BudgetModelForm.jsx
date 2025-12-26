import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import {
    buscarMarcas,
    buscarPlataformas,
    buscarRelatorioCompletoMarcas
} from '../services-apis/supabase/configService';
import { buscarTodosModelos } from '../services-apis/supabase/modelosService';
import {
    criarOrcamentoDetalhado,
    buscarTodosOrcamentosMensais
} from '../services-apis/supabase/orcamentoService';
import CurrencyInput from '../components/CurrencyInput';

const BudgetModelForm = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Data
    const [brands, setBrands] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [models, setModels] = useState([]);
    const [relatorioMarcas, setRelatorioMarcas] = useState([]);
    const [monthlyBudgets, setMonthlyBudgets] = useState([]);

    // Form State
    const [selectedPlatformId, setSelectedPlatformId] = useState('');
    const [selectedBrandId, setSelectedBrandId] = useState('');
    const [formData, setFormData] = useState({
        conta_de_anuncio_id: '',
        modelo_id: '',
        orcamento_diario_planejado: '',
        orcamento_total_planejado: '',
        resultados_planejados: '',
        observacoes: ''
    });

    // Derived State
    const [availableBrands, setAvailableBrands] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [marcasData, plataformasData, modelosData, relatorioData, orcamentosMensaisData] = await Promise.all([
                    buscarMarcas(),
                    buscarPlataformas(),
                    buscarTodosModelos(),
                    buscarRelatorioCompletoMarcas(),
                    buscarTodosOrcamentosMensais()
                ]);

                setBrands(marcasData || []);
                setPlatforms(plataformasData || []);
                setModels(modelosData || []);
                setRelatorioMarcas(relatorioData || []);
                setMonthlyBudgets(orcamentosMensaisData || []);
            } catch (error) {
                console.error("Error loading form data:", error);
                addToast("Erro ao carregar dados do formulário", "error");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [addToast]);

    // Filter Brands based on Platform
    useEffect(() => {
        if (selectedPlatformId && relatorioMarcas.length > 0) {
            // Get unique brand IDs that have an account on this platform
            const brandIdsOnPlatform = [...new Set(
                relatorioMarcas
                    .filter(item => item.plataforma_id === selectedPlatformId)
                    .map(item => item.marca_id)
            )];

            const filteredBrands = brands.filter(b => brandIdsOnPlatform.includes(b.id));
            setAvailableBrands(filteredBrands);

            // Reset brand if not in new list
            if (selectedBrandId && !brandIdsOnPlatform.includes(selectedBrandId)) {
                setSelectedBrandId('');
            }
        } else {
            setAvailableBrands([]);
        }
    }, [selectedPlatformId, relatorioMarcas, brands, selectedBrandId]);

    // Auto-select Ad Account
    useEffect(() => {
        if (selectedPlatformId && selectedBrandId && relatorioMarcas.length > 0) {
            const match = relatorioMarcas.find(
                item => item.plataforma_id === selectedPlatformId && item.marca_id === selectedBrandId
            );

            if (match) {
                setFormData(prev => ({ ...prev, conta_de_anuncio_id: match.conta_id }));
            } else {
                setFormData(prev => ({ ...prev, conta_de_anuncio_id: '' }));
                addToast("Nenhuma conta de anúncio encontrada para esta combinação", "warning");
            }
        } else {
            setFormData(prev => ({ ...prev, conta_de_anuncio_id: '' }));
        }
    }, [selectedPlatformId, selectedBrandId, relatorioMarcas, addToast]);

    // Auto-calculate Total Budget
    useEffect(() => {
        if (formData.orcamento_diario_planejado) {
            const daily = parseFloat(formData.orcamento_diario_planejado);
            const total = daily * 30.4;
            setFormData(prev => ({ ...prev, orcamento_total_planejado: total.toFixed(2) }));
        } else {
            setFormData(prev => ({ ...prev, orcamento_total_planejado: '' }));
        }
    }, [formData.orcamento_diario_planejado]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.conta_de_anuncio_id) {
            addToast("Conta de anúncio não identificada. Verifique a seleção de Marca e Plataforma.", "error");
            return;
        }

        // Find corresponding monthly budget
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        const monthlyBudget = monthlyBudgets.find(mb =>
            mb.marca_id === selectedBrandId &&
            mb.mes === currentMonth &&
            mb.ano === currentYear
        );

        if (!monthlyBudget) {
            addToast("Não há verba mensal definida para esta marca neste mês.", "error");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                orcamento_mensal_id: monthlyBudget.id,
                conta_de_anuncio_id: formData.conta_de_anuncio_id,
                modelo_id: formData.modelo_id,
                orcamento_diario_planejado: parseFloat(formData.orcamento_diario_planejado),
                orcamento_total_planejado: parseFloat(formData.orcamento_total_planejado),
                resultados_planejados: parseInt(formData.resultados_planejados),
                observacoes: formData.observacoes,
                ativo: true
            };

            const newBudget = await criarOrcamentoDetalhado(payload);

            if (newBudget) {
                addToast("Orçamento de modelo criado com sucesso!", "success");
                navigate('/orcamento');
            } else {
                throw new Error("Falha ao criar orçamento");
            }
        } catch (error) {
            console.error("Error creating model budget:", error);
            addToast("Erro ao criar orçamento de modelo", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="page-view">
                <div className="loading-spinner-container">
                    <div className="loading-spinner"></div>
                    <p>Carregando formulário...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-view">
            <div className="page-header">
                <button className="btn-icon" onClick={() => navigate('/orcamento')}>
                    <ArrowLeft size={20} />
                </button>
                <h1>Novo Orçamento de Modelo</h1>
            </div>

            <div className="form-container">
                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        {/* Platform Selection */}
                        <div className="form-group">
                            <label htmlFor="plataforma_id">Plataforma</label>
                            <select
                                id="plataforma_id"
                                value={selectedPlatformId}
                                onChange={(e) => setSelectedPlatformId(e.target.value)}
                                required
                            >
                                <option value="">Selecione uma plataforma</option>
                                {platforms.map(p => (
                                    <option key={p.id} value={p.id}>{p.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Brand Selection */}
                        <div className="form-group">
                            <label htmlFor="marca_id">Marca</label>
                            <select
                                id="marca_id"
                                value={selectedBrandId}
                                onChange={(e) => setSelectedBrandId(e.target.value)}
                                required
                                disabled={!selectedPlatformId}
                            >
                                <option value="">Selecione uma marca</option>
                                {availableBrands.map(b => (
                                    <option key={b.id} value={b.id}>{b.nome}</option>
                                ))}
                            </select>
                            {!selectedPlatformId && <small className="text-muted">Selecione uma plataforma primeiro</small>}
                        </div>

                        {/* Ad Account is auto-selected and hidden */}
                        <input type="hidden" name="conta_de_anuncio_id" value={formData.conta_de_anuncio_id} />

                        {/* Model Selection */}
                        <div className="form-group">
                            <label htmlFor="modelo_id">Modelo</label>
                            <select
                                id="modelo_id"
                                name="modelo_id"
                                value={formData.modelo_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Selecione um modelo</option>
                                {models.map(model => (
                                    <option key={model.id} value={model.id}>{model.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Daily Budget */}
                        <div className="form-group">
                            <label htmlFor="orcamento_diario_planejado">Orçamento Diário (R$)</label>
                            <CurrencyInput
                                id="orcamento_diario_planejado"
                                name="orcamento_diario_planejado"
                                value={formData.orcamento_diario_planejado}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Total Budget (Read Only) */}
                        <div className="form-group">
                            <label htmlFor="orcamento_total_planejado">Orçamento Total (R$)</label>
                            <input
                                type="text"
                                id="orcamento_total_planejado"
                                value={formData.orcamento_total_planejado ? `R$ ${parseFloat(formData.orcamento_total_planejado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                                readOnly
                                style={{ background: '#f3f4f6' }}
                            />
                        </div>

                        {/* Planned Results */}
                        <div className="form-group">
                            <label htmlFor="resultados_planejados">Resultados Planejados</label>
                            <input
                                type="number"
                                id="resultados_planejados"
                                name="resultados_planejados"
                                value={formData.resultados_planejados}
                                onChange={handleChange}
                                step="1"
                                required
                            />
                        </div>
                    </div>

                    {/* Observations */}
                    <div className="form-group">
                        <label htmlFor="observacoes">Observações</label>
                        <textarea
                            id="observacoes"
                            name="observacoes"
                            value={formData.observacoes}
                            onChange={handleChange}
                            rows="4"
                        ></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => navigate('/orcamento')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                            <Save size={16} style={{ marginRight: '8px' }} />
                            {submitting ? 'Salvando...' : 'Salvar Orçamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BudgetModelForm;
