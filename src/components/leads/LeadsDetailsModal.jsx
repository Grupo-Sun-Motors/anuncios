import React from 'react';
import Modal from '../common/Modal';

const LeadsDetailsModal = ({ isOpen, onClose, lead }) => {
    if (!lead) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalhes do Lead">
            <div className="details-grid">
                <div className="detail-item"><strong>Nome:</strong> {lead.nome}</div>
                <div className="detail-item"><strong>Email:</strong> {lead.email || '-'}</div>
                <div className="detail-item"><strong>Telefone:</strong> {lead.telefone || '-'}</div>
                <div className="detail-item"><strong>WhatsApp:</strong> {lead.whatsapp || '-'}</div>
                <div className="detail-item"><strong>Estágio:</strong> {lead.estagio}</div>
                <div className="detail-item"><strong>Conta:</strong> {lead.conta_de_anuncio?.nome || '-'}</div>
                <div className="detail-item"><strong>Formulário:</strong> {lead.nome_formulario || '-'}</div>
                <div className="detail-item"><strong>Fonte:</strong> {lead.fonte || '-'}</div>
                <div className="detail-item"><strong>Canal:</strong> {lead.canal || '-'}</div>
                <div className="detail-item"><strong>Data Criação:</strong> {new Date(lead.criado_em).toLocaleString('pt-BR')}</div>
            </div>
        </Modal>
    );
};

export default LeadsDetailsModal;
