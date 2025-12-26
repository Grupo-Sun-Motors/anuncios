import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Grid, List, UploadCloud, Plus, ArrowLeft, Save, X, CheckCircle, Search, Filter, MoreVertical, Play, Pause, Trash2, Edit, Eye, Facebook, Globe, ArrowUpDown, Folder, Layers, FileText, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';
import * as campanhasService from '../services-apis/supabase/campanhasService';
import * as configService from '../services-apis/supabase/configService';
import * as modelosService from '../services-apis/supabase/modelosService';
import Preloader from '../components/Preloader';
import { useToast } from '../contexts/ToastContext';

const Campanhas = () => {
    // State for data
    const [campaigns, setCampaigns] = useState([]);
    const [brands, setBrands] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [models, setModels] = useState([]);
    const [brandAccountRelations, setBrandAccountRelations] = useState([]);

    // State for UI
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [activeActionMenu, setActiveActionMenu] = useState(null); // ID of the campaign with open menu
    const [activeStatusMenu, setActiveStatusMenu] = useState(null); // ID of the campaign with open status menu
    const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState({ field: 'nome', direction: 'asc' });

    // Context Menu State
    const [contextMenu, setContextMenu] = useState({
        visible: false,
        x: 0,
        y: 0,
        nodeId: null,
        type: null // 'campaign', 'adset', 'ad'
    });

    // Campaign Editor State
    const [selectedNode, setSelectedNode] = useState('campaign'); // 'campaign', 'adset-id', 'ad-id'
    const [expandedNodes, setExpandedNodes] = useState(['campaign']);
    const [campaignData, setCampaignData] = useState({
        id: 'new',
        nome: 'Nova Campanha',
        status: 'active',
        plataforma_id: '',
        marca_id: '',
        modelo_id: '',
        orcamento_nivel: 'adset', // Forced to 'adset' as per new requirement
        orcamento: { valor: '', tipo: 'diario' },
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: '',
        objetivo: '',
        adSets: [
            {
                id: 'adset-1',
                nome: 'Novo Grupo de Anúncios',
                modelo_id: '',
                orcamento: { valor: '', tipo: 'diario' },
                direcionamento: '',
                posicionamento: 'automatic',
                ads: [
                    {
                        id: 'ad-1',
                        nome: 'Novo Anúncio',
                        modelo_id: '',
                        titulos: [''],
                        textos_principais: [''],
                        descricoes: [''],
                        cta: 'SAIBA_MAIS'
                    }
                ]
            }
        ]
    });

    // Helper to format currency for display
    const formatCurrency = (value) => {
        if (!value) return '';
        // If it's already a number
        if (typeof value === 'number') {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        }
        // If string, try to parse
        const numeric = parseFloat(value.replace(/\./g, '').replace(',', '.'));
        if (isNaN(numeric)) return '';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
    };

    // Real-time input mask: 1234 -> 12,34
    const handleRealTimeMoneyChange = (e, setter) => {
        let value = e.target.value.replace(/\D/g, '');
        if (!value) {
            setter('');
            return;
        }
        const numericValue = Number(value) / 100;
        const formatted = numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setter(formatted);
    };

    // Parse formatted string to number for calculations
    const parseMoney = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
    };

    // Navigation Logic
    const handleNextStep = () => {
        if (selectedNode === 'campaign') {
            const firstAdSet = campaignData.adSets[0];
            if (firstAdSet) {
                if (!expandedNodes.includes('campaign')) {
                    setExpandedNodes(prev => [...prev, 'campaign']);
                }
                setSelectedNode(firstAdSet.id);
            }
        } else if (selectedNode.startsWith('adset-')) {
            const adSet = campaignData.adSets.find(as => as.id === selectedNode);
            if (adSet && adSet.ads.length > 0) {
                if (!expandedNodes.includes(selectedNode)) {
                    setExpandedNodes(prev => [...prev, selectedNode]);
                }
                setSelectedNode(adSet.ads[0].id);
            }
        } else {
            // Already at Ad level or standard navigation
        }
    };

    const isLastStep = selectedNode.startsWith('ad-');

    const { addToast } = useToast();
    const { setIsSidebarCollapsed, isSidebarCollapsed } = useOutletContext(); // Context from MainLayout

    // State for filters
    const [filters, setFilters] = useState({
        brand: '',
        platform: '',
        status: '',
        model: ''
    });

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [
                fetchedCampaigns,
                fetchedBrands,
                fetchedPlatforms,
                fetchedModels,
                fetchedRelations
            ] = await Promise.all([
                campanhasService.buscarTodasCampanhas(),
                configService.buscarMarcas(),
                configService.buscarPlataformas(),
                modelosService.buscarTodosModelos(),
                configService.buscarRelatorioCompletoMarcas()
            ]);

            setCampaigns(fetchedCampaigns || []);
            setBrands(fetchedBrands || []);
            setPlatforms(fetchedPlatforms || []);
            setModels(fetchedModels || []);
            setBrandAccountRelations(fetchedRelations || []);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            addToast('Erro ao carregar dados.', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Sidebar Auto-Collapse
    useEffect(() => {
        if (isFormOpen && setIsSidebarCollapsed) {
            setIsSidebarCollapsed(true);
        }
    }, [isFormOpen, setIsSidebarCollapsed]);

    // Local Storage Persistance for Draft
    useEffect(() => {
        const savedDraft = localStorage.getItem('campaign_draft');
        if (savedDraft) {
            try {
                // Optional: ask user or just load. For now, we load if viewing 'new' campaign context
                // But since we are editing a specific object, let's just save.
                // We will load it when opening the "New Campaign" modal/view.
            } catch (e) {
                console.error("Error parsing draft", e);
            }
        }
    }, []);

    useEffect(() => {
        if (campaignData.id === 'new') {
            localStorage.setItem('campaign_draft', JSON.stringify(campaignData));
        }
    }, [campaignData]);

    // Initial Data & Event Listeners
    useEffect(() => {
        fetchInitialData();

        const handleClickOutside = (event) => {
            if (!event.target.closest('.actions-menu-btn') && !event.target.closest('.actions-dropdown')) {
                setActiveActionMenu(null);
            }
            if (!event.target.closest('.status-icon-btn') && !event.target.closest('.status-dropdown')) {
                setActiveStatusMenu(null);
            }
            if (!event.target.closest('.sort-menu-container')) {
                setIsSortMenuOpen(false);
            }
            // Close context menu
            if (contextMenu.visible && !event.target.closest('.context-menu-dropdown')) {
                setContextMenu({ ...contextMenu, visible: false });
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenu]); // Added contextMenu dependency to capture current state if needed, though mostly relying on setState

    // Context Menu Handlers
    const handleNodeContextMenu = (e, nodeId, type) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            nodeId,
            type
        });
    };

    const handleDuplicateNode = () => {
        const { nodeId, type } = contextMenu;
        if (!nodeId || !type) return;

        const newId = `${type}-${Date.now()}`;

        if (type === 'adset') {
            const adSetToDuplicate = campaignData.adSets.find(as => as.id === nodeId);
            if (adSetToDuplicate) {
                const newAdSet = { ...adSetToDuplicate, id: newId, nome: `${adSetToDuplicate.nome} (Cópia)`, ads: adSetToDuplicate.ads.map(ad => ({ ...ad, id: `ad-${Date.now()}-${Math.random()}` })) };
                setCampaignData(prev => ({ ...prev, adSets: [...prev.adSets, newAdSet] }));
                addToast('Grupo duplicado com sucesso!');
            }
        } else if (type === 'ad') {
            // Find which adset contains this ad
            const adSetIndex = campaignData.adSets.findIndex(as => as.ads.some(ad => ad.id === nodeId));
            if (adSetIndex !== -1) {
                const adToDuplicate = campaignData.adSets[adSetIndex].ads.find(ad => ad.id === nodeId);
                const newAd = { ...adToDuplicate, id: newId, nome: `${adToDuplicate.nome} (Cópia)` };
                const updatedAdSets = [...campaignData.adSets];
                updatedAdSets[adSetIndex] = {
                    ...updatedAdSets[adSetIndex],
                    ads: [...updatedAdSets[adSetIndex].ads, newAd]
                };
                setCampaignData(prev => ({ ...prev, adSets: updatedAdSets }));
                addToast('Anúncio duplicado com sucesso!');
            }
        }
        setContextMenu({ ...contextMenu, visible: false });
    };

    const handleDeleteNode = () => {
        const { nodeId, type } = contextMenu;
        if (!nodeId || !type) return;

        if (type === 'adset') {
            if (campaignData.adSets.length <= 1) {
                addToast('A campanha deve ter pelo menos um grupo de anúncios.', 'error');
                return;
            }
            setCampaignData(prev => ({ ...prev, adSets: prev.adSets.filter(as => as.id !== nodeId) }));
            if (selectedNode === nodeId) setSelectedNode('campaign');
            addToast('Grupo removido.');
        } else if (type === 'ad') {
            const adSetIndex = campaignData.adSets.findIndex(as => as.ads.some(ad => ad.id === nodeId));
            if (adSetIndex !== -1) {
                if (campaignData.adSets[adSetIndex].ads.length <= 1) {
                    addToast('O grupo deve ter pelo menos um anúncio.', 'error');
                    return;
                }
                const updatedAdSets = [...campaignData.adSets];
                updatedAdSets[adSetIndex] = {
                    ...updatedAdSets[adSetIndex],
                    ads: updatedAdSets[adSetIndex].ads.filter(ad => ad.id !== nodeId)
                };
                setCampaignData(prev => ({ ...prev, adSets: updatedAdSets }));
                if (selectedNode === nodeId) setSelectedNode(campaignData.adSets[adSetIndex].id);
                addToast('Anúncio removido.');
            }
        }
        setContextMenu({ ...contextMenu, visible: false });
    };


    // Filter Logic
    // Filter Logic
    const filteredModels = useMemo(() => {
        return models.filter(m => !filters.brand || m.marca_id === filters.brand);
    }, [models, filters.brand]);

    const filteredCampaigns = useMemo(() => {
        let result = campaigns.filter(campaign => {
            const matchBrand = filters.brand ? campaign.marca_id === filters.brand : true;
            const matchPlatform = filters.platform ? campaign.conta_de_anuncio?.plataforma_id === filters.platform : true;
            const matchStatus = filters.status ? campaign.status === filters.status : true;
            // Fix: Check nested object id or direct id if available
            const campaignModelId = campaign.modelo_id?.id || campaign.modelo_id;
            const matchModel = filters.model ? String(campaignModelId) === String(filters.model) : true;
            return matchBrand && matchPlatform && matchStatus && matchModel;
        });

        // Sorting
        if (sortConfig.field) {
            result.sort((a, b) => {
                let aValue, bValue;

                switch (sortConfig.field) {
                    case 'nome':
                        aValue = a.nome || '';
                        bValue = b.nome || '';
                        break;
                    case 'status':
                        aValue = a.status || '';
                        bValue = b.status || '';
                        break;
                    case 'orcamento':
                        aValue = parseFloat(a.orcamento?.valor || 0);
                        bValue = parseFloat(b.orcamento?.valor || 0);
                        break;
                    case 'marca':
                        aValue = a.marca?.nome || '';
                        bValue = b.marca?.nome || '';
                        break;
                    case 'modelo':
                        // modelo_id is the object itself due to the join
                        aValue = a.modelo_id?.nome || '';
                        bValue = b.modelo_id?.nome || '';
                        break;
                    case 'plataforma':
                        const pA = platforms.find(p => p.id === a.conta_de_anuncio?.plataforma_id)?.nome || '';
                        const pB = platforms.find(p => p.id === b.conta_de_anuncio?.plataforma_id)?.nome || '';
                        aValue = pA;
                        bValue = pB;
                        break;
                    case 'data_inicio':
                        aValue = new Date(a.data_inicio || 0);
                        bValue = new Date(b.data_inicio || 0);
                        break;
                    default:
                        aValue = a[sortConfig.field] || '';
                        bValue = b[sortConfig.field] || '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [campaigns, filters, sortConfig, models]); // Added models to dependency if needed, though mostly relying on IDs


    // Handlers
    const handleFilterChange = (e) => {
        const { id, value } = e.target;
        const filterName = id.replace('campaign-filter-', '');
        setFilters(prev => ({ ...prev, [filterName]: value }));
    };

    const toggleSortMenu = () => {
        setIsSortMenuOpen(!isSortMenuOpen);
    };

    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const toggleActionMenu = (id, e) => {
        e.stopPropagation();
        setActiveActionMenu(activeActionMenu === id ? null : id);
        setActiveStatusMenu(null);
    };

    const toggleStatusMenu = (id, e) => {
        e.stopPropagation();
        setActiveStatusMenu(activeStatusMenu === id ? null : id);
        setActiveActionMenu(null);
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            // Optimistic update
            setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
            setActiveStatusMenu(null);

            await campanhasService.atualizarCampanha(id, { status: newStatus });
            addToast('Status atualizado com sucesso!');
        } catch (error) {
            console.error("Error updating status:", error);
            addToast('Erro ao atualizar status.', 'error');
            fetchInitialData(); // Revert on error
        }
    };

    const getStatusColor = (status) => {
        const map = {
            'active': '#10b981', // Green
            'paused': '#f59e0b', // Amber
            'inactive': '#ef4444' // Red
        };
        return map[status] || '#6b7280';
    };

    const getPlatformIcon = (platformName) => {
        if (!platformName) return <Globe size={20} />;
        const lower = platformName.toLowerCase();
        if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) {
            return <Facebook size={20} color="#1877F2" fill="#1877F2" style={{ stroke: 'none' }} />; // Facebook Blue
        }
        if (lower.includes('google') || lower.includes('youtube')) {
            return (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
            );
        }
        return <Globe size={20} color="#6b7280" />;
    };

    // Render Helpers
    const renderCampaignItem = (campaign) => {
        const brandName = campaign.marca?.nome || 'N/A';
        const accountName = campaign.conta_de_anuncio?.nome || 'Conta Desconhecida';

        // Resolve platform name client-side
        const platformId = campaign.conta_de_anuncio?.plataforma_id;
        const platformObj = platforms.find(p => p.id === platformId);
        const platformName = platformObj?.nome || '';

        return (
            <div key={campaign.id} className="campaign-list-item">
                <div className="item-status-section">
                    <button
                        className="status-icon-btn"
                        onClick={(e) => toggleStatusMenu(campaign.id, e)}
                        title={`Status: ${campaign.status}`}
                    >
                        {getPlatformIcon(platformName)}
                        <span className="status-indicator" style={{ backgroundColor: getStatusColor(campaign.status) }}></span>
                    </button>

                    {activeStatusMenu === campaign.id && (
                        <div className="status-dropdown">
                            <div className="dropdown-item" onClick={() => handleStatusChange(campaign.id, 'active')}>
                                <span className="status-dot active"></span> Ativa
                            </div>
                            <div className="dropdown-item" onClick={() => handleStatusChange(campaign.id, 'paused')}>
                                <span className="status-dot paused"></span> Pausada
                            </div>
                            <div className="dropdown-item" onClick={() => handleStatusChange(campaign.id, 'inactive')}>
                                <span className="status-dot inactive"></span> Inativa
                            </div>
                        </div>
                    )}
                </div>

                <div className="item-main-info">
                    <h3 className="item-title">{campaign.nome}</h3>
                    <div className="item-meta">
                        <span className="meta-brand">{brandName}</span>
                        <span className="meta-separator">•</span>
                        <span className="meta-account">{accountName}</span>
                    </div>
                </div>

                <div className="item-metrics">
                    <div className="metric-group">
                        <span className="metric-label">Orçamento</span>
                        <span className="metric-value">R$ {parseFloat(campaign.orcamento?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="metric-group">
                        <span className="metric-label">Período</span>
                        <span className="metric-value">
                            {campaign.data_inicio ? new Date(campaign.data_inicio).toLocaleDateString('pt-BR') : '-'}
                            {' até '}
                            {campaign.data_fim ? new Date(campaign.data_fim).toLocaleDateString('pt-BR') : 'Contínuo'}
                        </span>
                    </div>
                </div>

                <div className="item-actions">
                    <button className="actions-menu-btn" onClick={(e) => toggleActionMenu(campaign.id, e)}>
                        <MoreVertical size={20} />
                    </button>

                    {activeActionMenu === campaign.id && (
                        <div className="actions-dropdown active">
                            <button className="dropdown-item">
                                <Eye size={16} /> Visualizar
                            </button>
                            <button className="dropdown-item">
                                <Edit size={16} /> Editar
                            </button>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item danger">
                                <Trash2 size={16} /> Excluir
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div id="view-campanhas" className="page-view">
            {/* List View */}
            {!isFormOpen && (
                <div id="campaigns-list-view">
                    <div className="page-header">
                        <h1>Campanhas Publicitárias</h1>
                        <span id="campaign-count-display" className="campaign-count">
                            {filteredCampaigns.length} campanhas
                        </span>
                        <div className="page-actions">
                            <div className="layout-toggle">
                                <button
                                    className={`btn btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                >
                                    <Grid size={16} />
                                </button>
                                <button
                                    className={`btn btn-icon ${viewMode === 'list' ? 'active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                >
                                    <List size={16} />
                                </button>
                            </div>
                            <button className="btn btn-secondary">
                                <UploadCloud size={16} style={{ marginRight: '8px' }} />
                                Importar
                            </button>
                            <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
                                <Plus size={16} style={{ marginRight: '8px' }} />
                                Nova Campanha
                            </button>
                        </div>
                    </div>

                    {/* Filters Section */}
                    <div className="campaigns-filters">
                        <div className="filter-group">
                            <label htmlFor="campaign-filter-brand">Marca</label>
                            <select id="campaign-filter-brand" value={filters.brand} onChange={handleFilterChange}>
                                <option value="">Todas</option>
                                {brands.map(brand => (
                                    <option key={brand.id} value={brand.id}>{brand.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="campaign-filter-platform">Plataforma</label>
                            <select id="campaign-filter-platform" value={filters.platform} onChange={handleFilterChange}>
                                <option value="">Todas</option>
                                {platforms.map(platform => (
                                    <option key={platform.id} value={platform.id}>{platform.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="campaign-filter-status">Status</label>
                            <select id="campaign-filter-status" value={filters.status} onChange={handleFilterChange}>
                                <option value="">Todos</option>
                                <option value="active">Ativa</option>
                                <option value="paused">Pausada</option>
                                <option value="inactive">Inativa</option>
                            </select>
                        </div>
                        <div className="filter-group">
                            <label htmlFor="campaign-filter-model">Modelo</label>
                            <select id="campaign-filter-model" value={filters.model} onChange={handleFilterChange}>
                                <option value="">Todos</option>
                                {filteredModels.map(model => (
                                    <option key={model.id} value={model.id}>{model.nome}</option>
                                ))}
                            </select>
                        </div>

                        {/* Sort Button */}
                        <div className="sort-menu-container">
                            <button className="btn btn-white sort-btn" onClick={toggleSortMenu}>
                                <ArrowUpDown size={16} style={{ marginRight: '8px' }} />
                                Classificar
                            </button>

                            {isSortMenuOpen && (
                                <div className="sort-dropdown">
                                    <div className="sort-header">Ordenar por</div>
                                    <div className="sort-options">
                                        <button
                                            className={`sort-option ${sortConfig.field === 'nome' ? 'active' : ''}`}
                                            onClick={() => handleSort('nome')}
                                        >
                                            <span>Nome</span>
                                            {sortConfig.field === 'nome' && (
                                                <span className="sort-direction">{sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                                            )}
                                        </button>
                                        <button
                                            className={`sort-option ${sortConfig.field === 'status' ? 'active' : ''}`}
                                            onClick={() => handleSort('status')}
                                        >
                                            <span>Status</span>
                                            {sortConfig.field === 'status' && (
                                                <span className="sort-direction">{sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                                            )}
                                        </button>
                                        <button
                                            className={`sort-option ${sortConfig.field === 'orcamento' ? 'active' : ''}`}
                                            onClick={() => handleSort('orcamento')}
                                        >
                                            <span>Orçamento</span>
                                            {sortConfig.field === 'orcamento' && (
                                                <span className="sort-direction">{sortConfig.direction === 'asc' ? 'Menor' : 'Maior'}</span>
                                            )}
                                        </button>
                                        <button
                                            className={`sort-option ${sortConfig.field === 'plataforma' ? 'active' : ''}`}
                                            onClick={() => handleSort('plataforma')}
                                        >
                                            <span>Plataforma</span>
                                            {sortConfig.field === 'plataforma' && (
                                                <span className="sort-direction">{sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                                            )}
                                        </button>
                                        <button
                                            className={`sort-option ${sortConfig.field === 'marca' ? 'active' : ''}`}
                                            onClick={() => handleSort('marca')}
                                        >
                                            <span>Marca</span>
                                            {sortConfig.field === 'marca' && (
                                                <span className="sort-direction">{sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                                            )}
                                        </button>
                                        <button
                                            className={`sort-option ${sortConfig.field === 'modelo' ? 'active' : ''}`}
                                            onClick={() => handleSort('modelo')}
                                        >
                                            <span>Modelo</span>
                                            {sortConfig.field === 'modelo' && (
                                                <span className="sort-direction">{sortConfig.direction === 'asc' ? 'A-Z' : 'Z-A'}</span>
                                            )}
                                        </button>
                                        <button
                                            className={`sort-option ${sortConfig.field === 'data_inicio' ? 'active' : ''}`}
                                            onClick={() => handleSort('data_inicio')}
                                        >
                                            <span>Data de Início</span>
                                            {sortConfig.field === 'data_inicio' && (
                                                <span className="sort-direction">{sortConfig.direction === 'asc' ? 'Antiga' : 'Recente'}</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <Preloader message="Carregando campanhas..." />
                    ) : (
                        <div id="campaignsList" className={`campaigns-container ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
                            {filteredCampaigns.length > 0 ? (
                                filteredCampaigns.map(renderCampaignItem)
                            ) : (
                                <div className="empty-state">Nenhuma campanha encontrada.</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Form View / Campaign Editor */}
            {isFormOpen && (
                <div id="campaigns-editor" className="campaign-editor">
                    {/* Header */}
                    <div className="editor-header">
                        <div className="header-left">
                            <button className="btn-icon-text" onClick={() => setIsFormOpen(false)}>
                                <X size={20} />
                                Fechar
                            </button>
                            <div className="campaign-breadcrumb">
                                <span className="breadcrumb-item">Campanhas</span>
                                <ChevronRight size={16} />
                                <span className="breadcrumb-item active">{campaignData.nome || 'Nova Campanha'}</span>
                            </div>
                        </div>
                        <div className="header-right">
                            <button className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>
                                Voltar
                            </button>
                            <button className="btn btn-secondary">
                                <span className="status-dot draft"></span>
                                Rascunho salvo
                            </button>
                            {isLastStep ? (
                                <button className="btn btn-primary" onClick={() => {
                                    addToast('Campanha publicada com sucesso!', 'success');
                                    setIsFormOpen(false);
                                }}>
                                    Publicar
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={handleNextStep}>
                                    Avançar
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="editor-body">
                        {/* Left Sidebar - Hierarchy */}
                        <div className="editor-sidebar">
                            <div className="hierarchy-tree">
                                {/* Campaign Node */}
                                <div
                                    className={`tree-node campaign-node ${selectedNode === 'campaign' ? 'selected' : ''}`}
                                    onClick={() => setSelectedNode('campaign')}
                                    onContextMenu={(e) => handleNodeContextMenu(e, 'campaign', 'campaign')} // Although campaign delete is "Cancel", duplicate might be useful later
                                >
                                    <div className="node-content">
                                        <button
                                            className="expand-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedNodes(prev => prev.includes('campaign') ? prev.filter(n => n !== 'campaign') : [...prev, 'campaign']);
                                            }}
                                        >
                                            {expandedNodes.includes('campaign') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <Folder size={16} className="node-icon folder" />
                                        <span className="node-name">{campaignData.nome}</span>
                                    </div>
                                    {/* Campaign Actions - usually top level doesn't delete itself in editor, but maybe duplicate? leaving empty or basic for now */}
                                    <div className="node-actions">
                                        <button className="icon-btn-tree" onClick={(e) => handleNodeContextMenu(e, 'campaign', 'campaign')}>
                                            <MoreVertical size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Ad Sets & Ads */}
                                {expandedNodes.includes('campaign') && (
                                    <div className="tree-children">
                                        {campaignData.adSets.map(adSet => (
                                            <div key={adSet.id} className="adset-group">
                                                <div
                                                    className={`tree-node adset-node ${selectedNode === adSet.id ? 'selected' : ''}`}
                                                    onClick={() => setSelectedNode(adSet.id)}
                                                    onContextMenu={(e) => handleNodeContextMenu(e, adSet.id, 'adset')}
                                                >
                                                    <div className="node-content">
                                                        <button
                                                            className="expand-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setExpandedNodes(prev => prev.includes(adSet.id) ? prev.filter(n => n !== adSet.id) : [...prev, adSet.id]);
                                                            }}
                                                        >
                                                            {expandedNodes.includes(adSet.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </button>
                                                        <Layers size={16} className="node-icon layers" />
                                                        <span className="node-name">{adSet.nome}</span>
                                                    </div>
                                                    <div className="node-actions">
                                                        <button className="icon-btn-tree" onClick={(e) => handleNodeContextMenu(e, adSet.id, 'adset')}>
                                                            <MoreVertical size={14} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {expandedNodes.includes(adSet.id) && (
                                                    <div className="tree-children">
                                                        {adSet.ads.map(ad => (
                                                            <div
                                                                key={ad.id}
                                                                className={`tree-node ad-node ${selectedNode === ad.id ? 'selected' : ''}`}
                                                                onClick={() => setSelectedNode(ad.id)}
                                                                onContextMenu={(e) => handleNodeContextMenu(e, ad.id, 'ad')}
                                                            >
                                                                <div className="node-content">
                                                                    <div className="spacer"></div>
                                                                    <ImageIcon size={16} className="node-icon image" />
                                                                    <span className="node-name">{ad.nome}</span>
                                                                </div>
                                                                <div className="node-actions">
                                                                    <button className="icon-btn-tree" onClick={(e) => handleNodeContextMenu(e, ad.id, 'ad')}>
                                                                        <MoreVertical size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <button className="add-child-btn" onClick={() => {
                                                            // Logic to add new ad
                                                            const newAd = { id: `ad-${Date.now()}`, nome: 'Novo Anúncio', titulos: [''], textos_principais: [''], descricoes: [''], cta: 'SAIBA_MAIS' };
                                                            const updatedAdSets = campaignData.adSets.map(as => {
                                                                if (as.id === adSet.id) {
                                                                    return { ...as, ads: [...as.ads, newAd] };
                                                                }
                                                                return as;
                                                            });
                                                            setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                            setSelectedNode(newAd.id);
                                                        }}>
                                                            <Plus size={14} /> Criar Anúncio
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <button className="add-child-btn" onClick={() => {
                                            // Logic to add new ad set
                                            const newAdSet = {
                                                id: `adset-${Date.now()}`,
                                                nome: 'Novo Grupo',
                                                ads: [],
                                                orcamento: { valor: '', tipo: 'diario' },
                                                posicionamento: 'automatic'
                                            };
                                            setCampaignData({ ...campaignData, adSets: [...campaignData.adSets, newAdSet] });
                                            setSelectedNode(newAdSet.id);
                                        }}>
                                            <Plus size={14} /> Criar Grupo de Anúncios
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Context Menu Dropdown */}
                            {contextMenu.visible && (
                                <div
                                    className="context-menu-dropdown"
                                    style={{
                                        position: 'fixed',
                                        top: contextMenu.y,
                                        left: contextMenu.x,
                                        zIndex: 9999
                                    }}
                                >
                                    <div className="context-menu-header">Ações</div>
                                    <button onClick={handleDuplicateNode}><FileText size={14} /> Duplicar</button>
                                    <button onClick={handleDeleteNode} className="danger"><Trash2 size={14} /> Excluir</button>
                                </div>
                            )}
                        </div>

                        {/* Right Content - Form */}
                        <div className="editor-content">
                            {selectedNode === 'campaign' && (
                                <div className="form-section">
                                    <div className="form-header-details">
                                        <h2>Campanha</h2>
                                        <p>Configure os detalhes principais da sua campanha.</p>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label>Nome da Campanha</label>
                                            <input
                                                type="text"
                                                value={campaignData.nome}
                                                onChange={e => setCampaignData({ ...campaignData, nome: e.target.value })}
                                                placeholder="Ex: Campanha de Verão 2024"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Plataforma</label>
                                            <select
                                                value={campaignData.plataforma_id}
                                                onChange={e => setCampaignData({ ...campaignData, plataforma_id: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                {platforms.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Marca</label>
                                            <select
                                                value={campaignData.marca_id}
                                                onChange={e => setCampaignData({ ...campaignData, marca_id: e.target.value })}
                                            >
                                                <option value="">Selecione...</option>
                                                {brands.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Modelo (Produto)</label>
                                            <select
                                                value={campaignData.modelo_id}
                                                onChange={e => setCampaignData({ ...campaignData, modelo_id: e.target.value })}
                                                disabled={!campaignData.marca_id}
                                            >
                                                <option value="">Selecione a Marca primeiro...</option>
                                                {models.filter(m => m.marca_id === campaignData.marca_id).map(m => (
                                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Status</label>
                                            <select
                                                value={campaignData.status}
                                                onChange={e => setCampaignData({ ...campaignData, status: e.target.value })}
                                            >
                                                <option value="active">Ativa</option>
                                                <option value="paused">Pausada</option>
                                                <option value="inactive">Inativa</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Nível do Orçamento</label>
                                            <select
                                                value={campaignData.orcamento_nivel}
                                                onChange={e => setCampaignData({ ...campaignData, orcamento_nivel: e.target.value })}
                                            >
                                                <option value="adset">Por Conjunto de Anúncios</option>
                                                <option value="campaign">Campanha (Advantage+)</option>
                                            </select>
                                        </div>

                                        {campaignData.orcamento_nivel === 'campaign' ? (
                                            <>
                                                <div className="form-group">
                                                    <label>Orçamento da Campanha (R$)</label>
                                                    <div className="input-group-prefix">
                                                        <span className="prefix">R$</span>
                                                        <input
                                                            type="text"
                                                            value={campaignData.orcamento.valor}
                                                            onChange={e => handleRealTimeMoneyChange(e, (val) => setCampaignData({ ...campaignData, orcamento: { ...campaignData.orcamento, valor: val } }))}
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Tipo de Orçamento</label>
                                                    <select
                                                        value={campaignData.orcamento.tipo}
                                                        onChange={e => setCampaignData({ ...campaignData, orcamento: { ...campaignData.orcamento, tipo: e.target.value } })}
                                                    >
                                                        <option value="diario">Diário</option>
                                                        <option value="total">Vitalício</option>
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="form-group">
                                                <label>Orçamento Total (Soma dos Grupos)</label>
                                                <div className="input-group-prefix" style={{ background: '#f3f4f6' }}>
                                                    <span className="prefix">R$</span>
                                                    <input
                                                        type="text"
                                                        disabled
                                                        value={formatCurrency(campaignData.adSets.reduce((sum, adSet) => sum + parseMoney(adSet.orcamento?.valor), 0)).replace('R$', '').trim()}
                                                        style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="form-group">
                                            <label>Data de Início</label>
                                            <input
                                                type="date"
                                                value={campaignData.data_inicio}
                                                onChange={e => setCampaignData({ ...campaignData, data_inicio: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Data de Fim</label>
                                            <input
                                                type="date"
                                                value={campaignData.data_fim}
                                                onChange={e => setCampaignData({ ...campaignData, data_fim: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>Objetivo</label>
                                            <select
                                                value={campaignData.objetivo}
                                                onChange={e => setCampaignData({ ...campaignData, objetivo: e.target.value })}
                                            >
                                                <option value="">Selecione o objetivo...</option>
                                                <option value="reconhecimento">Reconhecimento</option>
                                                <option value="trafego">Tráfego</option>
                                                <option value="engajamento">Engajamento</option>
                                                <option value="cadastros">Cadastros</option>
                                                <option value="promocao_app">Promoção do App</option>
                                                <option value="vendas">Vendas</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedNode.startsWith('adset') && (
                                <div className="form-section">
                                    <div className="form-header-details">
                                        <h2>Grupo de Anúncios</h2>
                                        <p>Defina o público-alvo, posicionamentos e programação.</p>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label>Nome do Grupo</label>
                                            <input
                                                type="text"
                                                value={campaignData.adSets.find(as => as.id === selectedNode)?.nome || ''}
                                                onChange={e => {
                                                    const updated = campaignData.adSets.map(as => as.id === selectedNode ? { ...as, nome: e.target.value } : as);
                                                    setCampaignData({ ...campaignData, adSets: updated });
                                                }}
                                            />
                                        </div>
                                        <div className="form-group full-width">
                                            <label>Modelo (Opcional - Substitui Campanha)</label>
                                            <select
                                                value={campaignData.adSets.find(as => as.id === selectedNode)?.modelo_id || ''}
                                                onChange={e => {
                                                    const updated = campaignData.adSets.map(as => as.id === selectedNode ? { ...as, modelo_id: e.target.value } : as);
                                                    setCampaignData({ ...campaignData, adSets: updated });
                                                }}
                                                disabled={!campaignData.marca_id}
                                            >
                                                <option value="">Usar Modelo da Campanha</option>
                                                {models.filter(m => m.marca_id === campaignData.marca_id).map(m => (
                                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {campaignData.orcamento_nivel === 'adset' ? (
                                            <>
                                                <div className="form-group">
                                                    <label>Orçamento</label>
                                                    <div className="input-group-prefix">
                                                        <span className="prefix">R$</span>
                                                        <input
                                                            type="text"
                                                            value={campaignData.adSets.find(as => as.id === selectedNode)?.orcamento?.valor || ''}
                                                            onChange={e => handleRealTimeMoneyChange(e, (val) => {
                                                                const updated = campaignData.adSets.map(as => as.id === selectedNode ? { ...as, orcamento: { ...as.orcamento, valor: val } } : as);
                                                                setCampaignData({ ...campaignData, adSets: updated });
                                                            })}
                                                            placeholder="0,00"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="form-group">
                                                    <label>Tipo de Orçamento</label>
                                                    <select
                                                        value={campaignData.adSets.find(as => as.id === selectedNode)?.orcamento?.tipo || 'diario'}
                                                        onChange={e => {
                                                            const updated = campaignData.adSets.map(as => as.id === selectedNode ? { ...as, orcamento: { ...as.orcamento, tipo: e.target.value } } : as);
                                                            setCampaignData({ ...campaignData, adSets: updated });
                                                        }}
                                                    >
                                                        <option value="diario">Diário</option>
                                                        <option value="total">Vitalício</option>
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="form-group full-width">
                                                <label>Orçamento</label>
                                                <p style={{ color: '#6b7280', fontSize: '0.875rem', padding: '8px 0' }}>
                                                    O orçamento é gerenciado nível da campanha (CBO).
                                                </p>
                                            </div>
                                        )}

                                        <div className="form-group full-width">
                                            <label>Direcionamento (Público)</label>
                                            <textarea
                                                rows="3"
                                                placeholder="Defina o público-alvo (Idade, Interesses, Localização...)"
                                                value={campaignData.adSets.find(as => as.id === selectedNode)?.direcionamento || ''}
                                                onChange={e => {
                                                    const updated = campaignData.adSets.map(as => as.id === selectedNode ? { ...as, direcionamento: e.target.value } : as);
                                                    setCampaignData({ ...campaignData, adSets: updated });
                                                }}
                                            ></textarea>
                                        </div>
                                        <div className="form-group">
                                            <label>Posicionamentos</label>
                                            <select
                                                value={campaignData.adSets.find(as => as.id === selectedNode)?.posicionamento || 'automatic'}
                                                onChange={e => {
                                                    const updated = campaignData.adSets.map(as => as.id === selectedNode ? { ...as, posicionamento: e.target.value } : as);
                                                    setCampaignData({ ...campaignData, adSets: updated });
                                                }}
                                            >
                                                <option value="automatic">Advantage+ (Recomendado)</option>
                                                <option value="manual">Manual</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedNode.startsWith('ad-') && !selectedNode.startsWith('adset') && (
                                <div className="form-section">
                                    <div className="form-header-details">
                                        <h2>Anúncio</h2>
                                        <p>Configure a identidade visual e o criativo do anúncio.</p>
                                    </div>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label>Nome do Anúncio</label>
                                            <input
                                                type="text"
                                                value={campaignData.adSets.flatMap(as => as.ads).find(ad => ad.id === selectedNode)?.nome || ''}
                                                onChange={e => {
                                                    const updatedAdSets = campaignData.adSets.map(as => {
                                                        const updatedAds = as.ads.map(ad => ad.id === selectedNode ? { ...ad, nome: e.target.value } : as);
                                                        return { ...as, ads: updatedAds };
                                                    });
                                                    setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                }}
                                            />
                                        </div>

                                        <div className="form-group full-width">
                                            <label>Modelo (Produto)</label>
                                            <select
                                                value={campaignData.adSets.flatMap(as => as.ads).find(ad => ad.id === selectedNode)?.modelo_id || ''}
                                                onChange={e => {
                                                    const updatedAdSets = campaignData.adSets.map(as => {
                                                        const updatedAds = as.ads.map(ad => ad.id === selectedNode ? { ...ad, modelo_id: e.target.value } : as);
                                                        return { ...as, ads: updatedAds };
                                                    });
                                                    setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                }}
                                                disabled={!campaignData.marca_id}
                                            >
                                                <option value="">Selecione...</option>
                                                {models.filter(m => m.marca_id === campaignData.marca_id).map(m => (
                                                    <option key={m.id} value={m.id}>{m.nome}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Dynamic Titles */}
                                        <div className="form-group full-width">
                                            <label>Títulos (Headlines)</label>
                                            {campaignData.adSets.flatMap(as => as.ads).find(ad => ad.id === selectedNode)?.titulos?.map((titulo, index) => (
                                                <div key={index} className="dynamic-input-row">
                                                    <input
                                                        type="text"
                                                        placeholder={`Título ${index + 1}`}
                                                        value={titulo}
                                                        onChange={e => {
                                                            const updatedAdSets = campaignData.adSets.map(as => {
                                                                const updatedAds = as.ads.map(ad => {
                                                                    if (ad.id === selectedNode) {
                                                                        const newTitulos = [...ad.titulos];
                                                                        newTitulos[index] = e.target.value;
                                                                        return { ...ad, titulos: newTitulos };
                                                                    }
                                                                    return ad;
                                                                });
                                                                return { ...as, ads: updatedAds };
                                                            });
                                                            setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                        }}
                                                    />
                                                    {index > 0 && (
                                                        <button
                                                            className="btn-icon-danger"
                                                            onClick={() => {
                                                                const updatedAdSets = campaignData.adSets.map(as => {
                                                                    const updatedAds = as.ads.map(ad => {
                                                                        if (ad.id === selectedNode) {
                                                                            return { ...ad, titulos: ad.titulos.filter((_, i) => i !== index) };
                                                                        }
                                                                        return ad;
                                                                    });
                                                                    return { ...as, ads: updatedAds };
                                                                });
                                                                setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                className="btn-add-more"
                                                onClick={() => {
                                                    const updatedAdSets = campaignData.adSets.map(as => {
                                                        const updatedAds = as.ads.map(ad => {
                                                            if (ad.id === selectedNode) {
                                                                return { ...ad, titulos: [...(ad.titulos || []), ''] };
                                                            }
                                                            return ad;
                                                        });
                                                        return { ...as, ads: updatedAds };
                                                    });
                                                    setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                }}
                                            >
                                                <Plus size={14} /> Adicionar Título
                                            </button>
                                        </div>

                                        {/* Dynamic Primary Texts */}
                                        <div className="form-group full-width">
                                            <label>Textos Principais</label>
                                            {campaignData.adSets.flatMap(as => as.ads).find(ad => ad.id === selectedNode)?.textos_principais?.map((texto, index) => (
                                                <div key={index} className="dynamic-input-row">
                                                    <textarea
                                                        rows="3"
                                                        placeholder={`Texto Principal ${index + 1}`}
                                                        value={texto}
                                                        onChange={e => {
                                                            const updatedAdSets = campaignData.adSets.map(as => {
                                                                const updatedAds = as.ads.map(ad => {
                                                                    if (ad.id === selectedNode) {
                                                                        const newTextos = [...ad.textos_principais];
                                                                        newTextos[index] = e.target.value;
                                                                        return { ...ad, textos_principais: newTextos };
                                                                    }
                                                                    return ad;
                                                                });
                                                                return { ...as, ads: updatedAds };
                                                            });
                                                            setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                        }}
                                                    ></textarea>
                                                    {index > 0 && (
                                                        <button
                                                            className="btn-icon-danger"
                                                            onClick={() => {
                                                                const updatedAdSets = campaignData.adSets.map(as => {
                                                                    const updatedAds = as.ads.map(ad => {
                                                                        if (ad.id === selectedNode) {
                                                                            return { ...ad, textos_principais: ad.textos_principais.filter((_, i) => i !== index) };
                                                                        }
                                                                        return ad;
                                                                    });
                                                                    return { ...as, ads: updatedAds };
                                                                });
                                                                setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                className="btn-add-more"
                                                onClick={() => {
                                                    const updatedAdSets = campaignData.adSets.map(as => {
                                                        const updatedAds = as.ads.map(ad => {
                                                            if (ad.id === selectedNode) {
                                                                return { ...ad, textos_principais: [...(ad.textos_principais || []), ''] };
                                                            }
                                                            return ad;
                                                        });
                                                        return { ...as, ads: updatedAds };
                                                    });
                                                    setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                }}
                                            >
                                                <Plus size={14} /> Adicionar Texto
                                            </button>
                                        </div>

                                        {/* Dynamic Descriptions */}
                                        <div className="form-group full-width">
                                            <label>Descrições (Opcionais)</label>
                                            {campaignData.adSets.flatMap(as => as.ads).find(ad => ad.id === selectedNode)?.descricoes?.map((desc, index) => (
                                                <div key={index} className="dynamic-input-row">
                                                    <input
                                                        type="text"
                                                        placeholder={`Descrição ${index + 1}`}
                                                        value={desc}
                                                        onChange={e => {
                                                            const updatedAdSets = campaignData.adSets.map(as => {
                                                                const updatedAds = as.ads.map(ad => {
                                                                    if (ad.id === selectedNode) {
                                                                        const newDescs = [...ad.descricoes];
                                                                        newDescs[index] = e.target.value;
                                                                        return { ...ad, descricoes: newDescs };
                                                                    }
                                                                    return ad;
                                                                });
                                                                return { ...as, ads: updatedAds };
                                                            });
                                                            setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                        }}
                                                    />
                                                    {index > 0 && (
                                                        <button
                                                            className="btn-icon-danger"
                                                            onClick={() => {
                                                                const updatedAdSets = campaignData.adSets.map(as => {
                                                                    const updatedAds = as.ads.map(ad => {
                                                                        if (ad.id === selectedNode) {
                                                                            return { ...ad, descricoes: ad.descricoes.filter((_, i) => i !== index) };
                                                                        }
                                                                        return ad;
                                                                    });
                                                                    return { ...as, ads: updatedAds };
                                                                });
                                                                setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                className="btn-add-more"
                                                onClick={() => {
                                                    const updatedAdSets = campaignData.adSets.map(as => {
                                                        const updatedAds = as.ads.map(ad => {
                                                            if (ad.id === selectedNode) {
                                                                return { ...ad, descricoes: [...(ad.descricoes || []), ''] };
                                                            }
                                                            return ad;
                                                        });
                                                        return { ...as, ads: updatedAds };
                                                    });
                                                    setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                }}
                                            >
                                                <Plus size={14} /> Adicionar Descrição
                                            </button>
                                        </div>

                                        <div className="form-group">
                                            <label>Chamada para Ação (CTA)</label>
                                            <select
                                                value={campaignData.adSets.flatMap(as => as.ads).find(ad => ad.id === selectedNode)?.cta || 'SAIBA_MAIS'}
                                                onChange={e => {
                                                    const updatedAdSets = campaignData.adSets.map(as => {
                                                        const updatedAds = as.ads.map(ad => ad.id === selectedNode ? { ...ad, cta: e.target.value } : as);
                                                        return { ...as, ads: updatedAds };
                                                    });
                                                    setCampaignData({ ...campaignData, adSets: updatedAdSets });
                                                }}
                                            >
                                                <option value="SAIBA_MAIS">Saiba Mais</option>
                                                <option value="FALE_CONOSCO">Fale Conosco</option>
                                                <option value="CADASTRE_SE">Cadastre-se</option>
                                                <option value="ENVIAR_MENSAGEM_WHATSAPP">Enviar Mensagem (WhatsApp)</option>
                                                <option value="COMPRAR_AGORA">Comprar Agora</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="media-upload-area">
                                        <div className="upload-placeholder">
                                            <UploadCloud size={48} color="#9ca3af" />
                                            <p>Arraste e solte o criativo aqui ou clique para fazer upload</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* Campaign Editor Styles */
                .campaign-editor {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 70px; /* Offset for collapsed sidebar */
                    /* left: 0; */
                    z-index: 100;
                    background: #f3f4f6;
                    display: flex;
                    flex-direction: column;
                    width: calc(100% - 70px);
                }
                
                /* Ensure it covers full screen if sidebar is pushed (optional) but user wants it to look good */
                
                .editor-header {
                    height: 60px;
                    background: white;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0 24px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    /* Ensure headers don't get overlapped by anything */
                }
                .header-left, .header-right {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                .btn-icon-text {
                    background: none;
                    border: none;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #6b7280;
                    font-size: 0.875rem;
                    cursor: pointer;
                    font-weight: 500;
                }
                .btn-icon-text:hover { color: #111827; }
                
                .campaign-breadcrumb {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.875rem;
                    color: #6b7280;
                    border-left: 1px solid #e5e7eb;
                    padding-left: 16px;
                }
                .breadcrumb-item.active {
                    color: #111827;
                    font-weight: 600;
                }

                .editor-body {
                    flex: 1;
                    display: flex;
                    overflow: hidden;
                }

                /* Sidebar / Hierarchy */
                .editor-sidebar {
                    width: 300px;
                    background: white;
                    border-right: 1px solid #e5e7eb;
                    display: flex;
                    flex-direction: column;
                    overflow-y: auto;
                }
                .hierarchy-tree {
                    padding: 16px;
                }
                .tree-node {
                    display: flex;
                    align-items: center;
                    justify-content: space-between; /* For actions */
                    padding: 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 0.15s;
                    margin-bottom: 2px;
                }
                .tree-node:hover {
                    background-color: #f3f4f6;
                }
                .tree-node.selected {
                    background-color: #eff6ff;
                }
                .tree-node.selected .node-name {
                    color: #2563eb;
                    font-weight: 500;
                }
                .tree-node .node-icon {
                    margin-right: 8px;
                    color: #6b7280;
                }
                .tree-node.selected .node-icon {
                    color: #2563eb;
                }
                .node-content {
                    display: flex;
                    align-items: center;
                    flex: 1;
                    min-width: 0;
                }
                .node-name {
                    font-size: 0.875rem;
                    color: #374151;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .expand-btn {
                    background: none;
                    border: none;
                    padding: 0;
                    margin-right: 4px;
                    cursor: pointer;
                    color: #9ca3af;
                }
                .expand-btn:hover { color: #6b7280; }
                
                .node-actions {
                    display: flex;
                    align-items: center;
                }

                .icon-btn-tree {
                    background: none;
                    border: none;
                    padding: 4px;
                    border-radius: 4px;
                    cursor: pointer;
                    color: #9ca3af;
                    opacity: 1; /* Always visible */
                    transition: color 0.2s, background-color 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .icon-btn-tree:hover {
                    background-color: #e5e7eb;
                    color: #374151;
                }
                
                .context-menu-dropdown {
                    background: white;
                    border-radius: 6px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    border: 1px solid #e5e7eb;
                    min-width: 160px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .context-menu-header {
                    padding: 8px 12px;
                    font-size: 0.75rem;
                    color: #6b7280;
                    background: #f9fafb;
                    border-bottom: 1px solid #f3f4f6;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .context-menu-dropdown button {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 10px 12px;
                    text-align: left;
                    background: none;
                    border: none;
                    font-size: 0.875rem;
                    color: #374151;
                    cursor: pointer;
                }
                .context-menu-dropdown button:hover {
                    background-color: #f3f4f6;
                }
                .context-menu-dropdown button.danger {
                    color: #ef4444;
                }
                .context-menu-dropdown button.danger:hover {
                    background-color: #fee2e2;
                }
                    border: none;
                    padding: 2px;
                    margin-right: 4px;
                    cursor: pointer;
                    color: #9ca3af;
                }
                .expand-btn:hover { color: #4b5563; }
                .tree-children {
                    margin-left: 20px;
                    border-left: 1px solid #e5e7eb;
                    padding-left: 4px;
                }
                .spacer { width: 24px; } /* Indent for items without expand button */
                
                .add-child-btn {
                    width: 100%;
                    text-align: left;
                    background: none;
                    border: none;
                    padding: 8px 8px 8px 32px;
                    color: #2563eb;
                    font-size: 0.80rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .add-child-btn:hover { text-decoration: underline; }

                /* Content Area */
                .editor-content {
                    flex: 1;
                    padding: 32px;
                    overflow-y: auto;
                    max-width: 900px; /* Readability */
                    margin: 0 auto;
                }
                .form-section {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    padding: 24px;
                    margin-bottom: 24px;
                }
                .form-header-details {
                    margin-bottom: 24px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 16px;
                }
                .form-header-details h2 {
                    font-size: 1.25rem;
                    color: #111827;
                    margin: 0 0 4px 0;
                }
                .form-header-details p {
                    color: #6b7280;
                    margin: 0;
                }
                .form-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .full-width { grid-column: 1 / -1; }
                
                .form-group label {
                    display: block;
                    font-size: 0.875rem;
                    font-weight: 500;
                    color: #374151;
                    margin-bottom: 6px;
                }
                .form-group input, .form-group select, .form-group textarea {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.875rem;
                }
                .dynamic-input-row {
                    display: flex;
                    gap: 8px;
                    margin-bottom: 8px;
                }
                .btn-icon-danger {
                    background: none;
                    border: none;
                    color: #ef4444;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .btn-icon-danger:hover {
                    background: #fee2e2;
                    border-radius: 4px;
                }
                .btn-add-more {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #2563eb;
                    background: none;
                    border: none;
                    font-size: 0.875rem;
                    cursor: pointer;
                    font-weight: 500;
                    margin-top: 4px;
                }
                .btn-add-more:hover {
                    text-decoration: underline;
                }
                
                .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
                    outline: none;
                    border-color: #2563eb;
                    box-shadow: 0 0 0 1px #2563eb;
                }
                
                .input-group-prefix {
                    display: flex;
                    align-items: center;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    overflow: hidden;
                }
                .input-group-prefix .prefix {
                    background: #f9fafb;
                    padding: 0 12px;
                    color: #6b7280;
                    border-right: 1px solid #d1d5db;
                    font-size: 0.875rem;
                    height: 40px;
                    display: flex;
                    align-items: center;
                }
                .input-group-prefix input {
                    border: none;
                    border-radius: 0;
                }
                .input-group-prefix input:focus {
                    box-shadow: none;
                }
                
                .media-upload-area {
                    border: 2px dashed #d1d5db;
                    border-radius: 8px;
                    padding: 40px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .media-upload-area:hover {
                    border-color: #2563eb;
                    background: #feffff;
                }
                .upload-placeholder p {
                    color: #6b7280;
                    margin-top: 12px;
                }
                
                .status-dot.draft {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #9ca3af;
                    display: inline-block;
                    margin-right: 6px;
                }
            `}</style>





            <style>{`
                .campaign - list - item {
                    display: flex;
                align-items: center;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                transition: all 0.2s;
                }
                .campaign-list-item:hover {
                    box - shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                border-color: #d1d5db;
                }
                .item-status-section {
                    position: relative;
                margin-right: 16px;
                }
                .status-icon-btn {
                    position: relative;
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                }
                .status-indicator {
                    position: absolute;
                bottom: 0;
                right: 0;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                border: 1px solid white;
                }
                .item-main-info {
                    flex: 1;
                min-width: 0; /* Truncate text */
                }
                .item-title {
                    font - size: 1rem;
                font-weight: 600;
                color: #111827;
                margin: 0 0 4px 0;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                }
                .item-meta {
                    display: flex;
                align-items: center;
                font-size: 0.875rem;
                color: #6b7280;
                }
                .meta-separator {
                    margin: 0 8px;
                }
                .item-metrics {
                    display: flex;
                gap: 24px;
                margin: 0 24px;
                text-align: right;
                }
                .metric-group {
                    display: flex;
                flex-direction: column;
                }
                .metric-label {
                    font - size: 0.75rem;
                color: #9ca3af;
                text-transform: uppercase;
                }
                .metric-value {
                    font - size: 0.875rem;
                font-weight: 500;
                color: #374151;
                }
                .item-actions {
                    position: relative;
                }
                .actions-menu-btn {
                    background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                border-radius: 4px;
                color: #9ca3af;
                transition: all 0.2s;
                }
                .actions-menu-btn:hover {
                    background - color: #f3f4f6;
                color: #374151;
                }
                .status-dropdown, .actions-dropdown {
                    position: absolute;
                top: 100%;
                left: 0;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 50;
                min-width: 140px;
                overflow: hidden;
                }
                .actions-dropdown {
                    left: auto;
                right: 0;
                }
                .dropdown-item {
                    display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                padding: 8px 12px;
                text-align: left;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.875rem;
                color: #374151;
                }
                .dropdown-item:hover {
                    background - color: #f9fafb;
                }
                .dropdown-item.danger {
                    color: #ef4444;
                }
                .dropdown-item.danger:hover {
                    background - color: #fef2f2;
                }
                .dropdown-divider {
                    height: 1px;
                background-color: #e5e7eb;
                margin: 4px 0;
                }
                .status-dot {
                    width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
                }
                .status-dot.active {background - color: #10b981; }
                .status-dot.paused {background - color: #f59e0b; }
                .status-dot.inactive {background - color: #ef4444; }

                /* Filter Styles Update */
                .campaigns-filters {
                    display: flex;
                flex-wrap: wrap;
                gap: 16px;
                align-items: flex-end;
                padding: 16px;
                background: white;
                border-bottom: 1px solid #e5e7eb;
                margin: -24px -24px 24px -24px;
                }
                .filter-group {
                    display: flex;
                flex-direction: column;
                gap: 4px;
                min-width: 150px;
                }
                .filter-group label {
                    font - size: 0.75rem;
                font-weight: 500;
                color: #6b7280;
                }
                .filter-group select {
                    padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-size: 0.875rem;
                color: #374151;
                background-color: white;
                }
                .sort-menu-container {
                    position: relative;
                margin-left: auto;
                }
                .btn-white {
                    background: white;
                border: 1px solid #d1d5db;
                color: #374151;
                }
                .btn-white:hover {
                    background: #f9fafb;
                border-color: #9ca3af;
                }
                .sort-dropdown {
                    position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                z-index: 60;
                min-width: 200px;
                margin-top: 8px;
                overflow: hidden;
                }
                .sort-header {
                    padding: 12px 16px;
                font-size: 0.75rem;
                font-weight: 600;
                color: #9ca3af;
                text-transform: uppercase;
                border-bottom: 1px solid #f3f4f6;
                background: #f9fafb;
                }
                .sort-options {
                    padding: 4px 0;
                }
                .sort-option {
                    width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 16px;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 0.875rem;
                color: #374151;
                text-align: left;
                }
                .sort-option:hover {
                    background - color: #f3f4f6;
                }
                .sort-option.active {
                    background - color: #eff6ff;
                color: #2563eb;
                font-weight: 500;
                }
                .sort-direction {
                    font - size: 0.75rem;
                color: #6b7280;
                background: #f3f4f6;
                padding: 2px 6px;
                border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default Campanhas;
