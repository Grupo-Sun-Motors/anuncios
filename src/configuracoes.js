class ConfiguracoesManager {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.userProfile = null; // Perfil do usuário da tabela perfil_de_usuario
        this.userPlan = 'Free'; // Default plan
        this.init();
    }

    async init() {
        try {
            if (window.getSupabaseClient) {
                this.supabase = window.getSupabaseClient();
                await this.loadUserData();
                this.setupEventListeners();
                this.renderCurrentPlan();
            } else {
                console.error('Failed to load Supabase library');
                this.showError('Erro ao conectar com o banco de dados');
            }
        } catch (error) {
            console.error('Error initializing Configurações Manager:', error);
            this.showError('Erro ao inicializar configurações');
        }
    }

    async loadUserData() {
        try {
            // Get current user from auth
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();

            if (authError) throw authError;

            if (user) {
                this.currentUser = user;

                // Carregar perfil do usuário da tabela perfil_de_usuario
                await this.loadUserProfile();

                this.renderUserInfo();
                this.renderProfileForm();

                // Try to get user plan from profiles table using centralized service
                try {
                    let profile = null;

                    // Try to use centralized service function if available
                    if (window.buscarPerfilUsuario) {
                        profile = await window.buscarPerfilUsuario(user.id);
                    } else {
                        // Fallback: try to import the module dynamically
                        try {
                            const { buscarPerfilUsuario } = await import('./services-apis/supabase/configService.js');
                            profile = await buscarPerfilUsuario(user.id, this.supabase);
                        } catch (importError) {
                            // If import fails, use direct query as fallback
                            const { data } = await this.supabase
                                .from('profiles')
                                .select('plan')
                                .eq('id', user.id)
                                .single();
                            profile = data;
                        }
                    }

                    if (profile?.plan) {
                        this.userPlan = profile.plan;
                    }
                } catch (profileError) {
                    // Profiles table might not exist yet, use default plan
                    console.log('No profile found, using default plan');
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Erro ao carregar dados do usuário');
        }
    }

    setupEventListeners() {
        // Tab navigation
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // Profile form
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileUpdate(e));
        }

        // Phone formatting
        const telefoneInput = document.getElementById('profile-telefone');
        if (telefoneInput) {
            telefoneInput.addEventListener('input', (e) => this.formatPhoneInput(e));
            telefoneInput.addEventListener('keydown', (e) => this.handlePhoneKeydown(e));
        }

        // Password form
        const passwordForm = document.getElementById('password-form');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // Logout button
        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', () => this.handleLogout());
        }

        // Plan upgrade buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.plan-upgrade-btn')) {
                const plan = e.target.closest('.plan-upgrade-btn').getAttribute('data-plan');
                this.handlePlanUpgrade(plan);
            }
        });
    }

    formatPhoneInput(e) {
        const input = e.target;
        let value = input.value.replace(/\D/g, ''); // Remove tudo que não é dígito

        // Limita a 11 dígitos (com DDD)
        if (value.length > 11) {
            value = value.slice(0, 11);
        }

        // Aplica a formatação
        let formattedValue = '';
        if (value.length > 0) {
            formattedValue = '(' + value.slice(0, 2);
            if (value.length > 2) {
                formattedValue += ') ';
                if (value.length <= 10) {
                    // Telefone fixo: (00) 0000-0000
                    formattedValue += value.slice(2, 6);
                    if (value.length > 6) {
                        formattedValue += '-' + value.slice(6, 10);
                    }
                } else {
                    // Celular: (00) 00000-0000
                    formattedValue += value.slice(2, 7);
                    if (value.length > 7) {
                        formattedValue += '-' + value.slice(7, 11);
                    }
                }
            }
        }

        input.value = formattedValue;
    }

    handlePhoneKeydown(e) {
        // Permite backspace, delete, tab, escape, enter
        if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
            // Permite Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            // Permite home, end, left, right
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        // Garante que é um número
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    }

    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });

        // Se mudou para a aba de perfil, garantir que a formatação do telefone esteja aplicada
        if (tabId === 'perfil') {
            const telefoneInput = document.getElementById('profile-telefone');
            if (telefoneInput && telefoneInput.value) {
                // Reaplica a formatação se necessário
                const currentValue = telefoneInput.value;
                const numbersOnly = currentValue.replace(/\D/g, '');
                if (numbersOnly.length > 0) {
                    telefoneInput.value = this.formatPhoneNumber(numbersOnly);
                }
            }
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

    renderUserInfo() {
        if (!this.currentUser) return;

        const emailElement = document.getElementById('user-email');
        if (emailElement) {
            emailElement.textContent = this.currentUser.email;
        }

        const joinDateElement = document.getElementById('user-join-date');
        if (joinDateElement) {
            const joinDate = new Date(this.currentUser.created_at).toLocaleDateString('pt-BR');
            joinDateElement.textContent = joinDate;
        }
    }

    renderProfileForm() {
        if (!this.userProfile) return;

        // Preencher formulário com dados do perfil
        const nomeInput = document.getElementById('profile-nome');
        const telefoneInput = document.getElementById('profile-telefone');
        const cargoInput = document.getElementById('profile-cargo');
        const avatarUrlInput = document.getElementById('profile-avatar-url');

        if (nomeInput) nomeInput.value = this.userProfile.nome || '';
        if (telefoneInput) {
            // Se já tem telefone formatado, mantém; senão formata se tiver números
            const telefone = this.userProfile.telefone || '';
            if (telefone && /^\d+$/.test(telefone.replace(/\D/g, ''))) {
                // Se é só números, formata
                telefoneInput.value = this.formatPhoneNumber(telefone.replace(/\D/g, ''));
            } else {
                telefoneInput.value = telefone;
            }
        }
        if (cargoInput) cargoInput.value = this.userProfile.cargo || '';
        if (avatarUrlInput) avatarUrlInput.value = this.userProfile.avatar_url || '';
    }

    formatPhoneNumber(value) {
        // Remove tudo que não é dígito
        const numbers = value.replace(/\D/g, '');

        if (numbers.length === 0) return '';

        // Limita a 11 dígitos
        const limitedNumbers = numbers.slice(0, 11);

        // Aplica formatação
        if (limitedNumbers.length <= 2) {
            return '(' + limitedNumbers;
        } else if (limitedNumbers.length <= 10) {
            // Telefone fixo: (00) 0000-0000
            return '(' + limitedNumbers.slice(0, 2) + ') ' +
                limitedNumbers.slice(2, 6) +
                (limitedNumbers.length > 6 ? '-' + limitedNumbers.slice(6, 10) : '');
        } else {
            // Celular: (00) 00000-0000
            return '(' + limitedNumbers.slice(0, 2) + ') ' +
                limitedNumbers.slice(2, 7) +
                '-' + limitedNumbers.slice(7, 11);
        }
    }

    async handleProfileUpdate(e) {
        e.preventDefault();
        if (!this.currentUser || !this.supabase) return;

        try {
            this.showLoading('Salvando perfil...');

            const formData = new FormData(e.target);
            const dadosAtualizados = {
                nome: formData.get('nome') || '',
                telefone: formData.get('telefone') || null,
                cargo: formData.get('cargo') || null,
                avatar_url: formData.get('avatar_url') || null
            };

            // Validar nome obrigatório
            if (!dadosAtualizados.nome.trim()) {
                this.showError('O nome é obrigatório');
                this.hideLoading();
                return;
            }

            // Tentar importar o serviço de perfil
            let atualizarPerfilUsuario;
            try {
                const perfilModule = await import('./services-apis/supabase/perfilUsuarioService.js');
                atualizarPerfilUsuario = perfilModule.atualizarPerfilUsuario;
            } catch (importError) {
                if (window.atualizarPerfilUsuario) {
                    atualizarPerfilUsuario = window.atualizarPerfilUsuario;
                } else {
                    this.showError('Serviço de perfil não disponível');
                    this.hideLoading();
                    return;
                }
            }

            // Atualizar perfil
            const perfilAtualizado = await atualizarPerfilUsuario(
                this.currentUser.id,
                dadosAtualizados,
                this.supabase
            );

            if (perfilAtualizado) {
                this.userProfile = perfilAtualizado;
                this.hideLoading();
                this.showSuccess('Perfil atualizado com sucesso!');

                // Atualizar UI do sidemenu se disponível
                if (window.app && window.app.updateAuthUI) {
                    window.app.userProfile = perfilAtualizado;
                    window.app.updateAuthUI(true);
                }
            } else {
                this.hideLoading();
                this.showError('Erro ao atualizar perfil. Tente novamente.');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Erro ao atualizar perfil:', error);
            this.showError(error.message || 'Erro ao atualizar perfil');
        }
    }

    renderCurrentPlan() {
        const currentPlanName = document.getElementById('current-plan-name');
        const currentPlanDescription = document.getElementById('current-plan-description');

        if (currentPlanName) {
            currentPlanName.textContent = this.userPlan;
        }

        if (currentPlanDescription) {
            const descriptions = {
                'Free': 'Acesso básico às funcionalidades essenciais',
                'PRO': 'Acesso completo a todas as funcionalidades avançadas'
            };
            currentPlanDescription.textContent = descriptions[this.userPlan] || descriptions['Free'];
        }

        // Update plan cards
        this.updatePlanCards();
    }

    updatePlanCards() {
        const planCards = document.querySelectorAll('.plan-card');

        planCards.forEach(card => {
            const planName = card.getAttribute('data-plan');
            const actionBtn = card.querySelector('.plan-action');

            if (planName === this.userPlan) {
                card.classList.add('current');
                if (actionBtn) {
                    actionBtn.textContent = 'Seu Plano Atual';
                    actionBtn.className = 'plan-action current';
                    actionBtn.disabled = true;
                }
            } else {
                card.classList.remove('current');
                if (actionBtn) {
                    if (planName === 'PRO' && this.userPlan === 'Free') {
                        actionBtn.textContent = 'Fazer Upgrade';
                        actionBtn.className = 'plan-action primary plan-upgrade-btn';
                        actionBtn.setAttribute('data-plan', planName);
                        actionBtn.disabled = false;
                    } else if (planName === 'Free' && this.userPlan === 'PRO') {
                        actionBtn.textContent = 'Fazer Downgrade';
                        actionBtn.className = 'plan-action secondary plan-upgrade-btn';
                        actionBtn.setAttribute('data-plan', planName);
                        actionBtn.disabled = false;
                    }
                }
            }
        });
    }

    async handlePasswordChange(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const currentPassword = formData.get('current-password');
        const newPassword = formData.get('new-password');
        const confirmPassword = formData.get('confirm-password');

        // Validate passwords
        if (newPassword !== confirmPassword) {
            this.showError('As senhas não coincidem');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        try {
            this.showLoading('Alterando senha...');

            // Update password
            const { error } = await this.supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            this.hideLoading();
            this.showSuccess('Senha alterada com sucesso!');

            // Reset form
            e.target.reset();
        } catch (error) {
            this.hideLoading();
            console.error('Error changing password:', error);
            this.showError(error.message || 'Erro ao alterar senha');
        }
    }

    async handlePlanUpgrade(planName) {
        if (planName === this.userPlan) return;

        try {
            this.showLoading('Processando mudança de plano...');

            // In a real application, this would integrate with a payment gateway
            // For now, we'll simulate the process
            if (planName === 'PRO') {
                // Simulate payment process
                await this.simulatePaymentProcess();
            }

            // Update user plan in database using centralized service
            try {
                let result = null;

                // Try to use centralized service function if available
                if (window.atualizarPlanoUsuario) {
                    result = await window.atualizarPlanoUsuario(this.currentUser.id, planName);
                } else {
                    // Fallback: try to import the module dynamically
                    try {
                        const { atualizarPlanoUsuario } = await import('./services-apis/supabase/configService.js');
                        result = await atualizarPlanoUsuario(this.currentUser.id, planName, this.supabase);
                    } catch (importError) {
                        // If import fails, use direct query as fallback
                        await this.supabase
                            .from('profiles')
                            .upsert({
                                id: this.currentUser.id,
                                plan: planName,
                                updated_at: new Date().toISOString()
                            });
                    }
                }

                if (result === null) {
                    console.log('Profiles table not found, plan stored locally only');
                }
            } catch (dbError) {
                console.log('Profiles table not found, plan stored locally only');
            }

            // Update local state
            this.userPlan = planName;
            this.renderCurrentPlan();

            this.hideLoading();
            this.showSuccess(`Plano alterado para ${planName} com sucesso!`);
        } catch (error) {
            this.hideLoading();
            console.error('Error upgrading plan:', error);
            this.showError('Erro ao alterar plano. Tente novamente.');
        }
    }

    async simulatePaymentProcess() {
        // Simulate payment gateway integration
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, 2000);
        });
    }

    showLoading(message = 'Carregando...') {
        // You could implement a loading overlay here
        console.log('Loading:', message);
    }

    hideLoading() {
        // Hide loading overlay
        console.log('Loading finished');
    }

    showSuccess(message) {
        const notification = document.getElementById('config-notification');
        const messageEl = document.getElementById('config-notification-message');

        if (notification && messageEl) {
            messageEl.textContent = message;
            notification.classList.remove('error');
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }
    }

    showError(message) {
        const notification = document.getElementById('config-notification');
        const messageEl = document.getElementById('config-notification-message');

        if (notification && messageEl) {
            messageEl.textContent = message;
            notification.classList.add('error');
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 5000);
        }
        console.error('Configurações Error:', message);
    }

    async handleLogout() {
        if (!confirm('Tem certeza que deseja sair da conta?')) {
            return;
        }

        try {
            if (!this.supabase) {
                this.showError('Erro ao conectar com o sistema');
                return;
            }

            const { error } = await this.supabase.auth.signOut();

            if (error) throw error;

            // Redirecionar para a página inicial ou recarregar
            window.location.reload();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            this.showError('Erro ao fazer logout. Tente novamente.');
        }
    }
}

// Global instance
window.configuracoesManager = new ConfiguracoesManager();

// Initialize Lucide icons after page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }, 100);
});