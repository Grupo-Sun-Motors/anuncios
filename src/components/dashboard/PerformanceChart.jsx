import React from 'react';
import { BarChart3, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PerformanceChart = () => {
    const navigate = useNavigate();

    return (
        <div className="dashboard-widget performance-chart">
            <div className="widget-header">
                <h3>Gráfico de Performance</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => navigate('/relatorios')}>
                    <ExternalLink size={16} />
                    Ver Relatório
                </button>
            </div>
            <div className="widget-content">
                <div className="chart-placeholder">
                    <div style={{ textAlign: 'center' }}>
                        <BarChart3 style={{ width: '48px', height: '48px', marginBottom: '1rem', margin: '0 auto' }} />
                        <p>Gráfico de Performance</p>
                        <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                            Integração com Chart.js será implementada aqui
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceChart;
