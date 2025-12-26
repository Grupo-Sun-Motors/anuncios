class SegmentacaoManager {
    constructor() {
        this.supabase = null;
        this.editModal = null;
        this.addPublicoAlvoBtn = null;
        this.closeModalBtn = null;
        this.cancelModalBtn = null;
        this.editForm = null;
        this.detailsSidemenu = null;
        this.detailsOverlay = null;
        this.closeDetailsBtn = null;
        this.deleteConfirmationModal = null;
        this.cancelDeleteBtn = null;
        this.confirmDeleteBtn = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        if (window.getSupabaseClient) {
            this.supabase = window.getSupabaseClient();
        }

        // Selecionar os elementos apenas quando a página for inicializada
        this.editModal = document.getElementById('edit-modal-segmentacao');
        this.addPublicoAlvoBtn = document.getElementById('add-publico-alvo-btn-segmentacao');
        this.closeModalBtn = document.getElementById('close-modal-btn-segmentacao');
        this.cancelModalBtn = document.getElementById('cancel-modal-btn-segmentacao');
        this.editForm = document.getElementById('edit-form-segmentacao');
        this.detailsSidemenu = document.getElementById('details-sidemenu-segmentacao');
        this.detailsOverlay = document.getElementById('details-overlay-segmentacao');
        this.closeDetailsBtn = document.getElementById('close-details-btn-segmentacao');
        this.deleteConfirmationModal = document.getElementById('delete-confirmation-modal-segmentacao');
        this.cancelDeleteBtn = document.getElementById('cancel-delete-btn-segmentacao');
        this.confirmDeleteBtn = document.getElementById('confirm-delete-btn-segmentacao');

        this.addEventListeners();
        this.initialized = true;
        console.log('SegmentacaoManager initialized');
    }

    addEventListeners() {
        if (this.addPublicoAlvoBtn) {
            this.addPublicoAlvoBtn.addEventListener('click', () => this.openEditModal('new'));
        }
        if (this.closeModalBtn) {
            this.closeModalBtn.addEventListener('click', () => this.closeEditModal());
        }
        if (this.cancelModalBtn) {
            this.cancelModalBtn.addEventListener('click', () => this.closeEditModal());
        }
        if (this.editForm) {
            this.editForm.addEventListener('submit', (e) => this.savePublicoAlvo(e));
        }
        if (this.closeDetailsBtn) {
            this.closeDetailsBtn.addEventListener('click', () => this.closeDetails());
        }
        if (this.detailsOverlay) {
            this.detailsOverlay.addEventListener('click', () => this.closeDetails());
        }

        // Use event delegation for dynamic elements
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-view-details-segmentacao')) {
                const btn = e.target.closest('.btn-view-details-segmentacao');
                this.openDetails(btn.dataset.brand);
            }
            if (e.target.closest('.btn-edit-segmentacao')) {
                const btn = e.target.closest('.btn-edit-segmentacao');
                this.openEditModal('edit', btn.dataset.brand);
            }
        });

        if (this.cancelDeleteBtn) {
            this.cancelDeleteBtn.addEventListener('click', () => this.closeDeleteModal());
        }
        if (this.confirmDeleteBtn) {
            this.confirmDeleteBtn.addEventListener('click', () => this.executeDelete());
        }
    }

    openEditModal(mode, brand = null, publicoId = null) {
        if (this.editModal) {
            const title = this.editModal.querySelector('#edit-modal-title-segmentacao');
            if (title) {
                if (mode === 'new') {
                    title.textContent = 'Adicionar Novo Público-Alvo';
                    if (this.editForm) this.editForm.reset();
                } else {
                    title.textContent = 'Editar Público-Alvo';
                    // Futuramente: carregar dados do público a ser editado
                }
            }
            this.editModal.classList.add('open');
            this.editModal.style.display = 'block'; // Ensure display is set
        }
    }

    closeEditModal() {
        if (this.editModal) {
            this.editModal.classList.remove('open');
            this.editModal.style.display = 'none';
        }
    }

    savePublicoAlvo(event) {
        event.preventDefault();
        // Lógica para salvar os dados do formulário
        console.log('Dados do público salvos!');
        this.closeEditModal();
        // TODO: Implement actual save logic with Supabase
    }

    openDetails(brand) {
        if (this.detailsSidemenu && this.detailsOverlay) {
            // Futuramente: carregar detalhes do perfil da marca
            this.detailsSidemenu.classList.add('open');
            this.detailsOverlay.classList.add('open');
            this.detailsOverlay.style.display = 'block';
        }
    }

    closeDetails() {
        if (this.detailsSidemenu && this.detailsOverlay) {
            this.detailsSidemenu.classList.remove('open');
            this.detailsOverlay.classList.remove('open');
            this.detailsOverlay.style.display = 'none';
        }
    }

    openDeleteModal(publicoId) {
        if (this.deleteConfirmationModal) {
            this.deleteConfirmationModal.dataset.publicoId = publicoId;
            this.deleteConfirmationModal.classList.add('open');
            this.deleteConfirmationModal.style.display = 'block';
        }
    }

    closeDeleteModal() {
        if (this.deleteConfirmationModal) {
            this.deleteConfirmationModal.classList.remove('open');
            this.deleteConfirmationModal.style.display = 'none';
        }
    }

    executeDelete() {
        if (!this.deleteConfirmationModal) return;

        const publicoId = this.deleteConfirmationModal.dataset.publicoId;
        // Lógica para excluir o público-alvo
        console.log(`Público ${publicoId} excluído!`);
        this.closeDeleteModal();
        // TODO: Implement actual delete logic with Supabase
    }
}

// Global instance
window.segmentacaoManager = new SegmentacaoManager();
