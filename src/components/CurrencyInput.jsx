import React from 'react';

const CurrencyInput = ({ value, onChange, ...props }) => {
    const formatCurrency = (val) => {
        if (!val) return '';
        const number = val.replace(/\D/g, '') / 100;
        return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleChange = (e) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        const numberValue = rawValue ? parseFloat(rawValue) / 100 : '';

        // Call parent onChange with the numeric value (or event with numeric value)
        // We'll mimic a standard event object for compatibility
        onChange({
            target: {
                name: props.name,
                value: numberValue
            }
        });
    };

    return (
        <input
            {...props}
            type="text"
            value={formatCurrency(value ? value.toFixed(2) : '')}
            onChange={handleChange}
        />
    );
};

export default CurrencyInput;
