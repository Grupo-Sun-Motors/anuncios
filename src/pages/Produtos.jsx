import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, CheckCircle, MoreVertical, Edit, Trash2, Car, Eye, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { buscarTodosModelos, criarModelo, atualizarModelo, deletarModelo } from '../services-apis/supabase/modelosService';
import { buscarMarcas } from '../services-apis/supabase/configService';
import { getMediaSupabase } from '../services-apis/supabase/mediaClient';
import Preloader from '../components/Preloader';

const Produtos = () => {
    const { addToast } = useToast();

    // State
    const [models, setModels] = useState([]);
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const dropdownRef = useRef(null); // Ref for the container of brands
    const [availableRemoteImages, setAvailableRemoteImages] = useState([]); // Images from the other Supabase

    // Modals & Side Menu State
    const [showModelModal, setShowModelModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDetailsMenu, setShowDetailsMenu] = useState(false);

    // Selection & Form Data
    const [selectedModel, setSelectedModel] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        nome: '',
        segmento: '',
        preco: '',
        marca_id: '',
        descricao: '',
        foto_destaque: '',
        galeria: '' // We'll handle this as a string in the input
    });
    const [displayPrice, setDisplayPrice] = useState('');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Initial Load
    useEffect(() => {
        loadData();

        // Improved Click Outside Logic
        const handleClickOutside = (event) => {
            // If the click is NOT inside an actions menu, close any active dropdown
            if (!event.target.closest('.actions-menu')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchRemoteImages = async () => {
        try {
            const { data, error } = await getMediaSupabase().storage.from('anuncios').list();
            if (error) throw error;
            return data.map(file => file.name);
        } catch (error) {
            console.error("Error fetching remote images:", error);
            return [];
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [modelsData, brandsData, remoteImagesData] = await Promise.all([
                buscarTodosModelos(),
                buscarMarcas(),
                fetchRemoteImages()
            ]);
            setModels(modelsData || []);
            setBrands(brandsData || []);
            setAvailableRemoteImages(remoteImagesData || []);
        } catch (error) {
            console.error("Error loading data:", error);
            addToast("Erro ao carregar dados.", "error");
        } finally {
            setLoading(false);
        }
    };

    // Group Models by Brand
    const getModelsByBrand = (brandId) => {
        return models.filter(model => model.marca_id === brandId);
    };

    // Helper for Brand Styling
    const getBrandClass = (brandName) => {
        if (!brandName) return '';
        return brandName.toLowerCase().replace(/\s+/g, '-');
    };

    // Currency Formatting Helper
    const formatCurrency = (value) => {
        if (!value) return '';
        // Remove non-digits
        const number = value.replace(/\D/g, '');
        // Convert to number and divide by 100 to get decimal
        const amount = parseFloat(number) / 100;
        // Format as BRL
        return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Slug Generation Helper
    const generateSlug = (text) => {
        if (!text) return '';
        return text
            .toString()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/\s+/g, '-')            // Replace spaces with -
            .replace(/__/g, '-')             // Replace __ with -
            .replace(/[^a-z0-9-]/g, '')      // Remove invalid chars (keep - and alphanumeric)
            .replace(/-+/g, '-')             // Replace multiple - with single -
            .replace(/^-+|-+$/g, '');        // Trim - from start and end
    };

    // Form Handling
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'preco') {
            // Handle Price Input specifically
            const rawValue = value.replace(/\D/g, ''); // Keep only numbers
            const numericValue = rawValue ? (parseFloat(rawValue) / 100).toFixed(2) : '';

            setFormData(prev => ({ ...prev, [name]: numericValue }));
            setDisplayPrice(formatCurrency(rawValue));
        } else if (name === 'nome') {
            // Update name and auto-generate slug
            const newSlug = generateSlug(value);
            setFormData(prev => ({
                ...prev,
                [name]: value,
                slug: newSlug
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleNewModel = (brandId) => {
        setFormData({
            nome: '',
            slug: '',
            segmento: '',
            preco: '',
            marca_id: brandId || '',
            descricao: '',
            foto_destaque: '',
            galeria: ''
        });
        setDisplayPrice('');
        setIsEditing(false);
        setShowModelModal(true);
        setActiveDropdown(null);
    };

    const handleEdit = (model) => {
        setFormData({
            nome: model.nome || '',
            slug: model.slug || generateSlug(model.nome || ''),
            segmento: model.segmento || '',
            preco: model.preco || '',
            marca_id: model.marca_id || '',
            descricao: model.descricao || '',
            foto_destaque: model.foto_destaque || '',
            galeria: Array.isArray(model.galeria) ? model.galeria.join(', ') : ''
        });
        // Format existing price for display
        if (model.preco) {
            const priceString = parseFloat(model.preco).toFixed(2).replace('.', '');
            setDisplayPrice(formatCurrency(priceString));
        } else {
            setDisplayPrice('');
        }

        setSelectedModel(model);
        setIsEditing(true);
        setShowModelModal(true);
        setActiveDropdown(null);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            // Prepare data: convert galeria string back to array
            const payload = {
                ...formData,
                galeria: formData.galeria ? formData.galeria.split(',').map(s => s.trim()) : []
            };

            if (isEditing && selectedModel) {
                await atualizarModelo(selectedModel.id, payload);
                addToast("Modelo atualizado com sucesso!", "success");
            } else {
                await criarModelo(payload);
                addToast("Modelo criado com sucesso!", "success");
            }
            setShowModelModal(false);
            loadData();
        } catch (error) {
            console.error("Error saving model:", error);
            addToast("Erro ao salvar modelo.", "error");
        }
    };

    // Delete Handling
    const confirmDelete = (model) => {
        setSelectedModel(model);
        setShowDeleteModal(true);
        setActiveDropdown(null);
    };

    const handleDelete = async () => {
        if (!selectedModel) return;
        try {
            await deletarModelo(selectedModel.id);
            addToast("Modelo excluído com sucesso!", "success");
            setShowDeleteModal(false);
            loadData();
        } catch (error) {
            console.error("Error deleting model:", error);
            addToast("Erro ao excluir modelo.", "error");
        }
    };

    // View Details Handling
    const handleView = (model) => {
        setSelectedModel(model);
        setCurrentImageIndex(0);
        setShowDetailsMenu(true);
        setActiveDropdown(null);
    };

    const toggleDropdown = (e, id) => {
        e.stopPropagation();
        setActiveDropdown(activeDropdown === id ? null : id);
    };

    if (loading) {
        return <Preloader message="Carregando catálogo..." />;
    }

    return (
        <div id="view-produtos" className="page-view">
            <div className="page-header">
                <h1>Catálogo de Modelos</h1>
                <p className="page-subtitle">Descubra nossa linha completa de veículos organizados por marca.</p>
            </div>

            <div id="brandsContainer" ref={dropdownRef}>
                {brands.map(brand => {
                    const brandModels = getModelsByBrand(brand.id);
                    const brandClass = getBrandClass(brand.nome);

                    return (
                        <div key={brand.id} className="brand-section">
                            <div className={`brand-header ${brandClass}`}>
                                <div className="brand-info">
                                    <h2>{brand.nome}</h2>
                                    <p className="brand-slogan">Slogan da marca aqui...</p>
                                </div>
                                <button className="add-model-btn" onClick={() => handleNewModel(brand.id)}>
                                    <Plus size={16} />
                                    Adicionar Modelo
                                </button>
                            </div>

                            <div className="models-table-container">
                                {brandModels.length > 0 ? (
                                    <table className="models-table">
                                        <thead>
                                            <tr>
                                                <th>Modelo</th>
                                                <th>Segmento</th>
                                                <th>Preço</th>
                                                <th className="actions-cell">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {brandModels.map((model, index) => {
                                                // Check if it's one of the last items to open dropdown upwards
                                                const isLastItem = index >= brandModels.length - 2 && brandModels.length > 3;

                                                return (
                                                    <tr key={model.id}>
                                                        <td className="model-name">
                                                            {model.nome}
                                                        </td>
                                                        <td>
                                                            <span className="model-segment">{model.segmento}</span>
                                                        </td>
                                                        <td className="model-price">
                                                            {model.preco ? `R$ ${parseFloat(model.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sob Consulta'}
                                                        </td>
                                                        <td className="actions-cell">
                                                            <div className="actions-menu">
                                                                <button
                                                                    className="actions-trigger"
                                                                    onClick={(e) => toggleDropdown(e, model.id)}
                                                                >
                                                                    <MoreVertical size={18} />
                                                                </button>
                                                                {activeDropdown === model.id && (
                                                                    <div className={`actions-dropdown active ${isLastItem ? 'bottom-up' : ''}`}>
                                                                        <button onClick={() => handleView(model)}>
                                                                            <Eye size={14} /> Visualizar
                                                                        </button>
                                                                        <button onClick={() => handleEdit(model)}>
                                                                            <Edit size={14} /> Editar
                                                                        </button>
                                                                        <button className="danger" onClick={() => confirmDelete(model)}>
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
                                    <div className="empty-models">
                                        <Car />
                                        <h3>Nenhum modelo cadastrado</h3>
                                        <p>Clique em "Adicionar Modelo" para começar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Model Edit/Create Side Menu */}
            <div id="model-sidemenu-overlay" className={`details-overlay ${showModelModal ? 'active' : ''}`} onClick={() => setShowModelModal(false)}>
                <div id="model-sidemenu" className="details-sidemenu" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', maxWidth: '500px' }}>

                    {/* Header - Fixed */}
                    <div className="details-header" style={{ flexShrink: 0 }}>
                        <h2 id="modelModalTitle" style={{ margin: 0, fontSize: '1.25rem' }}>{isEditing ? 'Editar Modelo' : 'Adicionar Modelo'}</h2>
                        <button className="btn-icon" onClick={() => setShowModelModal(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Wrapper - Flexible */}
                    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <form id="modelForm" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                            {/* Scrollable Form Body */}
                            <div className="form-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label htmlFor="modelName" style={{ margin: 0 }}>Nome do Modelo</label>
                                        {formData.slug && (
                                            <span className="slug-tag" style={{
                                                fontSize: '0.75rem',
                                                backgroundColor: '#f1f5f9',
                                                color: '#64748b',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontFamily: 'monospace'
                                            }}>
                                                slug: {formData.slug}
                                            </span>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        id="modelName"
                                        name="nome"
                                        value={formData.nome}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="modelSegment" style={{ display: 'block', marginBottom: '0.5rem' }}>Segmento</label>
                                    <input
                                        type="text"
                                        id="modelSegment"
                                        name="segmento"
                                        value={formData.segmento}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="modelPrice" style={{ display: 'block', marginBottom: '0.5rem' }}>Preço (R$)</label>
                                    <input
                                        type="text"
                                        id="modelPrice"
                                        name="preco"
                                        value={displayPrice}
                                        onChange={handleInputChange}
                                        placeholder="R$ 0,00"
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="modelBrand" style={{ display: 'block', marginBottom: '0.5rem' }}>Marca</label>
                                    <select
                                        id="modelBrand"
                                        name="marca_id"
                                        value={formData.marca_id}
                                        onChange={handleInputChange}
                                        required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd' }}
                                    >
                                        <option value="">Selecione...</option>
                                        {brands.map(b => (
                                            <option key={b.id} value={b.id}>{b.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label htmlFor="modelDescription" style={{ display: 'block', marginBottom: '0.5rem' }}>Descrição</label>
                                    <textarea
                                        id="modelDescription"
                                        name="descricao"
                                        value={formData.descricao}
                                        onChange={handleInputChange}
                                        rows="6"
                                        placeholder="Digite a descrição do modelo..."
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ddd', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            {/* Fixed Footer Actions */}
                            <div className="form-actions" style={{
                                flexShrink: 0,
                                borderTop: '1px solid #eee',
                                padding: '1rem 1.5rem',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '1rem',
                                backgroundColor: '#fff'
                            }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModelModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal - Standardized */}
            <div id="confirmModal" className={`modal ${showDeleteModal ? 'is-active' : ''}`}>
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Confirmar Exclusão</h2>
                        <button className="close-btn" onClick={() => setShowDeleteModal(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body">
                        <p id="confirmMessage">
                            Tem certeza que deseja excluir o modelo <strong>{selectedModel?.nome}</strong>? Esta ação não pode ser desfeita.
                        </p>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                        <button type="button" className="btn btn-danger" onClick={handleDelete}>Confirmar</button>
                    </div>
                </div>
            </div>

            {/* Side Menu for Details */}
            <div id="product-details-overlay" className={`details-overlay ${showDetailsMenu ? 'active' : ''}`} onClick={() => setShowDetailsMenu(false)}>
                <div id="product-details-sidemenu" className="details-sidemenu" onClick={e => e.stopPropagation()}>
                    <div className="details-header">
                        <h3>Detalhes do Produto</h3>
                        <button className="btn-icon" onClick={() => setShowDetailsMenu(false)}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="details-content" id="productDetailsContent">
                        {selectedModel && (
                            <>
                                {/* Image Slider */}
                                <div className="product-images-slider">
                                    {(() => {
                                        // Base URL for galeria_veiculos bucket if path is relative
                                        const BASE_STORAGE_URL = 'https://qeckbczlymcidnuqtrxc.supabase.co/storage/v1/object/public/galeria_veiculos/';

                                        const resolveUrl = (path) => {
                                            if (!path) return null;
                                            if (path.startsWith('http')) return path;
                                            // Ensure no double slashes if path starts with /
                                            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                                            return `${BASE_STORAGE_URL}${cleanPath}`;
                                        };

                                        const images = [];

                                        // Foto Destaque
                                        if (selectedModel.foto_destaque) {
                                            images.push(resolveUrl(selectedModel.foto_destaque));
                                        }

                                        // Galeria
                                        // Assuming selectedModel.galeria is a comma-separated string or an array of strings
                                        const galleryItems = Array.isArray(selectedModel.galeria)
                                            ? selectedModel.galeria
                                            : (selectedModel.galeria ? selectedModel.galeria.split(',').map(s => s.trim()) : []);

                                        galleryItems.forEach(img => {
                                            const url = resolveUrl(img);
                                            if (url && !images.includes(url)) images.push(url);
                                        });

                                        if (images.length === 0) {
                                            return (
                                                <div className="no-image-placeholder">
                                                    <ImageIcon size={48} />
                                                    <span>Nenhuma imagem disponível</span>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div className="slider-wrapper">
                                                <img
                                                    src={images[currentImageIndex]}
                                                    alt={selectedModel.nome}
                                                    className="slider-image"
                                                    onError={(e) => {
                                                        // Fallback logic could go here, but user asked to check availability
                                                        e.target.style.display = 'none';
                                                        e.target.parentElement.innerHTML = '<div class="no-image-placeholder"><span>Imagem não carregada</span></div>';
                                                    }}
                                                />

                                                {images.length > 1 && (
                                                    <>
                                                        <button
                                                            className="slider-nav prev"
                                                            onClick={() => setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length)}
                                                        >
                                                            <ChevronLeft size={24} />
                                                        </button>
                                                        <button
                                                            className="slider-nav next"
                                                            onClick={() => setCurrentImageIndex((currentImageIndex + 1) % images.length)}
                                                        >
                                                            <ChevronRight size={24} />
                                                        </button>
                                                        <div className="slider-dots">
                                                            {images.map((_, i) => (
                                                                <span
                                                                    key={i}
                                                                    className={`dot ${i === currentImageIndex ? 'active' : ''}`}
                                                                    onClick={() => setCurrentImageIndex(i)}
                                                                ></span>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="details-grid" style={{ padding: '1.5rem' }}>
                                    <div className="detail-item">
                                        <strong>Modelo</strong>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <span>{selectedModel.nome}</span>
                                            {selectedModel.slug && (
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    color: '#64748b',
                                                    backgroundColor: '#f1f5f9',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontFamily: 'monospace',
                                                    height: 'fit-content'
                                                }}>
                                                    {selectedModel.slug}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="detail-item">
                                        <strong>Marca</strong>
                                        <span>{brands.find(b => b.id === selectedModel.marca_id)?.nome || 'N/A'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <strong>Segmento</strong>
                                        <span>{selectedModel.segmento}</span>
                                    </div>
                                    <div className="detail-item">
                                        <strong>Preço</strong>
                                        <span>{selectedModel.preco ? `R$ ${parseFloat(selectedModel.preco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Sob Consulta'}</span>
                                    </div>
                                    <div className="detail-item full-width">
                                        <strong>Descrição</strong>
                                        <p style={{ marginTop: '0.5rem', color: '#666', lineHeight: '1.5' }}>
                                            {selectedModel.descricao || 'Sem descrição cadastrada'}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Produtos;
