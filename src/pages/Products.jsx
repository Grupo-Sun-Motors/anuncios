import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Eye, Edit, Trash2, X, Car, DollarSign } from 'lucide-react';
import { supabase } from '../services-apis/supabase/client';
import * as configService from '../services-apis/supabase/configService';
import * as modelosService from '../services-apis/supabase/modelosService';

const Products = () => {
    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [selectedBrandId, setSelectedBrandId] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        segmento: '',
        preco: ''
    });

    // Details State
    const [showDetails, setShowDetails] = useState(false);
    const [selectedModel, setSelectedModel] = useState(null);
    const [modelAudience, setModelAudience] = useState(null);

    const brandConfig = {
        'Kia': { slogan: 'The Power to Surprise', color: '#BB162B' },
        'Suzuki': { slogan: 'Way of Life!', color: '#S3565' }, // Suzuki Blue/Red
        'Zontes': { slogan: 'Born to be Different', color: '#333' },
        'Haojue': { slogan: 'Confiança em Movimento', color: '#0055A4' }
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [brandsData, modelsData] = await Promise.all([
                configService.buscarMarcas(),
                modelosService.buscarTodosModelos()
            ]);
            setBrands(brandsData || []);
            setModels(modelsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        if (name === 'preco') {
            // Format currency input
            const numericValue = value.replace(/\D/g, '');
            const floatValue = parseFloat(numericValue) / 100;
            setFormData(prev => ({ ...prev, [name]: floatValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const dataToSave = {
                ...formData,
                marca_id: selectedBrandId
            };

            if (editingModel) {
                await modelosService.atualizarModelo(editingModel.id, dataToSave);
            } else {
                await modelosService.criarModelo(dataToSave);
            }
            setShowModal(false);
            setEditingModel(null);
            resetForm();
            loadData();
        } catch (error) {
            console.error('Error saving model:', error);
            alert('Erro ao salvar modelo');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
            try {
                await modelosService.deletarModelo(id);
                setModels(prev => prev.filter(m => m.id !== id));
            } catch (error) {
                console.error('Error deleting model:', error);
            }
        }
    };

    const handleEdit = (model) => {
        setEditingModel(model);
        setSelectedBrandId(model.marca_id);
        setFormData({
            nome: model.nome || '',
            segmento: model.segmento || '',
            preco: model.preco || ''
        });
        setShowModal(true);
    };

    const handleAdd = (brandId) => {
        setEditingModel(null);
        setSelectedBrandId(brandId);
        resetForm();
        setShowModal(true);
    };

    const handleViewDetails = async (model) => {
        setSelectedModel(model);
        setShowDetails(true);
        setModelAudience(null); // Reset while loading

        try {
            const { data, error } = await supabase
                .from('audiencias')
                .select('*')
                .eq('modelo_id', model.id)
                .single();

            if (!error) {
                setModelAudience(data);
            }
        } catch (error) {
            console.error('Error loading audience details:', error);
        }
    };

    const resetForm = () => {
        setFormData({
            nome: '',
            segmento: '',
            preco: ''
        });
    };

    const getModelsByBrand = (brandId) => {
        return models.filter(m => m.marca_id === brandId);
    };

    return (
        <div className="page-view" style={{ display: 'block' }}>
            <div className="page-header">
                <h1>Produtos</h1>
            </div>

            <div className="products-content">
                {loading ? (
                    <div className="loading">Carregando produtos...</div>
                ) : (
                    <div className="brands-container">
                        {brands.map(brand => {
                            const brandModels = getModelsByBrand(brand.id);
                            const config = brandConfig[brand.nome] || { slogan: '', color: '#333' };

                            return (
                                <div key={brand.id} className="brand-section">
                                    <div className="brand-header-card" style={{ borderLeft: `4px solid ${config.color}` }}>
                                        <div className="brand-info">
                                            <h2>{brand.nome}</h2>
                                            <p className="brand-slogan">{config.slogan}</p>
                                        </div>
                                        <button className="btn btn-sm btn-outline" onClick={() => handleAdd(brand.id)}>
                                            <Plus size={14} /> Adicionar Modelo
                                        </button>
                                    </div>

                                    <div className="models-grid">
                                        {brandModels.length === 0 ? (
                                            <div className="empty-models">
                                                <Car size={32} className="text-muted" />
                                                <p>Nenhum modelo cadastrado</p>
                                            </div>
                                        ) : (
                                            <table className="models-table">
                                                <thead>
                                                    <tr>
                                                        <th>Modelo</th>
                                                        <th>Segmento</th>
                                                        <th>Preço</th>
                                                        <th style={{ width: '100px' }}>Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {brandModels.map(model => (
                                                        <tr key={model.id}>
                                                            <td className="font-medium">{model.nome}</td>
                                                            <td>{model.segmento || '-'}</td>
                                                            <td>{formatCurrency(model.preco)}</td>
                                                            <td>
                                                                <div className="actions-row">
                                                                    <button className="btn-icon" onClick={() => handleViewDetails(model)} title="Detalhes">
                                                                        <Eye size={16} />
                                                                    </button>
                                                                    <button className="btn-icon" onClick={() => handleEdit(model)} title="Editar">
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    <button className="btn-icon danger" onClick={() => handleDelete(model.id)} title="Excluir">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingModel ? 'Editar Modelo' : 'Novo Modelo'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nome do Modelo *</label>
                                <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Segmento</label>
                                <input type="text" name="segmento" value={formData.segmento} onChange={handleInputChange} placeholder="Ex: SUV, Hatch, Sedan" />
                            </div>
                            <div className="form-group">
                                <label>Preço (R$)</label>
                                <input
                                    type="text"
                                    name="preco"
                                    value={formData.preco ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(formData.preco) : ''}
                                    onChange={(e) => {
                                        // Custom handler to allow typing numbers
                                        const val = e.target.value.replace(/\D/g, '');
                                        const floatVal = parseFloat(val) / 100;
                                        setFormData(prev => ({ ...prev, preco: floatVal }));
                                    }}
                                    placeholder="0,00"
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetails && selectedModel && (
                <div className="modal active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Detalhes do Modelo</h2>
                            <button className="close-btn" onClick={() => setShowDetails(false)}><X size={20} /></button>
                        </div>
                        <div className="details-body">
                            <div className="detail-section">
                                <h3>Informações Básicas</h3>
                                <div className="details-grid">
                                    <div className="detail-item"><strong>Modelo:</strong> {selectedModel.nome}</div>
                                    <div className="detail-item"><strong>Segmento:</strong> {selectedModel.segmento || '-'}</div>
                                    <div className="detail-item"><strong>Preço:</strong> {formatCurrency(selectedModel.preco)}</div>
                                </div>
                            </div>

                            <div className="detail-section mt-4">
                                <h3>Perfil do Público-Alvo</h3>
                                {modelAudience ? (
                                    <div className="details-grid">
                                        <div className="detail-item"><strong>Perfil:</strong> {modelAudience.nome_perfil}</div>
                                        <div className="detail-item full-width"><strong>Descrição:</strong> {modelAudience.descricao}</div>
                                        <div className="detail-item"><strong>Faixa Etária:</strong> {modelAudience.faixa_etaria}</div>
                                        <div className="detail-item"><strong>Gênero:</strong> {modelAudience.genero}</div>
                                        <div className="detail-item full-width"><strong>Localização:</strong> {modelAudience.localizacao}</div>

                                        {modelAudience.interesses && (
                                            <div className="detail-item full-width">
                                                <strong>Interesses:</strong>
                                                <div className="tags-list">
                                                    {modelAudience.interesses.map((int, i) => <span key={i} className="tag">{int}</span>)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="empty-state-small">
                                        <p>Nenhuma informação de público-alvo cadastrada.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
