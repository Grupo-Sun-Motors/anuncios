// Styles
import './style.css';
import './publico-alvo.css';
import './produtos.css';
import './otimizacoes.css';
import './campanhas.css';
import './leads.css';
import './relatorios.css';
import './segmentacao.css';
import './uploads.css';
import './dashboard.css';
import './configuracoes.css';
import './auth.css';

// Scripts (Order matters for dependencies)
import './config.js';
import './legacy-services.js';
import './api.js';


class SunMotorsApp {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.mainContent = document.getElementById('main-content');
        this.desktopToggle = document.getElementById('desktop-toggle');
        this.mobileMenuBtn = document.getElementById('mobile-menu-btn');
        this.mobileOverlay = document.getElementById('mobile-overlay');
        this.navItems = document.querySelectorAll('.nav-item');

        this.isMobile = window.innerWidth <= 768;
        this.isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
        this.currentUser = null;
        this.userProfile = null; // Perfil do usuário da tabela perfil_de_usuario
        this.supabase = null;
        this.dataStore = {
            brands: [],
            platforms: []
        };

        this.init();
    }

    async init() {
        try {
            // Initialize Supabase client first
            await this.initializeSupabase();

            // Expose getSupabaseClient globally for legacy support
            window.getSupabaseClient = () => this.supabase;

            this.setupEventListeners();
            this.setupRouting();
            this.setupAuthEventListeners();
            this.initializeSidebar();
            this.setActiveNavItem();
            await this.checkAuthState();
            this.handleInitialPageLoad();

            // Preload essential data in the background
            this.preloadEssentialData();

            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } finally {
            this.hidePreloader();
        }
    }

    hidePreloader() {
        const preloader = document.getElementById('app-preloader');
        if (preloader) {
            preloader.classList.add('hidden');
        }
    }

    getCache(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) {
            return null;
        }
        const item = JSON.parse(itemStr);
        const now = new Date();
        if (now.getTime() > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.value;
    }

    setCache(key, value, ttlMinutes = 60) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttlMinutes * 60 * 1000,
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    async preloadEssentialData() {
        // Try to load from cache first
        const cachedBrands = this.getCache('brands');
        const cachedPlatforms = this.getCache('platforms');

        if (cachedBrands && cachedPlatforms) {
            console.log('Loading essential data from cache...');
            this.dataStore.brands = cachedBrands;
            this.dataStore.platforms = cachedPlatforms;
            console.log('Essential data loaded from cache:', this.dataStore);
            return; // Exit if cache is valid
        }

        try {
            console.log('Preloading essential data from Supabase...');
            const [brandsResult, platformsResult] = await Promise.all([
                this.supabase.from('marcas').select('id, nome'),
                this.supabase.from('plataformas').select('id, nome')
            ]);

            if (brandsResult.error) throw brandsResult.error;
            if (platformsResult.error) throw platformsResult.error;

            this.dataStore.brands = brandsResult.data || [];
            this.dataStore.platforms = platformsResult.data || [];

            // Save to cache
            this.setCache('brands', this.dataStore.brands);
            this.setCache('platforms', this.dataStore.platforms);

            console.log('Essential data preloaded and cached:', this.dataStore);
        } catch (error) {
            console.error('Failed to preload essential data:', error);
        }
    }

    async initializeSupabase() {
        // First, try to use the unified client from client.js (React)
        if (window.__supabaseClient) {
            this.supabase = window.__supabaseClient;
            console.log('[Legacy] Using unified Supabase client');
            return;
        }

        // Fallback to window.initializeSupabase from config.js
        if (window.initializeSupabase) {
            this.supabase = window.initializeSupabase();
            if (this.supabase) {
                console.log('[Legacy] Supabase initialized via config.js');
                return;
            }
        }

        // Last resort: try window.supabase.createClient (CDN)
        if (window.supabase && window.supabase.createClient) {
            console.warn('[Legacy] Creating Supabase client via CDN');
            this.supabase = window.supabase.createClient(
                window.supabaseConfig?.url || 'https://agdvozsqcrszflzsimyl.supabase.co',
                window.supabaseConfig?.key || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZHZvenNxY3JzemZsenNpbXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MDUzODksImV4cCI6MjA2OTM4MTM4OX0.pgYBlwUqLZZ7I5EOD1LFcSeBrrTy1Jf1Ep8zLjYj3LQ'
            );
            // Store for other legacy code
            window.__supabaseClient = this.supabase;
            return;
        }

        console.error('[Legacy] Failed to initialize Supabase - no client available');
        throw new Error('Supabase library not available');
    }


    setupEventListeners() {
        // Desktop toggle
        this.desktopToggle.addEventListener('click', () => {
            this.toggleSidebar();
        });

        // Mobile menu button
        this.mobileMenuBtn.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });

        // Mobile overlay
        this.mobileOverlay.addEventListener('click', () => {
            this.closeMobileSidebar();
        });

        // Navigation items
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const href = item.getAttribute('href');
                const page = item.getAttribute('data-page');
                this.navigate(href, page);
            });
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Close mobile sidebar on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileSidebar();
                this.closeAuthPanel();
            }
        });

        // Global Dropdown Handler (Fix for 3-dot menus)
        document.addEventListener('click', (e) => {
            // Handle actions trigger click
            const trigger = e.target.closest('.actions-trigger');
            if (trigger) {
                // Check if it's a budget row (BudgetManager)
                if (trigger.hasAttribute('data-budget-id')) {
                    if (window.budgetManager && typeof window.budgetManager.toggleActionsMenu === 'function') {
                        window.budgetManager.toggleActionsMenu(e, trigger.getAttribute('data-budget-id'));
                        return;
                    }
                }

                // Check if it's an optimization card
                if (trigger.closest('.optimization-card')) {
                    if (window.otimizacoesManager) {
                        const card = trigger.closest('.optimization-card');
                        const dropdown = card.querySelector('.actions-dropdown');
                        if (dropdown) {
                            const id = dropdown.id.replace('dropdown-', '');
                            window.otimizacoesManager.toggleDropdown(e, id);
                            return;
                        }
                    }
                }

                // Check if it's a product row/card (ProdutosManager)
                if (window.produtosManager && trigger.closest('.actions-menu')) {
                    const dropdown = trigger.closest('.actions-menu').querySelector('.actions-dropdown');
                    if (dropdown) {
                        const id = dropdown.id.replace('actions-', '');
                        if (typeof window.produtosManager.toggleActionsMenu === 'function') {
                            window.produtosManager.toggleActionsMenu(e, id);
                            return;
                        }
                    }
                }
            }

            // Close dropdowns when clicking outside
            if (!e.target.closest('.actions-trigger') && !e.target.closest('.actions-dropdown')) {
                document.querySelectorAll('.actions-dropdown.active').forEach(dropdown => {
                    dropdown.classList.remove('active');
                });
            }
        });
    }

    setupRouting() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', () => {
            this.setActiveNavItem();
            this.updatePageContent();
        });
    }

    setupAuthEventListeners() {
        // Auth panel controls
        const openAuthBtn = document.getElementById('open-auth-panel-btn');
        const closeAuthBtn = document.getElementById('close-auth-panel');
        const authOverlay = document.getElementById('auth-overlay');

        if (openAuthBtn) {
            openAuthBtn.addEventListener('click', () => this.openAuthPanel());
        }

        if (closeAuthBtn) {
            closeAuthBtn.addEventListener('click', () => this.closeAuthPanel());
        }

        if (authOverlay) {
            authOverlay.addEventListener('click', (e) => {
                if (e.target === authOverlay) {
                    this.closeAuthPanel();
                }
            });
        }

        // Auth forms
        const loginForm = document.getElementById('login-form');
        const signupForm = document.getElementById('signup-form');
        const resetForm = document.getElementById('reset-form');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handlePasswordReset(e));
        }
    }

    async checkAuthState() {
        try {
            if (!this.supabase) {
                console.error('Supabase not initialized');
                return;
            }

            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) throw error;

            const authView = document.getElementById('auth-view');
            const sidebar = document.getElementById('sidebar');
            const mobileHeader = document.getElementById('mobile-header');
            const mainContent = document.getElementById('main-content');

            if (session?.user) {
                this.currentUser = session.user;
                // Buscar perfil do usuário
                await this.loadUserProfile();
                this.updateAuthUI(true);
                console.log('User authenticated:', this.currentUser.email);

                // Show App, Hide Auth
                if (authView) authView.style.display = 'none';
                if (sidebar) sidebar.style.display = 'flex';
                if (mobileHeader && this.isMobile) mobileHeader.style.display = 'flex';
                if (mainContent) mainContent.style.display = 'block';

            } else {
                this.currentUser = null;
                this.userProfile = null;
                this.updateAuthUI(false);
                console.log('No authenticated user');

                // Show Auth, Hide App
                if (authView) authView.style.display = 'flex';
                if (sidebar) sidebar.style.display = 'none';
                if (mobileHeader) mobileHeader.style.display = 'none';
                if (mainContent) mainContent.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking auth state:', error);
            this.currentUser = null;
            this.userProfile = null;
            this.updateAuthUI(false);

            // Show Auth on error
            const authView = document.getElementById('auth-view');
            const sidebar = document.getElementById('sidebar');
            const mobileHeader = document.getElementById('mobile-header');
            const mainContent = document.getElementById('main-content');

            if (authView) authView.style.display = 'flex';
            if (sidebar) sidebar.style.display = 'none';
            if (mobileHeader) mobileHeader.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
        }
    }

    async loadUserProfile() {
        if (!this.currentUser || !this.supabase) return;

        try {
            // Tentar importar o serviço de perfil
            let buscarPerfilUsuario;
            try {
                const perfilModule = await import('./services-apis/supabase/perfilUsuarioService.js');
                buscarPerfilUsuario = perfilModule.buscarPerfilUsuario;
            } catch (importError) {
                // Se não conseguir importar, tentar usar função global
                if (window.buscarPerfilUsuario) {
                    buscarPerfilUsuario = window.buscarPerfilUsuario;
                } else {
                    console.warn('Serviço de perfil não disponível');
                    return;
                }
            }

            // Buscar perfil do usuário
            this.userProfile = await buscarPerfilUsuario(this.currentUser.id, this.supabase);

            // Se não existe perfil, criar um básico com o email como nome inicial
            if (!this.userProfile) {
                try {
                    let criarOuAtualizarPerfilUsuario;
                    try {
                        const perfilModule = await import('./services-apis/supabase/perfilUsuarioService.js');
                        criarOuAtualizarPerfilUsuario = perfilModule.criarOuAtualizarPerfilUsuario;
                    } catch (importError) {
                        if (window.criarOuAtualizarPerfilUsuario) {
                            criarOuAtualizarPerfilUsuario = window.criarOuAtualizarPerfilUsuario;
                        } else {
                            return;
                        }
                    }

                    this.userProfile = await criarOuAtualizarPerfilUsuario(
                        this.currentUser.id,
                        {
                            nome: this.currentUser.email.split('@')[0], // Usar parte antes do @ como nome inicial
                            email: this.currentUser.email
                        },
                        this.supabase
                    );
                } catch (createError) {
                    console.error('Erro ao criar perfil inicial:', createError);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar perfil do usuário:', error);
        }
    }

    updateAuthUI(isLoggedIn) {
        const authBtn = document.getElementById('open-auth-panel-btn');

        if (isLoggedIn && this.currentUser) {
            // Usar nome do perfil se disponível, senão usar email
            const displayName = this.userProfile?.nome || this.currentUser.email;
            const avatarInitial = displayName.charAt(0).toUpperCase();

            authBtn.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar">${avatarInitial}</div>
                    <div class="user-details">
                        <div class="user-email">${displayName}</div>
                        <div class="user-status">Online</div>
                    </div>
                    <button class="logout-btn" onclick="app.handleLogout()">
                        <i data-lucide="log-out"></i>
                    </button>
                </div>
            `;
        } else {
            authBtn.innerHTML = `
                <i data-lucide="log-in"></i>
                <span class="nav-text">Login / Criar Conta</span>
            `;
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    openAuthPanel() {
        if (this.currentUser) {
            return; // Don't open panel if user is already logged in
        }

        const overlay = document.getElementById('auth-overlay');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        this.switchAuthView('login');
    }

    closeAuthPanel() {
        const overlay = document.getElementById('auth-overlay');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.clearAuthMessages();
    }

    switchAuthView(view) {
        const views = ['login', 'signup', 'reset'];
        views.forEach(v => {
            const viewElement = document.getElementById(`${v}-view`);
            viewElement.classList.toggle('active', v === view);
        });
        this.clearAuthMessages();
    }

    togglePassword(inputId, button) {
        const input = document.getElementById(inputId);
        const icon = button?.querySelector('i');

        if (!input || !icon) {
            console.error('Input or icon element not found');
            return;
        }

        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    showAuthMessage(message, type = 'success') {
        const messageEl = document.getElementById('auth-message');
        messageEl.textContent = message;
        messageEl.className = `auth-message ${type} active`;

        setTimeout(() => {
            messageEl.classList.remove('active');
        }, 5000);
    }

    clearAuthMessages() {
        const messageEl = document.getElementById('auth-message');
        messageEl.classList.remove('active');
    }

    async handleLogin(e) {
        e.preventDefault();
        if (!this.supabase) {
            this.showAuthMessage('Sistema não inicializado. Tente novamente.', 'error');
            return;
        }

        const formData = new FormData(e.target);

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: formData.get('email'),
                password: formData.get('password')
            });

            if (error) throw error;

            this.currentUser = data.user;
            // Carregar perfil do usuário após login
            await this.loadUserProfile();
            this.updateAuthUI(true);

            // Transition to App
            await this.checkAuthState();

            this.showAuthMessage('Login realizado com sucesso!', 'success');

            // Trigger budget data reload if on budget page
            if (window.budgetManager && window.location.pathname === '/orcamento') {
                await window.budgetManager.loadBudgetData();
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthMessage(error.message || 'Erro ao fazer login', 'error');
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        if (!this.supabase) {
            this.showAuthMessage('Sistema não inicializado. Tente novamente.', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');

        if (password !== confirmPassword) {
            this.showAuthMessage('As senhas não coincidem', 'error');
            return;
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email: formData.get('email'),
                password: password
            });

            if (error) throw error;

            this.showAuthMessage('Conta criada! Verifique seu e-mail para confirmar.', 'success');
            setTimeout(() => {
                this.switchAuthView('login');
            }, 2000);
        } catch (error) {
            console.error('Signup error:', error);
            this.showAuthMessage(error.message || 'Erro ao criar conta', 'error');
        }
    }

    async handlePasswordReset(e) {
        e.preventDefault();
        if (!this.supabase) {
            this.showAuthMessage('Sistema não inicializado. Tente novamente.', 'error');
            return;
        }

        const formData = new FormData(e.target);

        try {
            const { error } = await this.supabase.auth.resetPasswordForEmail(formData.get('email'), {
                redirectTo: window.location.origin
            });

            if (error) throw error;

            this.showAuthMessage('Link de recuperação enviado para seu e-mail!', 'success');
        } catch (error) {
            console.error('Password reset error:', error);
            this.showAuthMessage(error.message || 'Erro ao enviar e-mail de recuperação', 'error');
        }
    }

    async handleLogout() {
        try {
            if (!this.supabase) return;

            const { error } = await this.supabase.auth.signOut();

            if (error) throw error;

            this.currentUser = null;
            this.userProfile = null;
            this.updateAuthUI(false);

            // Return to Auth View
            await this.checkAuthState();

            this.showAuthMessage('Logout realizado com sucesso!', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showAuthMessage('Erro ao fazer logout', 'error');
        }
    }

    initializeSidebar() {
        if (!this.isMobile && this.isCollapsed) {
            this.sidebar.classList.add('collapsed');
            this.mainContent.classList.add('collapsed');
        }
    }

    toggleSidebar() {
        if (this.isMobile) return;

        this.isCollapsed = !this.isCollapsed;
        this.sidebar.classList.toggle('collapsed', this.isCollapsed);
        this.mainContent.classList.toggle('collapsed', this.isCollapsed);

        localStorage.setItem('sidebar-collapsed', this.isCollapsed.toString());
    }

    toggleMobileSidebar() {
        if (!this.isMobile) return;

        const isOpen = this.sidebar.classList.contains('mobile-open');

        if (isOpen) {
            this.closeMobileSidebar();
        } else {
            this.openMobileSidebar();
        }
    }

    openMobileSidebar() {
        this.sidebar.classList.add('mobile-open');
        this.mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeMobileSidebar() {
        this.sidebar.classList.remove('mobile-open');
        this.mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;

        if (wasMobile !== this.isMobile) {
            // Reset states when switching between mobile/desktop
            this.closeMobileSidebar();

            if (!this.isMobile) {
                // Restore collapsed state on desktop
                this.sidebar.classList.toggle('collapsed', this.isCollapsed);
                this.mainContent.classList.toggle('collapsed', this.isCollapsed);
            } else {
                // Remove collapsed state on mobile
                this.sidebar.classList.remove('collapsed');
                this.mainContent.classList.remove('collapsed');
            }
        }
    }

    navigate(href, page, isInitialLoad = false) {
        // Update URL without page refresh
        history.pushState({ page }, '', href);

        // Update active nav item
        this.setActiveNavItem(page);

        // Update page content
        this.updatePageContent(page);

        // Close mobile sidebar if open
        if (this.isMobile) {
            this.closeMobileSidebar();
        }
    }

    handleInitialPageLoad() {
        const path = window.location.pathname;
        const page = path.substring(1) || 'dashboard';
        this.navigate(path, page, true);
    }

    setActiveNavItem(activePage = null) {
        // Determine active page from URL if not provided
        if (!activePage) {
            const path = window.location.pathname;
            switch (path) {
                case '/':
                    activePage = 'dashboard';
                    break;
                case '/orcamento':
                    activePage = 'orcamento';
                    break;
                case '/publico-alvo':
                    activePage = 'publico-alvo';
                    break;
                case '/otimizacoes':
                    activePage = 'otimizacoes';
                    break;
                case '/relatorios':
                    activePage = 'relatorios';
                    break;
                case '/segmentacao':
                    activePage = 'segmentacao';
                    break;
                case '/campanhas':
                    activePage = 'campanhas';
                    break;
                case '/leads':
                    activePage = 'leads';
                    break;
                case '/produtos':
                    activePage = 'produtos';
                    break;
                case '/uploads':
                    activePage = 'uploads';
                    break;
                case '/configuracoes':
                    activePage = 'configuracoes';
                    break;
                default:
                    activePage = 'dashboard';
            }
        }

        // Update active states
        this.navItems.forEach(item => {
            const page = item.getAttribute('data-page');
            item.classList.toggle('active', page === activePage);
        });
    }

    async updatePageContent(page = null) {
        if (!page) {
            const path = window.location.pathname;
            switch (path) {
                case '/':
                    page = 'dashboard';
                    break;
                case '/orcamento':
                    page = 'orcamento';
                    break;
                case '/orcamento/novo':
                    page = 'orcamento-novo';
                    break;
                case '/publico-alvo':
                    page = 'publico-alvo';
                    break;
                case '/produtos':
                    page = 'produtos';
                    break;
                case '/uploads':
                    page = 'uploads';
                    break;
                case '/otimizacoes':
                    page = 'otimizacoes';
                    break;
                case '/relatorios':
                    page = 'relatorios';
                    break;
                case '/segmentacao':
                    page = 'segmentacao';
                    break;
                case '/campanhas':
                    page = 'campanhas';
                    break;
                case '/leads':
                    page = 'leads';
                    break;
                case '/configuracoes':
                    page = 'configuracoes';
                    break;
                default:
                    page = 'dashboard';
            }
        }

        // Hide all page views
        const pageViews = document.querySelectorAll('.page-view');
        pageViews.forEach(view => view.style.display = 'none');

        // Show default page content container
        const pageContent = document.querySelector('.page-content');

        // Dispatch custom event for budget pages to handle their own rendering
        // Handle budget pages directly
        if (page === 'orcamento') {
            pageContent.style.display = 'block';
            if (!window.budgetManager) await import('./budget.js');
            if (window.budgetManager) {
                await window.budgetManager.renderBudgetPage();
            }
        } else if (page === 'orcamento-novo') {
            pageContent.style.display = 'block';
            if (!window.budgetManager) await import('./budget.js');
            if (window.budgetManager) {
                await window.budgetManager.renderNewBudgetPage();
            }
        } else if (page === 'dashboard') {
            // Hide default page content and show dashboard page
            pageContent.style.display = 'none';
            const dashboardView = document.getElementById('view-dashboard');
            if (dashboardView) {
                dashboardView.style.display = 'block';
                if (!window.dashboardManager) await import('./dashboard.js');
                if (window.dashboardManager) {
                    await window.dashboardManager.loadAllDashboardData();
                }
            }
        } else if (page === 'publico-alvo') {
            // Hide default page content and show publico-alvo page
            pageContent.style.display = 'none';
            const publicoAlvoView = document.getElementById('view-publico-alvo');
            if (publicoAlvoView) {
                publicoAlvoView.style.display = 'block';
                // Initialize publico-alvo page
                if (!window.publicoAlvoManager) await import('./publico-alvo-script.js');
                if (window.publicoAlvoManager) {
                    await window.publicoAlvoManager.init();
                }
            }
        } else if (page === 'produtos') {
            // Hide default page content and show produtos page
            pageContent.style.display = 'none';
            const produtosView = document.getElementById('view-produtos');
            if (produtosView) {
                produtosView.style.display = 'block';
                if (!window.produtosManager) await import('./produtos.js');
                if (window.produtosManager) {
                    await window.produtosManager.init();
                }
            }
        } else if (page === 'otimizacoes') {
            // Hide default page content and show otimizacoes page
            pageContent.style.display = 'none';
            const otimizacoesView = document.getElementById('view-otimizacoes');
            if (otimizacoesView) {
                otimizacoesView.style.display = 'block';
                // Initialize otimizacoes page
                if (!window.otimizacoesManager) await import('./otimizacoes.js');
                if (window.otimizacoesManager) {
                    // Ensure list view is shown by default
                    if (typeof window.otimizacoesManager.showListView === 'function') {
                        window.otimizacoesManager.showListView();
                    }
                    await window.otimizacoesManager.loadInitialData();
                }
            }
        } else if (page === 'campanhas') {
            // Hide default page content and show campanhas page
            pageContent.style.display = 'none';
            const campanhasView = document.getElementById('view-campanhas');
            if (campanhasView) {
                campanhasView.style.display = 'block';
                // Initialize campanhas page
                if (!window.campanhasManager) await import('./campanhas.js');
                if (window.campanhasManager) {
                    await window.campanhasManager.loadInitialData();
                }
            }
        } else if (page === 'leads') {
            // Hide default page content and show leads page
            pageContent.style.display = 'none';
            const leadsView = document.getElementById('view-leads');
            if (leadsView) {
                leadsView.style.display = 'block';
                // Initialize leads page
                if (!window.leadsManager) {
                    const module = await import('./leads.js');
                    window.leadsManager = new module.LeadsManager();
                }
                if (window.leadsManager && typeof window.leadsManager.init === 'function') {
                    await window.leadsManager.init();
                }
            }
        } else if (page === 'relatorios') {
            // Hide default page content and show relatorios page
            pageContent.style.display = 'none';
            const relatoriosView = document.getElementById('view-relatorios');
            if (relatoriosView) {
                relatoriosView.style.display = 'block';
                if (!window.relatoriosManager) await import('./relatorios.js');
                if (window.relatoriosManager) {
                    await window.relatoriosManager.loadReportData();
                }
            }
        } else if (page === 'segmentacao') {
            pageContent.style.display = 'none';
            const segmentacaoView = document.getElementById('view-segmentacao');
            if (segmentacaoView) {
                segmentacaoView.style.display = 'block';
                if (!window.segmentacaoManager) await import('./segmentacao.js');
                if (window.segmentacaoManager && typeof window.segmentacaoManager.init === 'function') {
                    window.segmentacaoManager.init();
                }
            }
        } else if (page === 'uploads') {
            pageContent.style.display = 'none';
            const uploadsView = document.getElementById('view-uploads');
            if (uploadsView) {
                uploadsView.style.display = 'block';
                if (!window.initUploads) await import('./uploads.js');
                if (typeof window.initUploads === 'function') {
                    window.initUploads();
                }
            }
        } else if (page === 'configuracoes') {
            // Hide default page content and show configuracoes page
            pageContent.style.display = 'none';
            const configuracoesView = document.getElementById('view-configuracoes');
            if (configuracoesView) {
                configuracoesView.style.display = 'block';
                if (!window.configuracoesManager) await import('./configuracoes.js');
                if (window.configuracoesManager) {
                    await window.configuracoesManager.loadUserData();
                }
            }
        } else {
            // Show default page content for other pages
            pageContent.style.display = 'block';
            const titles = {
                'dashboard': 'Dashboard de Performance',
                'orcamento': 'Orçamento',
                'publico-alvo': 'Público-Alvo',
                'produtos': 'Produtos',
                'otimizacoes': 'Otimizações',
                'relatorios': 'Relatórios',
                'segmentacao': 'Segmentação',
                'campanhas': 'Campanhas',
                'uploads': 'Uploads',
                'configuracoes': 'Configurações'
            };

            pageContent.innerHTML = `<h1>${titles[page] || 'Dashboard de Performance'}</h1>`;
        }
    }
}

// Make app globally available
window.app = null;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.app = new SunMotorsApp();
    } catch (error) {
        console.error('Failed to initialize application:', error);
    }
});