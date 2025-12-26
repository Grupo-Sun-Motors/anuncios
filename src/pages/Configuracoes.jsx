import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, CreditCard, Save, LogOut, Star, Check, X, CheckCircle, Building2, Link as LinkIcon, Edit2, Users, Shield } from 'lucide-react';
import Preloader from '../components/Preloader';
import { supabase } from '../services-apis/supabase/client';
import { buscarPerfilUsuario, criarOuAtualizarPerfilUsuario } from '../services-apis/supabase/perfilUsuarioService';
import { buscarRelatorioCompletoMarcas } from '../services-apis/supabase/configService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { CARGOS } from '../utils/permissions';

const formatPhoneNumber = (value) => {
    if (!value) return '';
    let r = value.replace(/\D/g, "");
    r = r.replace(/^0/, "");
    if (r.length > 10) {
        r = r.replace(/^(\d\d)(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (r.length > 5) {
        r = r.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (r.length > 2) {
        r = r.replace(/^(\d\d)(\d{0,5}).*/, "($1) $2");
    } else if (r.length > 0) {
        r = r.replace(/^(\d*)/, "($1");
    }
    return r;
};

// Descrição dos acessos por cargo
const CARGO_DESCRIPTIONS = {
    [CARGOS.ADM]: {
        label: 'ADM',
        description: 'Acesso completo a todas as funcionalidades',
        acessos: ['Dashboard', 'Campanhas', 'Segmentação', 'Uploads', 'Relatórios', 'Todas as outras páginas', 'Grupos de Anúncios', 'Criativos'],
        corBadge: '#3b82f6'
    },
    [CARGOS.SOCIOS]: {
        label: 'Sócios',
        description: 'Acesso a maioria das funcionalidades, exceto exclusivas do ADM',
        acessos: ['Onboard', 'Orçamento', 'Público-Alvo', 'Otimizações', 'Relatórios', 'Leads', 'Produtos', 'Mídias', 'Anúncios', 'Configurações'],
        restricoes: ['Dashboard', 'Campanhas', 'Segmentação', 'Uploads', 'Grupos de Anúncios', 'Criativos'],
        corBadge: '#10b981'
    },
    [CARGOS.GESTORES]: {
        label: 'Gestores',
        description: 'Acesso a maioria das funcionalidades, exceto exclusivas do ADM',
        acessos: ['Onboard', 'Orçamento', 'Público-Alvo', 'Otimizações', 'Relatórios', 'Leads', 'Produtos', 'Mídias', 'Anúncios', 'Configurações'],
        restricoes: ['Dashboard', 'Campanhas', 'Segmentação', 'Uploads', 'Grupos de Anúncios', 'Criativos'],
        corBadge: '#8b5cf6'
    },
    [CARGOS.MARKETING]: {
        label: 'Marketing',
        description: 'Acesso limitado às funcionalidades operacionais',
        acessos: ['Onboard', 'Orçamento', 'Público-Alvo', 'Otimizações', 'Leads', 'Produtos', 'Mídias', 'Anúncios', 'Configurações'],
        restricoes: ['Dashboard', 'Relatórios', 'Campanhas', 'Segmentação', 'Uploads', 'Grupos de Anúncios', 'Criativos'],
        corBadge: '#f59e0b'
    }
};

const Configuracoes = () => {
    const { profile: currentUserProfile, logout } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('perfil');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isEditingPassword, setIsEditingPassword] = useState(false);
    const [userProfile, setUserProfile] = useState({
        nome: '',
        email: '',
        telefone: '',
        cargo: '',
        avatar_url: '',
        createdAt: ''
    });
    const [brandsAccounts, setBrandsAccounts] = useState([]);

    // Estado para a aba de gerenciamento de usuários
    const [allUsers, setAllUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newCargo, setNewCargo] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Verifica se o usuário atual pode ver a aba de usuários (ADM, Sócios ou Gestores)
    const canManageUsers = currentUserProfile?.cargo === CARGOS.ADM || currentUserProfile?.cargo === CARGOS.SOCIOS || currentUserProfile?.cargo === CARGOS.GESTORES;

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeTab === 'usuarios' && canManageUsers) {
            fetchAllUsers();
        }
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Fetch Profile
                const profile = await buscarPerfilUsuario(user.id);
                const createdAtDate = new Date(user.created_at).toLocaleDateString('pt-BR');

                if (profile) {
                    setUserProfile({
                        nome: profile.nome || '',
                        email: user.email || '',
                        telefone: formatPhoneNumber(profile.telefone || ''),
                        cargo: profile.cargo || '',
                        avatar_url: profile.avatar_url || '',
                        createdAt: createdAtDate
                    });
                } else {
                    setUserProfile(prev => ({
                        ...prev,
                        email: user.email,
                        createdAt: createdAtDate
                    }));
                }

                // Fetch Brands & Accounts
                const brandsData = await buscarRelatorioCompletoMarcas();
                setBrandsAccounts(brandsData || []);
            }
        } catch (error) {
            console.error('Error fetching settings data:', error);
            showNotification('Erro ao carregar dados.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('perfil_de_usuario')
                .select('*')
                .order('nome', { ascending: true });

            if (error) throw error;
            setAllUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            showNotification('Erro ao carregar usuários.', 'error');
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'telefone') {
            formattedValue = formatPhoneNumber(value);
        }

        setUserProfile(prev => ({ ...prev, [name]: formattedValue }));
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Não atualiza o cargo aqui - cargo só pode ser alterado na aba de usuários
            const result = await criarOuAtualizarPerfilUsuario(user.id, {
                nome: userProfile.nome,
                telefone: userProfile.telefone,
                avatar_url: userProfile.avatar_url
            });

            if (result) {
                addToast('Perfil atualizado com sucesso!', 'success');
                setIsEditingProfile(false);
            } else {
                throw new Error('Falha ao atualizar perfil');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            addToast('Erro ao atualizar perfil.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const newPassword = e.target['new-password'].value;
        const confirmPassword = e.target['confirm-password'].value;

        if (newPassword !== confirmPassword) {
            addToast('As senhas não coincidem.', 'error');
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            addToast('Senha alterada com sucesso!', 'success');
            e.target.reset();
            setIsEditingPassword(false);
        } catch (error) {
            console.error('Error changing password:', error);
            addToast('Erro ao alterar senha: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/auth');
        } catch (error) {
            console.error('Error logging out:', error);
            addToast('Erro ao sair da conta', 'error');
        }
    };

    const handleCargoChange = (userId, currentCargo) => {
        const user = allUsers.find(u => u.id === userId);
        setSelectedUser(user);
        setNewCargo(currentCargo || CARGOS.MARKETING);
    };

    const confirmCargoChange = async () => {
        if (!selectedUser || !newCargo) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('perfil_de_usuario')
                .update({ cargo: newCargo })
                .eq('id', selectedUser.id);

            if (error) throw error;

            addToast(`Cargo de ${selectedUser.nome || selectedUser.email} alterado para ${newCargo}!`, 'success');
            setShowConfirmModal(false);
            setSelectedUser(null);
            setNewCargo('');
            fetchAllUsers(); // Recarrega a lista
        } catch (error) {
            console.error('Error updating cargo:', error);
            addToast('Erro ao atualizar cargo: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    // Group brands and accounts for display
    const groupedBrands = brandsAccounts.reduce((acc, item) => {
        if (!acc[item.marca]) {
            acc[item.marca] = [];
        }
        acc[item.marca].push(item);
        return acc;
    }, {});

    // Show loading preloader while fetching data
    if (loading) {
        return <Preloader message="Carregando configurações..." />;
    }

    return (
        <div id="view-configuracoes" className="page-view">
            <div className="configuracoes-header">
                <h1>Configurações</h1>
            </div>

            {/* Tabs Navigation */}
            <div className="config-tabs">
                <div className="tabs-nav">
                    <button
                        className={`tab-btn ${activeTab === 'perfil' ? 'active' : ''}`}
                        onClick={() => handleTabChange('perfil')}
                    >
                        <User size={16} style={{ marginRight: '8px' }} />
                        Perfil
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'marcas' ? 'active' : ''}`}
                        onClick={() => handleTabChange('marcas')}
                    >
                        <Building2 size={16} style={{ marginRight: '8px' }} />
                        Marcas & Contas
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'seguranca' ? 'active' : ''}`}
                        onClick={() => handleTabChange('seguranca')}
                    >
                        <Lock size={16} style={{ marginRight: '8px' }} />
                        Segurança
                    </button>
                    {canManageUsers && (
                        <button
                            className={`tab-btn ${activeTab === 'usuarios' ? 'active' : ''}`}
                            onClick={() => handleTabChange('usuarios')}
                        >
                            <Users size={16} style={{ marginRight: '8px' }} />
                            Gerenciar Usuários
                        </button>
                    )}
                    <button
                        className={`tab-btn ${activeTab === 'plano' ? 'active' : ''}`}
                        onClick={() => handleTabChange('plano')}
                        style={{ display: 'none' }}
                    >
                        <CreditCard size={16} style={{ marginRight: '8px' }} />
                        Plano e Faturamento
                    </button>
                </div>

                {/* Profile Tab */}
                {activeTab === 'perfil' && (
                    <div className="tab-content active">
                        <div className="profile-section">
                            <h3>Informações da Conta</h3>

                            <div className="user-info-display">
                                <div className="user-info-item">
                                    <span className="user-info-label">E-mail:</span>
                                    <span className="user-info-value">{userProfile.email}</span>
                                </div>
                                <div className="user-info-item">
                                    <span className="user-info-label">Membro desde:</span>
                                    <span className="user-info-value">
                                        {userProfile.createdAt || '-'}
                                    </span>
                                </div>
                            </div>

                            <div className="profile-edit-form">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3>Editar Perfil</h3>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '0.9rem' }}
                                    >
                                        {isEditingProfile ? <X size={14} /> : <Edit2 size={14} />}
                                        {isEditingProfile ? 'Cancelar' : 'Editar'}
                                    </button>
                                </div>
                                <form onSubmit={handleProfileSubmit}>
                                    <div className="config-form-group">
                                        <label htmlFor="profile-nome">Nome</label>
                                        <input
                                            type="text"
                                            id="profile-nome"
                                            name="nome"
                                            className="config-form-input"
                                            placeholder="Seu nome completo"
                                            value={userProfile.nome}
                                            onChange={handleInputChange}
                                            disabled={!isEditingProfile}
                                            required
                                        />
                                    </div>
                                    <div className="config-form-group">
                                        <label htmlFor="profile-telefone">Telefone</label>
                                        <input
                                            type="tel"
                                            id="profile-telefone"
                                            name="telefone"
                                            className="config-form-input"
                                            placeholder="(00) 00000-0000"
                                            value={userProfile.telefone}
                                            onChange={handleInputChange}
                                            disabled={!isEditingProfile}
                                            maxLength={15}
                                        />
                                    </div>
                                    <div className="config-form-group">
                                        <label htmlFor="profile-cargo">Cargo</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="text"
                                                id="profile-cargo"
                                                name="cargo"
                                                className="config-form-input"
                                                value={userProfile.cargo || 'Não definido'}
                                                disabled={true}
                                                style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                                            />
                                            <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                                                O cargo só pode ser alterado por Gestores.
                                            </small>
                                        </div>
                                    </div>
                                    <div className="config-form-group">
                                        <label htmlFor="profile-avatar-url">URL do Avatar</label>
                                        <input
                                            type="url"
                                            id="profile-avatar-url"
                                            name="avatar_url"
                                            className="config-form-input"
                                            placeholder="https://exemplo.com/avatar.jpg"
                                            value={userProfile.avatar_url}
                                            onChange={handleInputChange}
                                            disabled={!isEditingProfile}
                                        />
                                    </div>
                                    {isEditingProfile && (
                                        <div className="config-form-actions">
                                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                                <Save size={16} style={{ marginRight: '8px' }} />
                                                {saving ? 'Salvando...' : 'Salvar Perfil'}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Brands & Accounts Tab */}
                {activeTab === 'marcas' && (
                    <div className="tab-content active">
                        <div className="brands-section">
                            <h3>Marcas e Contas de Anúncio Conectadas</h3>
                            <p className="section-description">
                                Visualize como suas marcas estão conectadas às contas de anúncio (Meta Ads e Google Ads).
                            </p>

                            <div className="brands-grid" style={{ display: 'grid', gap: '20px', marginTop: '20px' }}>
                                {Object.keys(groupedBrands).length === 0 ? (
                                    <p>Nenhuma marca encontrada.</p>
                                ) : (
                                    Object.entries(groupedBrands).map(([marca, accounts]) => (
                                        <div key={marca} className="brand-card" style={{
                                            background: 'var(--bg-secondary)',
                                            padding: '20px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <h4 style={{ fontSize: '1.1rem', marginBottom: '15px', color: 'var(--text-primary)' }}>{marca}</h4>
                                            <div className="accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {accounts.map((account, idx) => (
                                                    <div key={idx} className="account-item" style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        padding: '10px',
                                                        background: 'var(--bg-primary)',
                                                        borderRadius: '6px',
                                                        borderLeft: `4px solid ${account.plataforma === 'Meta Ads' ? '#1877F2' : '#DB4437'}`
                                                    }}>
                                                        <LinkIcon size={14} style={{ marginRight: '10px', opacity: 0.7 }} />
                                                        <div>
                                                            <div style={{ fontWeight: 500 }}>{account.conta_nome}</div>
                                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{account.plataforma}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'seguranca' && (
                    <div className="tab-content active">
                        <div className="security-section">
                            <div className="password-form">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <h3>Alterar Senha</h3>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setIsEditingPassword(!isEditingPassword)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', fontSize: '0.9rem' }}
                                    >
                                        {isEditingPassword ? <X size={14} /> : <Edit2 size={14} />}
                                        {isEditingPassword ? 'Cancelar' : 'Editar'}
                                    </button>
                                </div>
                                <form onSubmit={handlePasswordChange}>
                                    <div className="config-form-group">
                                        <label htmlFor="new-password">Nova Senha</label>
                                        <input
                                            type="password"
                                            id="new-password"
                                            name="new-password"
                                            className="config-form-input"
                                            required
                                            minLength="6"
                                            disabled={!isEditingPassword}
                                        />
                                    </div>
                                    <div className="config-form-group">
                                        <label htmlFor="change-confirm-password">Confirmar Nova Senha</label>
                                        <input
                                            type="password"
                                            id="change-confirm-password"
                                            name="confirm-password"
                                            className="config-form-input"
                                            required
                                            minLength="6"
                                            disabled={!isEditingPassword}
                                        />
                                    </div>
                                    {isEditingPassword && (
                                        <div className="config-form-actions">
                                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                                <Save size={16} style={{ marginRight: '8px' }} />
                                                {saving ? 'Alterando...' : 'Alterar Senha'}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </div>

                            <div className="logout-section">
                                <h3>Sair da Conta</h3>
                                <p className="logout-description">Você será desconectado e precisará fazer login novamente para acessar o sistema.</p>
                                <button type="button" className="btn btn-danger" onClick={handleLogout}>
                                    <LogOut size={16} style={{ marginRight: '8px' }} />
                                    Sair da Conta
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Users Management Tab - Only for ADM and Gestores */}
                {activeTab === 'usuarios' && canManageUsers && (
                    <div className="tab-content active">
                        <div className="users-section">
                            <h3>Gerenciar Usuários</h3>
                            <p className="section-description">
                                Gerencie os cargos dos usuários do sistema. Cada cargo tem diferentes níveis de acesso.
                            </p>

                            {/* Legenda de Cargos */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '15px',
                                marginTop: '20px',
                                marginBottom: '30px'
                            }}>
                                {Object.entries(CARGO_DESCRIPTIONS).map(([cargo, info]) => (
                                    <div key={cargo} style={{
                                        background: 'var(--bg-secondary)',
                                        padding: '15px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        borderLeft: `4px solid ${info.corBadge}`
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <Shield size={16} style={{ color: info.corBadge }} />
                                            <strong style={{ color: info.corBadge }}>{info.label}</strong>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '10px' }}>
                                            {info.description}
                                        </p>
                                        <div style={{ fontSize: '0.8rem' }}>
                                            <div style={{ marginBottom: '5px' }}>
                                                <Check size={12} style={{ color: '#10b981', marginRight: '4px' }} />
                                                <span style={{ color: '#374151' }}>{info.acessos.slice(0, 4).join(', ')}{info.acessos.length > 4 ? '...' : ''}</span>
                                            </div>
                                            {info.restricoes && (
                                                <div>
                                                    <X size={12} style={{ color: '#ef4444', marginRight: '4px' }} />
                                                    <span style={{ color: '#9ca3af' }}>{info.restricoes.slice(0, 3).join(', ')}{info.restricoes.length > 3 ? '...' : ''}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Lista de Usuários */}
                            <h4 style={{ marginBottom: '15px' }}>Usuários Cadastrados</h4>
                            {loadingUsers ? (
                                <p>Carregando usuários...</p>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        overflow: 'hidden'
                                    }}>
                                        <thead>
                                            <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600' }}>Nome</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600' }}>Email</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'left', fontWeight: '600' }}>Cargo Atual</th>
                                                <th style={{ padding: '12px 15px', textAlign: 'center', fontWeight: '600' }}>Alterar Cargo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allUsers.map((user) => (
                                                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '12px 15px' }}>{user.nome || '-'}</td>
                                                    <td style={{ padding: '12px 15px', color: '#6b7280' }}>{user.email || '-'}</td>
                                                    <td style={{ padding: '12px 15px' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.8rem',
                                                            fontWeight: '500',
                                                            background: CARGO_DESCRIPTIONS[user.cargo]?.corBadge || '#6b7280',
                                                            color: 'white'
                                                        }}>
                                                            {user.cargo || 'Não definido'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                                                        <select
                                                            id={`cargo-select-${user.id}`}
                                                            name={`cargo-select-${user.id}`}
                                                            value=""
                                                            onChange={(e) => {
                                                                const newValue = e.target.value;
                                                                if (newValue && newValue !== user.cargo) {
                                                                    setSelectedUser(user);
                                                                    setNewCargo(newValue);
                                                                    setShowConfirmModal(true);
                                                                }
                                                                e.target.value = '';
                                                            }}
                                                            aria-label={`Alterar cargo de ${user.nome || user.email}`}
                                                            style={{
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                border: '1px solid var(--border-color)',
                                                                background: 'var(--bg-primary)',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <option value="">Alterar para...</option>
                                                            <option value={CARGOS.ADM}>{CARGO_DESCRIPTIONS[CARGOS.ADM].label}</option>
                                                            <option value={CARGOS.SOCIOS}>{CARGO_DESCRIPTIONS[CARGOS.SOCIOS].label}</option>
                                                            <option value={CARGOS.GESTORES}>{CARGO_DESCRIPTIONS[CARGOS.GESTORES].label}</option>
                                                            <option value={CARGOS.MARKETING}>{CARGO_DESCRIPTIONS[CARGOS.MARKETING].label}</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Plan Tab (Hidden/Future) */}
                {activeTab === 'plano' && (
                    <div className="tab-content active">
                        <div className="current-plan-section">
                            <div className="current-plan-badge">
                                <Star size={16} style={{ marginRight: '8px' }} />
                                <span id="current-plan-name">Free</span>
                            </div>
                            <h2 className="current-plan-title">Seu Plano Atual</h2>
                            <p className="current-plan-description">
                                Acesso básico às funcionalidades essenciais
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Confirmação */}
            {showConfirmModal && selectedUser && (
                <div className="modal is-active">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Confirmar Alteração de Cargo</h2>
                            <button className="close-btn" onClick={() => {
                                setShowConfirmModal(false);
                                setSelectedUser(null);
                                setNewCargo('');
                            }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem' }}>
                            <p style={{ marginBottom: '15px', color: '#374151' }}>
                                Você está prestes a alterar o cargo de <strong>{selectedUser.nome || selectedUser.email}</strong> para:
                            </p>

                            <div style={{
                                background: '#f9fafb',
                                padding: '15px',
                                borderRadius: '8px',
                                marginBottom: '15px',
                                borderLeft: `4px solid ${CARGO_DESCRIPTIONS[newCargo]?.corBadge || '#6b7280'}`
                            }}>
                                <strong style={{ color: CARGO_DESCRIPTIONS[newCargo]?.corBadge }}>
                                    {CARGO_DESCRIPTIONS[newCargo]?.label || newCargo}
                                </strong>
                                <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    {CARGO_DESCRIPTIONS[newCargo]?.description}
                                </p>
                            </div>

                            <p style={{ fontSize: '0.9rem', color: '#ef4444', marginBottom: '20px' }}>
                                Esta ação irá alterar os acessos do usuário imediatamente.
                            </p>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        setSelectedUser(null);
                                        setNewCargo('');
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={confirmCargoChange}
                                    disabled={saving}
                                >
                                    {saving ? 'Salvando...' : 'Confirmar Alteração'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Configuracoes;
