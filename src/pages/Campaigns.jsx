import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List as ListIcon, Filter, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '../services-apis/supabase/client';
import * as campanhasService from '../services-apis/supabase/campanhasService';
import * as configService from '../services-apis/supabase/configService';
import * as modelosService from '../services-apis/supabase/modelosService';
import CampaignList from '../components/campaigns/CampaignList';
import CampaignEditor from '../components/campaigns/CampaignEditor';

const Campaigns = () => {
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [brands, setBrands] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [models, setModels] = useState([]);
    const [accounts, setAccounts] = useState([]);

    // Filters
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedModel, setSelectedModel] = useState('');

    // UI State
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [editorMode, setEditorMode] = useState(false); // false, 'new', 'edit'
    const [editingCampaignId, setEditingCampaignId] = useState(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            const [
                brandsData,
                platformsData,
                accountsData,
                modelsData,
                campaignsData
            ] = await Promise.all([
                configService.buscarMarcas(),
                configService.buscarPlataformas(),
                configService.buscarTodasContasDeAnuncio(),
                modelosService.buscarTodosModelos(),
                campanhasService.buscarTodasCampanhas()
            ]);

            setBrands(brandsData || []);
            setPlatforms(platformsData || []);
            setAccounts(accountsData || []);
            setModels(modelsData || []);
            setCampaigns(campaignsData || []);
        } catch (error) {
            console.error('Error loading initial data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredCampaigns = () => {
        return campaigns.filter(campaign => {
            if (selectedBrand && String(campaign.marca_id) !== String(selectedBrand)) return false;
            if (selectedPlatform && String(campaign.plataforma_id) !== String(selectedPlatform)) return false;
            if (selectedStatus && campaign.status !== selectedStatus) return false;
            if (selectedModel && String(campaign.modelo_id?.id || campaign.modelo_id) !== String(selectedModel)) return false;
            return true;
        });
    };

    const handleCreateCampaign = () => {
        setEditingCampaignId('new');
        setEditorMode(true);
    };

    const handleEditCampaign = (id) => {
        setEditingCampaignId(id);
        setEditorMode(true);
    };

    const handleDeleteCampaign = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta campanha?')) {
            try {
                await campanhasService.deletarCampanha(id);
                setCampaigns(prev => prev.filter(c => c.id !== id));
            } catch (error) {
                console.error('Error deleting campaign:', error);
                alert('Erro ao excluir campanha');
            }
        }
    };

    const handleSaveComplete = () => {
        setEditorMode(false);
        setEditingCampaignId(null);
        loadInitialData(); // Reload to get updated data
    };

    const handleCancelEdit = () => {
        setEditorMode(false);
        setEditingCampaignId(null);
    };

    if (editorMode) {
        return (
            <div className="page-view" style={{ display: 'block' }}>
                <CampaignEditor
                    campaignId={editingCampaignId}
                    onSave={handleSaveComplete}
                    onCancel={handleCancelEdit}
                    brands={brands}
                    platforms={platforms}
                    models={models}
                    accounts={accounts}
                />
            </div>
        );
    }

    return (
        <div className="page-view" style={{ display: 'block' }}>
            <div className="page-header">
                <h1>Campanhas</h1>
                <div className="header-actions">
                    <button className="btn btn-secondary" disabled>
                        <Upload size={16} /> Importar (Em breve)
                    </button>
                    <button className="btn btn-primary" onClick={handleCreateCampaign}>
                        <Plus size={16} /> Nova Campanha
                    </button>
                </div>
            </div>

            <div className="campaigns-filters">
                <div className="filter-group">
                    <label>Marca</label>
                    <select value={selectedBrand} onChange={(e) => setSelectedBrand(e.target.value)}>
                        <option value="">Todas as Marcas</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Plataforma</label>
                    <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
                        <option value="">Todas as Plataformas</option>
                        {platforms.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Status</label>
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="">Todos os Status</option>
                        <option value="active">Ativa</option>
                        <option value="paused">Pausada</option>
                        <option value="inactive">Inativa</option>
                    </select>
                </div>
                <div className="filter-actions">
                    <div className="layout-toggle">
                        <button
                            className={`btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                            title="Lista"
                        >
                            <ListIcon size={20} />
                        </button>
                        <button
                            className={`btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                            title="Grade"
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">Carregando campanhas...</div>
            ) : (
                <CampaignList
                    campaigns={getFilteredCampaigns()}
                    viewMode={viewMode}
                    onEdit={handleEditCampaign}
                    onDelete={handleDeleteCampaign}
                />
            )}
        </div>
    );
};

export default Campaigns;
