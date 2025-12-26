import React, { useState, useEffect } from 'react';
import { User, Lock, CreditCard, LogOut, Save, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../services-apis/supabase/client';
import * as perfilService from '../services-apis/supabase/perfilUsuarioService';
import * as configService from '../services-apis/supabase/configService';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('perfil');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [userPlan, setUserPlan] = useState('Free');
    const [notification, setNotification] = useState(null);

    // Profile Form State
    const [profileData, setProfileData] = useState({
        nome: '',
        telefone: '',
        cargo: '',
        avatar_url: ''
    });

    // Password Form State
    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);

                // Load Profile
                const profileData = await perfilService.buscarPerfilUsuario(user.id);
                setProfile(profileData);
                if (profileData) {
                    setProfileData({
                        nome: profileData.nome || '',
                        telefone: profileData.telefone || '',
                        cargo: profileData.cargo || '',
                        avatar_url: profileData.avatar_url || ''
                    });
                } else {
                    // Initialize with email if no profile
                    setProfileData(prev => ({ ...prev, nome: user.email.split('@')[0] }));
                }

                // Load Plan
                const planData = await configService.buscarPerfilUsuario(user.id);
                if (planData?.plan) {
                    setUserPlan(planData.plan);
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            showNotification('error', 'Erro ao carregar dados do usuário');
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        if (name === 'telefone') {
            // Format phone
            const numbers = value.replace(/\D/g, '').slice(0, 11);
            let formatted = numbers;
            if (numbers.length > 2) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
            if (numbers.length > 7) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
            setProfileData(prev => ({ ...prev, [name]: formatted }));
        } else {
            setProfileData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (!profileData.nome.trim()) throw new Error('Nome é obrigatório');

            const updatedProfile = await perfilService.criarOuAtualizarPerfilUsuario(user.id, {
                ...profileData,
                email: user.email
            });

            if (updatedProfile) {
                setProfile(updatedProfile);
                showNotification('success', 'Perfil atualizado com sucesso!');
            } else {
                throw new Error('Falha ao atualizar perfil');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('error', error.message || 'Erro ao atualizar perfil');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showNotification('error', 'As senhas não coincidem');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            showNotification('error', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });
            if (error) throw error;
            showNotification('success', 'Senha alterada com sucesso!');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Error changing password:', error);
            showNotification('error', error.message || 'Erro ao alterar senha');
        } finally {
            setSaving(false);
        }
    };

    const handlePlanUpgrade = async (plan) => {
        if (plan === userPlan) return;
        if (!window.confirm(`Deseja alterar seu plano para ${plan}?`)) return;

        setSaving(true);
        try {
            // Simulate payment
            await new Promise(resolve => setTimeout(resolve, 1500));

            await configService.atualizarPlanoUsuario(user.id, plan);
            setUserPlan(plan);
            showNotification('success', `Plano alterado para ${plan} com sucesso!`);
        } catch (error) {
            console.error('Error upgrading plan:', error);
            showNotification('error', 'Erro ao alterar plano');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        if (window.confirm('Tem certeza que deseja sair?')) {
            await supabase.auth.signOut();
            window.location.reload();
        }
    };

    if (loading) return <div className="loading">Carregando configurações...</div>;

    return (
        <div className="page-view" style={{ display: 'block' }}>
            <div className="page-header">
                <h1>Configurações</h1>
            </div>

            <div className="settings-container">
                <div className="settings-sidebar">
                    <div className="user-mini-profile">
                        <div className="avatar-circle">
                            {profileData.nome ? profileData.nome.charAt(0).toUpperCase() : <User />}
                        </div>
                        <div className="user-info">
                            <h3>{profileData.nome || 'Usuário'}</h3>
                            <p>{user?.email}</p>
                        </div>
                    </div>
                    <nav className="settings-nav">
                        <button
                            className={`nav-item ${activeTab === 'perfil' ? 'active' : ''}`}
                            onClick={() => setActiveTab('perfil')}
                        >
                            <User size={18} /> Perfil
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'senha' ? 'active' : ''}`}
                            onClick={() => setActiveTab('senha')}
                        >
                            <Lock size={18} /> Senha
                        </button>
                        <button
                            className={`nav-item ${activeTab === 'plano' ? 'active' : ''}`}
                            onClick={() => setActiveTab('plano')}
                        >
                            <CreditCard size={18} /> Plano
                        </button>
                        <button className="nav-item danger" onClick={handleLogout}>
                            <LogOut size={18} /> Sair
                        </button>
                    </nav>
                </div>

                <div className="settings-content">
                    {notification && (
                        <div className={`notification ${notification.type} show`}>
                            {notification.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            {notification.message}
                        </div>
                    )}

                    {activeTab === 'perfil' && (
                        <div className="tab-content active">
                            <h2>Meu Perfil</h2>
                            <form onSubmit={handleProfileSubmit}>
                                <div className="form-group">
                                    <label>Nome Completo</label>
                                    <input
                                        type="text"
                                        name="nome"
                                        value={profileData.nome}
                                        onChange={handleProfileChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={user?.email}
                                        disabled
                                        className="disabled"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Telefone</label>
                                    <input
                                        type="text"
                                        name="telefone"
                                        value={profileData.telefone}
                                        onChange={handleProfileChange}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Cargo</label>
                                    <input
                                        type="text"
                                        name="cargo"
                                        value={profileData.cargo}
                                        onChange={handleProfileChange}
                                        placeholder="Ex: Gerente de Marketing"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>URL do Avatar</label>
                                    <input
                                        type="text"
                                        name="avatar_url"
                                        value={profileData.avatar_url}
                                        onChange={handleProfileChange}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? <Loader size={16} className="spin" /> : <Save size={16} />}
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'senha' && (
                        <div className="tab-content active">
                            <h2>Alterar Senha</h2>
                            <form onSubmit={handlePasswordSubmit}>
                                <div className="form-group">
                                    <label>Nova Senha</label>
                                    <input
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Confirmar Nova Senha</label>
                                    <input
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                        required
                                        minLength={6}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? <Loader size={16} className="spin" /> : <Save size={16} />}
                                        Alterar Senha
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'plano' && (
                        <div className="tab-content active">
                            <h2>Meu Plano</h2>
                            <div className="current-plan-info">
                                <p>Seu plano atual é: <strong>{userPlan}</strong></p>
                            </div>

                            <div className="plans-grid">
                                <div className={`plan-card ${userPlan === 'Free' ? 'current' : ''}`}>
                                    <div className="plan-header">
                                        <h3>Free</h3>
                                        <div className="plan-price">R$ 0<span>/mês</span></div>
                                    </div>
                                    <ul className="plan-features">
                                        <li><CheckCircle size={14} /> Acesso básico</li>
                                        <li><CheckCircle size={14} /> Até 3 campanhas</li>
                                        <li><CheckCircle size={14} /> Relatórios simples</li>
                                    </ul>
                                    <button
                                        className="btn btn-outline full-width"
                                        disabled={userPlan === 'Free' || saving}
                                        onClick={() => handlePlanUpgrade('Free')}
                                    >
                                        {userPlan === 'Free' ? 'Plano Atual' : 'Downgrade'}
                                    </button>
                                </div>

                                <div className={`plan-card ${userPlan === 'PRO' ? 'current' : ''}`}>
                                    <div className="plan-header">
                                        <h3>PRO</h3>
                                        <div className="plan-price">R$ 99<span>/mês</span></div>
                                    </div>
                                    <ul className="plan-features">
                                        <li><CheckCircle size={14} /> Acesso completo</li>
                                        <li><CheckCircle size={14} /> Campanhas ilimitadas</li>
                                        <li><CheckCircle size={14} /> Relatórios avançados</li>
                                        <li><CheckCircle size={14} /> Suporte prioritário</li>
                                    </ul>
                                    <button
                                        className="btn btn-primary full-width"
                                        disabled={userPlan === 'PRO' || saving}
                                        onClick={() => handlePlanUpgrade('PRO')}
                                    >
                                        {userPlan === 'PRO' ? 'Plano Atual' : 'Upgrade para PRO'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
