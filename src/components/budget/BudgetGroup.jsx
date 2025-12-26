import React from 'react';
import { Edit, Trash2 } from 'lucide-react';

const BudgetGroup = ({ group, onToggleStatus, onUpdateBudget, onEdit, onDelete }) => {
    const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const statusClass = group.investments.balance >= 0 ? 'status-ok' : 'status-over';

    return (
        <div className="budget-section">
            <div className="section-header">
                <h2>{group.account.nome}</h2>
            </div>

            <div className="investment-cards">
                <div className="investment-card">
                    <div className="card-header">
                        <h3>Orçamento Planejado</h3>
                        <span className="amount">{formatCurrency(group.investments.planned)}</span>
                    </div>
                </div>
                <div className="investment-card">
                    <div className="card-header">
                        <h3>Meta da Plataforma</h3>
                        <span className="amount">{formatCurrency(group.investments.target)}</span>
                    </div>
                </div>
                <div className="investment-card">
                    <div className="card-header">
                        <h3>Saldo</h3>
                        <span className={`amount ${statusClass}`}>{formatCurrency(group.investments.balance)}</span>
                    </div>
                </div>
            </div>

            <div className="budget-table-container">
                <table className="budget-table">
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Modelo</th>
                            <th>Orç. Diário</th>
                            <th>Orç. Total</th>
                            <th>Results</th>
                            <th>Custo/Res.</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {group.detailedBudgets.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="empty-state">
                                    Nenhum orçamento detalhado encontrado. Use o botão "Adicionar Orçamento de Modelo" para criar um novo.
                                </td>
                            </tr>
                        ) : (
                            group.detailedBudgets.map(budget => {
                                const costPerResult = budget.resultados_planejados > 0 ?
                                    (budget.orcamento_total_planejado || 0) / budget.resultados_planejados : 0;

                                return (
                                    <tr key={budget.id}>
                                        <td>
                                            <label className="switch">
                                                <input
                                                    type="checkbox"
                                                    checked={budget.ativo}
                                                    onChange={() => onToggleStatus(budget.id, budget.ativo)}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </td>
                                        <td>{budget.modelos?.nome || '-'}</td>
                                        <td>
                                            <input
                                                type="number"
                                                className="budget-input"
                                                defaultValue={budget.orcamento_diario_planejado || 0}
                                                step="0.01"
                                                onBlur={(e) => onUpdateBudget(budget.id, 'orcamento_diario_planejado', parseFloat(e.target.value))}
                                            />
                                        </td>
                                        <td>
                                            <span className="calculated-total">{formatCurrency(budget.orcamento_total_planejado || 0)}</span>
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="budget-input results-input"
                                                defaultValue={budget.resultados_planejados || 0}
                                                step="1"
                                                onBlur={(e) => onUpdateBudget(budget.id, 'resultados_planejados', parseInt(e.target.value))}
                                            />
                                        </td>
                                        <td className="calculated">{formatCurrency(costPerResult)}</td>
                                        <td>
                                            <div className="actions-row">
                                                <button className="btn-icon" onClick={() => onEdit(budget)} title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="btn-icon danger" onClick={() => onDelete(budget.id)} title="Excluir">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BudgetGroup;
