import React from 'react';
import { Menu, Zap } from 'lucide-react';

const MobileHeader = ({ onMenuClick }) => {
    return (
        <header className="mobile-header">
            <button className="mobile-menu-btn" onClick={onMenuClick}>
                <Menu />
            </button>
            <div className="mobile-logo">
                <Zap className="text-blue-600" size={20} />
                <span>Sun Motors</span>
            </div>
        </header>
    );
};

export default MobileHeader;
