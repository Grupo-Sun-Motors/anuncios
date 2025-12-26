import React, { useState, useEffect, useRef } from 'react';
import {
    Plus, X, MoreVertical, Edit, Trash2, Eye, ExternalLink,
    Link2, Copy, Check, Globe, CheckCircle
} from 'lucide-react';
import Preloader from '../components/Preloader';
import { useToast } from '../contexts/ToastContext';
import {
    buscarTodasLandingPages,
    criarLandingPage,
    atualizarLandingPage,
    deletarLandingPage,
    buscarMarcasConsolidadas
} from '../services-apis/supabase/landingPagesService';
import { buscarTodosModelos } from '../services-apis/supabase/modelosService';
import '../styles/landing-pages.css';

const LandingPages = () => {
    const { addToast } = useToast();

    // State
    const [landingPages, setLandingPages] = useState([]);
    const [brands, setBrands] = useState([]);
    const [allModels, setAllModels] = useState([]); // All models for lookup
    const [availableModels, setAvailableModels] = useState([]); // Models filtered by selected brand
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null);

    // Filters
    const [filterBrand, setFilterBrand] = useState('');
    const [filterModel, setFilterModel] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAvailableModels, setFilterAvailableModels] = useState([]); // Models for the filter dropdown

    // Modals & Side Menu State
    const [showFormMenu, setShowFormMenu] = useState(false); // Replaces Modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailsMenu, setShowDetailsMenu] = useState(false);

    // Selection & Form Data
    const [selectedLandingPage, setSelectedLandingPage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        links: '',
        status: 'Solicitada',
        id_marcas: '',
        modelo_ids: []
    });
    const [selectedModelToAdd, setSelectedModelToAdd] = useState('');

    // Copy state
    const [copiedId, setCopiedId] = useState(null);

    // Status options - Valores do banco: Solicitada, Ativa, Pausada, Cancelada
    const statusOptions = [
        { value: 'Solicitada', label: 'Solicitada' },
        { value: 'Ativa', label: 'Ativa' },
        { value: 'Pausada', label: 'Pausada' },
        { value: 'Cancelada', label: 'Cancelada' }
    ];

    // Initial Load
    useEffect(() => {
        loadData();

        const handleClickOutside = (event) => {
            if (!event.target.closest('.landing-card-actions')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadData = async () => {
        console.log('[LandingPages Page] Iniciando carregamento de dados...');
        setLoading(true);
        try {
            console.log('[LandingPages Page] Chamando APIs...');
            const [landingPagesData, brandsData, modelsData] = await Promise.all([
                buscarTodasLandingPages(),
                buscarMarcasConsolidadas(),
                buscarTodosModelos()
            ]);

            console.log('[LandingPages Page] Dados recebidos:', {
                landingPages: landingPagesData,
                landingPagesCount: (landingPagesData || []).length,
                brands: brandsData,
                brandsCount: (brandsData || []).length,
                modelsCount: (modelsData || []).length
            });

            setLandingPages(landingPagesData || []);
            setBrands(brandsData || []);
            setAllModels(modelsData || []);

            console.log('[LandingPages Page] Estado atualizado com sucesso');
        } catch (error) {
            console.error("[LandingPages Page] Erro ao carregar dados:", error);
            addToast("Erro ao carregar dados.", "error");
        } finally {
            setLoading(false);
            console.log('[LandingPages Page] Carregamento finalizado');
        }
    };

    // Filtered and Sorted Landing Pages (sorted by brand name)
    const filteredLandingPages = landingPages
        .filter(lp => {
            const matchesBrand = !filterBrand || lp.id_marcas === filterBrand;
            const matchesStatus = !filterStatus || lp.status === filterStatus;
            const matchesModel = !filterModel || (lp.modelo_ids && lp.modelo_ids.includes(filterModel));
            return matchesBrand && matchesStatus && matchesModel;
        })
        .sort((a, b) => {
            const brandA = a.marca?.nome || '';
            const brandB = b.marca?.nome || '';
            const brandComparison = brandA.localeCompare(brandB, 'pt-BR');
            if (brandComparison !== 0) return brandComparison;
            return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
        });

    // Update available models for filter when filterBrand changes
    useEffect(() => {
        if (filterBrand) {
            const filtered = allModels.filter(m => m.marca_id === filterBrand);
            setFilterAvailableModels(filtered);
        } else {
            setFilterAvailableModels([]);
            setFilterModel(''); // Reset model filter if no brand is selected or brand changes to "All"
        }
    }, [filterBrand, allModels]);

    // Helper for Brand Styling
    const getBrandClass = (brandName) => {
        if (!brandName) return '';
        return brandName.toLowerCase().replace(/\s+/g, '-');
    };

    // Copy Link to Clipboard
    const handleCopyLink = async (link, id) => {
        if (!link) return;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedId(id);
            addToast("Link copiado para a área de transferência!", "success");
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            addToast("Erro ao copiar link.", "error");
        }
    };

    // Brand Change Handling to update available models
    useEffect(() => {
        if (formData.id_marcas) {
            const filtered = allModels.filter(m => m.marca_id === formData.id_marcas);
            setAvailableModels(filtered);
        } else {
            setAvailableModels([]);
        }
    }, [formData.id_marcas, allModels]);


    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddModel = () => {
        if (!selectedModelToAdd) return;
        if (!formData.modelo_ids.includes(selectedModelToAdd)) {
            setFormData(prev => ({
                ...prev,
                modelo_ids: [...prev.modelo_ids, selectedModelToAdd]
            }));
        }
        setSelectedModelToAdd('');
    };

    const handleRemoveModel = (modelId) => {
        setFormData(prev => ({
            ...prev,
            modelo_ids: prev.modelo_ids.filter(id => id !== modelId)
        }));
    };

    const handleNewLandingPage = () => {
        setFormData({
            nome: '',
            descricao: '',
            links: '',
            status: 'Solicitada',
            id_marcas: '',
            modelo_ids: []
        });
        setIsEditing(false);
        setShowFormMenu(true);
        setActiveDropdown(null);
    };

    const handleEdit = (landingPage) => {
        setFormData({
            nome: landingPage.nome || '',
            descricao: landingPage.descricao || '',
            links: landingPage.links || '',
            status: landingPage.status || 'Solicitada',
            id_marcas: landingPage.id_marcas || '',
            modelo_ids: landingPage.modelo_ids || []
        });
        setSelectedLandingPage(landingPage);
        setIsEditing(true);
        setShowFormMenu(true);
        setActiveDropdown(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.id_marcas) {
            addToast("Selecione uma marca.", "error");
            return;
        }

        try {
            if (isEditing && selectedLandingPage) {
                await atualizarLandingPage(selectedLandingPage.id, formData);
                addToast("Landing Page atualizada com sucesso!", "success");
            } else {
                await criarLandingPage(formData);
                addToast("Landing Page criada com sucesso!", "success");
            }
            setShowFormMenu(false);
            loadData();
        } catch (error) {
            console.error("Error saving landing page:", error);
            addToast("Erro ao salvar Landing Page.", "error");
        }
    };

    // Delete Handling
    const confirmDelete = (landingPage) => {
        setSelectedLandingPage(landingPage);
        setShowDeleteModal(true);
        setActiveDropdown(null);
    };

    const handleDelete = async () => {
        if (!selectedLandingPage) return;
        try {
            await deletarLandingPage(selectedLandingPage.id);
            addToast("Landing Page excluída com sucesso!", "success");
            setShowDeleteModal(false);
            setSelectedLandingPage(null);
            loadData();
        } catch (error) {
            console.error("Error deleting landing page:", error);
            addToast("Erro ao excluir Landing Page.", "error");
        }
    };

    // View Details Handling
    const handleView = (landingPage) => {
        setSelectedLandingPage(landingPage);
        setShowDetailsMenu(true);
        setActiveDropdown(null);
    };

    const toggleDropdown = (e, id) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === id ? null : id);
    };

    // Loading State
    if (loading) {
        return <Preloader message="Carregando landing pages..." />;
    }

    return (
        <div id="view-landing-pages" className="page-view">
            {/* Page Header */}
            <div className="page-header">
                <h1>Landing Pages</h1>
                <p className="page-subtitle">
                    Gerencie todas as landing pages das marcas do grupo.
                </p>
            </div>

            {/* Actions Bar */}
            <div className="page-actions">
                <div className="filters-group">
                    <select
                        className="filter-select"
                        value={filterBrand}
                        onChange={(e) => {
                            setFilterBrand(e.target.value);
                            setFilterModel(''); // Reset model filter when brand changes
                        }}
                        aria-label="Filtrar por marca"
                    >
                        <option value="">Todas as Marcas</option>
                        {brands.map(brand => (
                            <option key={brand.id} value={brand.id}>{brand.nome}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={filterModel}
                        onChange={(e) => setFilterModel(e.target.value)}
                        aria-label="Filtrar por modelo"
                        disabled={!filterBrand}
                        style={{ opacity: !filterBrand ? 0.6 : 1, cursor: !filterBrand ? 'not-allowed' : 'pointer' }}
                    >
                        <option value="">Todos os Modelos</option>
                        {filterAvailableModels.map(model => (
                            <option key={model.id} value={model.id}>{model.nome}</option>
                        ))}
                    </select>

                    <select
                        className="filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        aria-label="Filtrar por status"
                    >
                        <option value="">Todos os Status</option>
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <button className="add-landing-btn" onClick={handleNewLandingPage}>
                    <Plus size={18} />
                    Nova Landing Page
                </button>
            </div>

            {/* Landing Pages Grid */}
            <div className="landing-pages-grid">
                {filteredLandingPages.length > 0 ? (
                    filteredLandingPages.map(lp => {
                        const brandName = lp.marca?.nome || '';
                        const brandClass = getBrandClass(brandName);

                        return (
                            <div key={lp.id} className={`landing-card ${brandClass}`}>
                                {/* Card Header */}
                                <div className={`landing-card-header ${brandClass}`}>
                                    <div className="landing-card-info">
                                        <span className={`brand-badge ${brandClass}`}>
                                            <Globe size={12} />
                                            {brandName || 'Sem marca'}
                                        </span>
                                        <h3 className="landing-card-title" title={lp.nome}>
                                            {lp.nome || 'Sem nome definido'}
                                        </h3>
                                    </div>

                                    <div className="landing-card-actions" ref={dropdownRef}>
                                        <button
                                            className="actions-trigger"
                                            onClick={(e) => toggleDropdown(e, lp.id)}
                                            aria-label="Abrir menu de ações"
                                        >
                                            <MoreVertical size={18} />
                                        </button>

                                        <div className={`actions-dropdown ${activeDropdown === lp.id ? 'active' : ''}`}>
                                            {lp.links && (
                                                <button onClick={() => {
                                                    window.open(lp.links, '_blank', 'noopener,noreferrer');
                                                    setActiveDropdown(null);
                                                }}>
                                                    <ExternalLink size={14} />
                                                    Visitar
                                                </button>
                                            )}
                                            <button onClick={() => handleView(lp)}>
                                                <Eye size={14} />
                                                Visualizar
                                            </button>
                                            <button onClick={() => handleEdit(lp)}>
                                                <Edit size={14} />
                                                Editar
                                            </button>
                                            <button className="danger" onClick={() => confirmDelete(lp)}>
                                                <Trash2 size={14} />
                                                Excluir
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                {/* Card Body */}
                                <div className="landing-card-body" style={{ padding: 0, height: '180px', overflow: 'hidden', backgroundColor: '#f3f4f6', position: 'relative' }}>
                                    {lp.links ? (
                                        <div style={{ width: '100%', height: '100%' }}>
                                            <img
                                                src={`https://s0.wp.com/mshots/v1/${encodeURIComponent(lp.links)}?w=600`}
                                                alt="Preview"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                                                onError={(e) => {
                                                    // Hide the image if it fails, showing the gray background
                                                    e.target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', flexDirection: 'column', gap: '0.5rem' }}>
                                            <Globe size={24} />
                                            <span style={{ fontSize: '0.875rem' }}>Sem visualização</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                {/* Card Footer */}
                                <div className="landing-card-footer">
                                    <div className="landing-model-tags">
                                        <span className={`status-badge ${lp.status}`}>
                                            <span className="status-indicator"></span>
                                            {lp.status || 'Indefinido'}
                                        </span>
                                        {lp.modelo_ids && lp.modelo_ids.length > 0 && (
                                            <div className="model-tags-list">
                                                {lp.modelo_ids.slice(0, 2).map(modelId => {
                                                    const modelParams = allModels.find(m => m.id === modelId);
                                                    return (
                                                        <span key={modelId} className="model-tag">
                                                            {modelParams ? modelParams.nome : '...'}
                                                        </span>
                                                    );
                                                })}
                                                {lp.modelo_ids.length > 2 && (
                                                    <span className="model-tag-more">+{lp.modelo_ids.length - 2}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {lp.links && (
                                            <button
                                                className={`open-link-btn ${copiedId === lp.id ? 'copied' : ''}`}
                                                onClick={() => handleCopyLink(lp.links, lp.id)}
                                                title="Copiar link"
                                                style={{
                                                    backgroundColor: copiedId === lp.id ? '#d1fae5' : 'transparent',
                                                    borderColor: copiedId === lp.id ? '#a7f3d0' : '#e5e7eb',
                                                    color: copiedId === lp.id ? '#059669' : '#6b7280',
                                                    padding: '0.5rem',
                                                    lineHeight: 0
                                                }}
                                            >
                                                {copiedId === lp.id ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        )}

                                        {lp.links && (
                                            <a
                                                href={lp.links}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="open-link-btn"
                                            >
                                                <ExternalLink size={14} />
                                                Abrir
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Globe size={32} />
                        </div>
                        <h3>Nenhuma landing page encontrada</h3>
                        <p>
                            {filterBrand || filterStatus || filterModel
                                ? 'Tente ajustar os filtros ou cadastre uma nova landing page.'
                                : 'Clique no botão abaixo para cadastrar sua primeira landing page.'}
                        </p>
                        <button className="add-landing-btn" onClick={handleNewLandingPage}>
                            <Plus size={18} />
                            Nova Landing Page
                        </button>
                    </div>
                )}
            </div>

            {/* Create/Edit Side Menu */}
            <div
                id="landing-form-overlay"
                className={showFormMenu ? 'active' : ''}
                onClick={() => setShowFormMenu(false)}
            >
                <div
                    id="landing-form-sidemenu"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="landing-details-header">
                        <h3>{isEditing ? 'Editar Landing Page' : 'Nova Landing Page'}</h3>
                        <button className="btn-icon" onClick={() => setShowFormMenu(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="landing-details-content">
                        <form onSubmit={handleSave} id="landingForm">
                            <div className="form-group">
                                <label htmlFor="landingNome">Nome da Landing Page *</label>
                                <input
                                    type="text"
                                    id="landingNome"
                                    name="nome"
                                    value={formData.nome}
                                    onChange={handleInputChange}
                                    placeholder="Ex: Campanha Verão 2025"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="landingBrand">Marca *</label>
                                <select
                                    id="landingBrand"
                                    name="id_marcas"
                                    value={formData.id_marcas}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Selecione uma marca...</option>
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.nome}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Models Selection */}
                            <div className="form-group">
                                <label>Modelos</label>
                                <div className="models-selection-container">
                                    <div className="model-input-group">
                                        <select
                                            value={selectedModelToAdd}
                                            onChange={(e) => setSelectedModelToAdd(e.target.value)}
                                            disabled={!formData.id_marcas}
                                        >
                                            <option value="">
                                                {!formData.id_marcas
                                                    ? 'Selecione uma marca primeiro'
                                                    : 'Selecione um modelo'}
                                            </option>
                                            {availableModels
                                                .filter(m => !formData.modelo_ids.includes(m.id))
                                                .map(model => (
                                                    <option key={model.id} value={model.id}>{model.nome}</option>
                                                ))
                                            }
                                        </select>
                                        <button
                                            type="button"
                                            className="btn-add-model"
                                            onClick={handleAddModel}
                                            disabled={!selectedModelToAdd}
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>

                                    {formData.modelo_ids.length > 0 && (
                                        <div className="selected-models-list">
                                            {formData.modelo_ids.map(modelId => {
                                                const model = allModels.find(m => m.id === modelId);
                                                return (
                                                    <span key={modelId} className="selected-model-tag">
                                                        {model ? model.nome : 'Desconhecido'}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveModel(modelId)}
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="landingDescricao">Descrição</label>
                                <textarea
                                    id="landingDescricao"
                                    name="descricao"
                                    value={formData.descricao}
                                    onChange={handleInputChange}
                                    placeholder="Breve descrição da landing page..."
                                    rows={3}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="landingLink">URL da Landing Page</label>
                                <input
                                    type="url"
                                    id="landingLink"
                                    name="links"
                                    value={formData.links}
                                    onChange={handleInputChange}
                                    placeholder="https://"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="landingStatus">Status</label>
                                <select
                                    id="landingStatus"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                >
                                    {statusOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-actions-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowFormMenu(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {isEditing ? 'Salvar Alterações' : 'Criar Landing Page'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <div id="deleteModal" className={`modal ${showDeleteModal ? 'is-active' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Confirmar Exclusão</h2>
                        <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body">
                        <p>
                            Tem certeza que deseja excluir a landing page da marca{' '}
                            <strong>{selectedLandingPage?.marca?.nome || 'selecionada'}</strong>?
                            Esta ação não pode ser desfeita.
                        </p>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setShowDeleteModal(false)}
                        >
                            Cancelar
                        </button>
                        <button type="button" className="btn btn-danger" onClick={handleDelete}>
                            Confirmar Exclusão
                        </button>
                    </div>
                </div>
            </div>

            {/* Details Side Menu */}
            <div
                id="landing-details-overlay"
                className={showDetailsMenu ? 'active' : ''}
                onClick={() => setShowDetailsMenu(false)}
            >
                <div
                    id="landing-details-sidemenu"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="landing-details-header">
                        <h3>Detalhes da Landing Page</h3>
                        <button className="btn-icon" onClick={() => setShowDetailsMenu(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="landing-details-content">
                        {selectedLandingPage && (
                            <>
                                <div className="landing-detail-item">
                                    <label>Marca</label>
                                    <div className="value">
                                        {selectedLandingPage.marca?.nome || 'Não definida'}
                                    </div>
                                </div>

                                <div className="landing-detail-item">
                                    <label>URL da Página</label>
                                    <div className="value">
                                        {selectedLandingPage.links ? (
                                            <a
                                                href={selectedLandingPage.links}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {selectedLandingPage.links}
                                            </a>
                                        ) : (
                                            <span style={{ color: '#9ca3af' }}>Nenhum link cadastrado</span>
                                        )}
                                    </div>
                                </div>

                                <div className="landing-detail-item">
                                    <label>Status</label>
                                    <div className="value">
                                        <span className={`status-badge ${selectedLandingPage.status}`}>
                                            <span className="status-indicator"></span>
                                            {selectedLandingPage.status || 'Indefinido'}
                                        </span>
                                    </div>
                                </div>

                                <div className="landing-detail-item">
                                    <label>ID</label>
                                    <div className="value" style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#6b7280' }}>
                                        {selectedLandingPage.id}
                                    </div>
                                </div>

                                <div className="landing-detail-item">
                                    <label>Modelos</label>
                                    <div className="value">
                                        {selectedLandingPage.modelo_ids && selectedLandingPage.modelo_ids.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {selectedLandingPage.modelo_ids.map(mid => {
                                                    const m = allModels.find(x => x.id === mid);
                                                    return (
                                                        <span key={mid} style={{
                                                            background: '#f3f4f6',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.75rem',
                                                            color: '#4b5563'
                                                        }}>
                                                            {m ? m.nome : '...'}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : 'Nenhum modelo vinculado'}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ flex: 1 }}
                                        onClick={() => {
                                            setShowDetailsMenu(false);
                                            handleEdit(selectedLandingPage);
                                        }}
                                    >
                                        <Edit size={16} style={{ marginRight: '0.5rem' }} />
                                        Editar
                                    </button>
                                    {selectedLandingPage.links && (
                                        <a
                                            href={selectedLandingPage.links}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
                                        >
                                            <ExternalLink size={16} style={{ marginRight: '0.5rem' }} />
                                            Abrir Página
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LandingPages;
