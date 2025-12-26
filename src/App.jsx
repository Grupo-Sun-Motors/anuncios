import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Budget from './pages/Budget';
import BudgetModelForm from './pages/BudgetModelForm';
import PublicoAlvo from './pages/PublicoAlvo';
import Campanhas from './pages/Campanhas';
import Otimizacoes from './pages/Otimizacoes';
import Relatorios from './pages/Relatorios';
import Leads from './pages/Leads';
import Segmentacao from './pages/Segmentacao';
import Produtos from './pages/Produtos';
import Uploads from './pages/Uploads';
import Configuracoes from './pages/Configuracoes';
import Auth from './pages/Auth';
import Midias from './pages/Midias';
import Anuncios from './pages/Anuncios';
import Onboard from './pages/Onboard';
import LandingPages from './pages/LandingPages';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9fafb' }}>
                <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3498db', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <p style={{ marginTop: '1rem', color: '#6b7280' }}>Carregando aplicação...</p>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <ToastProvider>
                <Router>
                    <Routes>
                        <Route path="/auth" element={<Auth />} />

                        <Route path="/" element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }>
                            <Route index element={<Dashboard />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="orcamento" element={<Budget />} />
                            <Route path="orcamento/novo" element={<BudgetModelForm />} />
                            <Route path="publico-alvo" element={<PublicoAlvo />} />
                            <Route path="otimizacoes" element={<Otimizacoes />} />
                            <Route path="relatorios" element={<Relatorios />} />
                            <Route path="segmentacao" element={<Segmentacao />} />
                            <Route path="campanhas" element={<Campanhas />} />
                            <Route path="leads" element={<Leads />} />
                            <Route path="produtos" element={<Produtos />} />
                            <Route path="uploads" element={<Uploads />} />
                            <Route path="midias" element={<Midias />} />
                            <Route path="anuncios" element={<Anuncios />} />
                            <Route path="configuracoes" element={<Configuracoes />} />
                            <Route path="onboard" element={<Onboard />} />
                            <Route path="landing-pages" element={<LandingPages />} />
                        </Route>
                    </Routes>
                </Router>
            </ToastProvider>
        </AuthProvider>
    );
}

export default App;
