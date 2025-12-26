import React from 'react';
import { DollarSign, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const BudgetOverview = ({ budgetData }) => {
    const navigate = useNavigate();

    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    if (!budgetData || budgetData.length === 0) {
        return (
            <div className="dashboard-widget budget-overview">
                <div className="widget-header">
                    <h3>Acompanhamento de Orçamento</h3>
                    <button className="btn btn-sm btn-secondary" onClick={() => navigate('/orcamento')}>
                        <ExternalLink size={16} />
                        Ver Detalhes
                    </button>
                </div>
                <div className="widget-content">
                    <div className="empty-state">
                        <DollarSign />
                        <p>Nenhum orçamento encontrado para este período</p>
                    </div>
                </div>
            </div>
        );
    }

    let totalBudget = 0;
    let totalSpent = 0;

    const budgetItems = budgetData.map(budget => {
        const total = budget.meta_investimento_total || 0;
        const spent = total * 0.65; // Simulated spending data
        const percentage = total > 0 ? (spent / total) * 100 : 0;

        totalBudget += total;
        totalSpent += spent;

        let statusClass = '';
        if (percentage >= 90) statusClass = 'danger';
        else if (percentage >= 75) statusClass = 'warning';

        return (
            <div className="budget-item" key={budget.id}>
                <div>
                    <div className="budget-label">{budget.marcas?.nome || 'Marca'}</div>
                    <div className="budget-amount">
                        {formatCurrency(spent)} / {formatCurrency(total)}
                    </div>
                    <div className="budget-bar">
                        <div className={`budget-fill ${statusClass}`} style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                    </div>
                </div>
            </div>
        );
    });

    const totalPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    let totalStatusClass = '';
    if (totalPercentage >= 90) totalStatusClass = 'danger';
    else if (totalPercentage >= 75) totalStatusClass = 'warning';

    return (
        <div className="dashboard-widget budget-overview">
            <div className="widget-header">
                <h3>Acompanhamento de Orçamento</h3>
                <button className="btn btn-sm btn-secondary" onClick={() => navigate('/orcamento')}>
                    <ExternalLink size={16} />
                    Ver Detalhes
                </button>
            </div>
            <div className="widget-content">
                <div className="budget-item" style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                    <div>
                        <div className="budget-label" style={{ fontWeight: 600 }}>Total Geral</div>
                        <div className="budget-amount" style={{ fontSize: '1.125rem', fontWeight: 700 }}>
                            {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
                        </div>
                        <div className="budget-bar">
                            <div className={`budget-fill ${totalStatusClass}`} style={{ width: `${Math.min(totalPercentage, 100)}%` }}></div>
                        </div>
                    </div>
                </div>
                {budgetItems}
            </div>
        </div>
    );
};

export default BudgetOverview;
