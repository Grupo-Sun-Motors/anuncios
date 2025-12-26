import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { hasAccess } from '../utils/permissions';
import {
    Zap,
    ChevronLeft,
    BarChart3,
    DollarSign,
    Users,
    TrendingUp,
    FileText,
    PieChart,
    Megaphone,
    UserPlus,
    Package,
    Upload,
    Settings,
    Sparkles,
    ArrowRight,
    Image,
    Layout,
    Globe
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose, isCollapsed, toggleCollapse }) => {
    const { user, profile } = useAuth();

    // Fallback display if profile not loaded yet (should be loaded by AuthContext)
    const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
    const displayName = profile?.nome || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
    const initial = (displayName[0] || 'U').toUpperCase();
    const userRole = profile?.cargo;

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${isOpen ? 'active' : ''}`}
                onClick={onClose}
            ></div>

            <nav className={`sidebar ${isOpen ? 'mobile-open' : ''} ${isCollapsed ? 'collapsed' : ''}`} id="sidebar">
                <div className="sidebar-header">
                    <a
                        href="https://topstack.com.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="logo"
                        title="Ir para TopStack"
                        style={{ textDecoration: 'none' }}
                    >
                        <img
                            src={isCollapsed
                                ? "https://agdvozsqcrszflzsimyl.supabase.co/storage/v1/object/public/TOPSTACK/topstack-logo-1x1.png"
                                : "https://agdvozsqcrszflzsimyl.supabase.co/storage/v1/object/public/TOPSTACK/topstack-logo-3x1.png"
                            }
                            alt="TopStack"
                            style={{
                                height: '32px',
                                width: 'auto',
                                display: 'block',
                                transition: 'all 0.2s ease'
                            }}
                        />
                    </a>
                    {/* Desktop Toggle */}
                    <button className="desktop-toggle" onClick={toggleCollapse}>
                        <ChevronLeft />
                    </button>
                    {/* Mobile Close */}
                    <button className="mobile-close-btn" onClick={onClose} style={{ display: 'none' }}>
                        <ChevronLeft />
                    </button>
                </div>

                <div className="nav-menu">
                    {hasAccess(userRole, '/') && (
                        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                            <BarChart3 />
                            <span className="nav-text">Dashboard</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/onboard') && (
                        <NavLink to="/onboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Layout />
                            <span className="nav-text">Onboard</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/orcamento') && (
                        <NavLink to="/orcamento" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <DollarSign />
                            <span className="nav-text">Orçamento</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/publico-alvo') && (
                        <NavLink to="/publico-alvo" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Users />
                            <span className="nav-text">Público-Alvo</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/otimizacoes') && (
                        <NavLink to="/otimizacoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <TrendingUp />
                            <span className="nav-text">Otimizações</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/relatorios') && (
                        <a
                            href="https://topstack-ads-anatlytics.netlify.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="nav-item"
                        >
                            <FileText />
                            <span className="nav-text">Relatórios</span>
                        </a>
                    )}
                    {hasAccess(userRole, '/segmentacao') && (
                        <NavLink to="/segmentacao" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <PieChart />
                            <span className="nav-text">Segmentação</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/campanhas') && (
                        <NavLink to="/campanhas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Megaphone />
                            <span className="nav-text">Campanhas</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/leads') && (
                        <NavLink to="/leads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <UserPlus />
                            <span className="nav-text">Leads</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/produtos') && (
                        <NavLink to="/produtos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Package />
                            <span className="nav-text">Produtos</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/midias') && (
                        <NavLink to="/midias" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Image />
                            <span className="nav-text">Mídias</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/anuncios') && (
                        <NavLink to="/anuncios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Layout />
                            <span className="nav-text">Anúncios</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/landing-pages') && (
                        <NavLink to="/landing-pages" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Globe />
                            <span className="nav-text">Landing Pages</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/uploads') && (
                        <NavLink to="/uploads" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Upload />
                            <span className="nav-text">Uploads</span>
                        </NavLink>
                    )}
                    {hasAccess(userRole, '/configuracoes') && (
                        <NavLink to="/configuracoes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Settings />
                            <span className="nav-text">Configurações</span>
                        </NavLink>
                    )}

                    <div className="nav-divider"></div>

                    {user && (
                        <div className="nav-item user-profile-display" style={{ marginTop: 'auto', cursor: 'default', background: 'transparent' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: '#3b82f6',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0,
                                overflow: 'hidden',
                                border: '2px solid #2563eb'
                            }}>
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt="User Avatar"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    initial
                                )}
                            </div>
                            <div className="nav-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>
                                    {displayName}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Online</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="sidebar-footer" style={{ display: 'none' }}>
                    <div className="hyzy-promo">
                        <div className="hyzy-header">
                            <Sparkles />
                            <span className="hyzy-name">HYZY.IO</span>
                        </div>
                        <div className="plan-status">
                            <span className="plan-badge">Free</span>
                            <span className="plan-text">Plano Atual</span>
                        </div>
                        <button className="upgrade-btn">
                            <span>Upgrade para PRO</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
