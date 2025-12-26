import React, { useState, useEffect } from 'react';
import { Plus, MoreVertical, Eye, Edit, Trash2, Save, X, Search, Filter } from 'lucide-react';
import { supabase } from '../services-apis/supabase/client';
import * as historicoService from '../services-apis/supabase/historicoOtimizacoesService';
import * as configService from '../services-apis/supabase/configService';
import * as campanhasService from '../services-apis/supabase/campanhasService';
import * as gruposService from '../services-apis/supabase/gruposDeAnunciosService';
import * as criativosService from '../services-apis/supabase/criativosService';

const Optimizations = () => {
    const [optimizations, setOptimizations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [brands, setBrands] = useState([]);
    const [platforms, setPlatforms] = useState([]);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        descricao: '',
        status: 'Pendente',
        tipo_alteracao: 'Orçamento',
        responsavel: '',
        hipotese: '',
        data_alteracao: new Date().toISOString().split('T')[0],
        marca_id: '',
        plataforma_id: '',
        conta_de_anuncio_id: '',
        campanha_id: '',
        grupo_de_anuncio_id: '',
        criativo_id: ''
    });

    // Dynamic Options State
    const [accounts, setAccounts] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [adGroups, setAdGroups] = useState([]);
    const [creatives, setCreatives] = useState([]);

    // Visibility Toggles for Form Fields
    const [visibleFields, setVisibleFields] = useState({
        plataforma_id: false,
        marca_id: false,
        campanha_id: false,
        grupo_de_anuncio_id: false,
        criativo_id: false
    });

    // View Modal State
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedOptimization, setSelectedOptimization] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [optData, brandsData, platformsData] = await Promise.all([
                historicoService.buscarTodoHistorico(),
                configService.buscarMarcas(),
                configService.buscarPlataformas()
            ]);
            setOptimizations(optData || []);
            setBrands(brandsData || []);
            setPlatforms(platformsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Dependency Effects
    useEffect(() => {
        if (formData.marca_id && formData.plataforma_id) {
            loadAccounts();
        } else {
            setAccounts([]);
            setFormData(prev => ({ ...prev, conta_de_anuncio_id: '' }));
        }
    }, [formData.marca_id, formData.plataforma_id]);

    useEffect(() => {
        if (formData.conta_de_anuncio_id) {
            loadCampaigns();
        } else {
            setCampaigns([]);
            setFormData(prev => ({ ...prev, campanha_id: '' }));
        }
    }, [formData.conta_de_anuncio_id]);

    useEffect(() => {
        if (formData.campanha_id) {
            loadAdGroups();
        } else {
            setAdGroups([]);
            setFormData(prev => ({ ...prev, grupo_de_anuncio_id: '' }));
        }
    }, [formData.campanha_id]);

    useEffect(() => {
        if (formData.grupo_de_anuncio_id) {
            loadCreatives();
        } else {
            setCreatives([]);
            setFormData(prev => ({ ...prev, criativo_id: '' }));
        }
    }, [formData.grupo_de_anuncio_id]);

    const loadAccounts = async () => {
        try {
            const brandAccounts = await configService.buscarContasPorMarca(formData.marca_id);
            const filtered = brandAccounts.filter(acc => String(acc.plataforma_id) === String(formData.plataforma_id));
            setAccounts(filtered);
            if (filtered.length === 1) {
                setFormData(prev => ({ ...prev, conta_de_anuncio_id: filtered[0].id }));
            }
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    };

    const loadCampaigns = async () => {
        try {
            const { data } = await supabase
                .from('campanhas')
                .select('id, nome')
                .eq('conta_de_anuncio_id', formData.conta_de_anuncio_id)
                .order('nome');
            setCampaigns(data || []);
        } catch (error) {
            console.error('Error loading campaigns:', error);
        }
    };

    const loadAdGroups = async () => {
        try {
            const data = await gruposService.buscarGruposPorCampanha(formData.campanha_id);
            setAdGroups(data || []);
        } catch (error) {
            console.error('Error loading ad groups:', error);
        }
    };

    const loadCreatives = async () => {
        try {
            const data = await criativosService.buscarCriativosPorGrupo(formData.grupo_de_anuncio_id);
            setCreatives(data || []);
        } catch (error) {
            console.error('Error loading creatives:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleToggleField = (field) => {
        setVisibleFields(prev => {
            const newState = { ...prev, [field]: !prev[field] };
            if (!newState[field]) {
                // Clear value if hidden
                setFormData(data => ({ ...data, [field]: '' }));
            }
            return newState;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await historicoService.atualizarHistorico(editingId, formData);
            } else {
                await historicoService.criarHistorico(formData);
            }
            setShowForm(false);
            setEditingId(null);
            resetForm();
            loadInitialData();
        } catch (error) {
            console.error('Error saving optimization:', error);
            alert('Erro ao salvar otimização');
        }
    };

    const handleEdit = (opt) => {
        setEditingId(opt.id);
        setFormData({
            descricao: opt.descricao,
            status: opt.status,
            tipo_alteracao: opt.tipo_alteracao,
            responsavel: opt.responsavel,
            hipotese: opt.hipotese || '',
            data_alteracao: opt.data_alteracao ? opt.data_alteracao.split('T')[0] : new Date().toISOString().split('T')[0],
            marca_id: opt.marca_id || '',
            plataforma_id: opt.plataforma_id || '',
            conta_de_anuncio_id: opt.conta_de_anuncio_id || '',
            campanha_id: opt.campanha_id || '',
            grupo_de_anuncio_id: opt.grupo_de_anuncio_id || '',
            criativo_id: opt.criativo_id || ''
        });
        setVisibleFields({
            plataforma_id: !!opt.plataforma_id,
            marca_id: !!opt.marca_id,
            campanha_id: !!opt.campanha_id,
            grupo_de_anuncio_id: !!opt.grupo_de_anuncio_id,
            criativo_id: !!opt.criativo_id
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta otimização?')) {
            try {
                await historicoService.deletarHistorico(id);
                setOptimizations(prev => prev.filter(o => o.id !== id));
            } catch (error) {
                console.error('Error deleting optimization:', error);
            }
        }
    };

    const handleView = (opt) => {
        setSelectedOptimization(opt);
        setViewModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            descricao: '',
            status: 'Pendente',
            tipo_alteracao: 'Orçamento',
            responsavel: '',
            hipotese: '',
            data_alteracao: new Date().toISOString().split('T')[0],
            marca_id: '',
            plataforma_id: '',
            conta_de_anuncio_id: '',
            campanha_id: '',
            grupo_de_anuncio_id: '',
            criativo_id: ''
        });
        setVisibleFields({
            plataforma_id: false,
            marca_id: false,
            campanha_id: false,
            grupo_de_anuncio_id: false,
            criativo_id: false
        });
    };

    return (
        <div className="page-view" style={{ display: 'block' }}>
            <div className="page-header">
                <h1>Otimizações</h1>
                <button className="btn btn-primary" onClick={() => { resetForm(); setEditingId(null); setShowForm(true); }}>
                    <Plus size={16} /> Nova Otimização
                </button>
            </div>

            {showForm && (
                <div className="optimization-form-container">
                    <div className="form-card">
                        <div className="form-header">
                            <h2>{editingId ? 'Editar Otimização' : 'Nova Otimização'}</h2>
                            <button className="close-btn" onClick={() => setShowForm(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label>Descrição *</label>
                                    <input type="text" name="descricao" value={formData.descricao} onChange={handleInputChange} required />
                                </div>

                                <div className="form-group">
                                    <label>Status</label>
                                    <select name="status" value={formData.status} onChange={handleInputChange}>
                                        <option value="Pendente">Pendente</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Concluída">Concluída</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Tipo de Alteração</label>
                                    <select name="tipo_alteracao" value={formData.tipo_alteracao} onChange={handleInputChange}>
                                        <option value="Orçamento">Orçamento</option>
                                        <option value="Bid">Bid</option>
                                        <option value="Criativo">Criativo</option>
                                        <option value="Público">Público</option>
                                        <option value="Estrutural">Estrutural</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>Responsável *</label>
                                    <input type="text" name="responsavel" value={formData.responsavel} onChange={handleInputChange} required />
                                </div>

                                <div className="form-group">
                                    <label>Data</label>
                                    <input type="date" name="data_alteracao" value={formData.data_alteracao} onChange={handleInputChange} />
                                </div>

                                <div className="form-group full-width">
                                    <label>Hipótese</label>
                                    <textarea name="hipotese" rows="2" value={formData.hipotese} onChange={handleInputChange}></textarea>
                                </div>

                                {/* Dynamic Fields Toggles */}
                                <div className="form-group full-width">
                                    <label>Vincular a:</label>
                                    <div className="toggles-container">
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={visibleFields.marca_id} onChange={() => handleToggleField('marca_id')} /> Marca
                                        </label>
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={visibleFields.plataforma_id} onChange={() => handleToggleField('plataforma_id')} /> Plataforma
                                        </label>
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={visibleFields.campanha_id} onChange={() => handleToggleField('campanha_id')} /> Campanha
                                        </label>
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={visibleFields.grupo_de_anuncio_id} onChange={() => handleToggleField('grupo_de_anuncio_id')} /> Grupo
                                        </label>
                                        <label className="checkbox-label">
                                            <input type="checkbox" checked={visibleFields.criativo_id} onChange={() => handleToggleField('criativo_id')} /> Criativo
                                        </label>
                                    </div>
                                </div>

                                {/* Dynamic Fields */}
                                {visibleFields.marca_id && (
                                    <div className="form-group">
                                        <label>Marca</label>
                                        <select name="marca_id" value={formData.marca_id} onChange={handleInputChange}>
                                            <option value="">Selecione...</option>
                                            {brands.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                                        </select>
                                    </div>
                                )}

                                {visibleFields.plataforma_id && (
                                    <div className="form-group">
                                        <label>Plataforma</label>
                                        <select name="plataforma_id" value={formData.plataforma_id} onChange={handleInputChange}>
                                            <option value="">Selecione...</option>
                                            {platforms.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                        </select>
                                    </div>
                                )}

                                {visibleFields.campanha_id && (
                                    <div className="form-group">
                                        <label>Campanha</label>
                                        <select name="campanha_id" value={formData.campanha_id} onChange={handleInputChange} disabled={!formData.conta_de_anuncio_id}>
                                            <option value="">Selecione...</option>
                                            {campaigns.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                        </select>
                                    </div>
                                )}

                                {visibleFields.grupo_de_anuncio_id && (
                                    <div className="form-group">
                                        <label>Grupo de Anúncios</label>
                                        <select name="grupo_de_anuncio_id" value={formData.grupo_de_anuncio_id} onChange={handleInputChange} disabled={!formData.campanha_id}>
                                            <option value="">Selecione...</option>
                                            {adGroups.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                                        </select>
                                    </div>
                                )}

                                {visibleFields.criativo_id && (
                                    <div className="form-group">
                                        <label>Criativo</label>
                                        <select name="criativo_id" value={formData.criativo_id} onChange={handleInputChange} disabled={!formData.grupo_de_anuncio_id}>
                                            <option value="">Selecione...</option>
                                            {creatives.map(c => <option key={c.id} value={c.id}>{c.nome || c.titulos?.[0]}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary"><Save size={16} /> Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="optimizations-list">
                {loading ? (
                    <div className="loading">Carregando otimizações...</div>
                ) : optimizations.length === 0 ? (
                    <div className="empty-state">
                        <p>Nenhuma otimização encontrada.</p>
                    </div>
                ) : (
                    optimizations.map(opt => (
                        <div key={opt.id} className={`optimization-card status-${opt.status?.toLowerCase().replace(' ', '-')}`}>
                            <div className="card-header">
                                <h4 className="card-title">{opt.descricao}</h4>
                                <div className="card-actions">
                                    <div className="actions-menu">
                                        <button className="btn-icon" onClick={() => handleView(opt)}><Eye size={16} /></button>
                                        <button className="btn-icon" onClick={() => handleEdit(opt)}><Edit size={16} /></button>
                                        <button className="btn-icon danger" onClick={() => handleDelete(opt.id)}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="card-content">
                                <div className="card-field">
                                    <span className="field-label">Status</span>
                                    <span className={`status-badge status-${opt.status?.toLowerCase().replace(' ', '-')}`}>{opt.status}</span>
                                </div>
                                <div className="card-field">
                                    <span className="field-label">Tipo</span>
                                    <span className="field-value">{opt.tipo_alteracao}</span>
                                </div>
                                <div className="card-field">
                                    <span className="field-label">Data</span>
                                    <span className="field-value">{new Date(opt.data_alteracao).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="card-field">
                                    <span className="field-label">Responsável</span>
                                    <span className="field-value">{opt.responsavel}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {viewModalOpen && selectedOptimization && (
                <div className="modal active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Detalhes da Otimização</h2>
                            <button className="close-btn" onClick={() => setViewModalOpen(false)}><X size={20} /></button>
                        </div>
                        <div className="details-grid">
                            <div className="detail-item full-width"><strong>Descrição:</strong> {selectedOptimization.descricao}</div>
                            <div className="detail-item"><strong>Status:</strong> {selectedOptimization.status}</div>
                            <div className="detail-item"><strong>Tipo:</strong> {selectedOptimization.tipo_alteracao}</div>
                            <div className="detail-item"><strong>Responsável:</strong> {selectedOptimization.responsavel}</div>
                            <div className="detail-item"><strong>Data:</strong> {new Date(selectedOptimization.data_alteracao).toLocaleDateString('pt-BR')}</div>
                            <div className="detail-item"><strong>Plataforma:</strong> {selectedOptimization.plataformas?.nome || 'N/A'}</div>
                            <div className="detail-item"><strong>Marca:</strong> {selectedOptimization.marcas?.nome || 'N/A'}</div>
                            <div className="detail-item"><strong>Campanha:</strong> {selectedOptimization.campanhas?.nome || 'N/A'}</div>
                            <div className="detail-item"><strong>Grupo:</strong> {selectedOptimization.grupos_de_anuncios?.nome || 'N/A'}</div>
                            <div className="detail-item"><strong>Criativo:</strong> {selectedOptimization.criativos?.titulos?.[0] || 'N/A'}</div>
                            <div className="detail-item full-width"><strong>Hipótese:</strong> {selectedOptimization.hipotese || 'N/A'}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Optimizations;
