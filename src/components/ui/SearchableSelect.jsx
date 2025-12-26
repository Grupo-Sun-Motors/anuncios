import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import './SearchableSelect.css';

const SearchableSelect = ({ options, value, onChange, placeholder, disabled, className = '' }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    // Fecha dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = useMemo(
        () => options.filter(o => o.label.toLowerCase().includes(search.toLowerCase())),
        [options, search]
    );

    const selected = options.find(o => o.value === value);

    const handleSelect = (val) => {
        onChange(val);
        setOpen(false);
        setSearch('');
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setSearch('');
    };

    return (
        <div className={`searchable-select ${className}`} ref={ref}>
            <div
                className={`searchable-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setOpen(!open)}
            >
                <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <span style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {selected ? selected.label : placeholder}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selected && !disabled && (
                        <X
                            size={14}
                            style={{ cursor: 'pointer', color: '#94a3b8' }}
                            onClick={handleClear}
                            className="searchable-clear"
                        />
                    )}
                    <ChevronDown size={16} />
                </div>
            </div>
            {open && (
                <div className="searchable-dropdown">
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="searchable-options">
                        {filtered.length === 0 && <div className="searchable-empty">Nenhum resultado</div>}
                        {filtered.map(opt => (
                            <div
                                key={opt.value}
                                className={`searchable-option ${opt.value === value ? 'selected' : ''}`}
                                onClick={() => handleSelect(opt.value)}
                            >
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
