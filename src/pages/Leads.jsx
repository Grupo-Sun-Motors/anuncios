import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, Plus, ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X, CheckCircle, MoreVertical, Eye, Edit, Trash2, Filter, Calendar, Search, MessageCircle, Copy, Mail, FileText, AlertCircle, MapPin } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { buscarLeadsComFiltros, criarLead, atualizarLead, deletarLead } from '../services-apis/supabase/leadsService';
import { buscarMarcas, buscarRelatorioCompletoMarcas, buscarPlataformas } from '../services-apis/supabase/configService';
import { buscarFormulariosPorMarca, buscarTodosFormularios } from '../services-apis/supabase/formulariosService';
import Preloader from '../components/Preloader';
import ImportadorLeads from '../components/uploads/ImportadorLeads';
import SearchableSelect from '../components/ui/SearchableSelect';

// Helper to find Brand Name from Ad Accounts map
const getBrandName = (lead, adAccounts) => {
    if (lead?.marca?.nome) return lead.marca.nome; // If available (legacy or future)
    if (!lead?.conta_de_anuncio_id) return '-';

    // Look up in adAccounts which serves as our flattened view representation
    const account = adAccounts.find(acc => acc.id === lead.conta_de_anuncio_id);
    return account?.marca || '-';
};

// DDDs do Rio Grande do Sul
const DDD_RS = ['51', '53', '54', '55'];

// Função para extrair o DDD de um telefone
const extractDDD = (phone) => {
    if (!phone) return null;
    // Remove todos os caracteres não numéricos
    const digits = phone.toString().replace(/\D/g, '');

    // Se começar com 55 (código do Brasil)
    if (digits.startsWith('55')) {
        // Caso 1: Formato padrão com DDI (12 ou 13 dígitos)
        // Ex: 55 11 99999 9999
        if (digits.length > 11) {
            return digits.substring(2, 4);
        }

        // Caso 2: Número curto/malformado mas com DDI 55
        // Ex: "55119999999" (11 dígitos, parece DDD 55 mas o 3º dígito é 1)
        // Como não existem números começando com 1 no DDD 55, assumimos que é DDI 55 + DDD 1x
        const thirdDigit = digits[2];
        if (thirdDigit === '1') {
            return digits.substring(2, 4);
        }
    }

    // Retorna os 2 primeiros dígitos como DDD (padrão)
    return digits.substring(0, 2);
};

// Função para verificar se o telefone é do RS
const isFromRS = (phone) => {
    const ddd = extractDDD(phone);
    return ddd && DDD_RS.includes(ddd);
};



