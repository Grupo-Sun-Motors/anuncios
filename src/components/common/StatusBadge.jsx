import React from 'react';

const StatusBadge = ({ status, type = 'default' }) => {
    const getStatusClass = (status) => {
        const lowerStatus = status?.toLowerCase() || '';
        if (lowerStatus.includes('análise') || lowerStatus.includes('analise')) return 'status-warning';
        if (lowerStatus.includes('negociação') || lowerStatus.includes('negociacao')) return 'status-info';
        if (lowerStatus.includes('convertido') || lowerStatus.includes('ganho')) return 'status-success';
        if (lowerStatus.includes('perdido')) return 'status-danger';
        if (lowerStatus.includes('ativo')) return 'status-success';
        if (lowerStatus.includes('pausado') || lowerStatus.includes('inativo')) return 'status-secondary';
        return 'status-default';
    };

    return (
        <span className={`status-badge ${getStatusClass(status)}`}>
            {status}
        </span>
    );
};

export default StatusBadge;
