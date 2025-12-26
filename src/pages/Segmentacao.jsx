import React from 'react';
import { Plus, Eye, Edit, X, CheckCircle } from 'lucide-react';

const Segmentacao = () => {
    return (
        <div id="view-segmentacao" className="page-view">
            <div className="page-header">
                <h1>Segmentação de Público-Alvo</h1>
                <div className="page-actions">
                    <button className="btn btn-primary" id="add-publico-alvo-btn-segmentacao">
                        <Plus size={16} style={{ marginRight: '8px' }} />
                        Adicionar Público-Alvo
                    </button>
                </div>
            </div>

            {/* Seção KIA */}
            <section className="brand-section">
                <div className="section-header">
                    <h2>Kia Sun Motors</h2>
                </div>

                <div className="profile-box">
                    <div className="profile-header">
                        <h3>Perfil do Cliente Kia</h3>
                        <div className="profile-actions">
                            <button className="btn btn-sm btn-secondary btn-view-details-segmentacao" data-brand="kia">
                                <Eye size={16} style={{ marginRight: '8px' }} />
                                Ver Detalhes
                            </button>
                            <button className="btn btn-sm btn-primary btn-edit-segmentacao" data-brand="kia">
                                <Edit size={16} style={{ marginRight: '8px' }} />
                                Editar
                            </button>
                        </div>
                    </div>

                    <div className="summary-cards" id="kia-summary-cards-segmentacao">
                        {/* Cards serão preenchidos dinamicamente */}
                    </div>
                </div>

                <div className="models-table-container">
                    <table className="models-table" id="kia-table-segmentacao">
                        <thead>
                            <tr>
                                <th>Modelo</th>
                                <th>Segmento</th>
                                <th>Faixa de Idade</th>
                                <th>Gênero</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="kia-table-body-segmentacao">
                            {/* Linhas serão preenchidas dinamicamente */}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Seção Suzuki */}
            <section className="brand-section">
                <div className="section-header">
                    <h2>Suzuki Sun Motors</h2>
                </div>

                <div className="profile-box">
                    <div className="profile-header">
                        <h3>Perfil do Cliente Suzuki</h3>
                        <div className="profile-actions">
                            <button className="btn btn-sm btn-secondary btn-view-details-segmentacao" data-brand="suzuki">
                                <Eye size={16} style={{ marginRight: '8px' }} />
                                Ver Detalhes
                            </button>
                            <button className="btn btn-sm btn-primary btn-edit-segmentacao" data-brand="suzuki">
                                <Edit size={16} style={{ marginRight: '8px' }} />
                                Editar
                            </button>
                        </div>
                    </div>

                    <div className="summary-cards" id="suzuki-summary-cards-segmentacao">
                        {/* Cards serão preenchidos dinamicamente */}
                    </div>
                </div>

                <div className="models-table-container">
                    <table className="models-table" id="suzuki-table-segmentacao">
                        <thead>
                            <tr>
                                <th>Modelo</th>
                                <th>Segmento</th>
                                <th>Faixa de Idade</th>
                                <th>Gênero</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="suzuki-table-body-segmentacao">
                            {/* Linhas serão preenchidas dinamicamente */}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Confirmation Modal for Deletion */}
            <div id="delete-confirmation-modal-segmentacao" className="modal">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>Confirmar Exclusão</h2>
                        <button className="close-btn">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="modal-body">
                        <p>Tem certeza que deseja excluir este público-alvo? Esta ação não pode ser desfeita.</p>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="button" className="btn btn-danger">
                            Excluir
                        </button>
                    </div>
                </div>
            </div>

            {/* Menu Lateral de Detalhes */}
            <div id="details-overlay-segmentacao" className="details-overlay">
                <div id="details-sidemenu-segmentacao" className="details-sidemenu">
                    <div className="details-header">
                        <h3 id="details-title-segmentacao">Detalhes do Público-Alvo</h3>
                        <button className="btn-icon" id="close-details-btn-segmentacao">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="details-content" id="details-content-segmentacao">
                        {/* Conteúdo será preenchido dinamicamente */}
                    </div>
                </div>
            </div>

            {/* Modal de Edição */}
            <div id="edit-modal-segmentacao" className="modal">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2 id="edit-modal-title-segmentacao">Editar Público-Alvo</h2>
                        <button className="close-btn" id="close-modal-btn-segmentacao">
                            <X size={20} />
                        </button>
                    </div>

                    <form id="edit-form-segmentacao">
                        <div id="edit-form-fields-segmentacao">
                            {/* Campos serão preenchidos dinamicamente */}
                            <div className="form-group">
                                <label htmlFor="edit-modelo-segmentacao">Modelo Associado</label>
                                <input type="text" id="edit-modelo-segmentacao" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-nome-perfil-segmentacao">Nome do Perfil</label>
                                <input type="text" id="edit-nome-perfil-segmentacao" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-descricao-segmentacao">Descrição</label>
                                <textarea id="edit-descricao-segmentacao" rows="3"></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-faixa-etaria-segmentacao">Faixa Etária</label>
                                <input type="text" id="edit-faixa-etaria-segmentacao" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-genero-segmentacao">Gênero</label>
                                <select id="edit-genero-segmentacao">
                                    <option value="Todos">Todos</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-localizacao-segmentacao">Localização</label>
                                <input type="text" id="edit-localizacao-segmentacao" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-interesses-segmentacao">Interesses</label>
                                <textarea id="edit-interesses-segmentacao" rows="3" placeholder="Separados por vírgula"></textarea>
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-comportamentos-segmentacao">Comportamentos</label>
                                <textarea id="edit-comportamentos-segmentacao" rows="3" placeholder="Separados por vírgula"></textarea>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" id="cancel-modal-btn-segmentacao">
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Segmentacao;
