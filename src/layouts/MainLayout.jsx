import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MobileHeader from '../components/MobileHeader';
import { useAuth } from '../contexts/AuthContext';
import { hasAccess, getInitialRoute } from '../utils/permissions';

const MainLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { user, profile, loading, profileLoading } = useAuth();
    const location = useLocation();

    // Check localStorage for collapsed state on mount
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState === 'true') {
            setIsSidebarCollapsed(true);
        }
    }, []);

    const toggleSidebar = () => {
        const newState = !isSidebarCollapsed;
        setIsSidebarCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', newState.toString());
    };

    // Show loading spinner while auth or profile is loading
    if (loading || profileLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '1rem', color: '#6b7280' }}>Carregando aplicação...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Wait for profile to load before applying RBAC
    // If user is authenticated but profile not yet loaded, show loading
    if (user && !profile) {
        console.log('[MainLayout] Waiting for profile to load or fallback...');
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '1rem', color: '#ef4444' }}>Não foi possível carregar o perfil. Recarregue ou tente novamente.</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // RBAC: Verifica acesso usando o valor do campo cargo de perfil_de_usuario
    const cargo = profile?.cargo;
    const currentPath = location.pathname;

    console.log(`[MainLayout] cargo='${cargo}' path='${currentPath}'`);

    // Only apply RBAC if profile has cargo defined
    if (cargo && !hasAccess(cargo, currentPath)) {
        const redirectPath = getInitialRoute(cargo);
        console.warn(`[RBAC] Redirecionando de ${currentPath} para ${redirectPath} - cargo '${cargo}' não tem acesso.`);

        // Previne loop infinito de redirecionamento
        if (currentPath !== redirectPath) {
            return <Navigate to={redirectPath} replace />;
        }
    }

    return (
        <div className="app-container">
            <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />

            <Sidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isCollapsed={isSidebarCollapsed}
                toggleCollapse={toggleSidebar}
            />

            <main className={`main-content ${isSidebarCollapsed ? 'collapsed' : ''}`} id="main-content">
                <div className="page-content">
                    <Outlet context={{ isSidebarCollapsed, setIsSidebarCollapsed }} />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;

