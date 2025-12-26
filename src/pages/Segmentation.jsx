import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Users, X } from 'lucide-react';
import * as publicoService from '../services-apis/supabase/publicoPersonalizadoService';

const Segmentation = () => {
    const [audiences, setAudiences] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editingAudience, setEditingAudience] = useState(null);
    const [formData, setFormData] = useState({
        nome: '',
        descricao: '',
        tipo: 'Interesse', // Default type
        tamanho_estimado: ''
    });

    useEffect(() => {
        loadAudiences();
    }, []);

    const loadAudiences = async () => {
        setLoading(true);
        try {
            const data = await publicoService.buscarTodosPublicos();
            setAudiences(data || []);
        } catch (error) {
            console.error('Error loading audiences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAudience) {
                await publicoService.atualizarPublico(editingAudience.id, formData);
            } else {
                await publicoService.criarPublico(formData);
            }
            setShowModal(false);
            setEditingAudience(null);
            resetForm();
            loadAudiences();
        } catch (error) {
            console.error('Error saving audience:', error);
            alert('Erro ao salvar público');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir este público?')) {
            try {
                await publicoService.deletarPublico(id);
                setAudiences(prev => prev.filter(a => a.id !== id));
            } catch (error) {
                console.error('Error deleting audience:', error);
            }
        }
    };

    const handleEdit = (audience) => {
        setEditingAudience(audience);
        setFormData({
            nome: audience.nome || '',
            descricao: audience.descricao || '',
            tipo: audience.tipo || 'Interesse',
            tamanho_estimado: audience.tamanho_estimado || ''
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            nome: '',
            descricao: '',
            tipo: 'Interesse',
            tamanho_estimado: ''
        });
    };

    const filteredAudiences = audiences.filter(audience =>
        audience.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        audience.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="page-view" style={{ display: 'block' }}>
            <div className="page-header">
                <h1>Segmentação</h1>
                <button className="btn btn-primary" onClick={() => { resetForm(); setEditingAudience(null); setShowModal(true); }}>
                    <Plus size={16} /> Novo Público
                </button>
            </div>

            <div className="filters-bar">
                <div className="search-input-wrapper" style={{ width: '100%', maxWidth: '400px' }}>
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Buscar públicos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="content-body">
                {loading ? (
                    <div className="loading">Carregando segmentações...</div>
                ) : filteredAudiences.length === 0 ? (
                    <div className="empty-state">
                        <Users size={48} className="text-muted" />
                        <p>Nenhum público de segmentação encontrado.</p>
                    </div>
                ) : (
                    <div className="grid-cards">
                        {filteredAudiences.map(audience => (
                            <div key={audience.id} className="card">
                                <div className="card-header">
                                    <h3 className="card-title">{audience.nome}</h3>
                                    <div className="card-actions">
                                        <button className="btn-icon" onClick={() => handleEdit(audience)}>
                                            <Edit size={16} />
                                        </button>
                                        <button className="btn-icon danger" onClick={() => handleDelete(audience.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <p className="text-sm text-muted">{audience.descricao || 'Sem descrição'}</p>
                                    <div className="tags mt-2">
                                        <span className="tag">{audience.tipo || 'Geral'}</span>
                                        {audience.tamanho_estimado && (
                                            <span className="tag secondary">{audience.tamanho_estimado} pessoas</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{editingAudience ? 'Editar Público' : 'Novo Público'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nome *</label>
                                <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} required />
                            </div>
                            <div className="form-group">
                                <label>Descrição</label>
                                <textarea name="descricao" value={formData.descricao} onChange={handleInputChange} rows="3"></textarea>
                            </div>
                            <div className="form-group">
                                <label>Tipo</label>
                                <select name="tipo" value={formData.tipo} onChange={handleInputChange}>
                                    <option value="Interesse">Interesse</option>
                                    <option value="Lookalike">Lookalike (Semelhante)</option>
                                    <option value="Customizado">Customizado (Lista)</option>
                                    <option value="Geográfico">Geográfico</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Tamanho Estimado</label>
                                <input type="text" name="tamanho_estimado" value={formData.tamanho_estimado} onChange={handleInputChange} placeholder="Ex: 1.000 - 5.000" />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Segmentation;
