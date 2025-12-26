import React from 'react';
import '../styles/components.css'; // Garantir que os estilos estejam carregados

const Preloader = ({ message = "Carregando..." }) => {
    return (
        <div className="global-preloader-overlay">
            <div className="global-preloader-content">
                <div className="global-spinner"></div>
                <div className="global-preloader-text">{message}</div>
            </div>
        </div>
    );
};

export default Preloader;
