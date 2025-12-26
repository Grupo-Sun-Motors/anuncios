import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, ArrowRight, UserPlus, Send } from 'lucide-react';

const Auth = () => {
    const navigate = useNavigate();
    const { login, signup, resetPassword, user, authError } = useAuth();

    const [view, setView] = useState('login'); // login, signup, reset
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    // Surface auth errors from context (e.g., falha ao carregar perfil/sessão)
    useEffect(() => {
        if (authError) {
            setMessage({ type: 'error', text: authError });
        }
    }, [authError]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            await login(email, password);
            setMessage({ type: 'success', text: 'Login realizado com sucesso!' });
            // Navigation handled by useEffect
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Erro ao fazer login' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem' });
            return;
        }

        setIsLoading(true);
        setMessage(null);

        try {
            await signup(email, password);
            setMessage({ type: 'success', text: 'Conta criada! Verifique seu e-mail para confirmar.' });
            setTimeout(() => {
                setView('login');
            }, 2000);
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Erro ao criar conta' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage(null);

        try {
            await resetPassword(email);
            setMessage({ type: 'success', text: 'Link de recuperação enviado para seu e-mail!' });
        } catch (error) {
            setMessage({ type: 'error', text: error.message || 'Erro ao enviar e-mail de recuperação' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div id="auth-view" className="active" style={{ display: 'flex' }}>
            <div className="auth-container">
                <div className="auth-header">
                    <div className="auth-logo">
                        <img
                            src="https://agdvozsqcrszflzsimyl.supabase.co/storage/v1/object/public/TOPSTACK/topstack-logo-3x1.png"
                            alt="TopStack Logo"
                            className="topstack-logo"
                            style={{ width: '100%', maxWidth: '280px', height: 'auto' }}
                        />
                    </div>
                    <h2 id="auth-title">
                        {view === 'login' && 'Bem-vindo de volta'}
                        {view === 'signup' && 'Criar nova conta'}
                        {view === 'reset' && 'Recuperar senha'}
                    </h2>
                    <p id="auth-subtitle">
                        {view === 'login' && 'Entre na sua conta para continuar'}
                        {view === 'signup' && 'Preencha os dados abaixo'}
                        {view === 'reset' && 'Digite seu e-mail para receber o link'}
                    </p>
                    <h1 className="sun-motors-text">Sun Motors</h1>
                </div>

                {message && (
                    <div className={`auth-message ${message.type} active`}>
                        {message.text}
                    </div>
                )}

                {view === 'login' && (
                    <form id="login-form" className="auth-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <input
                                type="email"
                                id="login-email"
                                placeholder="seu@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-label="E-mail"
                            />
                        </div>
                        <div className="form-group">
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="login-password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    aria-label="Senha"
                                />
                                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Entrando...' : 'Entrar'}
                            {!isLoading && <ArrowRight size={20} />}
                        </button>
                        <div className="auth-footer">
                            Não tem uma conta? <a onClick={() => setView('signup')}>Criar conta</a>
                            <br />
                            <a onClick={() => setView('reset')} style={{ fontSize: '0.8rem', marginTop: '0.5rem', display: 'inline-block' }}>
                                Esqueci minha senha
                            </a>
                        </div>
                    </form>
                )}

                {view === 'signup' && (
                    <form id="signup-form" className="auth-form" onSubmit={handleSignup}>
                        <div className="form-group">
                            <input
                                type="email"
                                id="signup-email"
                                placeholder="seu@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-label="E-mail"
                            />
                        </div>
                        <div className="form-group">
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="signup-password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    aria-label="Senha"
                                />
                                <button type="button" className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="form-group">
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="signup-confirm-password"
                                    placeholder="Confirmar senha ••••••••"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    aria-label="Confirmar Senha"
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Criando...' : 'Criar Conta'}
                            {!isLoading && <UserPlus size={20} />}
                        </button>
                        <div className="auth-footer">
                            Já tem uma conta? <a onClick={() => setView('login')}>Fazer login</a>
                        </div>
                    </form>
                )}

                {view === 'reset' && (
                    <form id="reset-form" className="auth-form" onSubmit={handleReset}>
                        <div className="form-group">
                            <input
                                type="email"
                                id="reset-email"
                                placeholder="seu@email.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-label="E-mail"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                            {!isLoading && <Send size={20} />}
                        </button>
                        <div className="auth-footer">
                            <a onClick={() => setView('login')}>Voltar para Login</a>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Auth;
