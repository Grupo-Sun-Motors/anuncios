import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Filter, Trash2, Edit, Save, MoreVertical, Eye } from 'lucide-react';
import Preloader from '../components/Preloader';
import { useToast } from '../contexts/ToastContext';
import {
    buscarTodoHistorico,
    buscarHistoricoComFiltros,
    criarHistorico,
    atualizarHistorico,
    atualizarStatusOtimizacao,
    deletarHistorico
} from '../services-apis/supabase/historicoOtimizacoesService';
import {
    buscarMarcas,
    buscarPlataformas,
    buscarRelatorioCompletoMarcas
} from '../services-apis/supabase/configService';
import { buscarTodasCampanhas } from '../services-apis/supabase/campanhasService';
import { buscarGruposPorCampanha } from '../services-apis/supabase/gruposDeAnunciosService';
import { buscarCriativosPorGrupo } from '../services-apis/supabase/criativosService';

// Tipos de alteração disponíveis
const TIPOS_ALTERACAO = [
    { value: 'Produtos', label: 'Produtos' },
    { value: 'Orçamentos', label: 'Orçamentos' },
    { value: 'Público Alvo', label: 'Público Alvo' },
    { value: 'Mídias', label: 'Mídias' },
    { value: 'Anúncios', label: 'Anúncios' }
];

// Opções de itens por página
const ITEMS_PER_PAGE_OPTIONS = [25, 50, 75, 100];

