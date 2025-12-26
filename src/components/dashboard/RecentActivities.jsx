import React from 'react';
import { Activity, ExternalLink, DollarSign, Users, Image as ImageIcon, Search, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RecentActivities = ({ activitiesData }) => {
    const navigate = useNavigate();

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays}d atrás`;
        if (diffHours > 0) return `${diffHours}h atrás`;
        return 'Agora';
    };

    const getActivityIcon = (tipo) => {
        switch (tipo) {
            case 'Orçamento': return DollarSign;
            case 'Público': return Users;
            case 'Criativo': return ImageIcon;
            case 'Palavra-chave': return Search;
            default: return Edit;
        }
    };

    if (!activitiesData || activitiesData.length === 0) {
        return (
            <div className="dashboard-widget recent-activities">
                <div className="widget-header">
                    <h3>Atividades Recentes</h3>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate('/otimizacoes')}>
                        <ExternalLink size={16} />
                        Ver Histórico
                    </button>
                </div>
                <div className="widget-content">
                    <div className="empty-state">
                        <Activity />
                        <p>Nenhuma atividade recente</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-widget recent-activities">
            <div className="widget-header">
                <h3>Atividades Recentes</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => navigate('/otimizacoes')}>
                    <ExternalLink size={16} />
                    Ver Histórico
                </button>
            </div>
            <div className="widget-content">
                <div className="activity-list">
                    {activitiesData.map((activity, index) => {
                        const Icon = getActivityIcon(activity.tipo_alteracao);
                        const dateField = activity.data_alteracao || activity.criado_em;
                        const timeAgo = getTimeAgo(dateField);
                        const description = activity.descricao || activity.tipo_alteracao || 'Atividade';
                        const entityName = activity.campanhas?.nome || activity.marcas?.nome || activity.plataformas?.nome || 'Sistema';

                        return (
                            <div className="activity-item" key={activity.id || index}>
                                <div className="activity-icon">
                                    <Icon size={16} />
                                </div>
                                <div className="activity-content">
                                    <h4>{description}</h4>
                                    <p>{entityName}</p>
                                </div>
                                <div className="activity-time">{timeAgo}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default RecentActivities;
