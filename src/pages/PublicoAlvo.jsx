import React, { useState, useEffect } from 'react';
import { Download, Eye, Edit, Plus, X, CheckCircle, Trash2, Save, MoreVertical, Lightbulb, Target, Clock, MessageCircle, RefreshCw, FileSpreadsheet, FileText } from 'lucide-react';
import Preloader from '../components/Preloader';
import { useToast } from '../contexts/ToastContext';
import { buscarMarcas, atualizarMarca } from '../services-apis/supabase/configService';
import {
    buscarTodasAudiencias,
    criarAudiencia,
    atualizarAudiencia,
    deletarAudiencia
} from '../services-apis/supabase/audienciasService';
import { buscarTodosModelos } from '../services-apis/supabase/modelosService';

const PublicoAlvo = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);

    // Data State
    const [brands, setBrands] = useState([]);
    const [audiences, setAudiences] = useState([]);
    const [models, setModels] = useState([]);

    // Modal State
    // We will use a single "Edit Sidemenu" state to match the reference architecture more closely
    // or just ensure we render the correct IDs.
    const [editSidemenu, setEditSidemenu] = useState({
        isOpen: false,
        type: null, // 'profile' or 'audience'
        action: null, // 'new' or 'edit'
        data: null // brand or audience object
    });

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isProfileDetailsOpen, setIsProfileDetailsOpen] = useState(false);

    // Selection State
    const [selectedBrand, setSelectedBrand] = useState(null);
    const [selectedAudience, setSelectedAudience] = useState(null); // For edit/delete/details
    const [formData, setFormData] = useState({}); // Shared form state
    const [openMenuId, setOpenMenuId] = useState(null); // Menu state
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

    // Click outside handler for menus
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.actions-menu')) {
                if (openMenuId) setOpenMenuId(null);
                if (isExportMenuOpen) setIsExportMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId, isExportMenuOpen]);

    const toggleMenu = (id) => {
        setOpenMenuId(openMenuId === id ? null : id);
    };

    // Load Data
    const loadData = async () => {
        setLoading(true);
        try {
            const [brandsData, audiencesData, modelsData] = await Promise.all([
                buscarMarcas(),
                buscarTodasAudiencias(),
                buscarTodosModelos()
            ]);
            setBrands(brandsData || []);
            setAudiences(audiencesData || []);
            setModels(modelsData || []);
        } catch (error) {
            console.error("Error loading data:", error);
            addToast("Erro ao carregar dados", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Handlers - Profile
    const handleEditProfileClick = (brand) => {
        setSelectedBrand(brand);
        setFormData({
            nome_perfil: brand.nome_perfil || '',
            descricao: brand.descricao || '',
            faixa_etaria: brand.faixa_etaria || '',
            genero: brand.genero || '',
            localizacao: brand.localizacao || '',
            interesses: Array.isArray(brand.interesses) ? brand.interesses.join(', ') : brand.interesses || '',
            comportamentos: Array.isArray(brand.comportamentos) ? brand.comportamentos.join(', ') : brand.comportamentos || ''
        });
        setEditSidemenu({ isOpen: true, type: 'profile', action: 'edit', data: brand });
    };

    const handleViewProfileDetails = (brand) => {
        setSelectedBrand(brand);
        setIsProfileDetailsOpen(true);
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!selectedBrand) return;

        // Prepare arrays
        const payload = {
            ...formData,
            interesses: formData.interesses.split(',').map(s => s.trim()).filter(Boolean),
            comportamentos: formData.comportamentos.split(',').map(s => s.trim()).filter(Boolean)
        };

        try {
            await atualizarMarca(selectedBrand.id, payload);
            addToast("Perfil da marca atualizado!", "success");
            setEditSidemenu({ ...editSidemenu, isOpen: false });
            loadData();
        } catch (error) {
            addToast("Erro ao atualizar perfil", "error");
        }
    };

    // Handlers - Audience
    const handleAddAudienceClick = (brandId) => {
        const brand = brands.find(b => b.id === brandId);
        setSelectedBrand(brand);
        setSelectedAudience(null); // New audience
        setFormData({
            modelo_id: '',
            nome_perfil: '', // Segmento
            faixa_etaria: '',
            genero: '',
            descricao: '',
            localizacao: '',
            interesses: '',
            comportamentos: ''
        });
        setEditSidemenu({ isOpen: true, type: 'audience', action: 'new', data: null });
    };

    const handleEditAudienceClick = (audience) => {
        setSelectedAudience(audience);
        // Find brand for this audience
        const brand = brands.find(b => b.id === audience.modelos?.marca_id);
        setSelectedBrand(brand);

        setFormData({
            modelo_id: audience.modelo_id,
            nome_perfil: audience.nome_perfil || '',
            faixa_etaria: audience.faixa_etaria || '',
            genero: audience.genero || '',
            descricao: audience.descricao || '',
            localizacao: audience.localizacao || '',
            interesses: Array.isArray(audience.interesses) ? audience.interesses.join(', ') : audience.interesses || '',
            comportamentos: Array.isArray(audience.comportamentos) ? audience.comportamentos.join(', ') : audience.comportamentos || ''
        });
        setEditSidemenu({ isOpen: true, type: 'audience', action: 'edit', data: audience });
    };

    const handleSaveAudience = async (e) => {
        e.preventDefault();

        // Prepare arrays
        const payload = {
            ...formData,
            interesses: formData.interesses.split(',').map(s => s.trim()).filter(Boolean),
            comportamentos: formData.comportamentos.split(',').map(s => s.trim()).filter(Boolean)
        };

        try {
            if (editSidemenu.action === 'edit' && selectedAudience) {
                await atualizarAudiencia(selectedAudience.id, payload);
                addToast("Público-alvo atualizado!", "success");
            } else {
                await criarAudiencia(payload);
                addToast("Público-alvo criado!", "success");
            }
            setEditSidemenu({ ...editSidemenu, isOpen: false });
            loadData();
        } catch (error) {
            addToast("Erro ao salvar público-alvo", "error");
        }
    };

    const handleDeleteAudienceClick = (audience) => {
        setSelectedAudience(audience);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!selectedAudience) return;
        try {
            await deletarAudiencia(selectedAudience.id);
            addToast("Público-alvo excluído!", "success");
            setIsDeleteModalOpen(false);
            loadData();
        } catch (error) {
            addToast("Erro ao excluir", "error");
        }
    };

    const handleViewDetails = (audience) => {
        setSelectedAudience(audience);
        setIsDetailsOpen(true);
    };

    if (loading) {
        return <Preloader message="Carregando públicos..." />;
    }


    const handleExportCSV = () => {
        try {
            // Headers
            const headers = ['Marca', 'Modelo', 'Nome do Perfil', 'Faixa Etária', 'Gênero', 'Localização', 'Interesses', 'Comportamentos', 'Descrição'];
            const rows = [];

            brands.forEach(brand => {
                const brandAudiences = audiences.filter(a => a.modelos?.marca_id === brand.id);
                if (brandAudiences.length === 0) return;

                brandAudiences.forEach(audience => {
                    const formatField = (field) => {
                        if (Array.isArray(field)) return field.join(', ');
                        if (!field) return '';
                        if (typeof field === 'object') return JSON.stringify(field);
                        return String(field);
                    };

                    rows.push([
                        brand.nome,
                        audience.modelos?.nome || 'N/A',
                        audience.nome_perfil,
                        audience.faixa_etaria,
                        audience.genero,
                        audience.localizacao,
                        `"${formatField(audience.interesses).replace(/"/g, '""')}"`,
                        `"${formatField(audience.comportamentos).replace(/"/g, '""')}"`,
                        `"${formatField(audience.descricao).replace(/"/g, '""')}"`
                    ]);
                });
            });

            const csvString = headers.join(',') + "\n" + rows.map(e => e.join(',')).join("\n");
            // Add BOM for Excel utf-8 compatibility
            // Fix MIME type and Blob creation
            const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.style.display = 'none';
            link.href = url;
            link.setAttribute('download', 'publico_alvo_estrategico.csv');
            document.body.appendChild(link);

            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 200);

            setIsExportMenuOpen(false);
            addToast("Exportação CSV concluída!", "success");
        } catch (error) {
            console.error("Erro ao exportar CSV:", error);
            addToast("Erro ao exportar CSV. Verifique o console.", "error");
        }
    };

    const handleExportDoc = () => {
        try {
            const formatField = (field) => {
                if (Array.isArray(field)) return field.join(', ');
                if (!field) return '-';
                if (typeof field === 'object') return JSON.stringify(field);
                return String(field);
            };

            let htmlContent = `
                <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                <head>
                    <meta charset="UTF-8">
                    <title>Relatório de Estratégia de Público-Alvo</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        h1 { color: #2563EB; border-bottom: 2px solid #2563EB; padding-bottom: 10px; }
                        h2 { color: #1E40AF; margin-top: 30px; background-color: #f3f4f6; padding: 10px; border-radius: 4px; }
                        h3 { color: #4B5563; margin-top: 20px; }
                        .brand-profile { margin-bottom: 20px; padding: 15px; border-left: 4px solid #1E40AF; background: #fff; }
                        .audience-card { margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
                        .tag { display: inline-block; background: #e5e7eb; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-right: 5px; }
                        strong { color: #374151; }
                    </style>
                </head>
                <body>
                    <h1>Relatório de Estratégia de Público-Alvo</h1>
                    <p>Gerado em: ${new Date().toLocaleDateString()}</p>
            `;

            brands.forEach(brand => {
                htmlContent += `
                    <h2>${brand.nome}</h2>
                    <div class="brand-profile">
                        <h3>Perfil da Marca: ${brand.nome_perfil || 'Geral'}</h3>
                        <p><strong>Descrição:</strong> ${brand.descricao || 'N/A'}</p>
                        <p><strong>Demografia:</strong> ${brand.faixa_etaria} | ${brand.genero} | ${brand.localizacao}</p>
                    </div>
                    <h3>Públicos por Modelo</h3>
                `;

                const brandAudiences = audiences.filter(a => a.modelos?.marca_id === brand.id);
                if (brandAudiences.length === 0) {
                    htmlContent += `<p><em>Nenhum público específico cadastrado para modelos desta marca.</em></p>`;
                } else {
                    brandAudiences.forEach(audience => {
                        htmlContent += `
                            <div class="audience-card">
                                <h4>Modelo: ${audience.modelos?.nome}</h4>
                                <p><strong>Segmento:</strong> ${audience.nome_perfil}</p>
                                <p><strong>Demografia:</strong> ${audience.faixa_etaria} | ${audience.genero} | ${audience.localizacao}</p>
                                <p><strong>Interesses:</strong> ${formatField(audience.interesses)}</p>
                                <p><strong>Comportamentos:</strong> ${formatField(audience.comportamentos)}</p>
                                <p><strong>Obs:</strong> ${audience.descricao || '-'}</p>
                            </div>
                        `;
                    });
                }
            });

            htmlContent += `</body></html>`;

            // Fix MIME type: application/msword is safer for .doc
            const blob = new Blob(['\ufeff', htmlContent], {
                type: 'application/msword'
            });

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.style.display = 'none';
            link.href = url;
            link.setAttribute('download', 'relatorio_estrategia_publico.doc');
            document.body.appendChild(link);

            link.click();

            // Cleanup
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 200);

            setIsExportMenuOpen(false);
            addToast("Relatório (Doc) gerado com sucesso!", "success");
        } catch (error) {
            console.error("Erro ao exportar Doc:", error);
            addToast("Erro ao exportar relatório. Verifique o console.", "error");
        }
    };

    return (
        <div id="view-publico-alvo" className="page-view">
            <div className="page-header">
                <h1>Público-Alvo</h1>
                <div className="page-actions">
                    <div className="actions-menu" style={{ position: 'relative' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        >
                            <Download size={16} style={{ marginRight: '8px' }} />
                            Exportar Dados
                        </button>
                        {isExportMenuOpen && (
                            <div className="actions-dropdown active" style={{ top: '100%', right: 0, marginTop: '5px', width: '220px' }}>
                                <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px' }}>
                                    <FileSpreadsheet size={18} style={{ color: '#2563EB' }} />
                                    <span>Exportar Planilha (CSV)</span>
                                </button>
                                <button onClick={handleExportDoc} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 15px' }}>
                                    <FileText size={18} style={{ color: '#2563EB' }} />
                                    <span>Exportar Relatório (Doc)</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {brands.map(brand => {
                // Filter audiences for this brand
                // Audience -> Model -> Brand
                const brandAudiences = audiences.filter(a => a.modelos?.marca_id === brand.id);
                const brandModels = models.filter(m => m.marca_id === brand.id);

                // Prepare summary card data
                const interesses = Array.isArray(brand.interesses) ? brand.interesses.slice(0, 2).join(', ') : (brand.interesses || 'Não definido');
                const comportamentos = Array.isArray(brand.comportamentos) ? brand.comportamentos.slice(0, 2).join(', ') : (brand.comportamentos || 'Não definido');

                return (
                    <section key={brand.id} className="brand-section">
                        <div className="section-header">
                            <h2>{brand.nome}</h2>
                        </div>

                        {/* Profile Box */}
                        <div className="profile-box">
                            <div className="profile-header">
                                <h3>Perfil do Cliente {brand.nome}</h3>
                                <div className="profile-actions">
                                    <button className="btn btn-sm btn-secondary" onClick={() => handleViewProfileDetails(brand)} style={{ marginRight: '8px' }}>
                                        <Eye size={16} style={{ marginRight: '8px' }} />
                                        Ver Detalhes
                                    </button>
                                    <button className="btn btn-sm btn-primary" onClick={() => handleEditProfileClick(brand)}>
                                        <Edit size={16} style={{ marginRight: '8px' }} />
                                        Editar
                                    </button>
                                </div>
                            </div>

                            <div className="summary-cards">
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
                        </div>

                        {/* Models Table */}
                        <div className="models-table-container">
                            <div className="table-header">
                                <h3>Modelos {brand.nome}</h3>
                                <button className="btn btn-sm btn-primary" onClick={() => handleAddAudienceClick(brand.id)}>
                                    <Plus size={16} style={{ marginRight: '8px' }} />
                                    Adicionar Público-Alvo
                                </button>
                            </div>

                            <table className="models-table">
                                <thead>
                                    <tr>
                                        <th>Modelo</th>
                                        <th>Segmento</th>
                                        <th>Faixa de Idade</th>
                                        <th>Gênero</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {brandAudiences.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="empty-state">Nenhum público-alvo cadastrado.</td>
                                        </tr>
                                    ) : (
                                        brandAudiences.map((audience, index) => {
                                            const isLastItem = index === brandAudiences.length - 1;
                                            return (
                                                <tr key={audience.id} onClick={() => handleViewDetails(audience)}>
                                                    <td>{audience.modelos?.nome || '-'}</td>
                                                    <td>{audience.nome_perfil}</td>
                                                    <td>{audience.faixa_etaria}</td>
                                                    <td>{audience.genero}</td>
                                                    <td onClick={e => e.stopPropagation()}>
                                                        <div className="actions-menu">
                                                            <button className="btn-icon actions-trigger" onClick={() => toggleMenu(audience.id)}>
                                                                <MoreVertical size={18} />
                                                            </button>
                                                            <div className={`actions-dropdown ${openMenuId === audience.id ? 'active' : ''} ${isLastItem ? 'upwards' : ''}`}>
                                                                <button onClick={() => {
                                                                    handleViewDetails(audience);
                                                                    setOpenMenuId(null);
                                                                }}>
                                                                    <Eye size={16} /> Visualizar
                                                                </button>
                                                                <button onClick={() => {
                                                                    handleEditAudienceClick(audience);
                                                                    setOpenMenuId(null);
                                                                }}>
                                                                    <Edit size={16} /> Editar
                                                                </button>
                                                                <button className="danger" onClick={() => {
                                                                    handleDeleteAudienceClick(audience);
                                                                    setOpenMenuId(null);
                                                                }}>
                                                                    <Trash2 size={16} /> Deletar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}

            {/* Seção de Recomendações */}
            <section className="recommendations-section" style={{ marginTop: '2rem' }}>
                <div className="section-header">
                    <h2>Recomendações Estratégicas</h2>
                </div>

                <div className="recommendations-content">
                    <div className="recommendations-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="recommendation-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                            <div style={{ color: '#2563EB', minWidth: '24px' }}><Lightbulb size={24} /></div>
                            <span>Segmentar campanhas por faixa etária para otimizar o targeting de cada modelo</span>
                        </div>
                        <div className="recommendation-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                            <div style={{ color: '#2563EB', minWidth: '24px' }}><Target size={24} /></div>
                            <span>Criar conteúdos específicos para diferentes perfis de comportamento de compra</span>
                        </div>
                        <div className="recommendation-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                            <div style={{ color: '#2563EB', minWidth: '24px' }}><Clock size={24} /></div>
                            <span>Ajustar horários de veiculação baseado nos momentos de maior engajamento</span>
                        </div>
                        <div className="recommendation-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                            <div style={{ color: '#2563EB', minWidth: '24px' }}><MessageCircle size={24} /></div>
                            <span>Personalizar mensagens por gênero e interesses específicos de cada marca</span>
                        </div>
                        <div className="recommendation-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #eee' }}>
                            <div style={{ color: '#2563EB', minWidth: '24px' }}><RefreshCw size={24} /></div>
                            <span>Implementar estratégias de retargeting baseadas no funil de vendas</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Edit Sidemenu (Shared for Profile and Audience) */}
            {editSidemenu.isOpen && (
                <div id="edit-overlay" className="details-overlay active" onClick={() => setEditSidemenu({ ...editSidemenu, isOpen: false })}>
                    <div id="edit-sidemenu" className="details-sidemenu active" onClick={e => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                        {/* Header - Fixed */}
                        <div className="details-header" style={{ flexShrink: 0 }}>
                            <h2>
                                {editSidemenu.type === 'profile'
                                    ? `Editar Perfil da Marca - ${selectedBrand?.nome}`
                                    : (editSidemenu.action === 'new' ? 'Novo Público-Alvo' : 'Editar Público-Alvo')}
                            </h2>
                            <button className="btn-icon" onClick={() => setEditSidemenu({ ...editSidemenu, isOpen: false })}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Wrapper - Flexible */}
                        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <form onSubmit={editSidemenu.type === 'profile' ? handleSaveProfile : handleSaveAudience} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

                                {/* Scrollable Form Body */}
                                <div id="edit-form-fields" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                                    {editSidemenu.type === 'profile' ? (
                                        // Profile Form Fields
                                        <>
                                            <div className="form-group">
                                                <label>Nome do Perfil</label>
                                                <input
                                                    type="text"
                                                    value={formData.nome_perfil}
                                                    onChange={e => setFormData({ ...formData, nome_perfil: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Descrição</label>
                                                <textarea
                                                    rows="4"
                                                    value={formData.descricao}
                                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                                ></textarea>
                                            </div>
                                            <div className="form-group">
                                                <label>Faixa Etária</label>
                                                <input
                                                    type="text"
                                                    value={formData.faixa_etaria}
                                                    onChange={e => setFormData({ ...formData, faixa_etaria: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Gênero</label>
                                                <select
                                                    value={formData.genero}
                                                    onChange={e => setFormData({ ...formData, genero: e.target.value })}
                                                >
                                                    <option value="Todos">Todos</option>
                                                    <option value="Masculino">Masculino</option>
                                                    <option value="Feminino">Feminino</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Localização</label>
                                                <input
                                                    type="text"
                                                    value={formData.localizacao}
                                                    onChange={e => setFormData({ ...formData, localizacao: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Interesses (separados por vírgula)</label>
                                                <textarea
                                                    rows="3"
                                                    value={formData.interesses}
                                                    onChange={e => setFormData({ ...formData, interesses: e.target.value })}
                                                ></textarea>
                                            </div>
                                            <div className="form-group">
                                                <label>Comportamentos (separados por vírgula)</label>
                                                <textarea
                                                    rows="3"
                                                    value={formData.comportamentos}
                                                    onChange={e => setFormData({ ...formData, comportamentos: e.target.value })}
                                                ></textarea>
                                            </div>
                                        </>
                                    ) : (
                                        // Audience Form Fields
                                        <>
                                            <div className="form-group">
                                                <label>Modelo</label>
                                                <select
                                                    value={formData.modelo_id}
                                                    onChange={e => setFormData({ ...formData, modelo_id: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Selecione um modelo</option>
                                                    {models
                                                        .filter(m => selectedBrand ? m.marca_id === selectedBrand.id : true)
                                                        .map(m => (
                                                            <option key={m.id} value={m.id}>{m.nome}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label>Segmento (Nome do Perfil)</label>
                                                <input
                                                    type="text"
                                                    value={formData.nome_perfil}
                                                    onChange={e => setFormData({ ...formData, nome_perfil: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label>Faixa Etária</label>
                                                    <input
                                                        type="text"
                                                        value={formData.faixa_etaria}
                                                        onChange={e => setFormData({ ...formData, faixa_etaria: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="form-group" style={{ flex: 1 }}>
                                                    <label>Gênero</label>
                                                    <select
                                                        value={formData.genero}
                                                        onChange={e => setFormData({ ...formData, genero: e.target.value })}
                                                        required
                                                    >
                                                        <option value="Todos">Todos</option>
                                                        <option value="Masculino">Masculino</option>
                                                        <option value="Feminino">Feminino</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label>Localização</label>
                                                <input
                                                    type="text"
                                                    value={formData.localizacao}
                                                    onChange={e => setFormData({ ...formData, localizacao: e.target.value })}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Interesses (separados por vírgula)</label>
                                                <textarea
                                                    rows="2"
                                                    value={formData.interesses}
                                                    onChange={e => setFormData({ ...formData, interesses: e.target.value })}
                                                ></textarea>
                                            </div>
                                            <div className="form-group">
                                                <label>Comportamentos (separados por vírgula)</label>
                                                <textarea
                                                    rows="2"
                                                    value={formData.comportamentos}
                                                    onChange={e => setFormData({ ...formData, comportamentos: e.target.value })}
                                                ></textarea>
                                            </div>
                                            <div className="form-group">
                                                <label>Descrição Adicional</label>
                                                <textarea
                                                    rows="3"
                                                    value={formData.descricao}
                                                    onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                                ></textarea>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Fixed Footer Actions */}
                                <div className="form-actions" style={{
                                    flexShrink: 0,
                                    marginTop: 'auto',
                                    borderTop: '1px solid #eee',
                                    padding: '1rem 1.5rem',
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    gap: '1rem',
                                    backgroundColor: '#fff'
                                }}>
                                    <button type="button" className="btn btn-secondary" onClick={() => setEditSidemenu({ ...editSidemenu, isOpen: false })}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Salvar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {isDeleteModalOpen && (
                <div className="modal is-active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Confirmar Exclusão</h2>
                            <button className="close-btn" onClick={() => setIsDeleteModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <p>Tem certeza que deseja excluir este público-alvo? Esta ação não pode ser desfeita.</p>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
                            <button type="button" className="btn btn-danger" onClick={handleDeleteConfirm}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Details Sidemenu */}
            {isProfileDetailsOpen && selectedBrand && (
                <div id="details-overlay" className="details-overlay active" onClick={() => setIsProfileDetailsOpen(false)}>
                    <div id="details-sidemenu" className="details-sidemenu active" onClick={e => e.stopPropagation()}>
                        <div className="details-header">
                            <h3>{selectedBrand.nome_perfil || 'Perfil da Marca'} - Detalhes</h3>
                            <button className="btn-icon" onClick={() => setIsProfileDetailsOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="details-content">
                            <div className="detail-item">
                                <label>Marca</label>
                                <p>{selectedBrand.nome}</p>
                            </div>
                            <div className="detail-item">
                                <label>Nome do Perfil</label>
                                <p className="detail-value primary">{selectedBrand.nome_perfil}</p>
                            </div>
                            <div className="detail-item">
                                <label>Descrição Completa</label>
                                <p>{selectedBrand.descricao}</p>
                            </div>

                            <div className="detail-section" style={{ marginTop: '2rem' }}>
                                <h4>Demografia</h4>
                                <div className="detail-item">
                                    <label>Faixa Etária</label>
                                    <p>{selectedBrand.faixa_etaria}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Gênero</label>
                                    <p>{selectedBrand.genero}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Localização</label>
                                    <p>{selectedBrand.localizacao}</p>
                                </div>
                            </div>

                            <div className="detail-section">
                                <h4>Interesses Completos</h4>
                                <p className="detail-value">{Array.isArray(selectedBrand.interesses) ? selectedBrand.interesses.join(', ') : selectedBrand.interesses}</p>
                            </div>

                            <div className="detail-section">
                                <h4>Comportamentos Completos</h4>
                                <p className="detail-value">{Array.isArray(selectedBrand.comportamentos) ? selectedBrand.comportamentos.join(', ') : selectedBrand.comportamentos}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Audience Details Overlay */}
            {isDetailsOpen && selectedAudience && (
                <div id="details-overlay" className="details-overlay active" onClick={() => setIsDetailsOpen(false)}>
                    <div id="details-sidemenu" className="details-sidemenu active" onClick={e => e.stopPropagation()}>
                        <div className="details-header">
                            <h3>Detalhes do Público-Alvo</h3>
                            <button className="btn-icon" onClick={() => setIsDetailsOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="details-content">
                            <div className="detail-item">
                                <label>Modelo</label>
                                <p className="detail-value primary">{selectedAudience.modelos?.nome}</p>
                            </div>
                            <div className="detail-item">
                                <label>Segmento</label>
                                <p>{selectedAudience.nome_perfil}</p>
                            </div>
                            <div className="detail-item">
                                <label>Faixa Etária</label>
                                <p>{selectedAudience.faixa_etaria}</p>
                            </div>
                            <div className="detail-item">
                                <label>Gênero</label>
                                <p>{selectedAudience.genero}</p>
                            </div>
                            <div className="detail-item">
                                <label>Localização</label>
                                <p>{selectedAudience.localizacao}</p>
                            </div>
                            <div className="detail-item">
                                <label>Interesses</label>
                                <div className="tags">
                                    {selectedAudience.interesses && selectedAudience.interesses.map((tag, i) => (
                                        <span key={i} className="tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="detail-item">
                                <label>Comportamentos</label>
                                <div className="tags">
                                    {selectedAudience.comportamentos && selectedAudience.comportamentos.map((tag, i) => (
                                        <span key={i} className="tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="detail-item">
                                <label>Descrição</label>
                                <p>{selectedAudience.descricao}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PublicoAlvo;