const Otimizacoes = () => {
    const { addToast } = useToast();

    // State for Data
    const [optimizations, setOptimizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [brands, setBrands] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [adGroups, setAdGroups] = useState([]);
    const [creatives, setCreatives] = useState([]);
    const [brandAccountMap, setBrandAccountMap] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const listRef = useRef(null);

    // State for UI
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'form'
    const [filters, setFilters] = useState({ status: '', type: '', responsible: '', brand: '', dateStart: '', dateEnd: '' });
    const [formData, setFormData] = useState({
        status: '',
        responsavel: '',
        descricao: '',
        data_alteracao: '',
        hipotese: '',
        tipo_alteracao: '',
        plataforma_id: '',
        marca_id: '',
        conta_de_anuncio_id: '',
        campanha_id: '',
        grupo_de_anuncio_id: '',
        criativo_id: '',
        orcamento_mensal_id: '',
        orcamento_detalhado_id: '',
        publico_personalizado_id: ''
    });
    const [visibleFields, setVisibleFields] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    // Dropdown State
    const [activeDropdown, setActiveDropdown] = useState(null);
    // const dropdownRef = useRef(null); // Removed unused ref

    // View Side Menu State
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewData, setViewData] = useState(null);

    // Initial Load
    useEffect(() => {
        loadInitialData();

        // Click outside to close dropdown
        const handleClickOutside = (event) => {
            if (!event.target.closest('.card-actions')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [optData, brandsData, platformsData, campaignsData, mapData] = await Promise.all([
                buscarTodoHistorico(),
                buscarMarcas(),
                buscarPlataformas(),
                buscarTodasCampanhas(),
                buscarRelatorioCompletoMarcas()
            ]);

            setOptimizations(optData || []);
            setBrands(brandsData || []);
            setPlatforms(platformsData || []);
            setCampaigns(campaignsData || []);
            setBrandAccountMap(mapData || []);
        } catch (error) {
            console.error("Error loading initial data:", error);
            addToast("Erro ao carregar dados iniciais.", "error");
        } finally {
            setLoading(false);
        }
    };

    // Helper to normalize status for CSS class
    const getStatusClass = (status) => {
        if (!status) return '';
        return `status-${status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-')}`;
    };

    // Filter Logic
    const handleFilterChange = (e) => {
        const { id, value } = e.target;
        const keyMap = {
            'filter-status': 'status',
            'filter-type': 'type',
            'filter-responsible': 'responsible',
            'filter-brand': 'brand',
            'filter-date-start': 'dateStart',
            'filter-date-end': 'dateEnd'
        };

        // Dropdowns que aplicam filtro automaticamente
        const autoApplyFields = ['filter-status', 'filter-type', 'filter-brand'];

        if (keyMap[id]) {
            const newFilters = { ...filters, [keyMap[id]]: value };
            setFilters(newFilters);

            // Aplicar filtros automaticamente para dropdowns
            if (autoApplyFields.includes(id)) {
                applyFiltersWithData(newFilters);
            }
        }
    };

    const applyFiltersWithData = async (filterData) => {
        setLoading(true);
        setCurrentPage(1);
        try {
            const apiFilters = {
                status: filterData.status,
                tipo_alteracao: filterData.type,
                responsavel: filterData.responsible,
                marca_id: filterData.brand,
                data_inicio: filterData.dateStart,
                data_fim: filterData.dateEnd
            };
            const data = await buscarHistoricoComFiltros(apiFilters);
            setOptimizations(data || []);
        } catch (error) {
            console.error("Error applying filters:", error);
            addToast("Erro ao aplicar filtros.", "error");
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = async () => {
        setLoading(true);
        try {
            const apiFilters = {
                status: filters.status,
                tipo_alteracao: filters.type,
                responsavel: filters.responsible,
                marca_id: filters.brand,
                data_inicio: filters.dateStart,
                data_fim: filters.dateEnd
            };
            const data = await buscarHistoricoComFiltros(apiFilters);
            setOptimizations(data || []);
        } catch (error) {
            console.error("Error applying filters:", error);
            addToast("Erro ao aplicar filtros.", "error");
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFilters({ status: '', type: '', responsible: '', brand: '', dateStart: '', dateEnd: '' });
        loadInitialData();
    };

    // Form Logic
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'marca_id' || name === 'plataforma_id') {
            const currentBrand = name === 'marca_id' ? value : formData.marca_id;
            const currentPlatform = name === 'plataforma_id' ? value : formData.plataforma_id;

            if (currentBrand && currentPlatform) {
                const found = brandAccountMap.find(
                    item => item.marca_id === currentBrand && item.plataforma_id === currentPlatform
                );
                if (found) {
                    setFormData(prev => ({ ...prev, conta_de_anuncio_id: found.conta_id }));
                } else {
                    setFormData(prev => ({ ...prev, conta_de_anuncio_id: '' }));
                }
            }
        }

        if (name === 'campanha_id') {
            if (value) {
                buscarGruposPorCampanha(value).then(groups => setAdGroups(groups || []));
            } else {
                setAdGroups([]);
            }
            setFormData(prev => ({ ...prev, grupo_de_anuncio_id: '', criativo_id: '' }));
        }

        if (name === 'grupo_de_anuncio_id') {
            if (value) {
                buscarCriativosPorGrupo(value).then(creatives => setCreatives(creatives || []));
            } else {
                setCreatives([]);
            }
            setFormData(prev => ({ ...prev, criativo_id: '' }));
        }
    };

    const handleCheckboxChange = (e) => {
        const field = e.target.getAttribute('data-field');
        const isChecked = e.target.checked;
        setVisibleFields(prev => ({ ...prev, [field]: isChecked }));

        if (!isChecked) {
            setFormData(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...formData };

            // Validation
            if (!payload.responsavel || !payload.descricao || !payload.tipo_alteracao) {
                addToast("Por favor, preencha os campos obrigatórios (Responsável, Descrição e Tipo de Alteração).", "error");
                setLoading(false);
                return;
            }

            // Sanitize Payload: Convert empty strings to null for UUID fields and optional fields
            const uuidFields = ['plataforma_id', 'marca_id', 'conta_de_anuncio_id', 'campanha_id', 'grupo_de_anuncio_id', 'criativo_id', 'orcamento_mensal_id', 'orcamento_detalhado_id', 'publico_personalizado_id'];
            uuidFields.forEach(field => {
                if (payload[field] === '') {
                    payload[field] = null;
                }
            });

            // Handle optional text fields
            if (payload.hipotese === '') payload.hipotese = null;
            if (payload.tipo_alteracao === '') payload.tipo_alteracao = null;

            // Handle date
            if (!payload.data_alteracao) {
                payload.data_alteracao = new Date().toISOString();
            }

            // Clean up payload based on visible fields (double check)
            Object.keys(visibleFields).forEach(field => {
                if (!visibleFields[field]) {
                    payload[field] = null;
                }
            });

            let result;
            if (isEditing) {
                result = await atualizarHistorico(editId, payload);
                addToast("Otimização atualizada com sucesso!", "success");
            } else {
                result = await criarHistorico(payload);
                addToast("Otimização criada com sucesso!", "success");
            }

            if (result) {
                resetForm();
                loadInitialData();
            }
        } catch (error) {
            console.error("Error saving optimization:", error);
            addToast("Erro ao salvar otimização. Verifique os dados e tente novamente.", "error");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            status: '', responsavel: '', descricao: '', data_alteracao: '',
            hipotese: '', tipo_alteracao: '', plataforma_id: '', marca_id: '',
            conta_de_anuncio_id: '', campanha_id: '', grupo_de_anuncio_id: '', criativo_id: '',
            orcamento_mensal_id: '', orcamento_detalhado_id: '', publico_personalizado_id: ''
        });
        setVisibleFields({});
        setIsEditing(false);
        setEditId(null);
        setViewMode('list');
    };

    const handleNewOptimization = () => {
        resetForm();
        setViewMode('form');
    };

    const handleEdit = (opt) => {
        setActiveDropdown(null);
        setFormData({
            status: opt.status || '',
            responsavel: opt.responsavel || '',
            descricao: opt.descricao || '',
            data_alteracao: opt.data_alteracao ? opt.data_alteracao.split('T')[0] : '',
            hipotese: opt.hipotese || '',
            tipo_alteracao: opt.tipo_alteracao || '',
            plataforma_id: opt.plataforma_id || '',
            marca_id: opt.marca_id || '',
            conta_de_anuncio_id: opt.conta_de_anuncio_id || '',
            campanha_id: opt.campanha_id || '',
            grupo_de_anuncio_id: opt.grupo_de_anuncio_id || '',
            criativo_id: opt.criativo_id || '',
            orcamento_mensal_id: opt.orcamento_mensal_id || '',
            orcamento_detalhado_id: opt.orcamento_detalhado_id || '',
            publico_personalizado_id: opt.publico_personalizado_id || ''
        });

        const newVisible = {};
        if (opt.hipotese) newVisible.hipotese = true;
        if (opt.plataforma_id) newVisible.plataforma_id = true;
        if (opt.marca_id) newVisible.marca_id = true;
        if (opt.campanha_id) newVisible.campanha_id = true;
        if (opt.grupo_de_anuncio_id) newVisible.grupo_de_anuncio_id = true;
        if (opt.criativo_id) newVisible.criativo_id = true;
        if (opt.orcamento_mensal_id) newVisible.orcamento_mensal_id = true;
        if (opt.orcamento_detalhado_id) newVisible.orcamento_detalhado_id = true;
        if (opt.publico_personalizado_id) newVisible.publico_personalizado_id = true;
        setVisibleFields(newVisible);

        if (opt.campanha_id) {
            buscarGruposPorCampanha(opt.campanha_id).then(groups => setAdGroups(groups || []));
        }
        if (opt.grupo_de_anuncio_id) {
            buscarCriativosPorGrupo(opt.grupo_de_anuncio_id).then(creatives => setCreatives(creatives || []));
        }

        setIsEditing(true);
        setEditId(opt.id);
        setViewMode('form');

        document.getElementById('form-title')?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleView = (opt) => {
        setActiveDropdown(null);
        setViewData(opt);
        setShowViewModal(true);
    };

    const confirmDelete = (id) => {
        setActiveDropdown(null);
        setDeleteId(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        setLoading(true);
        try {
            const success = await deletarHistorico(deleteId);
            if (success) {
                addToast("Otimização excluída com sucesso!", "success");
                loadInitialData();
            } else {
                addToast("Erro ao excluir otimização.", "error");
            }
        } catch (error) {
            console.error("Error deleting optimization:", error);
            addToast("Erro ao excluir otimização.", "error");
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
            setDeleteId(null);
        }
    };

    const toggleDropdown = (e, id) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === id ? null : id);
    };

    const handleStatusChange = async (opt, newStatus) => {
        if (!newStatus || opt.status === newStatus) return;


        setLoading(true);
        try {
            console.log(`[Page] Initiating status change for ${opt.id} to ${newStatus}`);
            const result = await atualizarStatusOtimizacao(opt.id, newStatus);

            if (result) {
                addToast("Status atualizado com sucesso!", "success");
                await loadInitialData();
            } else {
                throw new Error("API returned no data");
            }
        } catch (error) {
            console.error("[Page] Error updating status:", error);
            addToast("Erro ao atualizar status. Verifique o console.", "error");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div id="view-otimizacoes" className="page-view">
            <div className="page-header">
                <h1>Histórico de Otimizações</h1>
                <div className="page-actions">
                    <button
                        id="add-optimization-btn"
                        className="btn btn-primary"
                        onClick={viewMode === 'form' ? resetForm : handleNewOptimization}
                    >
                        {viewMode === 'form' ? (
                            <>Cancelar</>
                        ) : (
                            <>
                                <Plus size={16} style={{ marginRight: '8px' }} />
                                <span style={{ marginRight: '5px' }}>Nova Otimização</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Formulário Section */}
            {viewMode === 'form' && (
                <section className="optimization-form-section">
                    <h2 id="form-title">{isEditing ? 'Editar Otimização' : 'Registrar Nova Otimização'}</h2>

                    <form id="optimization-form" className="optimization-form" onSubmit={handleSubmit}>
                        <div className="form-layout-container">
                            <div className="form-main-column">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label htmlFor="optimization-status">Status</label>
                                        <select
                                            id="optimization-status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Selecione...</option>
                                            <option value="Solicitada">Solicitada</option>
                                            <option value="Em Andamento">Em Andamento</option>
                                            <option value="Concluída">Concluída</option>
                                            <option value="Cancelada">Cancelada</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="optimization-tipo">Tipo de Alteração *</label>
                                        <select
                                            id="optimization-tipo"
                                            name="tipo_alteracao"
                                            value={formData.tipo_alteracao}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="">Selecione...</option>
                                            {TIPOS_ALTERACAO.map(tipo => (
                                                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="optimization-responsible">Responsável *</label>
                                        <input
                                            type="text"
                                            id="optimization-responsible"
                                            name="responsavel"
                                            value={formData.responsavel}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="optimization-marca">Marca</label>
                                        <select
                                            id="optimization-marca"
                                            name="marca_id"
                                            value={formData.marca_id}
                                            onChange={handleInputChange}
                                        >
                                            <option value="">Selecione...</option>
                                            {brands.map(b => (
                                                <option key={b.id} value={b.id}>{b.nome}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group full-width">
                                        <label htmlFor="optimization-description">Descrição *</label>
                                        <textarea
                                            id="optimization-description"
                                            name="descricao"
                                            value={formData.descricao}
                                            onChange={handleInputChange}
                                            required
                                            rows="3"
                                        ></textarea>
                                    </div>

                                    {/* Data da Alteração - Only visible when editing */}
                                    {isEditing && (
                                        <div className="form-group">
                                            <label htmlFor="optimization-date">Data da Alteração</label>
                                            <input
                                                type="date"
                                                id="optimization-date"
                                                name="data_alteracao"
                                                value={formData.data_alteracao}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Bloco lateral temporariamente escondido - será ajustado posteriormente
                            <div className="form-sidebar-column">
                                <div className="fields-checkbox-section">
                                    <h3 className="checkbox-section-title">Campos Adicionais</h3>
                                    <div className="fields-checkbox-list">
                                        {['hipotese', 'plataforma_id', 'marca_id', 'campanha_id', 'grupo_de_anuncio_id', 'criativo_id', 'orcamento_mensal_id', 'orcamento_detalhado_id', 'publico_personalizado_id'].map(field => (
                                            <label key={field} className="checkbox-item" data-field={field}>
                                                <input
                                                    type="checkbox"
                                                    className="field-toggle-checkbox"
                                                    data-field={field}
                                                    checked={!!visibleFields[field]}
                                                    onChange={handleCheckboxChange}
                                                />
                                                <span>{field.replace('_id', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="dynamic-fields-container">
                                    {visibleFields.hipotese && (
                                        <div className="form-group dynamic-field">
                                            <label>Hipótese</label>
                                            <textarea name="hipotese" value={formData.hipotese} onChange={handleInputChange} rows="2"></textarea>
                                        </div>
                                    )}
                                    {visibleFields.plataforma_id && (
                                        <div className="form-group dynamic-field">
                                            <label>Plataforma</label>
                                            <select name="plataforma_id" value={formData.plataforma_id} onChange={handleInputChange}>
                                                <option value="">Selecione...</option>
                                                {platforms.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {visibleFields.marca_id && (
                                        <div className="form-group dynamic-field">
                                            <label>Marca</label>
                                            <select name="marca_id" value={formData.marca_id} onChange={handleInputChange}>
                                                <option value="">Selecione...</option>
                                                {brands.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {visibleFields.campanha_id && (
                                        <div className="form-group dynamic-field">
                                            <label>Campanha</label>
                                            <select name="campanha_id" value={formData.campanha_id} onChange={handleInputChange}>
                                                <option value="">Selecione...</option>
                                                {campaigns.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {visibleFields.grupo_de_anuncio_id && (
                                        <div className="form-group dynamic-field">
                                            <label>Grupo de Anúncio</label>
                                            <select name="grupo_de_anuncio_id" value={formData.grupo_de_anuncio_id} onChange={handleInputChange}>
                                                <option value="">Selecione...</option>
                                                {adGroups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {visibleFields.criativo_id && (
                                        <div className="form-group dynamic-field">
                                            <label>Criativo</label>
                                            <select name="criativo_id" value={formData.criativo_id} onChange={handleInputChange}>
                                                <option value="">Selecione...</option>
                                                {creatives.map(c => <option key={c.id} value={c.id}>{c.nome || c.titulos?.[0] || 'Sem nome'}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>
                            */}
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={resetForm}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary">
                                <Save size={16} style={{ marginRight: '8px' }} />
                                {isEditing ? 'Atualizar' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </section>
            )
            }

            {/* List View - Only visible when NOT in form mode */}
            {
                viewMode === 'list' && (
                    <>
                        {/* Filtros Section */}
                        <section className="optimization-filters-section">
                            <div className="filters-header">
                                <h3>Filtros</h3>
                                <div className="filter-actions">
                                    <button className="btn btn-sm btn-secondary" onClick={clearFilters}>
                                        Limpar Filtros
                                    </button>
                                    <button className="btn btn-sm btn-primary" onClick={applyFilters}>
                                        <Filter size={14} style={{ marginRight: '4px' }} />
                                        Aplicar Filtros
                                    </button>
                                </div>
                            </div>

                            <div className="filters-grid">
                                <div className="form-group">
                                    <label htmlFor="filter-status">Status</label>
                                    <select id="filter-status" value={filters.status} onChange={handleFilterChange}>
                                        <option value="">Todos</option>
                                        <option value="Solicitada">Solicitada</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Concluída">Concluída</option>
                                        <option value="Cancelada">Cancelada</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="filter-type">Tipo</label>
                                    <select id="filter-type" value={filters.type} onChange={handleFilterChange}>
                                        <option value="">Todos</option>
                                        {TIPOS_ALTERACAO.map(tipo => (
                                            <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="filter-brand">Marca</label>
                                    <select id="filter-brand" value={filters.brand} onChange={handleFilterChange}>
                                        <option value="">Todas</option>
                                        {brands.map(b => (
                                            <option key={b.id} value={b.id}>{b.nome}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="filter-responsible">Responsável</label>
                                    <input type="text" id="filter-responsible" value={filters.responsible} onChange={handleFilterChange} placeholder="Nome..." />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="filter-date-start">Data Início</label>
                                    <input type="date" id="filter-date-start" value={filters.dateStart} onChange={handleFilterChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="filter-date-end">Data Fim</label>
                                    <input type="date" id="filter-date-end" value={filters.dateEnd} onChange={handleFilterChange} />
                                </div>
                            </div>
                        </section>

                        {/* Lista Section */}
                        <section className="optimization-list-section">
                            <div className="section-header">
                                <h3>Otimizações ({optimizations.length})</h3>
                                <div className="pagination-controls">
                                    <label htmlFor="items-per-page">Itens por página:</label>
                                    <select
                                        id="items-per-page"
                                        value={itemsPerPage}
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                    >
                                        {ITEMS_PER_PAGE_OPTIONS.map(option => (
                                            <option key={option} value={option}>{option}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div id="optimizationsList" className="optimizations-list" ref={listRef}>
                                {loading ? (
                                    <Preloader message="Carregando otimizações..." />
                                ) : optimizations.length === 0 ? (
                                    <div className="empty-state">
                                        <Filter size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                        <h3>Nenhuma otimização encontrada</h3>
                                        <p>Registre sua primeira otimização usando o formulário acima.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Paginated Items */}
                                        {optimizations
                                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                            .map(opt => (
                                                <div key={opt.id} className={`optimization-card ${getStatusClass(opt.status)}`}>
                                                    <div className="card-header">
                                                        <h4 className="card-title">{opt.descricao}</h4>
                                                        <div className="card-actions">
                                                            <button
                                                                className="actions-trigger"
                                                                onClick={(e) => toggleDropdown(e, opt.id)}
                                                            >
                                                                <MoreVertical size={20} />
                                                            </button>
                                                            {activeDropdown === opt.id && (
                                                                <div className="actions-dropdown active">
                                                                    <button className="dropdown-item" onClick={() => handleView(opt)}>
                                                                        <Eye size={16} style={{ marginRight: '8px' }} />
                                                                        Visualizar
                                                                    </button>
                                                                    <button className="dropdown-item" onClick={() => handleEdit(opt)}>
                                                                        <Edit size={16} style={{ marginRight: '8px' }} />
                                                                        Editar
                                                                    </button>
                                                                    <button className="dropdown-item danger" onClick={() => confirmDelete(opt.id)}>
                                                                        <Trash2 size={16} style={{ marginRight: '8px' }} />
                                                                        Excluir
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="card-content">
                                                        <div className="card-field">
                                                            <span className="field-label">Status</span>
                                                            <div className="field-value custom-select-wrapper">
                                                                <select
                                                                    className={`status-badge-select ${getStatusClass(opt.status)}`}
                                                                    value={opt.status || ''}
                                                                    onChange={(e) => handleStatusChange(opt, e.target.value)}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <option value="Solicitada">Solicitada</option>
                                                                    <option value="Em Andamento">Em Andamento</option>
                                                                    <option value="Concluída">Concluída</option>
                                                                    <option value="Cancelada">Cancelada</option>
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="card-field">
                                                            <span className="field-label">Tipo</span>
                                                            <span className="field-value">
                                                                {opt.tipo_alteracao ? <span className="type-badge">{opt.tipo_alteracao}</span> : 'N/A'}
                                                            </span>
                                                        </div>

                                                        <div className="card-field">
                                                            <span className="field-label">Data</span>
                                                            <span className="field-value">
                                                                {opt.data_alteracao ? new Date(opt.data_alteracao).toLocaleDateString('pt-BR') : 'N/A'}
                                                            </span>
                                                        </div>

                                                        <div className="card-field">
                                                            <span className="field-label">Marca</span>
                                                            <span className="field-value">{opt.marcas?.nome || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                        {/* Pagination Footer */}
                                        {optimizations.length > itemsPerPage && (
                                            <div className="pagination-footer">
                                                <div className="pagination-info">
                                                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, optimizations.length)} de {optimizations.length}
                                                </div>
                                                <div className="pagination-buttons">
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        disabled={currentPage === 1}
                                                        onClick={() => {
                                                            setCurrentPage(prev => prev - 1);
                                                            listRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                        }}
                                                    >
                                                        Anterior
                                                    </button>
                                                    <div className="pagination-pages">
                                                        {Array.from({ length: Math.ceil(optimizations.length / itemsPerPage) }, (_, i) => i + 1)
                                                            .filter(page => {
                                                                const totalPages = Math.ceil(optimizations.length / itemsPerPage);
                                                                // Show first, last, and pages around current
                                                                return page === 1 || page === totalPages ||
                                                                    (page >= currentPage - 1 && page <= currentPage + 1);
                                                            })
                                                            .map((page, idx, arr) => (
                                                                <React.Fragment key={page}>
                                                                    {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                                        <span className="pagination-ellipsis">...</span>
                                                                    )}
                                                                    <button
                                                                        className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                                                                        onClick={() => {
                                                                            setCurrentPage(page);
                                                                            listRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                                        }}
                                                                    >
                                                                        {page}
                                                                    </button>
                                                                </React.Fragment>
                                                            ))
                                                        }
                                                    </div>
                                                    <button
                                                        className="btn btn-sm btn-secondary"
                                                        disabled={currentPage >= Math.ceil(optimizations.length / itemsPerPage)}
                                                        onClick={() => {
                                                            setCurrentPage(prev => prev + 1);
                                                            listRef.current?.scrollIntoView({ behavior: 'smooth' });
                                                        }}
                                                    >
                                                        Próximo
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>
                    </>
                )
            }

            {/* Modal de Exclusão - Standardized */}
            <div id="deleteOptimizationModal" className={`modal ${showDeleteModal ? 'is-active' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Confirmar Exclusão</h2>
                        <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="modal-body">
                        <p>Tem certeza que deseja excluir esta otimização? Esta ação não pode ser desfeita.</p>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                            Cancelar
                        </button>
                        <button type="button" className="btn btn-danger" onClick={handleDelete}>
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>

            {/* View Details Side Menu - Standardized */}
            <div className={`details-overlay ${showViewModal ? 'active' : ''}`} onClick={() => setShowViewModal(false)}>
                <div className="details-sidemenu" onClick={e => e.stopPropagation()}>
                    <div className="details-header">
                        <h3>Detalhes da Otimização</h3>
                        <button className="btn-icon" onClick={() => setShowViewModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="details-content">
                        {viewData && (
                            <div className="details-grid">
                                <div className="detail-item full-width">
                                    <strong>Descrição</strong>
                                    <span>{viewData.descricao}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Status</strong>
                                    <span>
                                        <span className={`status-badge ${getStatusClass(viewData.status)}`}>
                                            {viewData.status || 'N/A'}
                                        </span>
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <strong>Tipo</strong>
                                    <span>{viewData.tipo_alteracao || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Responsável</strong>
                                    <span>{viewData.responsavel || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Data</strong>
                                    <span>{viewData.data_alteracao ? new Date(viewData.data_alteracao).toLocaleDateString('pt-BR') : 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Plataforma</strong>
                                    <span>{viewData.plataformas?.nome || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Marca</strong>
                                    <span>{viewData.marcas?.nome || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Conta de Anúncio</strong>
                                    <span>{viewData.contas_de_anuncio?.nome || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Campanha</strong>
                                    <span>{viewData.campanhas?.nome || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Grupo de Anúncio</strong>
                                    <span>{viewData.grupos_de_anuncios?.nome || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Criativo</strong>
                                    <span>{viewData.criativos?.titulos?.[0] || 'N/A'}</span>
                                </div>
                                <div className="detail-item full-width">
                                    <strong>Hipótese</strong>
                                    <span>{viewData.hipotese || 'N/A'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Otimizacoes;
