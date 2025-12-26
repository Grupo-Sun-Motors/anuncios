import React, { useState, useEffect } from 'react';
import { Upload, X, Car, Search, Image as ImageIcon, Plus, MoreVertical, Edit, Trash2, Eye, ExternalLink, UserCheck } from 'lucide-react';
import Preloader from '../components/Preloader';
import { useToast } from '../contexts/ToastContext';
import { buscarTodosModelos } from '../services-apis/supabase/modelosService';
import { buscarMarcas } from '../services-apis/supabase/configService';
import { mediaSupabase } from '../services-apis/supabase/mediaClient';

const Midias = () => {
    const { addToast } = useToast();

    // State
    const [models, setModels] = useState([]);
    const [brands, setBrands] = useState([]);
    const [cardImages, setCardImages] = useState({}); // Map of vehicle_uuid -> image url (priority to profile)
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // UI State
    const [activeTab, setActiveTab] = useState('all');
    const [showSideMenu, setShowSideMenu] = useState(false);

    // Side Menu Context
    const [selectedModel, setSelectedModel] = useState(null);
    const [sideMenuMode, setSideMenuMode] = useState('list'); // 'list' or 'upload'
    const [modelImages, setModelImages] = useState([]); // List of images for side menu

    // Upload State
    const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
    const [uploadFile, setUploadFile] = useState(null);
    const [compressedFile, setCompressedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [originalSize, setOriginalSize] = useState(0);
    const [compressedSize, setCompressedSize] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [imageToDelete, setImageToDelete] = useState(null);

    // Dropdown state for images list
    const [activeImageDropdown, setActiveImageDropdown] = useState(null);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [modelsData, brandsData] = await Promise.all([
                buscarTodosModelos(),
                buscarMarcas()
            ]);
            setModels(modelsData || []);
            setBrands(brandsData || []);

            fetchCardImages();
        } catch (error) {
            console.error("Error loading data:", error);
            addToast("Erro ao carregar dados.", "error");
        } finally {
            setLoading(false);
        }
    };

    // Fetch ONE best image per vehicle for the cards
    // Priority: picture_perfil=true, otherwise latest created_at
    const fetchCardImages = async () => {
        try {
            const { data, error } = await mediaSupabase
                .from('vehicle_images')
                .select('vehicle_uuid, image_url, created_at, picture_perfil')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const imageMap = {};

            // Process to find the best image for each vehicle
            data.forEach(item => {
                if (!imageMap[item.vehicle_uuid]) {
                    // If no image found yet for this vehicle, take the current one (it's the latest so far)
                    imageMap[item.vehicle_uuid] = item;
                } else {
                    // If we already have an image, check if we should replace it
                    // We replace if the current item is a profile picture and the stored one is NOT
                    if (item.picture_perfil && !imageMap[item.vehicle_uuid].picture_perfil) {
                        imageMap[item.vehicle_uuid] = item;
                    }
                    // Note: If both are profile pictures (shouldn't happen with trigger), the first one (latest) wins
                }
            });

            // Convert to Map<uuid, url>
            const urlMap = {};
            Object.keys(imageMap).forEach(uuid => {
                urlMap[uuid] = imageMap[uuid].image_url;
            });

            setCardImages(urlMap);

        } catch (error) {
            console.error("Fetch card images error:", error);
        }
    };

    // Fetch ALL images for a specific model (for Drawer)
    const fetchModelImages = async (modelId) => {
        try {
            const { data, error } = await mediaSupabase
                .from('vehicle_images')
                .select('*')
                .eq('vehicle_uuid', modelId)
                .order('picture_perfil', { ascending: false }) // Put profile pic first
                .order('created_at', { ascending: false }); // Then latest

            if (error) throw error;
            setModelImages(data || []);
        } catch (error) {
            console.error("Fetch model images error:", error);
            addToast("Erro ao carregar imagens do modelo.", "error");
        }
    };

    const getBrandName = (brandId) => {
        const brand = brands.find(b => b.id === brandId);
        return brand ? brand.nome : '';
    };

    // Actions
    const handleOpenSideMenu = async (model) => {
        setSelectedModel(model);
        setSideMenuMode('list');
        setModelImages([]);
        setShowSideMenu(true);
        setActiveImageDropdown(null);
        await fetchModelImages(model.id);
    };

    const handleCloseSideMenu = () => {
        setShowSideMenu(false);
        setActiveImageDropdown(null);
        setTimeout(() => {
            setSelectedModel(null);
            setSideMenuMode('list');
            // Reset upload state
            setUploadFile(null);
            setCompressedFile(null);
            setPreviewUrl(null);
            setOriginalSize(0);
            setCompressedSize(0);
        }, 300);
    };

    const switchToUploadMode = () => {
        setUploadYear(new Date().getFullYear());
        setUploadFile(null);
        setCompressedFile(null);
        setPreviewUrl(null);
        setOriginalSize(0);
        setCompressedSize(0);
        setSideMenuMode('upload');
    };

    const switchToListMode = () => {
        setSideMenuMode('list');
    };

    // Set Profile Logic
    const handleSetProfile = async (image) => {
        try {
            // Update this image to true
            // The database trigger will handle setting others to false
            const { error } = await mediaSupabase
                .from('vehicle_images')
                .update({ picture_perfil: true })
                .eq('id', image.id);

            if (error) throw error;

            addToast("Foto de perfil atualizada!", "success");

            // Refresh
            if (selectedModel) await fetchModelImages(selectedModel.id);
            fetchCardImages();
            setActiveImageDropdown(null); // Close menu
        } catch (error) {
            console.error("Set profile error:", error);
            addToast("Erro ao atualizar foto de perfil.", "error");
        }
    };

    // Compress Image Helper
    const compressImage = async (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1600;
                    const MAX_HEIGHT = 1600;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Try converting to WebP for better compression
                    canvas.toBlob((blob) => {
                        if (!blob) {
                            reject(new Error('Canvas is empty'));
                            return;
                        }
                        resolve({
                            blob,
                            previewUrl: URL.createObjectURL(blob),
                            width,
                            height
                        });
                    }, 'image/webp', 0.75); // Quality 0.75
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    // Upload Handler & Compression Trigger
    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploadFile(file);
            setOriginalSize(file.size);
            setIsCompressing(true);

            try {
                // Generate initial preview immediately (optional, but good UX) or wait for compression
                // Let's wait for compression to show the result directly

                const { blob, previewUrl: compressedPreviewUrl } = await compressImage(file);

                // If compressed is bigger (rare), use original?
                // Usually WebP 0.75 is much smaller than raw JPEGs/PNGs from cameras.
                // But if user uploads optimized tiny image, it might grow.
                // For simplicity and uniformity, we prefer the WebP version unless it's strictly larger?
                // Let's just use the compressed one as per requirement "fazer uma compressão".

                setCompressedFile(blob);
                setCompressedSize(blob.size);
                setPreviewUrl(compressedPreviewUrl);

            } catch (error) {
                console.error("Compression error:", error);
                addToast("Erro ao otimizar imagem.", "error");
                // Fallback to original
                setCompressedFile(file);
                setCompressedSize(file.size);
                setPreviewUrl(URL.createObjectURL(file));
            } finally {
                setIsCompressing(false);
            }
        }
        e.target.value = '';
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedModel || !compressedFile) {
            addToast("Selecione um arquivo.", "error");
            return;
        }

        setIsUploading(true);
        try {
            // Using logic from original upload but with compressedFile
            // original file name might differ in extension if we converted to webp
            const originalName = uploadFile ? uploadFile.name : 'image.jpg';
            const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            const fileExt = 'webp'; // Since we are forcing webp in compressImage

            const fileName = `${selectedModel.id}/${Date.now()}_optimized.${fileExt}`;
            const filePath = `${fileName}`;
            const bucketName = 'galeria_veiculos';

            // Upload the compressed blob
            const { error: storageError } = await mediaSupabase.storage
                .from(bucketName)
                .upload(filePath, compressedFile);

            if (storageError) throw new Error(`Erro no upload: ${storageError.message}`);

            const { data: { publicUrl } } = mediaSupabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            const { error: dbError } = await mediaSupabase
                .from('vehicle_images')
                .insert([
                    {
                        vehicle_uuid: selectedModel.id,
                        image_url: publicUrl,
                        year: parseInt(uploadYear),
                        picture_perfil: false // Default to false
                    }
                ]);

            if (dbError) throw new Error(`Erro ao salvar no banco: ${dbError.message}`);

            addToast("Mídia enviada com sucesso!", "success");

            // Refresh logic
            await fetchModelImages(selectedModel.id);
            fetchCardImages();
            setSideMenuMode('list');

            // Clean up URLs
            if (previewUrl) URL.revokeObjectURL(previewUrl);

        } catch (error) {
            console.error("Upload process error:", error);
            addToast(error.message || "Erro ao fazer upload.", "error");
        } finally {
            setIsUploading(false);
        }
    };

    // Delete Handling
    const handleConfirmDelete = (img) => {
        setImageToDelete(img);
        setShowDeleteModal(true);
        setActiveImageDropdown(null);
    };

    const handleDeleteImage = async () => {
        if (!imageToDelete) return;

        try {
            const bucketName = 'galeria_veiculos';
            const urlParts = imageToDelete.image_url.split(`${bucketName}/`);
            if (urlParts.length > 1) {
                const path = urlParts[1];
                await mediaSupabase.storage.from(bucketName).remove([path]);
            }

            const { error } = await mediaSupabase
                .from('vehicle_images')
                .delete()
                .eq('id', imageToDelete.id);

            if (error) throw error;

            addToast("Imagem excluída com sucesso.", "success");

            if (selectedModel) await fetchModelImages(selectedModel.id);
            fetchCardImages();
            setShowDeleteModal(false);

        } catch (error) {
            console.error("Delete error:", error);
            addToast("Erro ao excluir imagem.", "error");
        }
    };

    // UI Helpers
    const toggleImageDropdown = (e, imgId) => {
        e.stopPropagation();
        setActiveImageDropdown(activeImageDropdown === imgId ? null : imgId);
    };

    const handleClickOutside = (e) => {
        if (!e.target.closest('.image-item-actions') && !e.target.closest('.item-menu-btn')) {
            setActiveImageDropdown(null);
        }
    };

    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Filter Logic
    const filteredModels = models.filter(model => {
        const matchesSearch = searchTerm === '' ||
            model.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const modelBrandName = getBrandName(model.marca_id).toLowerCase();
        const matchesTab = activeTab === 'all' || modelBrandName === activeTab.toLowerCase();
        return matchesSearch && matchesTab;
    });

    const brandTabs = ['all', ...Array.from(new Set(brands.map(b => b.nome)))];

    return (
        <div id="view-midias" className="page-view">
            {loading && <Preloader message="Carregando mídias..." />}
            <div className="page-header">
                <h1>Gestão de Mídias</h1>
                <p className="page-subtitle">Gerencie o acervo digital dos seus veículos.</p>
            </div>

            <div className="toolbar" style={{ marginBottom: '20px' }}>
                <div className="search-box" style={{ position: 'relative', maxWidth: '400px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                    <input
                        type="text"
                        placeholder="Buscar modelo..."
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ padding: '10px 10px 10px 40px', width: '100%', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                    />
                </div>
            </div>

            <div className="brand-tabs">
                <button className={`brand-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Todos</button>
                {brandTabs.filter(b => b !== 'all').sort().map(brandName => (
                    <button
                        key={brandName}
                        className={`brand-tab ${activeTab === brandName.toLowerCase() ? 'active' : ''}`}
                        onClick={() => setActiveTab(brandName.toLowerCase())}
                    >
                        {brandName}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {filteredModels.length > 0 ? (
                <div className="media-grid">
                    {filteredModels.map(model => (
                        <div key={model.id} className="media-card" onClick={() => handleOpenSideMenu(model)}>
                            <div className="media-card-content">
                                <div className="media-card-info">
                                    <h3>{model.nome}</h3>
                                    <span className="media-card-segment">{model.segmento}</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 'auto' }}>
                                    {getBrandName(model.marca_id)}
                                </div>
                            </div>
                            <div className="media-card-image">
                                {cardImages[model.id] ? (
                                    <img src={cardImages[model.id]} alt={model.nome} />
                                ) : (
                                    <div className="placeholder"><ImageIcon size={32} opacity={0.3} /></div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '60px' }}>
                    <Car size={64} color="#e5e7eb" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: '#374151' }}>Nenhum veículo encontrado</h3>
                </div>
            )}

            {/* Overlay */}
            <div className={`sidemenu-overlay ${showSideMenu ? 'open' : ''}`} onClick={handleCloseSideMenu}></div>

            {/* Drawer */}
            <div className={`upload-sidemenu ${showSideMenu ? 'open' : ''}`}>

                {/* Header */}
                <div className="sidemenu-header">
                    {sideMenuMode === 'list' ? (
                        <>
                            <div>
                                <h2 style={{ maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {selectedModel?.nome}
                                </h2>
                                <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Galeria de Imagens</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-action primary" onClick={switchToUploadMode} title="Adicionar Mídia" style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Plus size={20} />
                                </button>
                                <button className="btn-icon" onClick={handleCloseSideMenu}>
                                    <X size={24} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button className="btn-icon" onClick={switchToListMode} title="Voltar">
                                    <span style={{ fontSize: '1.2rem' }}>←</span>
                                </button>
                                <h2>Adicionar Mídia</h2>
                            </div>
                            <button className="btn-icon" onClick={handleCloseSideMenu}>
                                <X size={24} />
                            </button>
                        </>
                    )}
                </div>

                {/* Content */}
                <div className="sidemenu-content">
                    {selectedModel && (
                        <>
                            {sideMenuMode === 'list' ? (
                                <>
                                    {modelImages.length > 0 ? (
                                        <div className="gallery-list">
                                            {modelImages.map(img => (
                                                <div
                                                    key={img.id}
                                                    className="gallery-item group"
                                                    style={activeImageDropdown === img.id ? { zIndex: 20 } : {}}
                                                >
                                                    <img src={img.image_url} alt="Vehicle" loading="lazy" />

                                                    {/* Profile Badge */}
                                                    {img.picture_perfil && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '8px',
                                                            left: '8px',
                                                            background: '#2563eb',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            width: '24px',
                                                            height: '24px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                        }} title="Imagem de Perfil">
                                                            <UserCheck size={14} />
                                                        </div>
                                                    )}

                                                    <div className="image-year-badge">{img.year}</div>

                                                    {/* Actions Overlay */}
                                                    <div className={`gallery-item-actions image-item-actions ${activeImageDropdown === img.id ? 'active' : ''}`}>
                                                        <button className="item-menu-btn" onClick={(e) => toggleImageDropdown(e, img.id)}>
                                                            <MoreVertical size={16} />
                                                        </button>

                                                        {activeImageDropdown === img.id && (
                                                            <div className="actions-dropdown active" style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', minWidth: '160px' }}>
                                                                <button onClick={() => window.open(img.image_url, '_blank')}>
                                                                    <Eye size={14} /> Ver Original
                                                                </button>

                                                                {!img.picture_perfil && (
                                                                    <button onClick={() => handleSetProfile(img)}>
                                                                        <UserCheck size={14} /> Definir como Perfil
                                                                    </button>
                                                                )}

                                                                <button className="danger" onClick={() => handleConfirmDelete(img)}>
                                                                    <Trash2 size={14} /> Excluir
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', display: 'flex' }}>
                                            <ImageIcon size={48} color="#e5e7eb" />
                                            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Nenhuma imagem cadastrada.</p>
                                            <button className="btn btn-primary" onClick={switchToUploadMode} style={{ marginTop: '1rem' }}>
                                                Adicionar Primeira Imagem
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                /* Upload Form */
                                <div className="upload-form-container">
                                    <p style={{ marginBottom: '1.5rem', color: '#4b5563' }}>
                                        Adicionando imagem para <strong>{selectedModel.nome}</strong>
                                    </p>

                                    <form onSubmit={handleUpload}>
                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                                Ano de Referência
                                            </label>
                                            <input
                                                type="number"
                                                value={uploadYear}
                                                onChange={e => setUploadYear(e.target.value)}
                                                className="input-field"
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                                                required
                                            />
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
                                                Arquivo da Imagem
                                            </label>

                                            {!previewUrl ? (
                                                <div
                                                    className="upload-area"
                                                    onClick={() => !isCompressing && document.getElementById('drawerFileInput').click()}
                                                    style={{
                                                        cursor: isCompressing ? 'wait' : 'pointer',
                                                        opacity: isCompressing ? 0.7 : 1
                                                    }}
                                                >
                                                    {isCompressing ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                            <div className="loading-spinner"></div>
                                                            <p style={{ margin: 0, fontWeight: 500, color: '#4b5563' }}>Otimizando imagem...</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Upload size={32} color="#9ca3af" style={{ marginBottom: '1rem' }} />
                                                            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500, color: '#4b5563' }}>
                                                                Clique para selecionar
                                                            </p>
                                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>
                                                                JPG, PNG, WEBP
                                                            </p>
                                                        </>
                                                    )}
                                                    <input
                                                        id="drawerFileInput"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleFileChange}
                                                        style={{ display: 'none' }}
                                                        disabled={isCompressing}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="preview-container" style={{
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '0.5rem',
                                                    padding: '1rem',
                                                    position: 'relative'
                                                }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setUploadFile(null);
                                                            setCompressedFile(null);
                                                            setPreviewUrl(null);
                                                            setOriginalSize(0);
                                                            setCompressedSize(0);
                                                        }}
                                                        style={{
                                                            position: 'absolute',
                                                            top: '-10px',
                                                            right: '-10px',
                                                            background: 'white',
                                                            border: '1px solid #e5e7eb',
                                                            borderRadius: '50%',
                                                            width: '24px',
                                                            height: '24px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            cursor: 'pointer',
                                                            color: '#ef4444',
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>

                                                    <div style={{
                                                        height: '200px',
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        marginBottom: '1rem',
                                                        backgroundColor: '#f9fafb',
                                                        borderRadius: '0.25rem',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <img
                                                            src={previewUrl}
                                                            alt="Preview"
                                                            style={{
                                                                maxHeight: '100%',
                                                                maxWidth: '100%',
                                                                objectFit: 'contain'
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="compression-stats" style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                        <div style={{ color: '#6b7280' }}>
                                                            Original: <span style={{ fontWeight: 600, color: '#374151' }}>{(originalSize / 1024).toFixed(1)} KB</span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                                Otimizado: <span style={{ fontWeight: 600 }}>{(compressedSize / 1024).toFixed(1)} KB</span>
                                                            </div>
                                                            {originalSize > 0 && (
                                                                <span style={{
                                                                    fontSize: '0.75rem',
                                                                    background: '#ecfdf5',
                                                                    color: '#059669',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    fontWeight: 600
                                                                }}>
                                                                    -{Math.round((1 - compressedSize / originalSize) * 100)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ width: '100%', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                                            disabled={isUploading || isCompressing || !compressedFile}
                                        >
                                            {isUploading ? 'Enviando...' : (
                                                <>
                                                    <Upload size={18} /> Upload Mídia
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

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
                        <p className="confirm-message">
                            Tem certeza que deseja excluir esta imagem? Esta ação é irreversível.
                        </p>
                        {imageToDelete && (
                            <div style={{ width: '100%', height: '150px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem', border: '1px solid #eee', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f9f9f9' }}>
                                <img src={imageToDelete.image_url} alt="To delete" style={{ height: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                        <button type="button" className="btn btn-danger" onClick={handleDeleteImage}>Excluir</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Midias;
