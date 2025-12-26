import React from 'react';
import { MoreVertical, Edit, Trash2, Folder, Image, LayoutGrid, List as ListIcon } from 'lucide-react';

const CampaignList = ({
    campaigns,
    viewMode,
    onEdit,
    onDelete,
    onToggleStatus
}) => {
    if (!campaigns || campaigns.length === 0) {
        return (
            <div className="empty-state">
                <p>Nenhuma campanha encontrada.</p>
            </div>
        );
    }

    const getStatusLabel = (status) => {
        const map = {
            'active': 'Ativa',
            'paused': 'Pausada',
            'inactive': 'Inativa'
        };
        return map[status] || status;
    };

    const getStatusClass = (status) => {
        const map = {
            'active': 'status-active',
            'paused': 'status-paused',
            'inactive': 'status-inactive'
        };
        return map[status] || '';
    };

    if (viewMode === 'grid') {
        return (
            <div className="campaigns-grid">
                {campaigns.map(campaign => (
                    <div key={campaign.id} className="campaign-card">
                        <div className="campaign-card-header">
                            <h3 className="campaign-title">{campaign.nome}</h3>
                            <div className="campaign-actions">
                                <button className="actions-menu-btn" onClick={() => onEdit(campaign.id)}>
                                    <MoreVertical size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="campaign-meta">
                            <div className="meta-item">
                                <Folder />
                                <span>{campaign.marcas?.nome || 'Sem Marca'}</span>
                            </div>
                            <div className="meta-item">
                                <Image />
                                <span>{campaign.plataformas?.nome || 'Sem Plataforma'}</span>
                            </div>
                        </div>

                        <div className={`campaign-status status-${campaign.status || 'inactive'}`}>
                            {getStatusLabel(campaign.status)}
                        </div>

                        <div className="campaign-stats">
                            <div className="stat-item">
                                <span className="stat-value">R$ {campaign.orcamento?.toLocaleString('pt-BR') || '0,00'}</span>
                                <span className="stat-label">Orçamento</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value">{campaign.resultados || 0}</span>
                                <span className="stat-label">Resultados</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="campaigns-list">
            <div className="list-header">
                <div className="col-name">Campanha</div>
                <div className="col-status">Status</div>
                <div className="col-brand">Marca</div>
                <div className="col-platform">Plataforma</div>
                <div className="col-actions">Ações</div>
            </div>
            <div className="list-body">
                {campaigns.map(campaign => (
                    <div key={campaign.id} className="list-row">
                        <div className="col-name">
                            <div className="campaign-info">
                                <Folder size={20} className="text-muted" />
                                <span className="campaign-name">{campaign.nome}</span>
                            </div>
                        </div>
                        <div className="col-status">
                            <span className={`status-badge ${getStatusClass(campaign.status)}`}>
                                {getStatusLabel(campaign.status)}
                            </span>
                        </div>
                        <div className="col-brand">{campaign.marcas?.nome || '-'}</div>
                        <div className="col-platform">{campaign.plataformas?.nome || '-'}</div>
                        <div className="col-actions">
                            <div className="actions-menu">
                                <button className="btn-icon" onClick={() => onEdit(campaign.id)}>
                                    <Edit size={16} />
                                </button>
                                <button className="btn-icon danger" onClick={() => onDelete(campaign.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CampaignList;
