import React, { useState, useEffect } from 'react';
import { Folder, Image, ChevronRight, Plus, Save, ArrowLeft, Trash2 } from 'lucide-react';
import { supabase } from '../../services-apis/supabase/client';
import * as campanhasService from '../../services-apis/supabase/campanhasService';
import * as gruposService from '../../services-apis/supabase/gruposDeAnunciosService';
import * as criativosService from '../../services-apis/supabase/criativosService';

const CampaignEditor = ({ campaignId, onSave, onCancel, brands, platforms, models, accounts }) => {
    const [campaignData, setCampaignData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null); // { type: 'campaign'|'ad_group'|'creative', id: string, groupId?: string }
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        loadCampaignData();
    }, [campaignId]);

    const loadCampaignData = async () => {
        setLoading(true);
        try {
            if (campaignId === 'new') {
                const newCampaign = {
                    id: 'new',
                    nome: 'Nova Campanha',
                    status: 'active',
                    marca_id: '',
                    plataforma_id: '',
                    conta_de_anuncio_id: '',
                    ad_groups: []
                };
                setCampaignData(newCampaign);
                setSelectedItem({ type: 'campaign', id: 'new' });
            } else {
                // Load full campaign hierarchy
                const campaign = await campanhasService.buscarCampanhaPorId(campaignId);
                const adGroups = await gruposService.buscarGruposPorCampanha(campaignId);

                // Load creatives for each group
                const groupsWithCreatives = await Promise.all(adGroups.map(async (group) => {
                    const creatives = await criativosService.buscarCriativosPorGrupo(group.id);
                    return { ...group, creatives: creatives || [] };
                }));

                setCampaignData({
                    ...campaign,
                    ad_groups: groupsWithCreatives
                });
                setSelectedItem({ type: 'campaign', id: campaign.id });
            }
        } catch (error) {
            console.error('Error loading campaign:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = (type, parentId) => {
        if (type === 'ad_group') {
            const newGroup = {
                id: `new_group_${Date.now()}`,
                nome: 'Novo Grupo de Anúncios',
                status: 'active',
                creatives: []
            };
            setCampaignData(prev => ({
                ...prev,
                ad_groups: [...prev.ad_groups, newGroup]
            }));
            setSelectedItem({ type: 'ad_group', id: newGroup.id });
        } else if (type === 'creative') {
            const newCreative = {
                id: `new_creative_${Date.now()}`,
                nome: 'Novo Criativo',
                status: 'active',
                tipo: 'image'
            };
            setCampaignData(prev => ({
                ...prev,
                ad_groups: prev.ad_groups.map(g => {
                    if (g.id === parentId) {
                        return { ...g, creatives: [...g.creatives, newCreative] };
                    }
                    return g;
                })
            }));
            setSelectedItem({ type: 'creative', id: newCreative.id, groupId: parentId });
            setExpandedGroups(prev => ({ ...prev, [parentId]: true }));
        }
    };

    const handleUpdateItem = (field, value) => {
        if (!selectedItem) return;

        if (selectedItem.type === 'campaign') {
            setCampaignData(prev => ({ ...prev, [field]: value }));
        } else if (selectedItem.type === 'ad_group') {
            setCampaignData(prev => ({
                ...prev,
                ad_groups: prev.ad_groups.map(g =>
                    g.id === selectedItem.id ? { ...g, [field]: value } : g
                )
            }));
        } else if (selectedItem.type === 'creative') {
            setCampaignData(prev => ({
                ...prev,
                ad_groups: prev.ad_groups.map(g =>
                    g.id === selectedItem.groupId ? {
                        ...g,
                        creatives: g.creatives.map(c =>
                            c.id === selectedItem.id ? { ...c, [field]: value } : c
                        )
                    } : g
                )
            }));
        }
    };

    const handleSaveCampaign = async () => {
        try {
            setLoading(true);

            // 1. Save Campaign
            let savedCampaignId = campaignData.id;
            const campaignPayload = {
                nome: campaignData.nome,
                marca_id: campaignData.marca_id,
                plataforma_id: campaignData.plataforma_id,
                conta_de_anuncio_id: campaignData.conta_de_anuncio_id,
                modelo_id: campaignData.modelo_id,
                status: campaignData.status
            };

            if (campaignData.id === 'new') {
                const saved = await campanhasService.criarCampanha(campaignPayload);
                savedCampaignId = saved.id;
            } else {
                await campanhasService.atualizarCampanha(campaignData.id, campaignPayload);
            }

            // 2. Save Ad Groups
            for (const group of campaignData.ad_groups) {
                let savedGroupId = group.id;
                const groupPayload = {
                    nome: group.nome,
                    status: group.status,
                    orcamento_diario: group.orcamento_diario,
                    campanha_id: savedCampaignId
                };

                if (String(group.id).startsWith('new_')) {
                    const saved = await gruposService.criarGrupoDeAnuncio(groupPayload);
                    savedGroupId = saved.id;
                } else {
                    await gruposService.atualizarGrupoDeAnuncio(group.id, groupPayload);
                }

                // 3. Save Creatives
                for (const creative of group.creatives) {
                    const creativePayload = {
                        nome: creative.nome,
                        status: creative.status,
                        tipo: creative.tipo,
                        url_imagem: creative.url_imagem,
                        grupo_de_anuncio_id: savedGroupId
                    };

                    if (String(creative.id).startsWith('new_')) {
                        await criativosService.criarCriativo(creativePayload);
                    } else {
                        await criativosService.atualizarCriativo(creative.id, creativePayload);
                    }
                }
            }

            onSave();
        } catch (error) {
            console.error('Error saving campaign:', error);
            alert('Erro ao salvar campanha');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !campaignData) return <div className="loading">Carregando editor...</div>;

    return (
        <div className="campaign-editor">
            <div className="editor-header">
                <div className="left">
                    <button className="btn-icon" onClick={onCancel}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2>{campaignData.nome || 'Nova Campanha'}</h2>
                </div>
                <div className="right">
                    <button className="btn btn-primary" onClick={handleSaveCampaign} disabled={loading}>
                        <Save size={16} />
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>

            <div className="editor-body">
                {/* Sidebar Navigation */}
                <div className="editor-sidebar">
                    <div
                        className={`nav-item ${selectedItem?.type === 'campaign' ? 'active' : ''}`}
                        onClick={() => setSelectedItem({ type: 'campaign', id: campaignData.id })}
                    >
                        <Folder size={16} />
                        <span>{campaignData.nome || 'Nova Campanha'}</span>
                        <button className="btn-icon-mini" onClick={(e) => { e.stopPropagation(); handleAddItem('ad_group'); }}>
                            <Plus size={14} />
                        </button>
                    </div>

                    <div className="nav-groups">
                        {campaignData.ad_groups.map(group => (
                            <div key={group.id} className="nav-group-wrapper">
                                <div
                                    className={`nav-item ${selectedItem?.type === 'ad_group' && selectedItem.id === group.id ? 'active' : ''}`}
                                    onClick={() => setSelectedItem({ type: 'ad_group', id: group.id })}
                                >
                                    <ChevronRight
                                        size={14}
                                        className={`expand-icon ${expandedGroups[group.id] ? 'expanded' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedGroups(prev => ({ ...prev, [group.id]: !prev[group.id] }));
                                        }}
                                    />
                                    <Folder size={16} />
                                    <span>{group.nome}</span>
                                    <button className="btn-icon-mini" onClick={(e) => { e.stopPropagation(); handleAddItem('creative', group.id); }}>
                                        <Plus size={14} />
                                    </button>
                                </div>

                                {expandedGroups[group.id] && (
                                    <div className="nav-creatives">
                                        {group.creatives.map(creative => (
                                            <div
                                                key={creative.id}
                                                className={`nav-item ${selectedItem?.type === 'creative' && selectedItem.id === creative.id ? 'active' : ''}`}
                                                onClick={() => setSelectedItem({ type: 'creative', id: creative.id, groupId: group.id })}
                                            >
                                                <Image size={14} />
                                                <span>{creative.nome}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Form Area */}
                <div className="editor-content">
                    {selectedItem?.type === 'campaign' && (
                        <div className="form-section">
                            <h3>Detalhes da Campanha</h3>
                            <div className="form-grid">
                                <div className="form-group full-width">
                                    <label>Nome da Campanha</label>
                                    <input
                                        type="text"
                                        value={campaignData.nome}
                                        onChange={(e) => handleUpdateItem('nome', e.target.value)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Marca</label>
                                    <select
                                        value={campaignData.marca_id}
                                        onChange={(e) => handleUpdateItem('marca_id', e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {brands.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Plataforma</label>
                                    <select
                                        value={campaignData.plataforma_id}
                                        onChange={(e) => handleUpdateItem('plataforma_id', e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {platforms.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Status</label>
                                    <select
                                        value={campaignData.status}
                                        onChange={(e) => handleUpdateItem('status', e.target.value)}
                                    >
                                        <option value="active">Ativa</option>
                                        <option value="paused">Pausada</option>
                                        <option value="inactive">Inativa</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedItem?.type === 'ad_group' && (
                        <div className="form-section">
                            <h3>Grupo de Anúncios</h3>
                            {(() => {
                                const group = campaignData.ad_groups.find(g => g.id === selectedItem.id);
                                if (!group) return <div>Grupo não encontrado</div>;
                                return (
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label>Nome do Grupo</label>
                                            <input
                                                type="text"
                                                value={group.nome}
                                                onChange={(e) => handleUpdateItem('nome', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Orçamento Diário</label>
                                            <input
                                                type="number"
                                                value={group.orcamento_diario || ''}
                                                onChange={(e) => handleUpdateItem('orcamento_diario', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Status</label>
                                            <select
                                                value={group.status}
                                                onChange={(e) => handleUpdateItem('status', e.target.value)}
                                            >
                                                <option value="active">Ativo</option>
                                                <option value="paused">Pausado</option>
                                                <option value="inactive">Inativo</option>
                                            </select>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {selectedItem?.type === 'creative' && (
                        <div className="form-section">
                            <h3>Criativo</h3>
                            {(() => {
                                const group = campaignData.ad_groups.find(g => g.id === selectedItem.groupId);
                                const creative = group?.creatives.find(c => c.id === selectedItem.id);
                                if (!creative) return <div>Criativo não encontrado</div>;
                                return (
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label>Nome do Criativo</label>
                                            <input
                                                type="text"
                                                value={creative.nome}
                                                onChange={(e) => handleUpdateItem('nome', e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Tipo</label>
                                            <select
                                                value={creative.tipo}
                                                onChange={(e) => handleUpdateItem('tipo', e.target.value)}
                                            >
                                                <option value="image">Imagem</option>
                                                <option value="video">Vídeo</option>
                                                <option value="carousel">Carrossel</option>
                                            </select>
                                        </div>
                                        <div className="form-group full-width">
                                            <label>URL da Mídia</label>
                                            <input
                                                type="text"
                                                value={creative.url_imagem || ''}
                                                onChange={(e) => handleUpdateItem('url_imagem', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CampaignEditor;
