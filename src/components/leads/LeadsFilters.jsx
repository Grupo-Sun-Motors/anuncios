import React from 'react';
import { Search } from 'lucide-react';

const LeadsFilters = ({ filters, onFilterChange, quickFilter, onQuickFilterChange, accounts }) => {
    return (
        <div className="leads-filters">
            <div className="filter-group">
                <select value={quickFilter} onChange={(e) => onQuickFilterChange(e.target.value)}>
                    <option value="today">Hoje</option>
                    <option value="yesterday">Ontem</option>
                    <option value="last7days">Últimos 7 dias</option>
                    <option value="current-month">Este Mês</option>
                    <option value="last-month">Mês Passado</option>
                </select>
            </div>
            <div className="filter-group">
                <input
                    type="date"
                    value={filters.data_inicio}
                    onChange={(e) => onFilterChange('data_inicio', e.target.value)}
                />
                <span>até</span>
                <input
                    type="date"
                    value={filters.data_fim}
                    onChange={(e) => onFilterChange('data_fim', e.target.value)}
                />
            </div>
            <div className="filter-group">
                <select value={filters.conta_de_anuncio_id} onChange={(e) => onFilterChange('conta_de_anuncio_id', e.target.value)}>
                    <option value="">Todas as Contas</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.nome}</option>
                    ))}
                </select>
            </div>
            <div className="filter-group">
                <select value={filters.estagio} onChange={(e) => onFilterChange('estagio', e.target.value)}>
                    <option value="">Todos os Estágios</option>
                    <option value="Em análise">Em análise</option>
                    <option value="Em negociação">Em negociação</option>
                    <option value="Convertido">Convertido</option>
                    <option value="Perdido">Perdido</option>
                </select>
            </div>
            <div className="filter-group">
                <div className="search-input-wrapper">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Buscar formulário..."
                        value={filters.nome_formulario}
                        onChange={(e) => onFilterChange('nome_formulario', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default LeadsFilters;
