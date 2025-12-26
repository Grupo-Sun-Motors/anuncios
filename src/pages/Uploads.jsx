import React, { useState } from 'react';
import {
    UploadCloud,
    BarChart3,
    FolderTree,
    Layers,
    FileText,
    Target,
    Users,
    Image as ImageIcon,
    Database,
    Aperture,
    X,
    FileSpreadsheet
} from 'lucide-react';
import ImportadorCSV from '../components/relatorios/ImportadorCSV';
import ImportadorCampanhas from '../components/uploads/ImportadorCampanhas';
import ImportadorAnuncios from '../components/uploads/ImportadorAnuncios';
import ImportadorGithubCvs from '../components/uploads/ImportadorGithubCvs';
import ImportadorLeads from '../components/uploads/ImportadorLeads';
import { useToast } from '../contexts/ToastContext';
import '../styles/uploads.css';

const cardConfig = [
    { id: 'campanhas', title: 'Campanhas', description: 'Importar campanhas (ativo)', icon: Target },
    { id: 'github_cvs', title: 'Planilhas Github', description: 'Importar planilhas para o github Sun Motors', icon: FileSpreadsheet },
    { id: 'grupos', title: 'Grupos de Anúncio', description: 'Importar adsets/grupos', icon: FolderTree },
    { id: 'criativos', title: 'Criativos', description: 'Importar criativos', icon: Aperture },
    { id: 'anuncios', title: 'Anúncios', description: 'Importar anúncios (ativo)', icon: UploadCloud },
    { id: 'leads', title: 'Leads', description: 'Importar leads (ativo)', icon: Users },
    { id: 'produtos', title: 'Produtos', description: 'Importar catálogo', icon: Layers },
    { id: 'publicos', title: 'Públicos', description: 'Importar públicos-alvo', icon: Database },
    { id: 'segmentacoes', title: 'Segmentações', description: 'Importar segmentações', icon: BarChart3 },
    { id: 'relatorios', title: 'Relatórios', description: 'Importar relatórios (ativo)', icon: FileText },
    { id: 'midias', title: 'Mídias', description: 'Importar ativos de mídia', icon: ImageIcon }
];

const Uploads = () => {
    const { addToast } = useToast();
    const [activeImport, setActiveImport] = useState(null);
    const [showMenu, setShowMenu] = useState(false);

    const handleOpen = (id) => {
        setActiveImport(id);
        setShowMenu(true);
    };

    const closeMenu = () => {
        setShowMenu(false);
        setActiveImport(null);
    };

    const renderRelatorios = () => (
        <div className="sidemenu-content">
            <h3>Importar Relatórios</h3>
            <p className="sidemenu-description">
                Utilize o importador existente para CSV de relatórios.
            </p>
            <ImportadorCSV onClose={closeMenu} />
        </div>
    );

    const renderPlaceholder = (id) => (
        <div className="sidemenu-content">
            <h3>Importar {cardConfig.find(c => c.id === id)?.title}</h3>
            <p className="sidemenu-description">
                Estrutura pronta para conectar às funções do Supabase. Exiba conta de anúncio, seletores e upload conforme necessário.
            </p>
            <div className="placeholder-box">
                <p>Formulário de importação pendente de integração.</p>
                <ul>
                    <li>Selecionar conta via <code>relatorio_completo_marcas</code></li>
                    <li>Upload de arquivo (CSV/XLSX)</li>
                    <li>Preview básico</li>
                </ul>
            </div>
            <div className="sidemenu-actions">
                <button className="btn btn-secondary" onClick={closeMenu}>Fechar</button>
                <button className="btn btn-primary" disabled>Integrar depois</button>
            </div>
        </div>
    );

    const renderContent = () => {
        if (activeImport === 'leads') {
            return (
                <ImportadorLeads
                    onClose={closeMenu}
                    onImportSuccess={() => {
                        // Opcional: Alguma lógica de sucesso global, se necessário
                    }}
                />
            );
        }
        if (activeImport === 'relatorios') return renderRelatorios();
        return renderPlaceholder(activeImport);
    };

    // Verifica se é um componente com sidemenu próprio (que lida com seu próprio overlay/estado se necessário, 
    // mas aqui estamos renderizando dentro do fluxo ou condicionalmente fora)

    // NOTA: Leads agora é um sidemenu próprio também (ImportadorLeads tem overlay interno).
    // Para simplificar, ImportadorLeads gerencia seu próprio overlay.
    // Então, se activeImport for leads, NÃO devemos mostrar o sidemenu genérico deste arquivo, mas sim renderizar o componente diretamente.

    const isStandaloneImporter = ['anuncios', 'campanhas', 'github_cvs', 'leads'].includes(activeImport);
    const showGenericMenu = showMenu && !isStandaloneImporter;

    return (
        <div id="view-uploads" className="page-view">
            <div className="uploads-header">
                <div>
                    <p className="eyebrow">Uploads</p>
                    <h1>Central de Importação</h1>
                    <p className="subtitle">Escolha um tipo para abrir o sidemenu e fazer o upload.</p>
                </div>
            </div>

            <div className="uploads-grid">
                {cardConfig.map(card => {
                    const Icon = card.icon;
                    const isActive = card.id === activeImport && showMenu;
                    return (
                        <button
                            key={card.id}
                            className={`upload-card ${isActive ? 'active' : ''}`}
                            onClick={() => handleOpen(card.id)}
                        >
                            <div className="card-icon">
                                <Icon size={20} />
                            </div>
                            <div className="card-body">
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </div>
                            <div className="card-pill">
                                {['leads', 'relatorios', 'anuncios', 'campanhas', 'github_cvs'].includes(card.id) ? 'Disponível' : 'Em breve'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Sidemenu genérico para relatorios e outros placeholders */}
            <div className={`sidemenu-overlay ${showGenericMenu ? 'open' : ''}`} onClick={closeMenu}></div>
            <div className={`upload-sidemenu ${showGenericMenu ? 'open' : ''}`}>
                <div className="sidemenu-header">
                    <h2>{cardConfig.find(c => c.id === activeImport)?.title || 'Importar'}</h2>
                    <button className="btn-icon" onClick={closeMenu}>
                        <X size={18} />
                    </button>
                </div>
                {showGenericMenu && renderContent()}
            </div>

            {/* Importadores com sidemenu próprio */}
            {showMenu && activeImport === 'anuncios' && (
                <ImportadorAnuncios
                    onClose={closeMenu}
                    onImportSuccess={() => console.log('Anúncios importados!')}
                />
            )}
            {showMenu && activeImport === 'campanhas' && (
                <ImportadorCampanhas
                    onClose={closeMenu}
                    onImportSuccess={() => console.log('Campanhas importadas!')}
                />
            )}
            {showMenu && activeImport === 'github_cvs' && (
                <ImportadorGithubCvs
                    onClose={closeMenu}
                    onImportSuccess={() => console.log('Planilhas Github importadas!')}
                />
            )}
            {showMenu && activeImport === 'leads' && (
                <ImportadorLeads
                    onClose={closeMenu}
                    onImportSuccess={() => console.log('Leads importados!')}
                />
            )}
        </div>
    );
};

export default Uploads;
