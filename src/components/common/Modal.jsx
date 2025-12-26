import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import '../../styles/style.css'; // Ensure global styles are available

const Modal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClass = size === 'large' ? 'large' : size === 'small' ? 'small' : '';

    return (
        <div className="modal active" onClick={(e) => e.target.className.includes('modal') && onClose()}>
            <div className={`modal-content ${sizeClass}`}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
