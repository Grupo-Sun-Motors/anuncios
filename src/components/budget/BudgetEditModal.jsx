import React from 'react';
import Modal from '../common/Modal';

const BudgetEditModal = ({ isOpen, onClose, budget, onSave }) => {
    if (!budget) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Editar Orçamento">
            <form onSubmit={onSave}>
                <div className="form-group">
                    <label>Modelo</label>
                    <input type="text" value={budget.modelos?.nome || ''} disabled className="disabled" />
                </div>
                <div className="form-group">
                    <label>Orçamento Diário (R$)</label>
                    <input
                        type="number"
                        name="orcamento_diario_planejado"
                        defaultValue={budget.orcamento_diario_planejado}
                        step="0.01"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Resultados Planejados</label>
                    <input
                        type="number"
                        name="resultados_planejados"
                        defaultValue={budget.resultados_planejados}
                        step="1"
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Observações</label>
                    <textarea
                        name="observacoes"
                        defaultValue={budget.observacoes}
                        rows="3"
                    ></textarea>
                </div>
                <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">Salvar</button>
                </div>
            </form>
        </Modal>
    );
};

export default BudgetEditModal;
