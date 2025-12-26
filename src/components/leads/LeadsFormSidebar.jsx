import React from 'react';
import { X } from 'lucide-react';

const LeadsFormSidebar = ({ isOpen, onClose, formData, onInputChange, onSubmit, accounts, isEditing }) => {
    if (!isOpen) return null;

    return (
        <div className="sidebar-overlay active" onClick={(e) => { if (e.target.className.includes('sidebar-overlay')) onClose(); }}>
            <div className="sidebar-right">
                <div className="sidebar-header">
                    <h3>{isEditing ? 'Editar Lead' : 'Novo Lead'}</h3>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div className="sidebar-content">
                    <form onSubmit={onSubmit}>
                        <div className="form-group">
                            <label>Nome</label>
                            <input type="text" name="nome" value={formData.nome} onChange={onInputChange} required />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input type="email" name="email" value={formData.email} onChange={onInputChange} />
                        </div>
                        <div className="form-group">
                            <label>Telefone</label>
                            <input type="text" name="telefone" value={formData.telefone} onChange={onInputChange} />
                        </div>
                        <div className="form-group">
                            <label>WhatsApp</label>
                            <input type="text" name="whatsapp" value={formData.whatsapp} onChange={onInputChange} />
                        </div>
                        <div className="form-group">
                            <label>Conta de Anúncio</label>
                            <select name="conta_de_anuncio_id" value={formData.conta_de_anuncio_id} onChange={onInputChange}>
                                <option value="">Selecione...</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.nome}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Estágio</label>
                            <select name="estagio" value={formData.estagio} onChange={onInputChange}>
                                <option value="Em análise">Em análise</option>
                                <option value="Em negociação">Em negociação</option>
                                <option value="Convertido">Convertido</option>
                                <option value="Perdido">Perdido</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Nome do Formulário</label>
                            <input type="text" name="nome_formulario" value={formData.nome_formulario} onChange={onInputChange} />
                        </div>
                        <div className="form-group">
                            <label>Fonte</label>
                            <input type="text" name="fonte" value={formData.fonte} onChange={onInputChange} />
                        </div>
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn btn-primary">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LeadsFormSidebar;
