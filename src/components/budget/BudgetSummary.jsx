import React from 'react';

const BudgetSummary = ({ brandTotals }) => {
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    if (Object.keys(brandTotals).length === 0) return null;

    return (
        <div className="budget-section brand-overview">
            <div className="section-header">
                <h2>Visão Geral de Investimentos por Marca</h2>
            </div>
            <div className="investment-cards">
                {Object.entries(brandTotals).map(([brandName, totals]) => (
                    <div className="investment-card" key={brandName}>
                        <div className="card-header">
                            <h3>{brandName}</h3>
                            <span className="amount">{formatCurrency(totals.total)}</span>
                        </div>
                        <div className="card-breakdown">
                            <div className="breakdown-item">
                                <span className="breakdown-label">Google Ads:</span>
                                <span className="breakdown-value">{formatCurrency(totals.google)}</span>
                            </div>
                            <div className="breakdown-item">
                                <span className="breakdown-label">Meta Ads:</span>
                                <span className="breakdown-value">{formatCurrency(totals.meta)}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BudgetSummary;
