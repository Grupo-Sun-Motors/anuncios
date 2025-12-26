import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Filter,
    MoreVertical,
    Edit,
    Trash2,
    Eye,
    Layout,
    CheckCircle,
    PauseCircle,
    X,
    Save,
    Calendar,
    Globe,
    DollarSign,
    MousePointer,
    TrendingUp,
    Target,
    ArrowUpDown
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

import * as anunciosService from '../services-apis/supabase/anunciosService';
import * as configService from '../services-apis/supabase/configService';
import * as modelosService from '../services-apis/supabase/modelosService';
import { mediaSupabase } from '../services-apis/supabase/mediaClient';
import Preloader from '../components/Preloader';

// Helper Functions
const formatCurrency = (value) => {
    if (!value) return '';
    const number = Number(value);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(number);
};

const parseCurrency = (value) => {
    if (!value) return 0;
    return Number(value.replace(/\D/g, '')) / 100;
};

// --- COMPONENT ---

const Anuncios = () => {
    const { addToast } = useToast();

    // State
    const [anuncios, setAnuncios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ATIVO');
    const [filterPlatform, setFilterPlatform] = useState('all');
    const [filterMarca, setFilterMarca] = useState('all');
    const [filterModelo, setFilterModelo] = useState('all');

    // UI State
    const [showSideMenu, setShowSideMenu] = useState(false);
    const [sideMenuMode, setSideMenuMode] = useState('view'); // 'view', 'create', 'edit'
    const [selectedAnuncio, setSelectedAnuncio] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [activeStatusDropdown, setActiveStatusDropdown] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Sort State
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState({ field: 'nome', direction: 'asc' });

    // Custom Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [anuncioToDelete, setAnuncioToDelete] = useState(null);

    // Form State
    // Form State
    const [formData, setFormData] = useState({
        nome: '',
        marca_id: '',
        modelo_ids: [''],
        status: 'ATIVO',
        preview_midia: '',
        copy_titulos: [''],
        copy_textos: [''],
        copy_descricoes: [''],
        advanced_google_keywords: [''],
        advanced_google_negative_keywords: [''],
        advanced_meta_gender: 'todos',
        advanced_meta_age_min: 18,
        advanced_meta_age_max: 65,
        advanced_meta_interests: [''],
        advanced_meta_locations: [''],
        plataforma: 'META'
    });

    const [auxData, setAuxData] = useState({
        marcas: [],
        modelos: [],
        plataformas: []
    });

    // Initial Load - Fetch Aux Data
    useEffect(() => {
        const fetchAux = async () => {
            try {
                const [marcas, modelos, plataformas] = await Promise.all([
                    configService.buscarMarcas(),
                    modelosService.buscarTodosModelos(),
                    configService.buscarPlataformas()
                ]);
                setAuxData({ marcas, modelos, plataformas });
            } catch (error) {
                console.error("Erro ao carregar dados auxiliares", error);
            }
        };
        fetchAux();
        loadData();
    }, []);

    // Reset modelo filter when marca changes (cascade behavior)
    useEffect(() => {
        setFilterModelo('all');
    }, [filterMarca]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.anuncio-card-actions') && !e.target.closest('.action-btn')) {
                setActiveDropdown(null);
            }
            if (!e.target.closest('.sort-menu-container')) {
                setIsSortMenuOpen(false);
            }
            if (!e.target.closest('.status-dropdown-container')) {
                setActiveStatusDropdown(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Sort Handlers
    const toggleSortMenu = () => {
        setIsSortMenuOpen(!isSortMenuOpen);
    };

    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await anunciosService.buscarAnuncios();
            setAnuncios(data);
        } catch (error) {
            console.error("Erro ao carregar anúncios:", error);
            addToast("Erro ao carregar anúncios.", "error");
        } finally {
            setLoading(false);
        }
    };

    // Helper to determine platform type from name
    const getPlatformType = (name) => {
        if (!name) return 'UNKNOWN';
        const upperName = name.toUpperCase();
        if (upperName.includes('GOOGLE')) return 'GOOGLE';
        if (upperName.includes('META') || upperName.includes('FACEBOOK') || upperName.includes('INSTAGRAM')) return 'META';
        return 'UNKNOWN';
    };

    // Actions
    const handleOpenSideMenu = (anuncio = null, mode = 'view') => {
        setSelectedAnuncio(anuncio);
        setSideMenuMode(mode);

        if (mode === 'create') {
            // Default to first platform or hardcoded fallback
            const defaultPlatform = auxData.plataformas?.length > 0 ? auxData.plataformas[0].nome : 'Meta Ads';

            setFormData({
                nome: '',
                marca_id: '',
                modelo_ids: [''],
                status: 'ATIVO',
                preview_midia: '',
                copy_titulos: [''],
                copy_textos: [''],
                copy_descricoes: [''],
                advanced_google_keywords: [''],
                advanced_google_negative_keywords: [''],
                advanced_meta_gender: 'todos',
                advanced_meta_age_min: 18,
                advanced_meta_age_max: 65,
                advanced_meta_interests: [''],
                advanced_meta_locations: [''],
                orcamentos: [''],
                obs: '',
                plataforma: defaultPlatform
            });
        } else if (anuncio && (mode === 'edit' || mode === 'view')) {
            const copy = anuncio.copy || {};
            const adv = anuncio.configuracoes_avancadas || {};

            setFormData({
                nome: anuncio.nome,
                marca_id: anuncio.marca_id || '',
                modelo_ids: anuncio.modelo_ids?.length ? anuncio.modelo_ids : [''],
                status: anuncio.status,
                preview_midia: anuncio.preview_midia || '',
                // Handle legacy singular fields vs new array fields
                copy_titulos: copy.titulos?.length ? copy.titulos : (copy.titulo ? [copy.titulo] : ['']),
                copy_textos: copy.textos_principais?.length ? copy.textos_principais : (copy.texto_principal ? [copy.texto_principal] : (copy.descricoes?.length ? copy.descricoes : [''])),
                copy_descricoes: copy.descricoes?.length ? copy.descricoes : (copy.descricao ? [copy.descricao] : ['']),

                // Advanced Config - Google
                advanced_google_keywords: adv.palavras_chave?.length ? adv.palavras_chave : (copy.palavras_chave?.length ? copy.palavras_chave : ['']),
                advanced_google_negative_keywords: adv.palavras_chave_negativas?.length ? adv.palavras_chave_negativas : (copy.palavras_chave_negativas?.length ? copy.palavras_chave_negativas : ['']),

                // Advanced Config - Meta
                advanced_meta_gender: adv.genero || 'todos',
                advanced_meta_age_min: adv.idade_min || 18,
                advanced_meta_age_max: adv.idade_max || 65,
                advanced_meta_interests: adv.interesses?.length ? adv.interesses : [''],
                advanced_meta_locations: adv.localizacao?.length ? adv.localizacao : [''],

                orcamentos: anuncio.orcamentos?.length ? anuncio.orcamentos : [''],
                obs: anuncio.obs || '',
                plataforma: anuncio.plataforma_nome || anuncio.plataforma // Prefer real name
            });
        }

        setShowSideMenu(true);
        setActiveDropdown(null);
    };

    const handleModelChange = async (index, modelId) => {
        const newModeloIds = [...formData.modelo_ids];
        newModeloIds[index] = modelId;
        const newFormData = { ...formData, modelo_ids: newModeloIds };

        // Auto-fetch profile image if first model is selected and no image yet
        if (index === 0 && modelId && !formData.preview_midia) {
            try {
                const { data, error } = await mediaSupabase
                    .from('vehicle_images')
                    .select('image_url, picture_perfil, created_at')
                    .eq('vehicle_uuid', modelId)
                    .order('picture_perfil', { ascending: false })
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (data && data.image_url) {
                    newFormData.preview_midia = data.image_url;
                }
            } catch (error) {
                console.error("Erro ao buscar imagem do modelo:", error);
            }
        }

        setFormData(newFormData);
    };

    const addModelo = () => {
        setFormData({ ...formData, modelo_ids: [...formData.modelo_ids, ''] });
    };

    const removeModelo = (index) => {
        const newModeloIds = formData.modelo_ids.filter((_, i) => i !== index);
        setFormData({ ...formData, modelo_ids: newModeloIds.length > 0 ? newModeloIds : [''] });
    };

    const handleCloseSideMenu = () => {
        setShowSideMenu(false);
        setSelectedAnuncio(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const copyData = {
                titulos: formData.copy_titulos.filter(t => t),
                textos_principais: formData.copy_textos.filter(t => t),
                descricoes: formData.copy_descricoes.filter(t => t)
            };

            const platformType = getPlatformType(formData.plataforma);

            const advConfig = platformType === 'GOOGLE'
                ? {
                    palavras_chave: formData.advanced_google_keywords.filter(k => k),
                    palavras_chave_negativas: formData.advanced_google_negative_keywords.filter(k => k)
                }
                : { // META
                    genero: formData.advanced_meta_gender,
                    idade_min: Number(formData.advanced_meta_age_min),
                    idade_max: Number(formData.advanced_meta_age_max),
                    interesses: formData.advanced_meta_interests.filter(i => i),
                    localizacao: formData.advanced_meta_locations.filter(l => l)
                };

            // Resolve plataforma_id
            let plataforma_id = null;
            if (auxData.plataformas?.length > 0) {
                // Approximate match or exact name match
                const p = auxData.plataformas.find(p => p.nome === formData.plataforma);
                if (p) plataforma_id = p.id;
                else {
                    // Fallback to fuzzy search if needed
                    const fuzzy = auxData.plataformas.find(p => p.nome.toUpperCase().includes(formData.plataforma.toUpperCase()));
                    if (fuzzy) plataforma_id = fuzzy.id;
                }
            }

            const payload = {
                nome: formData.nome,
                status: formData.status,
                marca_id: formData.marca_id,
                plataforma_id: plataforma_id,
                modelo_ids: formData.modelo_ids.filter(id => id !== ''),
                preview_midia: formData.preview_midia || '', // No broken placeholder fallback
                copy: copyData,
                configuracoes_avancadas: advConfig,
                orcamentos: formData.orcamentos.filter(o => o !== '').map(o => Number(o)), // Ensure numbers
                obs: formData.obs,
                metricas: selectedAnuncio ? selectedAnuncio.metricas : { ctr: 0, cpc: 0, spend: 0, conversao: 0 }
            };

            if (selectedAnuncio && sideMenuMode === 'edit') {
                await anunciosService.atualizarAnuncio(selectedAnuncio.id, payload);
                addToast("Anúncio atualizado com sucesso!", "success");
            } else {
                await anunciosService.criarAnuncio(payload);
                addToast("Anúncio criado com sucesso!", "success");
            }

            await loadData();
            handleCloseSideMenu();

        } catch (error) {
            console.error(error);
            addToast("Erro ao salvar anúncio.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (id) => {
        const anuncio = anuncios.find(a => a.id === id);
        if (anuncio) {
            setAnuncioToDelete(anuncio);
            setShowDeleteModal(true);
        }
        setActiveDropdown(null);
    };


    const confirmDelete = async () => {
        if (!anuncioToDelete) return;

        try {
            await anunciosService.excluirAnuncio(anuncioToDelete.id);
            addToast("Anúncio removido.", "info");
            loadData();
        } catch (error) {
            addToast("Erro ao excluir.", "error");
        } finally {
            setShowDeleteModal(false);
            setAnuncioToDelete(null);
            // Also close side menu if the deleted item was being viewed directly (optional but good UX)
            if (showSideMenu && selectedAnuncio && selectedAnuncio.id === anuncioToDelete.id) {
                handleCloseSideMenu();
            }
        }
    };

    // Filters & Sort
    const filteredAnuncios = anuncios.filter(anuncio => {
        const matchesSearch = anuncio.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            anuncio.marca_nome?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || anuncio.status?.toUpperCase() === filterStatus;
        const matchesPlatform = filterPlatform === 'all' ||
            anuncio.plataforma === filterPlatform ||
            anuncio.plataforma_nome === filterPlatform;
        const matchesMarca = filterMarca === 'all' || anuncio.marca_id === filterMarca;
        const matchesModelo = filterModelo === 'all' ||
            (anuncio.modelo_ids && anuncio.modelo_ids.includes(filterModelo));
        return matchesSearch && matchesStatus && matchesPlatform && matchesMarca && matchesModelo;
    }).sort((a, b) => {
        if (!sortConfig.field) return 0;

        let aValue, bValue;

        switch (sortConfig.field) {
            case 'nome':
                aValue = a.nome || '';
                bValue = b.nome || '';
                break;
            case 'status':
                aValue = a.status || '';
                bValue = b.status || '';
                break;
            case 'orcamento':
                // Sum of budgets if multiple, or single value
                const sumBudgets = (budgets) => {
                    if (!budgets) return 0;
                    if (Array.isArray(budgets)) return budgets.reduce((acc, val) => acc + Number(val), 0);
                    return Number(budgets);
                };
                aValue = sumBudgets(a.orcamentos);
                bValue = sumBudgets(b.orcamentos);
                break;
            case 'plataforma':
                aValue = a.plataforma || '';
                bValue = b.plataforma || '';
                break;
            case 'marca':
                aValue = a.marca_nome || '';
                bValue = b.marca_nome || '';
                break;
            case 'modelo':
                aValue = a.modelos_nomes?.[0] || '';
                bValue = b.modelos_nomes?.[0] || '';
                break;
            case 'criado_em':
                aValue = new Date(a.criado_em || 0);
                bValue = new Date(b.criado_em || 0);
                break;
            default:
                aValue = a[sortConfig.field] || '';
                bValue = b[sortConfig.field] || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const getStatusBadge = (status) => {
        let style;
        switch (status?.toUpperCase()) {
            case 'ATIVO':
                style = { background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
                break;
            case 'PAUSADO':
                style = { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' };
                break;
            case 'INATIVO':
                style = { background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' };
                break;
            case 'CONCLUIDO':
                style = { background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' };
                break;
            default:
                style = { background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb' };
        }

        return (
            <span className="badge" style={{ ...style, display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                {status?.toUpperCase() === 'ATIVO' && <CheckCircle size={10} />}
                {status?.toUpperCase() === 'PAUSADO' && <PauseCircle size={10} />}
                {(status?.toUpperCase() === 'INATIVO' || status?.toUpperCase() === 'CONCLUIDO') && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'currentColor' }}></div>}
                {status?.toUpperCase() || 'ATIVO'}
            </span>
        );
    };

    // Handle status update directly from card
    const handleStatusUpdate = async (anuncioId, newStatus) => {
        try {
            await anunciosService.atualizarAnuncio(anuncioId, { status: newStatus });
            addToast(`Status atualizado para ${newStatus}`, 'success');
            loadData();
        } catch (error) {
            console.error('Erro ao atualizar status:', error);
            addToast('Erro ao atualizar status', 'error');
        }
        setActiveStatusDropdown(null);
    };

    // --- RENDER HELPERS ---

    const renderViewMode = () => {
        if (!selectedAnuncio) return null;

        const isMeta = selectedAnuncio.plataforma === 'META';
        const copy = selectedAnuncio.copy || {};

        return (
            <div className="view-mode-container">
                {/* Header Image */}
                <div className="view-image-container" style={{ position: 'relative', width: '100%', height: '250px', background: '#f3f4f6', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
                    {selectedAnuncio.preview_midia && !selectedAnuncio.preview_midia.includes('via.placeholder.com') ? (
                        <img
                            src={selectedAnuncio.preview_midia}
                            alt={selectedAnuncio.nome}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                                e.target.style.display = 'none'; // Hide if fails
                            }}
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                            <Layout size={64} />
                        </div>
                    )}
                    <div style={{ position: 'absolute', top: '15px', left: '15px' }}>
                        {getStatusBadge(selectedAnuncio.status)}
                    </div>
                </div>

                {/* Main Info */}
                <div className="view-section mb-4">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>{selectedAnuncio.nome}</h2>
                            <p style={{ color: 'var(--gray-500)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Globe size={14} /> {selectedAnuncio.plataforma} • {selectedAnuncio.marca_nome}
                            </p>
                            {/* Modelos associados ao anúncio */}
                            {selectedAnuncio.modelos_nomes && selectedAnuncio.modelos_nomes.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', marginBottom: '16px' }}>
                                    {selectedAnuncio.modelos_nomes.map((modelo, idx) => (
                                        <span
                                            key={idx}
                                            style={{
                                                fontSize: '0.8rem',
                                                background: '#e0f2fe',
                                                color: '#0369a1',
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {modelo}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setSideMenuMode('edit')}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Edit size={16} /> Editar
                        </button>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="view-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
                    {/* Row 1 */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 500 }}>
                            <TrendingUp size={14} /> Gasto
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>R$ {(selectedAnuncio.metricas?.spend || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 500 }}>
                            <Target size={14} /> Conversões
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{selectedAnuncio.metricas?.conversao || 0}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 500 }}>
                            <DollarSign size={14} /> CPA
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
                            R$ {selectedAnuncio.metricas?.conversao > 0 ? ((selectedAnuncio.metricas?.spend || 0) / selectedAnuncio.metricas.conversao).toFixed(2) : '0.00'}
                        </div>
                    </div>
                    {/* Row 2 */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 500 }}>
                            <MousePointer size={14} /> CTR
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{(selectedAnuncio.metricas?.ctr || 0).toFixed(1)}%</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 500 }}>
                            <DollarSign size={14} /> CPC
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>R$ {(selectedAnuncio.metricas?.cpc || 0).toFixed(2)}</div>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 500 }}>
                            <Eye size={14} /> Impressões
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>{(selectedAnuncio.metricas?.impressoes || 0).toLocaleString('pt-BR')}</div>
                    </div>
                </div>

                {/* Copy Details */}
                <div className="view-section mb-4" style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                        Criativo e Copy
                    </h3>

                    <div className="mb-3">
                        <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                            {/* Unified Label */}
                            Títulos
                        </label>
                        <p style={{ fontSize: '1rem', color: '#334155', fontWeight: 500 }}>
                            {/* Support new arrays and legacy singular */}
                            {copy.titulos?.join(' | ') || copy.titulo}
                        </p>
                    </div>

                    {(copy.textos_principais?.length > 0 || copy.texto_principal) && (
                        <div className="mb-3">
                            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                Texto Principal
                            </label>
                            <p style={{ fontSize: '0.95rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                {copy.textos_principais?.join('\n\n') || copy.texto_principal}
                            </p>
                        </div>
                    )}

                    {(copy.descricoes?.length > 0 || copy.descricao) && (
                        <div className="mb-3">
                            <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                                {(copy.textos_principais?.length > 0 || copy.texto_principal) ? 'Descrição Secundária' : 'Descrições'}
                            </label>
                            <p style={{ fontSize: '0.95rem', color: '#475569' }}>
                                {copy.descricoes?.join('\n') || copy.descricao}
                            </p>
                        </div>
                    )}
                </div>

                {/* System Info */}
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: '#94a3b8', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> Criado em: {new Date(selectedAnuncio.criado_em || Date.now()).toLocaleDateString()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Calendar size={14} /> Atualizado: {new Date(selectedAnuncio.atualizado_em || Date.now()).toLocaleDateString()}
                    </span>
                </div>
            </div>
        );
    };

    const renderFormMode = () => {
        const platformType = getPlatformType(formData.plataforma);

        return (
            <form onSubmit={handleSave} className="campaign-form" style={{ padding: 0 }}>
                <div className="form-group mb-4">
                    <label className="form-label">Nome da Campanha/Anúncio</label>
                    <input
                        type="text"
                        className="form-control"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: Promoção de Verão"
                        required
                    />
                </div>

                <div className="form-section mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Plataforma</label>
                        <select
                            className="form-control"
                            value={formData.plataforma}
                            onChange={(e) => setFormData({ ...formData, plataforma: e.target.value })}
                            style={{ height: '42px' }}
                        >
                            {auxData.plataformas?.length > 0 ? (
                                auxData.plataformas.map(p => (
                                    <option key={p.id} value={p.nome}>{p.nome}</option>
                                ))
                            ) : (
                                <>
                                    <option value="Meta Ads">Meta Ads</option>
                                    <option value="Google Ads">Google Ads</option>
                                </>
                            )}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                            className="form-control"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            style={{ height: '42px' }}
                        >
                            <option value="ATIVO">Ativo</option>
                            <option value="PAUSADO">Pausado</option>
                            <option value="INATIVO">Inativo</option>
                            <option value="CONCLUIDO">Concluído</option>
                        </select>
                    </div>
                </div>

                <div className="form-section mb-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group">
                        <label className="form-label">Marca</label>
                        <select
                            className="form-control"
                            value={formData.marca_id}
                            onChange={(e) => setFormData({ ...formData, marca_id: e.target.value })}
                            style={{ height: '42px' }}
                        >
                            <option value="">Selecione a Marca</option>
                            {auxData.marcas.map(m => (
                                <option key={m.id} value={m.id}>{m.nome}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Modelos</label>
                        {formData.modelo_ids.map((modeloId, index) => (
                            <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                                <select
                                    className="form-control"
                                    value={modeloId}
                                    onChange={(e) => handleModelChange(index, e.target.value)}
                                    style={{ height: '42px', flex: 1 }}
                                    disabled={!formData.marca_id}
                                >
                                    <option value="">Selecione o Modelo</option>
                                    {auxData.modelos
                                        .filter(m => !formData.marca_id || m.marca_id === formData.marca_id)
                                        .map(m => (
                                            <option key={m.id} value={m.id}>{m.nome}</option>
                                        ))
                                    }
                                </select>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {formData.modelo_ids.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeModelo(index)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                color: '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Remover modelo"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    {index === formData.modelo_ids.length - 1 && (
                                        <button
                                            type="button"
                                            onClick={addModelo}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                color: '#3b82f6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Adicionar modelo"
                                            disabled={!formData.marca_id}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="form-section mb-4" style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <DollarSign size={16} /> Orçamentos e Observações
                    </h4>

                    <div className="form-group mb-3">
                        <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Orçamentos (Mensal)</label>
                        {formData.orcamentos.map((item, index) => (
                            <div key={index} style={{ position: 'relative', marginBottom: '8px' }}>
                                <div style={{ position: 'relative' }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#6b7280',
                                        pointerEvents: 'none',
                                        fontWeight: 500
                                    }}>
                                        R$
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={item !== '' ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(item) : ''}
                                        onChange={(e) => {
                                            const val = parseCurrency(e.target.value);
                                            const newArray = [...formData.orcamentos];
                                            newArray[index] = val;
                                            setFormData({ ...formData, orcamentos: newArray });
                                        }}
                                        placeholder="0,00"
                                        style={{
                                            paddingLeft: '40px',
                                            paddingRight: '70px',
                                            height: '42px',
                                            borderRadius: '6px',
                                            border: '1px solid #d1d5db'
                                        }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center',
                                        height: '100%'
                                    }}>
                                        {formData.orcamentos.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newArray = formData.orcamentos.filter((_, i) => i !== index);
                                                    setFormData({ ...formData, orcamentos: newArray });
                                                }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Remover"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                        {index === formData.orcamentos.length - 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, orcamentos: [...formData.orcamentos, ''] })}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                title="Adicionar novo"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea
                            className="form-control"
                            rows="3"
                            value={formData.obs}
                            onChange={(e) => setFormData({ ...formData, obs: e.target.value })}
                            placeholder="Observações internas sobre este anúncio..."
                            style={{ resize: 'vertical' }}
                        ></textarea>
                    </div>
                </div>

                <div className="form-group mb-4">
                    <label className="form-label">Link da Mídia (Imagem/Vídeo)</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                type="text"
                                className="form-control"
                                value={formData.preview_midia}
                                onChange={(e) => setFormData({ ...formData, preview_midia: e.target.value })}
                                placeholder="https://..."
                                style={{ width: '100%', paddingRight: '40px' }}
                            />
                            {formData.preview_midia && (
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, preview_midia: '' })}
                                    style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: '#9ca3af',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px'
                                    }}
                                    title="Limpar URL"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={() => window.open(formData.preview_midia, '_blank')} disabled={!formData.preview_midia}>
                            Visualizar
                        </button>
                    </div>
                </div>

                <div className="form-section mb-4" style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Edit size={16} /> Copy e Criativo
                    </h4>

                    {[
                        { label: 'Títulos', key: 'copy_titulos', placeholder: 'Ex: Oferta Imperdível', type: 'input' },
                        ...(platformType === 'GOOGLE'
                            ? [
                                { label: 'Descrições', key: 'copy_descricoes', placeholder: 'Ex: Descrição do anúncio', type: 'textarea' }
                            ]
                            : [
                                { label: 'Textos Principais', key: 'copy_textos', placeholder: 'Ex: Confira as melhores condições...', type: 'textarea' },
                                { label: 'Descrições (Opcional)', key: 'copy_descricoes', placeholder: 'Ex: Clique e saiba mais', type: 'input' }
                            ]
                        )
                    ].map((field) => (
                        <div className="form-group mb-3" key={field.key}>
                            <label className="form-label">{field.label}</label>
                            {formData[field.key].map((item, index) => (
                                <div key={index} style={{ position: 'relative', marginBottom: '8px' }}>
                                    {field.type === 'textarea' ? (
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            value={item}
                                            onChange={(e) => {
                                                const newArray = [...formData[field.key]];
                                                newArray[index] = e.target.value;
                                                setFormData({ ...formData, [field.key]: newArray });
                                            }}
                                            placeholder={field.placeholder}
                                            style={{ resize: 'vertical', paddingRight: '60px' }}
                                        ></textarea>
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={item}
                                            onChange={(e) => {
                                                const newArray = [...formData[field.key]];
                                                newArray[index] = e.target.value;
                                                setFormData({ ...formData, [field.key]: newArray });
                                            }}
                                            placeholder={field.placeholder}
                                            style={{ paddingRight: '60px' }}
                                        />
                                    )}
                                    <div style={{
                                        position: 'absolute',
                                        right: '10px',
                                        top: field.type === 'textarea' ? '10px' : '50%',
                                        transform: field.type === 'textarea' ? 'none' : 'translateY(-50%)',
                                        display: 'flex',
                                        gap: '8px',
                                        alignItems: 'center'
                                    }}>
                                        {formData[field.key].length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newArray = formData[field.key].filter((_, i) => i !== index);
                                                    setFormData({ ...formData, [field.key]: newArray });
                                                }}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ef4444', display: 'flex' }}
                                                title="Remover"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        {index === formData[field.key].length - 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, [field.key]: [...formData[field.key], ''] })}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3b82f6', display: 'flex' }}
                                                title="Adicionar novo"
                                            >
                                                <Plus size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                {platformType === 'GOOGLE' && (
                    <div className="form-section mb-4" style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Search size={16} /> Palavras Chave
                        </h4>

                        {[
                            { label: 'Palavras Chave', key: 'advanced_google_keywords', placeholder: 'Ex: comprar suvs, promoção de carros' },
                            { label: 'Palavras Chave Negativas', key: 'advanced_google_negative_keywords', placeholder: 'Ex: grátis, usado, aluguel' }
                        ].map((field) => (
                            <div className="form-group mb-3" key={field.key}>
                                <label className="form-label">{field.label}</label>
                                {formData[field.key].map((item, index) => (
                                    <div key={index} style={{ position: 'relative', marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={item}
                                            onChange={(e) => {
                                                const newArray = [...formData[field.key]];
                                                newArray[index] = e.target.value;
                                                setFormData({ ...formData, [field.key]: newArray });
                                            }}
                                            placeholder={field.placeholder}
                                            style={{ paddingRight: '60px' }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'center'
                                        }}>
                                            {formData[field.key].length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newArray = formData[field.key].filter((_, i) => i !== index);
                                                        setFormData({ ...formData, [field.key]: newArray });
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ef4444', display: 'flex' }}
                                                    title="Remover"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            {index === formData[field.key].length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, [field.key]: [...formData[field.key], ''] })}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3b82f6', display: 'flex' }}
                                                    title="Adicionar novo"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                {platformType === 'META' && (
                    <div className="form-section mb-4" style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.375rem', border: '1px solid #e5e7eb' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Target size={16} /> Segmentação Avançada (Meta)
                        </h4>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Gênero</label>
                                <select
                                    className="form-control"
                                    value={formData.advanced_meta_gender}
                                    onChange={(e) => setFormData({ ...formData, advanced_meta_gender: e.target.value })}
                                >
                                    <option value="todos">Todos</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="feminino">Feminino</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Faixa Etária</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Min"
                                        min="13" max="65"
                                        value={formData.advanced_meta_age_min}
                                        onChange={(e) => setFormData({ ...formData, advanced_meta_age_min: e.target.value })}
                                    />
                                    <span>-</span>
                                    <input
                                        type="number"
                                        className="form-control"
                                        placeholder="Max"
                                        min="13" max="65"
                                        value={formData.advanced_meta_age_max}
                                        onChange={(e) => setFormData({ ...formData, advanced_meta_age_max: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {[
                            { label: 'Interesses', key: 'advanced_meta_interests', placeholder: 'Ex: Esportes, Tecnologia, Viagens' },
                            { label: 'Localização', key: 'advanced_meta_locations', placeholder: 'Ex: São Paulo, Brasil' }
                        ].map((field) => (
                            <div className="form-group mb-3" key={field.key}>
                                <label className="form-label">{field.label}</label>
                                {formData[field.key].map((item, index) => (
                                    <div key={index} style={{ position: 'relative', marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={item}
                                            onChange={(e) => {
                                                const newArray = [...formData[field.key]];
                                                newArray[index] = e.target.value;
                                                setFormData({ ...formData, [field.key]: newArray });
                                            }}
                                            placeholder={field.placeholder}
                                            style={{ paddingRight: '60px' }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            display: 'flex',
                                            gap: '8px',
                                            alignItems: 'center'
                                        }}>
                                            {formData[field.key].length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newArray = formData[field.key].filter((_, i) => i !== index);
                                                        setFormData({ ...formData, [field.key]: newArray });
                                                    }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ef4444', display: 'flex' }}
                                                    title="Remover"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            {index === formData[field.key].length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, [field.key]: [...formData[field.key], ''] })}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#3b82f6', display: 'flex' }}
                                                    title="Adicionar novo"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}

                <div className="sidemenu-footer" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={handleCloseSideMenu}>Cancelar</button>
                    <button type="submit" className="btn btn-primary" disabled={isSaving}>
                        {isSaving ? 'Salvando...' : (
                            <><Save size={18} /> Salvar</>
                        )}
                    </button>
                </div>
            </form >
        );
    };

    return (
        <div id="view-anuncios" className="page-view" style={{ padding: '2rem' }}>
            <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>Vitrine de Anúncios</h1>
                    <p style={{ color: '#6b7280' }}>Gerencie e visualize as campanhas ativas para os clientes.</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenSideMenu(null, 'create')}>
                    <Plus size={18} /> Novo Anúncio
                </button>
            </div>

            <div className="campaigns-filters" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', background: 'white', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', marginBottom: '2rem' }}>
                <div className="filter-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Marca</label>
                    <select
                        value={filterMarca}
                        onChange={(e) => setFilterMarca(e.target.value)}
                        className="form-control"
                        style={{ width: '100%' }}
                    >
                        <option value="all">Todas</option>
                        {auxData.marcas?.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                </div>

                <div className="filter-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Plataforma</label>
                    <select
                        value={filterPlatform}
                        onChange={(e) => setFilterPlatform(e.target.value)}
                        className="form-control"
                        style={{ width: '100%' }}
                    >
                        <option value="all">Todas</option>
                        {auxData.plataformas?.length > 0 ? (
                            auxData.plataformas.map(p => (
                                <option key={p.id} value={p.nome}>{p.nome}</option>
                            ))
                        ) : (
                            <>
                                <option value="Meta Ads">Meta Ads</option>
                                <option value="Google Ads">Google Ads</option>
                            </>
                        )}
                    </select>
                </div>

                <div className="filter-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Status</label>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="form-control"
                        style={{ width: '100%' }}
                    >
                        <option value="all">Todos</option>
                        <option value="ATIVO">Ativo</option>
                        <option value="PAUSADO">Pausado</option>
                        <option value="INATIVO">Inativo</option>
                        <option value="CONCLUIDO">Concluído</option>
                    </select>
                </div>

                <div className="filter-group" style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>Modelo</label>
                    <select
                        value={filterModelo}
                        onChange={(e) => setFilterModelo(e.target.value)}
                        className="form-control"
                        style={{ width: '100%' }}
                    >
                        <option value="all">Todos</option>
                        {auxData.modelos?.filter(m => filterMarca === 'all' || m.marca_id === filterMarca).map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                </div>

                <div className="filter-group sort-menu-container" style={{ position: 'relative' }}>
                    <button
                        className="btn btn-white"
                        onClick={(e) => { e.stopPropagation(); toggleSortMenu(); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #d1d5db', color: '#374151', height: '100%' }}
                    >
                        <ArrowUpDown size={16} /> Classificar
                    </button>
                    {isSortMenuOpen && (
                        <div style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '8px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            width: '200px',
                            zIndex: 20
                        }}>
                            <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>
                                Ordenar por
                            </div>
                            {[
                                { id: 'nome', label: 'Nome' },
                                { id: 'status', label: 'Status' },
                                { id: 'plataforma', label: 'Plataforma' },
                                { id: 'marca', label: 'Marca' },
                                { id: 'modelo', label: 'Modelo' },
                                { id: 'criado_em', label: 'Data de Criação' }
                            ].map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => handleSort(option.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: 'none',
                                        background: sortConfig.field === option.id ? '#f3f4f6' : 'transparent',
                                        color: sortConfig.field === option.id ? '#2563eb' : '#374151',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        textAlign: 'left'
                                    }}
                                >
                                    {option.label}
                                    {sortConfig.field === option.id && (
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                            {sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {
                loading ? (
                    <Preloader message="Carregando anúncios..." />
                ) : filteredAnuncios.length > 0 ? (
                    <div className="campaigns-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {filteredAnuncios.map(anuncio => (
                            <div
                                key={anuncio.id}
                                className="campaign-card"
                                style={{
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.75rem',
                                    padding: '1.5rem',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                onClick={() => handleOpenSideMenu(anuncio, 'view')} // Open view on click
                            >
                                {/* Card Image Wrapper */}
                                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                    {/* Image Container with overflow hidden */}
                                    <div className="card-image" style={{ height: '160px', background: '#f3f4f6', borderRadius: '0.5rem', overflow: 'hidden' }}>
                                        {anuncio.preview_midia && !anuncio.preview_midia.includes('via.placeholder.com') ? (
                                            <img
                                                src={anuncio.preview_midia}
                                                alt={anuncio.nome}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                                                <Layout size={40} />
                                            </div>
                                        )}
                                        <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'white', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} title={anuncio.plataforma}>
                                            {getPlatformType(anuncio.plataforma) === 'GOOGLE' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                </svg>
                                            ) : getPlatformType(anuncio.plataforma) === 'META' ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0866FF">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                            ) : (
                                                <Globe size={16} color="#6b7280" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Dropdown - Outside overflow hidden container */}
                                    <div className="status-dropdown-container" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 15 }}>
                                        <div
                                            onClick={(e) => { e.stopPropagation(); setActiveStatusDropdown(activeStatusDropdown === anuncio.id ? null : anuncio.id); }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            {getStatusBadge(anuncio.status)}
                                        </div>
                                        {activeStatusDropdown === anuncio.id && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                marginTop: '4px',
                                                background: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                zIndex: 100,
                                                minWidth: '120px',
                                                overflow: 'hidden'
                                            }}>
                                                {['ATIVO', 'PAUSADO', 'INATIVO', 'CONCLUIDO'].map(statusOption => (
                                                    <button
                                                        key={statusOption}
                                                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(anuncio.id, statusOption); }}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            width: '100%',
                                                            padding: '10px 14px',
                                                            border: 'none',
                                                            background: anuncio.status?.toUpperCase() === statusOption ? '#f3f4f6' : 'transparent',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            fontSize: '0.875rem',
                                                            color: '#374151',
                                                            transition: 'background 0.15s'
                                                        }}
                                                        onMouseEnter={(e) => e.target.style.background = '#f9fafb'}
                                                        onMouseLeave={(e) => e.target.style.background = anuncio.status?.toUpperCase() === statusOption ? '#f3f4f6' : 'transparent'}
                                                    >
                                                        {statusOption === 'ATIVO' && <CheckCircle size={14} style={{ color: '#16a34a' }} />}
                                                        {statusOption === 'PAUSADO' && <PauseCircle size={14} style={{ color: '#ca8a04' }} />}
                                                        {statusOption === 'INATIVO' && <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#dc2626' }}></div>}
                                                        {statusOption === 'CONCLUIDO' && <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#2563eb' }}></div>}
                                                        {statusOption === 'ATIVO' ? 'Ativo' : statusOption === 'PAUSADO' ? 'Pausado' : statusOption === 'INATIVO' ? 'Inativo' : 'Concluído'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div className="campaign-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0, lineHeight: 1.4, wordBreak: 'break-word', overflowWrap: 'break-word' }}>{anuncio.nome}</h3>
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{anuncio.marca_nome}</span>
                                        {/* Modelos do Anúncio */}
                                        {anuncio.modelos_nomes && anuncio.modelos_nomes.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                                {anuncio.modelos_nomes.map((modelo, idx) => (
                                                    <span
                                                        key={idx}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            background: '#e0f2fe',
                                                            color: '#0369a1',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {modelo}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="anuncio-card-actions" style={{ position: 'relative' }}>
                                        <button
                                            className="actions-menu-btn"
                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === anuncio.id ? null : anuncio.id); }}
                                            style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: '#6b7280' }}
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {activeDropdown === anuncio.id && (
                                            <div className="actions-dropdown active" style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: '100%',
                                                zIndex: 10,
                                                background: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '0.5rem',
                                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                                                width: '160px',
                                                display: 'block'
                                            }}>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenSideMenu(anuncio, 'view'); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#1f2937' }}>
                                                    <Eye size={16} /> Visualizar
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleOpenSideMenu(anuncio, 'edit'); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#1f2937' }}>
                                                    <Edit size={16} /> Editar
                                                </button>
                                                <div style={{ height: '1px', background: '#e5e7eb', margin: '0' }}></div>
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(anuncio.id); }} className="dropdown-item text-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1rem', width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '0.875rem', color: '#ef4444' }}>
                                                    <Trash2 size={16} /> Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1rem 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>
                                    {anuncio.plataforma === 'META' ? anuncio.copy?.texto_principal : anuncio.copy?.descricoes?.[0]}
                                </p>

                                {/* Metrics Compact */}
                                <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Gasto</div>
                                        <div style={{ fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>R$ {(anuncio.metricas?.spend || 0).toFixed(2)}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>Conv.</div>
                                        <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.9rem' }}>{anuncio.metricas?.conversao || 0}</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>CPA</div>
                                        <div style={{ fontWeight: 600, color: '#1f2937', whiteSpace: 'nowrap', fontSize: '0.9rem' }}>
                                            R$ {anuncio.metricas?.conversao > 0 ? ((anuncio.metricas?.spend || 0) / anuncio.metricas.conversao).toFixed(2) : '0.00'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#9ca3af', background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb' }}>
                        <Layout size={64} style={{ marginBottom: '1rem', color: '#d1d5db' }} />
                        <h3 style={{ color: '#1f2937', marginBottom: '0.5rem', fontWeight: 600 }}>Nenhum anúncio encontrado</h3>
                        <p>Crie uma nova vitrine para começar.</p>
                    </div>
                )
            }

            {/* Side Menu (Drawer) */}
            <div className={`sidemenu-overlay ${showSideMenu ? 'open' : ''}`} onClick={handleCloseSideMenu} style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
                opacity: showSideMenu ? 1 : 0, visibility: showSideMenu ? 'visible' : 'hidden', transition: 'all 0.3s'
            }}></div>

            <div className={`upload-sidemenu ${showSideMenu ? 'open' : ''}`} style={{
                position: 'fixed', top: 0, right: 0, width: '600px', height: '100vh', background: 'white',
                boxShadow: '-4px 0 15px rgba(0,0,0,0.1)', zIndex: 1001,
                transform: showSideMenu ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-in-out',
                display: 'flex', flexDirection: 'column'
            }}>
                <div className="sidemenu-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#1f2937' }}>
                        {sideMenuMode === 'create' && 'Novo Anúncio'}
                        {sideMenuMode === 'edit' && 'Editar Anúncio'}
                        {sideMenuMode === 'view' && 'Detalhes do Anúncio'}
                    </h2>
                    <button className="close-btn" onClick={handleCloseSideMenu} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="sidemenu-content" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', position: 'relative' }}>
                    {sideMenuMode === 'view' ? renderViewMode() : renderFormMode()}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <div className={`modal ${showDeleteModal ? 'is-active' : ''} `}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Confirmar Exclusão</h2>
                        <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                            <X size={20} />
                        </button>
                    </div>
                    <div className="modal-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', alignItems: 'flex-start' }}>
                            <span>Tem certeza que deseja excluir o anúncio <strong>{anuncioToDelete?.nome}</strong>?</span>
                            <span style={{ fontSize: '0.9em', color: '#6b7280' }}>Esta ação não pode ser desfeita.</span>
                        </div>
                        <div className="form-actions" style={{ borderTop: 'none', paddingTop: '0', marginTop: '1rem' }}>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={confirmDelete}>Excluir</button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default Anuncios;

