import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Eye, Edit, Trash2, X, Save } from 'lucide-react';
import { supabase } from '../services-apis/supabase/client';
import * as configService from '../services-apis/supabase/configService';

const TargetAudience = () => {
    const [brands, setBrands] = useState([]);
    const [brandsData, setBrandsData] = useState({});
    const [audiencesData, setAudiencesData] = useState({});
    const [modelsData, setModelsData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null); // Can be brand or audience
    const [modalType, setModalType] = useState(null); // 'brand' or 'audience'
    const [editAction, setEditAction] = useState(null); // 'new' or 'edit'
    const [currentBrandKey, setCurrentBrandKey] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Load Brands
            const { data: brandsList, error: brandsError } = await supabase.from('marcas').select('*');
            if (brandsError) throw brandsError;

            // Load Audiences with Models
            const { data: audiences, error: audiencesError } = await supabase
                .from('audiencias')
                .select(`
          *,
          modelos (
            id,
            nome,
            segmento,
            marca_id,
            marcas (nome)
          )
        `);
            if (audiencesError) throw audiencesError;

            // Load Models
            const { data: models, error: modelsError } = await supabase
                .from('modelos')
                .select(`*, marcas (nome)`);
            if (modelsError) throw modelsError;

            // Process Data
            const processedBrandsData = {};
            brandsList.forEach(brand => {
                processedBrandsData[brand.nome.toLowerCase()] = brand;
            });

            const processedAudiencesData = {};
            audiences.forEach(audience => {
                if (audience.modelos) {
                    const brandName = audience.modelos.marcas.nome.toLowerCase();
                    if (!processedAudiencesData[brandName]) {
                        processedAudiencesData[brandName] = [];
                    }
                    processedAudiencesData[brandName].push({
                        ...audience,
                        modelo: audience.modelos
                    });
                }
            });

            const processedModelsData = {};
            models.forEach(model => {
                const brandName = model.marcas.nome.toLowerCase();
                if (!processedModelsData[brandName]) {
                    processedModelsData[brandName] = [];
                }
                processedModelsData[brandName].push(model);
            });

            setBrands(brandsList);
            setBrandsData(processedBrandsData);
            setAudiencesData(processedAudiencesData);
            setModelsData(processedModelsData);

        } catch (err) {
            console.error('Error loading target audience data:', err);
            setError('Erro ao carregar dados do público-alvo.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDetails = (type, item, brandKey) => {
        setModalType(type);
        setSelectedItem(item);
        setCurrentBrandKey(brandKey);
        setShowDetailsModal(true);
    };

    const handleOpenEdit = (action, type, item, brandKey) => {
        setEditAction(action);
        setModalType(type);
        setSelectedItem(item); // For 'new', item might be null or partial
        setCurrentBrandKey(brandKey);
        setShowEditModal(true);
    };

    const handleOpenDelete = (item) => {
        setSelectedItem(item);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!selectedItem) return;
        try {
            const { error } = await supabase.from('audiencias').delete().eq('id', selectedItem.id);
            if (error) throw error;
            setShowDeleteModal(false);
            loadData();
        } catch (err) {
            console.error('Error deleting audience:', err);
            alert('Erro ao excluir público-alvo.');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // Process arrays
        data.interesses = data.interesses.split(',').map(s => s.trim()).filter(Boolean);
        data.comportamentos = data.comportamentos.split(',').map(s => s.trim()).filter(Boolean);

        try {
            if (modalType === 'brand') {
                const { error } = await supabase
                    .from('marcas')
                    .update(data)
                    .eq('id', selectedItem.id);
                if (error) throw error;
            } else {
                // Audience
                if (editAction === 'new') {
                    const { error } = await supabase.from('audiencias').insert([data]);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('audiencias')
                        .update(data)
                        .eq('id', selectedItem.id);
                    if (error) throw error;
                }
            }
            setShowEditModal(false);
            loadData();
        } catch (err) {
            console.error('Error saving data:', err);
            alert('Erro ao salvar dados.');
        }
    };

    if (isLoading) return <div className="loading">Carregando...</div>;
    if (error) return <div className="error">{error}</div>;

    const brandKeys = ['kia', 'suzuki', 'zontes', 'haojue']; // Order matters or dynamic?

    return (
        <div className="page-view" style={{ display: 'block' }}>
            <div className="page-header">
                <h1>Público-Alvo</h1>
                <p>Gestão de personas e perfis de audiência por marca</p>
            </div>

            <div className="brand-tabs">
                {/* Tabs implementation if needed, or just sections as per original */}
            </div>

            <div className="brands-container">
                {brandKeys.map(brandKey => {
                    const brand = brandsData[brandKey];
                    if (!brand) return null;

                    const audiences = audiencesData[brandKey] || [];
                    const interesses = Array.isArray(brand.interesses) ? brand.interesses.slice(0, 2).join(', ') : 'Não definido';
                    const comportamentos = Array.isArray(brand.comportamentos) ? brand.comportamentos.slice(0, 2).join(', ') : 'Não definido';

                    return (
                        <div className="brand-section" id={`section-${brandKey}`} key={brandKey}>
                            <div className="section-header">
                                <div className="brand-title">
                                    <h2>{brand.nome}</h2>
                                    <span className="badge">{audiences.length} Perfis</span>
                                </div>
                                <div className="header-actions">
                                    <button className="btn btn-secondary" onClick={() => handleOpenDetails('brand', brand, brandKey)}>
                                        <Eye size={16} />
                                        Ver Perfil da Marca
                                    </button>
                                    <button className="btn btn-primary" onClick={() => handleOpenEdit('new', 'audience', null, brandKey)}>
                                        <Plus size={16} />
                                        Novo Público
                                    </button>
                                </div>
                            </div>

                            <div className="summary-cards" id={`${brandKey}-summary-cards`}>
                                <div className="summary-card primary">
                                    <h5>Demografia Principal</h5>
                                    <p className="value">{brand.faixa_etaria || 'Não definido'}</p>
                                </div>
                                <div className="summary-card secondary">
                                    <h5>Motivações</h5>
                                    <p className="value">{interesses}</p>
                                </div>
                                <div className="summary-card accent">
                                    <h5>Comportamento</h5>
                                    <p className="value">{comportamentos}</p>
                                </div>
                            </div>

                            <div className="table-container">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Modelo</th>
                                            <th>Segmento</th>
                                            <th>Faixa Etária</th>
                                            <th>Gênero</th>
                                            <th>Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id={`${brandKey}-table-body`}>
                                        {audiences.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="empty-state">Nenhum modelo configurado ainda</td>
                                            </tr>
                                        ) : (
                                            audiences.map(audience => (
                                                <tr key={audience.id} onClick={() => handleOpenDetails('audience', audience, brandKey)}>
                                                    <td>{audience.modelo?.nome}</td>
                                                    <td>{audience.modelo?.segmento}</td>
                                                    <td>{audience.faixa_etaria || 'Não definido'}</td>
                                                    <td>{audience.genero}</td>
                                                    <td className="actions" onClick={(e) => e.stopPropagation()}>
                                                        <div className="actions-menu">
                                                            <button className="btn-icon actions-trigger">
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {/* Simplified Actions - In real app, implement dropdown */}
                                                            <div className="actions-dropdown-static" style={{ display: 'flex', gap: '5px' }}>
                                                                <button className="btn-icon-mini" onClick={() => handleOpenDetails('audience', audience, brandKey)} title="Visualizar"><Eye size={14} /></button>
                                                                <button className="btn-icon-mini" onClick={() => handleOpenEdit('edit', 'audience', audience, brandKey)} title="Editar"><Edit size={14} /></button>
                                                                <button className="btn-icon-mini danger" onClick={() => handleOpenDelete(audience)} title="Excluir"><Trash2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedItem && (
                <div className="modal-overlay active" onClick={() => setShowDetailsModal(false)}>
                    <div className="side-modal active" onClick={e => e.stopPropagation()}>
                        <div className="side-modal-header">
                            <h2 id="details-title">
                                {modalType === 'brand'
                                    ? `${selectedItem.nome_perfil || selectedItem.nome} - Perfil Completo`
                                    : `${selectedItem.modelo?.nome} - ${selectedItem.modelo?.marcas?.nome}`
                                }
                            </h2>
                            <button className="close-btn" onClick={() => setShowDetailsModal(false)}><X size={20} /></button>
                        </div>
                        <div className="side-modal-content" id="details-content">
                            {/* Render details based on type */}
                            {modalType === 'brand' ? (
                                <>
                                    <div className="detail-section">
                                        <h4>Perfil da Marca</h4>
                                        <div className="detail-item"><span className="detail-label">Nome do Perfil:</span> <span className="detail-value primary">{selectedItem.nome_perfil || 'Não informado'}</span></div>
                                        <div className="detail-item"><span className="detail-label">Marca:</span> <span className="detail-value">{selectedItem.nome}</span></div>
                                    </div>
                                    <div className="detail-section"><h4>Descrição Completa</h4><p className="detail-value">{selectedItem.descricao || 'Não informado'}</p></div>
                                    <div className="detail-section">
                                        <h4>Demografia</h4>
                                        <div className="detail-item"><span className="detail-label">Faixa Etária:</span> <span className="detail-value">{selectedItem.faixa_etaria || 'Não informado'}</span></div>
                                        <div className="detail-item"><span className="detail-label">Gênero:</span> <span className="detail-value">{selectedItem.genero || 'Não informado'}</span></div>
                                        <div className="detail-item"><span className="detail-label">Localização:</span> <span className="detail-value">{selectedItem.localizacao || 'Não informado'}</span></div>
                                    </div>
                                    <div className="detail-section"><h4>Interesses Completos</h4><p className="detail-value">{Array.isArray(selectedItem.interesses) ? selectedItem.interesses.join(', ') : selectedItem.interesses}</p></div>
                                    <div className="detail-section"><h4>Comportamentos Completos</h4><p className="detail-value">{Array.isArray(selectedItem.comportamentos) ? selectedItem.comportamentos.join(', ') : selectedItem.comportamentos}</p></div>
                                </>
                            ) : (
                                <>
                                    <div className="detail-section">
                                        <h4>Informações Básicas</h4>
                                        <div className="detail-item"><span className="detail-label">Modelo:</span> <span className="detail-value primary">{selectedItem.modelo?.nome}</span></div>
                                        <div className="detail-item"><span className="detail-label">Segmento:</span> <span className="detail-value">{selectedItem.modelo?.segmento}</span></div>
                                        <div className="detail-item"><span className="detail-label">Faixa Etária:</span> <span className="detail-value">{selectedItem.faixa_etaria}</span></div>
                                        <div className="detail-item"><span className="detail-label">Gênero:</span> <span className="detail-value">{selectedItem.genero}</span></div>
                                    </div>
                                    <div className="detail-section">
                                        <h4>Perfil do Público</h4>
                                        <div className="detail-item"><span className="detail-label">Nome do Perfil:</span> <span className="detail-value">{selectedItem.nome_perfil}</span></div>
                                    </div>
                                    <div className="detail-section"><h4>Descrição</h4><p className="detail-value">{selectedItem.descricao}</p></div>
                                    <div className="detail-section"><h4>Interesses</h4><p className="detail-value">{Array.isArray(selectedItem.interesses) ? selectedItem.interesses.join(', ') : selectedItem.interesses}</p></div>
                                    <div className="detail-section"><h4>Comportamentos</h4><p className="detail-value">{Array.isArray(selectedItem.comportamentos) ? selectedItem.comportamentos.join(', ') : selectedItem.comportamentos}</p></div>
                                    <div className="detail-section"><h4>Localização</h4><p className="detail-value">{selectedItem.localizacao}</p></div>
                                </>
                            )}
                        </div>
                        <div className="side-modal-footer">
                            {modalType === 'brand' ? (
                                <button className="btn btn-primary" onClick={() => { setShowDetailsModal(false); handleOpenEdit('edit', 'brand', selectedItem, currentBrandKey); }}>
                                    <Edit size={16} /> Editar Perfil
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={() => { setShowDetailsModal(false); handleOpenEdit('edit', 'audience', selectedItem, currentBrandKey); }}>
                                    <Edit size={16} /> Editar Público
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal-overlay active" onClick={() => setShowEditModal(false)}>
                    <div className="side-modal active" onClick={e => e.stopPropagation()}>
                        <div className="side-modal-header">
                            <h2>
                                {editAction === 'new' ? 'Novo Público-Alvo' : 'Editar Público-Alvo'}
                            </h2>
                            <button className="close-btn" onClick={() => setShowEditModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} className="side-modal-content">
                            {modalType === 'audience' && (
                                <div className="form-group">
                                    <label>Modelo</label>
                                    <select name="modelo_id" defaultValue={selectedItem?.modelo_id || ''} required>
                                        <option value="">Selecione um modelo</option>
                                        {modelsData[currentBrandKey]?.map(model => (
                                            <option key={model.id} value={model.id}>{model.nome} - {model.segmento}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="form-group full-width">
                                <label>Nome do Perfil</label>
                                <input type="text" name="nome_perfil" defaultValue={selectedItem?.nome_perfil || ''} required />
                            </div>
                            <div className="form-group full-width">
                                <label>Descrição</label>
                                <textarea name="descricao" rows="3" defaultValue={selectedItem?.descricao || ''}></textarea>
                            </div>
                            <div className="form-group">
                                <label>Faixa Etária</label>
                                <input type="text" name="faixa_etaria" defaultValue={selectedItem?.faixa_etaria || ''} />
                            </div>
                            <div className="form-group">
                                <label>Gênero</label>
                                <select name="genero" defaultValue={selectedItem?.genero || ''}>
                                    <option value="">Selecione</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                    <option value="Todos">Todos</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Localização</label>
                                <input type="text" name="localizacao" defaultValue={selectedItem?.localizacao || ''} />
                            </div>
                            <div className="form-group full-width">
                                <label>Interesses (separados por vírgula)</label>
                                <textarea name="interesses" rows="3" defaultValue={Array.isArray(selectedItem?.interesses) ? selectedItem.interesses.join(', ') : selectedItem?.interesses || ''}></textarea>
                            </div>
                            <div className="form-group full-width">
                                <label>Comportamentos (separados por vírgula)</label>
                                <textarea name="comportamentos" rows="3" defaultValue={Array.isArray(selectedItem?.comportamentos) ? selectedItem.comportamentos.join(', ') : selectedItem?.comportamentos || ''}></textarea>
                            </div>

                            <div className="side-modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary"><Save size={16} /> Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Confirmar Exclusão</h2>
                            <button className="close-btn" onClick={() => setShowDeleteModal(false)}>&times;</button>
                        </div>
                        <div style={{ padding: '20px' }}>
                            <p>Tem certeza que deseja excluir este público-alvo? Esta ação não pode ser desfeita.</p>
                            <div className="form-actions">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                                <button className="btn btn-danger" onClick={handleDelete}>Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TargetAudience;
