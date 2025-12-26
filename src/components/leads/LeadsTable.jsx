import React from 'react';
import { Eye, Edit, Trash2, Copy, MessageCircle, Search, Handshake, CheckCircle, Ban, FileText, ChevronLeft, ChevronRight } from 'lucide-react';

const LeadsTable = ({ leads, loading, currentPage, itemsPerPage, totalPages, onPageChange, onEdit, onDelete, onView, onUpdateStage }) => {

    const getStageIcon = (stage) => {
        switch (stage) {
            case 'Em análise': return { icon: Search, color: '#6366f1', class: 'status-analise' };
            case 'Em negociação': return { icon: Handshake, color: '#f59e0b', class: 'status-negociacao' };
            case 'Convertido': return { icon: CheckCircle, color: '#10b981', class: 'status-convertido' };
            case 'Perdido': return { icon: Ban, color: '#ef4444', class: 'status-perdido' };
            default: return { icon: FileText, color: '#6b7280', class: 'status-default' };
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Could add a toast notification here
    };

    const paginatedLeads = leads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) {
        return (
            <div className="leads-loading-overlay active">
                <div className="leads-loading-content">
                    <div className="leads-loading-spinner">
                        <div className="spinner"></div>
                    </div>
                    <div className="leads-loading-text">
                        <p>Carregando leads...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (leads.length === 0) {
        return (
            <div className="empty-leads">
                <FileText size={48} />
                <h3>Nenhum lead encontrado</h3>
                <p>Tente ajustar seus filtros ou adicione um novo lead.</p>
            </div>
        );
    }

    return (
        <>
            <div className="leads-list-container">
                <table className="leads-table">
                    <thead>
                        <tr>
                            <th style={{ width: '160px' }}>Estágio</th>
                            <th>Nome</th>
                            <th>Contato</th>
                            <th>Formulário</th>
                            <th>Data</th>
                            <th style={{ width: '100px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedLeads.map(lead => {
                            const stageInfo = getStageIcon(lead.estagio);
                            const StageIcon = stageInfo.icon;
                            return (
                                <tr key={lead.id}>
                                    <td>
                                        <div className="estagio-cell">
                                            <div className={`status-badge`} style={{ backgroundColor: `${stageInfo.color}20`, color: stageInfo.color, border: `1px solid ${stageInfo.color}40` }}>
                                                <StageIcon size={14} />
                                                <select
                                                    value={lead.estagio}
                                                    onChange={(e) => onUpdateStage(lead.id, e.target.value)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'inherit',
                                                        fontSize: 'inherit',
                                                        fontWeight: 'inherit',
                                                        cursor: 'pointer',
                                                        outline: 'none',
                                                        width: '100%'
                                                    }}
                                                >
                                                    <option value="Em análise">Em análise</option>
                                                    <option value="Em negociação">Em negociação</option>
                                                    <option value="Convertido">Convertido</option>
                                                    <option value="Perdido">Perdido</option>
                                                </select>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500, color: '#1f2937' }}>{lead.nome || 'Sem nome'}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{lead.email}</div>
                                    </td>
                                    <td>
                                        <div className="contact-field formatted">
                                            {lead.telefone ? (
                                                <>
                                                    <span className="contact-value copyable-text" onClick={() => copyToClipboard(lead.telefone)} title="Copiar">
                                                        {lead.telefone}
                                                    </span>
                                                    {lead.whatsapp && (
                                                        <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="contact-action whatsapp-action">
                                                            <MessageCircle size={16} />
                                                        </a>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="no-info">-</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{lead.nome_formulario || '-'}</td>
                                    <td>{new Date(lead.criado_em).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-icon" onClick={() => onView(lead)} title="Ver Detalhes">
                                                <Eye size={16} />
                                            </button>
                                            <button className="btn-icon" onClick={() => onEdit(lead)} title="Editar">
                                                <Edit size={16} />
                                            </button>
                                            <button className="btn-icon btn-danger" onClick={() => onDelete(lead.id)} title="Excluir">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="leads-pagination">
                <div className="pagination-info">
                    Mostrando <span>{(currentPage - 1) * itemsPerPage + 1}</span> a <span>{Math.min(currentPage * itemsPerPage, leads.length)}</span> de <span>{leads.length}</span> leads
                </div>
                <div className="pagination-controls">
                    <div className="pagination-buttons">
                        <button
                            className="btn-pagination"
                            disabled={currentPage === 1}
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="pagination-page-info">
                            Página <span>{currentPage}</span> de <span>{totalPages}</span>
                        </div>
                        <button
                            className="btn-pagination"
                            disabled={currentPage === totalPages}
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LeadsTable;
