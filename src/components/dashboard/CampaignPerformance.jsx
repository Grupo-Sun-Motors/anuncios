import React from 'react';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CampaignPerformance = ({ campaignsData, performanceData }) => {
    const navigate = useNavigate();
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    if (!campaignsData || campaignsData.length === 0) {
        return (
            <div className="dashboard-widget campaign-performance">
                <div className="widget-header">
                    <h3>Top Campanhas</h3>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate('/campanhas')}>
                        <ExternalLink size={16} />
                        Ver Todas
                    </button>
                </div>
                <div className="widget-content">
                    <div className="empty-state">
                        <TrendingUp />
                        <p>Nenhuma campanha encontrada</p>
                    </div>
                </div>
            </div>
        );
    }

    const topCampaigns = campaignsData.slice(0, 5);

    return (
        <div className="dashboard-widget campaign-performance">
            <div className="widget-header">
                <h3>Top Campanhas</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => navigate('/campanhas')}>
                    <ExternalLink size={16} />
                    Ver Todas
                </button>
            </div>
            <div className="widget-content">
                <div className="campaign-list">
                    {topCampaigns.map(campaign => {
                        const campaignPerf = performanceData?.find(p => p.campanha_id === campaign.id);
                        const cost = campaignPerf?.custo || campaign.orcamento || 0;
                        const conversions = campaignPerf?.conversoes || 0;
                        const brandName = campaign.marca?.nome || campaign.marcas?.nome || 'Marca';
                        const platformName = campaign.contas_de_anuncio?.plataformas?.nome ||
                            campaign.conta_de_anuncio?.plataformas?.nome || 'Plataforma';

                        return (
                            <div className="campaign-item" key={campaign.id}>
                                <div className="campaign-info">
                                    <h4>{campaign.nome || 'Campanha'}</h4>
                                    <p>{brandName} • {platformName}</p>
                                </div>
                                <div className="campaign-metrics">
                                    <div className="metric-value">{formatCurrency(cost)}</div>
                                    <div className="metric-label">{conversions} conversões</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default CampaignPerformance;