// Phone Formatter
// Phone Formatter
const formatPhone = (value) => {
    if (!value) return '';
    // Remove non-numeric characters
    const numbers = value.toString().replace(/\D/g, '');

    // Case 1: 12 or 13 digits (Country code + DDD + Number) e.g. 5511999999999
    if (numbers.length === 12 || numbers.length === 13) {
        // If it starts with 55, we can format it nicely
        if (numbers.startsWith('55')) {
            const ddd = numbers.substring(2, 4);
            const rest = numbers.substring(4);
            if (rest.length === 9) {
                return `+55 (${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
            } else if (rest.length === 8) {
                return `+55 (${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
            }
        }
    }

    // Case 2: 10 or 11 digits (DDD + Number) e.g. 11999999999
    if (numbers.length === 11) {
        return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    } else if (numbers.length === 10) {
        return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    }

    // Fallback: return original if it doesn't match expected patterns
    return value;
};

const Leads = () => {
    const { addToast } = useToast();

    // State
    const [leads, setLeads] = useState([]);
    const [filteredLeads, setFilteredLeads] = useState([]);
    const [brands, setBrands] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [adAccounts, setAdAccounts] = useState([]);
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [activeStageDropdown, setActiveStageDropdown] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    // Filters State
    const [filters, setFilters] = useState(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        return {
            marca_id: '',
            estagio: '',
            formulario_id: '',
            nome_formulario: '', // Fallback
            data_inicio: firstDay,
            data_fim: lastDay,
            quick_filter: 'current-month'
        };
    });

    // Modals & Side Menus State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [showEditMenu, setShowEditMenu] = useState(false);

    const [showImportMenu, setShowImportMenu] = useState(false);

    // Import State REMOVED (moved to ImportadorLeads)

    // Region Stats State (para parametrização de exibição)
    const [showRegionStats, setShowRegionStats] = useState(true);

    // Selection & Form Data
    const [selectedLead, setSelectedLead] = useState(null);
    const [formData, setFormData] = useState({
        marca_id: '',
        formulario_id: '',
        nome: '',
        email: '',
        telefone: '',
        telefone_secundario: '',
        whatsapp: '',
        fonte: '',
        canal: '',
        estagio: 'Em análise',
        proprietario: '',
        rotulos: ''
    });

    // Refs
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);

    // Initial Load
    useEffect(() => {
        loadInitialData();

        const handleClickOutside = (event) => {
            if (!event.target.closest('.actions-menu') && !event.target.closest('.estagio-cell')) {
                setActiveDropdown(null);
                setActiveStageDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter Effect
    useEffect(() => {
        applyFilters();
    }, [filters.marca_id, filters.estagio, filters.formulario_id, filters.data_inicio, filters.data_fim]); // Trigger on filter change

    // Pagination Effect
    useEffect(() => {
        applyClientSidePagination();
    }, [leads, currentPage, itemsPerPage]);

    const loadForms = async () => {
        console.log("loadForms triggered. Marca ID:", filters.marca_id);
        if (filters.marca_id) {
            const formsData = await buscarFormulariosPorMarca(filters.marca_id);
            console.log("Forms loaded for brand:", formsData);
            setForms(formsData || []);
        } else {
            const formsData = await buscarTodosFormularios();
            setForms(formsData || []);
        }
    };

    // Load Forms when Brand changes (for filters)
    useEffect(() => {
        loadForms();
    }, [filters.marca_id]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [leadsData, brandsData, accountsData, platformsData] = await Promise.all([
                buscarLeadsComFiltros(filters),
                buscarMarcas(),
                buscarRelatorioCompletoMarcas(),
                buscarPlataformas()
            ]);
            setLeads(leadsData || []);
            setBrands(brandsData || []);
            setPlatforms(platformsData || []);

            // Logic to populate adAccounts for the Import Modal (hidden feature)
            // And to populate the Brand mapping for display
            const uniqueAccounts = [];
            const seenIds = new Set();
            if (accountsData) {
                // We also store account->brand mapping in a ref or state if needed,
                // but since we have brandsData and accountsData, we can resolve it on render
                accountsData.forEach(row => {
                    const id = row.conta_id || row.conta_de_anuncio_id || row.id;
                    const nome = row.conta_nome || row.nome;
                    const marca = row.marca_nome || row.marca;

                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);
                        uniqueAccounts.push({ id, nome, marca });
                    }
                });
            }
            setAdAccounts(uniqueAccounts);



        } catch (error) {
            console.error("Error loading data:", error);
            addToast("Erro ao carregar dados.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        const key = name.replace('leads_', '');

        if (key === 'quick_filter') {
            handleQuickFilter(value);
        } else {
            setFilters(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleQuickFilter = (value) => {
        const today = new Date();
        let start = '';
        let end = '';

        if (value === 'current-month') {
            start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (value === 'last-month') {
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
            end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
        } else if (value === 'last-3-months') {
            start = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0];
            end = today.toISOString().split('T')[0];
        }

        setFilters(prev => ({
            ...prev,
            quick_filter: value,
            data_inicio: start,
            data_fim: end
        }));
    };

    const applyFilters = async () => {
        setLoading(true);
        try {
            const data = await buscarLeadsComFiltros(filters);
            setLeads(data || []);
            setCurrentPage(1);
        } catch (error) {
            console.error("Error applying filters:", error);
            addToast("Erro ao filtrar leads.", "error");
        } finally {
            setLoading(false);
        }
    };

    const applyClientSidePagination = () => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        setFilteredLeads(leads.slice(startIndex, endIndex));
    };

    // CRUD Operations
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'telefone') {
            setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // If brand changes, fetch forms for that brand
        if (name === 'marca_id') {
            buscarFormulariosPorMarca(value).then(data => setForms(data || []));
            setFormData(prev => ({ ...prev, formulario_id: '' })); // Reset form selection
        }
    };

    const handleCreate = () => {
        setFormData({
            conta_de_anuncio_id: '',
            formulario_id: '',
            nome: '',
            email: '',
            telefone: '',
            telefone_secundario: '',
            whatsapp: '',
            fonte: '',
            canal: '',
            estagio: 'Em análise',
            proprietario: '',
            rotulos: ''
        });
        setShowCreateModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            Object.keys(payload).forEach(key => {
                if (payload[key] === '') payload[key] = null;
            });

            if (selectedLead) {
                await atualizarLead(selectedLead.id, payload);
                addToast("Lead atualizado com sucesso!", "success");
                setShowEditMenu(false);
            } else {
                await criarLead(payload);
                addToast("Lead criado com sucesso!", "success");
                setShowCreateModal(false);
                // Reset form
                setFormData({
                    conta_de_anuncio_id: '',
                    formulario_id: '',
                    nome: '',
                    email: '',
                    telefone: '',
                    telefone_secundario: '',
                    whatsapp: '',
                    fonte: '',
                    canal: '',
                    estagio: 'Em análise',
                    proprietario: '',
                    rotulos: ''
                });
            }
            applyFilters(); // Refresh list
        } catch (error) {
            console.error("Error saving lead:", error);
            addToast("Erro ao salvar lead.", "error");
        }
    };

    const handleEdit = (lead) => {
        setSelectedLead(lead);
        setFormData({
            conta_de_anuncio_id: lead.conta_de_anuncio_id || '',
            formulario_id: lead.formulario_id || '',
            nome: lead.nome || '',
            email: lead.email || '',
            telefone: lead.telefone ? formatPhone(lead.telefone) : '',
            telefone_secundario: lead.telefone_secundario || '',
            whatsapp: lead.whatsapp || '',
            fonte: lead.fonte || '',
            canal: lead.canal || '',
            estagio: lead.estagio || 'Em análise',
            proprietario: lead.proprietario || '',
            rotulos: lead.rotulos || ''
        });
        // Fetch forms for the lead's brand so the dropdown is populated
        if (lead.marca_id) {
            buscarFormulariosPorMarca(lead.marca_id).then(data => setForms(data || []));
        }
        setShowEditMenu(true);
        setActiveDropdown(null);
    };

    const handleView = (lead) => {
        setSelectedLead(lead);
        setShowViewMenu(true);
        setActiveDropdown(null);
    };

    const confirmDelete = (lead) => {
        setSelectedLead(lead);
        setShowDeleteModal(true);
        setActiveDropdown(null);
    };

    const handleDelete = async () => {
        if (!selectedLead) return;
        try {
            await deletarLead(selectedLead.id);
            addToast("Lead excluído com sucesso!", "success");
            setShowDeleteModal(false);
            applyFilters();
        } catch (error) {
            console.error("Error deleting lead:", error);
            addToast("Erro ao excluir lead.", "error");
        }
    };

    const handleStageChange = async (lead, newStage) => {
        try {
            await atualizarLead(lead.id, { estagio: newStage });
            addToast("Estágio atualizado!", "success");
            setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, estagio: newStage } : l));
            setActiveStageDropdown(null);
        } catch (error) {
            console.error("Error updating stage:", error);
            addToast("Erro ao atualizar estágio.", "error");
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            addToast("Copiado para a área de transferência!", "success");
        });
    };

    // Import Logic Replaced by ImportadorLeads
    const handleImportClick = () => {
        setShowImportMenu(true);
    };

    // UI Helpers
    const toggleDropdown = (e, id) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === id ? null : id);
        setActiveStageDropdown(null);
    };

    const toggleStageDropdown = (e, id) => {
        e.stopPropagation();
        setActiveStageDropdown(activeStageDropdown === id ? null : id);
        setActiveDropdown(null);
    };

    const getStageBadgeClass = (stage) => {
        switch (stage) {
            case 'Convertido': return 'status-badge success';
            case 'Perdido': return 'status-badge error';
            default: return 'status-badge';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Pagination Logic
    const totalPages = Math.ceil(leads.length / itemsPerPage);
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Cálculo de leads por região (RS vs Outros Estados)
    const regionStats = useMemo(() => {
        const rsLeads = leads.filter(lead => isFromRS(lead.telefone));
        const outrosLeads = leads.filter(lead => lead.telefone && !isFromRS(lead.telefone));
        const semTelefone = leads.filter(lead => !lead.telefone);
        return {
            rs: rsLeads.length,
            outros: outrosLeads.length,
            semTelefone: semTelefone.length,
            total: leads.length
        };
    }, [leads]);

    return (
        <div id="view-leads" className="page-view">
            <div className="page-header">
                <h1>Leads</h1>
                <p className="page-subtitle">Gerencie seus leads e acompanhe o status de conversão.</p>
                <div className="page-actions">
                    <button className="btn btn-secondary" id="bulk-import-btn" onClick={handleImportClick}>
                        <Upload size={16} style={{ marginRight: '8px' }} />
                        Importação em Massa
                    </button>
                    <button className="btn btn-primary" onClick={handleCreate}>
                        <Plus size={16} style={{ marginRight: '8px' }} />
                        Novo Lead
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div className="leads-filters">
                <div className="filters-row">
                    <div className="filter-group">
                        <label htmlFor="leads-filter-marca">Marca</label>
                        <select
                            id="leads-filter-marca"
                            name="leads_marca_id"
                            value={filters.marca_id}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todas</option>
                            {brands.map(brand => (
                                <option key={brand.id} value={brand.id}>
                                    {brand.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="leads-filter-estagio">Estágio</label>
                        <select
                            id="leads-filter-estagio"
                            name="leads_estagio"
                            value={filters.estagio}
                            onChange={handleFilterChange}
                        >
                            <option value="">Todos</option>
                            <option value="Em análise">Em análise</option>
                            <option value="Em negociação">Em negociação</option>
                            <option value="Convertido">Convertido</option>
                            <option value="Perdido">Perdido</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>Formulário</label>
                        <SearchableSelect
                            options={forms.map(f => ({ value: f.id, label: f.nome }))}
                            value={filters.formulario_id}
                            onChange={(val) => setFilters(prev => ({ ...prev, formulario_id: val }))}
                            placeholder="Selecione..."
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="leads-filter-data-inicio">Data Início</label>
                        <input
                            type="date"
                            id="leads-filter-data-inicio"
                            name="leads_data_inicio"
                            value={filters.data_inicio}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="leads-filter-data-fim">Data Fim</label>
                        <input
                            type="date"
                            id="leads-filter-data-fim"
                            name="leads_data_fim"
                            value={filters.data_fim}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="leads-quick-filter-select">Período</label>
                        <select
                            id="leads-quick-filter-select"
                            name="leads_quick_filter"
                            value={filters.quick_filter}
                            onChange={handleFilterChange}
                        >
                            <option value="">Personalizado</option>
                            <option value="current-month">Mês Atual</option>
                            <option value="last-month">Mês Passado</option>
                            <option value="last-3-months">Últimos 3 Meses</option>
                        </select>
                    </div>
                </div>
                <div className="filters-actions-row">
                    <div className="region-toggle">
                        <input
                            type="checkbox"
                            id="show-region-stats"
                            checked={showRegionStats}
                            onChange={(e) => setShowRegionStats(e.target.checked)}
                        />
                        <label htmlFor="show-region-stats">
                            Exibir Resumo por Região
                        </label>
                    </div>
                    <div className="filter-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => {
                            const today = new Date();
                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                            setFilters({
                                marca_id: '',
                                estagio: '',
                                formulario_id: '',
                                nome_formulario: '',
                                data_inicio: firstDay,
                                data_fim: lastDay,
                                quick_filter: 'current-month'
                            });
                            loadInitialData();
                        }}>
                            Limpar Filtros
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={applyFilters}>
                            <Filter size={14} style={{ marginRight: '6px' }} />
                            Aplicar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Region Stats Summary */}
            {showRegionStats && leads.length > 0 && (
                <div className="region-stats-summary" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                    padding: '1rem 1.5rem',
                    marginBottom: '1rem',
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    borderRadius: '0.75rem',
                    border: '1px solid #bae6fd'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={18} style={{ color: '#0284c7' }} />
                            <span style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.875rem' }}>
                                Rio Grande do Sul:
                            </span>
                            <span style={{
                                background: '#0284c7',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                            }}>
                                {regionStats.rs}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                (DDDs: 51, 53, 54, 55)
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={18} style={{ color: '#64748b' }} />
                            <span style={{ fontWeight: 600, color: '#475569', fontSize: '0.875rem' }}>
                                Outros Estados:
                            </span>
                            <span style={{
                                background: '#64748b',
                                color: 'white',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '9999px',
                                fontWeight: 600,
                                fontSize: '0.875rem'
                            }}>
                                {regionStats.outros}
                            </span>
                        </div>
                        {regionStats.semTelefone > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 500, color: '#94a3b8', fontSize: '0.875rem' }}>
                                    Sem telefone:
                                </span>
                                <span style={{
                                    background: '#e2e8f0',
                                    color: '#64748b',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '9999px',
                                    fontWeight: 500,
                                    fontSize: '0.875rem'
                                }}>
                                    {regionStats.semTelefone}
                                </span>
                            </div>
                        )}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#475569' }}>
                        <strong>Total:</strong> {regionStats.total} leads
                    </div>
                </div>
            )}

            {/* Leads List */}
            <div id="leads-list-container" className="leads-list-container">
                {loading && leads.length === 0 ? (
                    <Preloader message="Carregando leads..." />
                ) : filteredLeads.length > 0 ? (
                    <table className="leads-table">
                        <thead>
                            <tr>
                                <th>Estágio</th>
                                <th>Nome</th>
                                <th>Telefone</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead, index) => {
                                const isLastItem = index >= filteredLeads.length - 2 && filteredLeads.length > 3;
                                return (
                                    <tr key={lead.id}>
                                        <td className="estagio-cell">
                                            <div className="estagio-icon-wrapper" onClick={(e) => toggleStageDropdown(e, lead.id)}>
                                                <span className={getStageBadgeClass(lead.estagio)}>
                                                    {lead.estagio || 'Em análise'}
                                                </span>
                                                <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                                            </div>
                                            {activeStageDropdown === lead.id && (
                                                <div className={`estagio-dropdown active ${isLastItem ? 'bottom-up' : ''}`}>
                                                    {['Em análise', 'Em negociação', 'Convertido', 'Perdido'].map(stage => (
                                                        <button
                                                            key={stage}
                                                            onClick={() => handleStageChange(lead, stage)}
                                                            className={lead.estagio === stage ? 'selected' : ''}
                                                        >
                                                            {stage}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{lead.nome}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#999' }}>{formatDate(lead.criado_em)}</div>
                                        </td>
                                        <td>
                                            {lead.telefone ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => copyToClipboard(lead.telefone)}
                                                        title="Clique para copiar"
                                                    >
                                                        {formatPhone(lead.telefone)}
                                                    </span>
                                                    <a
                                                        href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: '#25D366', display: 'flex', alignItems: 'center' }}
                                                    >
                                                        <MessageCircle size={18} />
                                                    </a>
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <div className="actions-menu">
                                                <button
                                                    className="actions-trigger"
                                                    onClick={(e) => toggleDropdown(e, lead.id)}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeDropdown === lead.id && (
                                                    <div className={`actions-dropdown active ${isLastItem ? 'bottom-up' : ''}`}>
                                                        <button onClick={() => handleView(lead)}>
                                                            <Eye size={14} /> Visualizar
                                                        </button>
                                                        <button onClick={() => handleEdit(lead)}>
                                                            <Edit size={14} /> Editar
                                                        </button>
                                                        <button className="danger" onClick={() => confirmDelete(lead)}>
                                                            <Trash2 size={14} /> Excluir
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-leads">
                        <Search size={48} />
                        <h3>Nenhum lead encontrado</h3>
                        <p>Tente ajustar os filtros ou adicione um novo lead.</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            {leads.length > 0 && (
                <div id="leads-pagination" className="leads-pagination">
                    <div className="pagination-info">
                        <span>
                            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, leads.length)} de {leads.length} resultados
                        </span>
                    </div>
                    <div className="pagination-controls">
                        <div className="pagination-per-page">
                            <label htmlFor="pagination-per-page-select">Itens por página:</label>
                            <select
                                id="pagination-per-page-select"
                                className="pagination-select"
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                            >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="75">75</option>
                                <option value="100">100</option>
                            </select>
                        </div>
                        <div className="pagination-buttons">
                            <button
                                className="btn-pagination"
                                onClick={() => handlePageChange(1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronsLeft size={16} />
                            </button>
                            <button
                                className="btn-pagination"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="pagination-page-info">
                                <span>{currentPage}</span> de <span>{totalPages}</span>
                            </span>
                            <button
                                className="btn-pagination"
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight size={16} />
                            </button>
                            <button
                                className="btn-pagination"
                                onClick={() => handlePageChange(totalPages)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronsRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Lead Modal */}
            <div className={`modal ${showCreateModal ? 'is-active' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Novo Lead</h2>
                        <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Marca</label>
                                <select
                                    name="marca_id"
                                    value={formData.marca_id}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Selecione...</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>
                                            {brand.nome}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Formulário</label>
                                <select
                                    name="formulario_id"
                                    value={formData.formulario_id}
                                    onChange={handleInputChange}
                                    disabled={!formData.marca_id}
                                >
                                    <option value="">Selecione...</option>
                                    {forms.map(f => (
                                        <option key={f.id} value={f.id}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Nome *</label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="form-group">
                                <label>Telefone</label>
                                <input
                                    type="text"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleInputChange}
                                    placeholder="(XX) XXXXX-XXXX"
                                />
                            </div>

                            <div className="form-group">
                                <label>Estágio</label>
                                <select
                                    name="estagio"
                                    value={formData.estagio}
                                    onChange={handleInputChange}
                                >
                                    <option value="Em análise">Em análise</option>
                                    <option value="Em negociação">Em negociação</option>
                                    <option value="Convertido">Convertido</option>
                                    <option value="Perdido">Perdido</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Import Side Menu */}
            {showImportMenu && (
                <ImportadorLeads
                    onClose={() => setShowImportMenu(false)}
                    onImportSuccess={() => {
                        applyFilters();
                        loadForms();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <div className={`modal ${showDeleteModal ? 'is-active' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Confirmar Exclusão</h2>
                        <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body">
                        <p>Tem certeza que deseja excluir o lead <strong>{selectedLead?.nome}</strong>? Esta ação não pode ser desfeita.</p>
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

            {/* View Details Side Menu */}
            <div className={`details-overlay ${showViewMenu ? 'active' : ''}`} onClick={() => setShowViewMenu(false)}>
                <div className="details-sidemenu" onClick={e => e.stopPropagation()}>
                    <div className="details-header">
                        <h3>Detalhes do Lead</h3>
                        <button className="btn-icon" onClick={() => setShowViewMenu(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="details-content">
                        {selectedLead && (
                            <div className="details-grid">
                                <div className="detail-item">
                                    <strong>Nome</strong>
                                    <span>{selectedLead.nome}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Email</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                                        <span>{selectedLead.email || '-'}</span>
                                        {selectedLead.email && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => copyToClipboard(selectedLead.email)}
                                                    title="Copiar Email"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <a
                                                    href={`mailto:${selectedLead.email}`}
                                                    className="btn-icon"
                                                    title="Enviar Email"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Mail size={14} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <strong>Telefone</strong>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%' }}>
                                        <span>{formatPhone(selectedLead.telefone) || '-'}</span>
                                        {selectedLead.telefone && (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => copyToClipboard(selectedLead.telefone)}
                                                    title="Copiar Telefone"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                                <a
                                                    href={`https://wa.me/${selectedLead.telefone.replace(/\D/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn-icon"
                                                    title="Abrir WhatsApp"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366' }}
                                                >
                                                    <MessageCircle size={14} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <strong>Estágio</strong>
                                    <span className={getStageBadgeClass(selectedLead.estagio)}>
                                        {selectedLead.estagio}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <strong>Marca</strong>
                                    <span>{getBrandName(selectedLead, adAccounts)}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Formulário</strong>
                                    <span>{selectedLead.formulario?.nome || selectedLead.nome_formulario || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <strong>Data de Criação</strong>
                                    <span>{formatDate(selectedLead.criado_em)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Side Menu */}
            < div className={`details-overlay ${showEditMenu ? 'active' : ''}`} onClick={() => setShowEditMenu(false)}>
                <div className="details-sidemenu" onClick={e => e.stopPropagation()}>
                    <div className="details-header">
                        <h3>Editar Lead</h3>
                        <button className="btn-icon" onClick={() => setShowEditMenu(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="details-content">
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Nome *</label>
                                <input
                                    type="text"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Telefone</label>
                                <input
                                    type="text"
                                    name="telefone"
                                    value={formData.telefone}
                                    onChange={handleInputChange}
                                    placeholder="(XX) XXXXX-XXXX"
                                />
                            </div>
                            <div className="form-group">
                                <label>Estágio</label>
                                <select
                                    name="estagio"
                                    value={formData.estagio}
                                    onChange={handleInputChange}
                                >
                                    <option value="Em análise">Em análise</option>
                                    <option value="Em negociação">Em negociação</option>
                                    <option value="Convertido">Convertido</option>
                                    <option value="Perdido">Perdido</option>
                                </select>
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditMenu(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div >
        </div >
    );
};

export default Leads;
