import React, { useState, useEffect, useMemo } from 'react';
import { X, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { buscarRelatorioCompletoMarcas } from '../../services-apis/supabase/configService';
import ImportadorAnunciosMeta from './ImportadorAnunciosMeta';
import ImportadorAnunciosGoogle from './ImportadorAnunciosGoogle';

/**
 * Componente Wrapper para importação de Anúncios
 * 
 * Identifica automaticamente a plataforma (Meta ou Google) baseado na conta 
 * selecionada e renderiza o importador específico correspondente.
 * 
 * Fluxo:
 * 1. Usuário seleciona a conta de anúncio
 * 2. Sistema identifica a plataforma da conta (Meta/Google)
 * 3. Renderiza ImportadorAnunciosMeta ou ImportadorAnunciosGoogle
 * 
 * As funções RPC são diferentes para cada plataforma:
 * - Meta: upload_tabela_anuncios
 * - Google: upload_tabela_anuncios_google
 */
const ImportadorAnuncios = ({ onImportSuccess, onClose }) => {
    const [contas, setContas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [contaSelecionada, setContaSelecionada] = useState(null);
    const [searchDropdown, setSearchDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [erro, setErro] = useState(null);

    useEffect(() => {
        loadContas();
    }, []);

    /**
     * Carrega contas de anúncio com informações de plataforma
     */
    const loadContas = async () => {
        try {
            setLoading(true);
            const viewData = await buscarRelatorioCompletoMarcas();

            // Cria mapa de contas únicas com informação de plataforma
            const contasUnicas = [...new Map(
                viewData.map(item => [item.conta_id, {
                    id: item.conta_id,
                    nome: item.conta_nome,
                    plataforma_id: item.plataforma_id,
                    plataforma: item.plataforma || '',
                    marca: item.marca || ''
                }])
            ).values()];

            setContas(contasUnicas);
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
            setErro('Erro ao carregar contas de anúncio');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Filtra contas baseado no termo de busca
     */
    const contasFiltradas = useMemo(() => {
        if (!searchTerm) return contas;
        return contas.filter(conta =>
            conta.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conta.plataforma?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            conta.marca?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contas, searchTerm]);

    /**
     * Identifica a plataforma baseado no nome
     * @returns {'META' | 'GOOGLE' | 'UNKNOWN'}
     */
    const identificarPlataforma = (conta) => {
        if (!conta?.plataforma) return 'UNKNOWN';
        const plataformaUpper = conta.plataforma.toUpperCase();

        if (plataformaUpper.includes('META') ||
            plataformaUpper.includes('FACEBOOK') ||
            plataformaUpper.includes('INSTAGRAM')) {
            return 'META';
        }

        if (plataformaUpper.includes('GOOGLE')) {
            return 'GOOGLE';
        }

        return 'UNKNOWN';
    };

    const handleContaSelect = (conta) => {
        setContaSelecionada(conta);
        setSearchDropdown(false);
        setSearchTerm('');
        setErro(null);
    };

    const handleReset = () => {
        setContaSelecionada(null);
        setSearchTerm('');
    };

    /**
     * Renderiza badge de plataforma na lista de contas
     */
    const renderPlataformaBadge = (plataforma) => {
        const tipo = plataforma?.toUpperCase() || '';
        if (tipo.includes('META') || tipo.includes('FACEBOOK') || tipo.includes('INSTAGRAM')) {
            return <span className="mini-badge meta">Meta</span>;
        }
        if (tipo.includes('GOOGLE')) {
            return <span className="mini-badge google">Google</span>;
        }
        return <span className="mini-badge unknown">Outro</span>;
    };

    const plataformaIdentificada = contaSelecionada ? identificarPlataforma(contaSelecionada) : null;

    return (
        <>
            <div className="sidemenu-overlay open" onClick={onClose}></div>
            <div className="upload-sidemenu import-sidemenu open">
                <div className="sidemenu-header">
                    <h2><FileSpreadsheet size={20} /> Importar Anúncios</h2>
                    <button className="btn-icon" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="sidemenu-content">
                    {loading ? (
                        <div className="loading-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
                            <Loader2 size={48} className="spinner" />
                            <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Carregando contas...</p>
                        </div>
                    ) : !contaSelecionada ? (
                        /* ETAPA 1: Seleção de Conta */
                        <div className="selecao-conta-section">
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Selecione a Conta de Anúncio *</label>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    A plataforma será identificada automaticamente para usar o importador correto.
                                </p>
                                <div className="searchable-select">
                                    <div className="searchable-trigger" onClick={() => setSearchDropdown(!searchDropdown)}>
                                        <span>Selecione uma conta...</span>
                                        <ChevronDown size={16} />
                                    </div>
                                    {searchDropdown && (
                                        <div className="searchable-dropdown">
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome, plataforma ou marca..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="searchable-options">
                                                {contasFiltradas.length === 0 && (
                                                    <div className="searchable-empty">Nenhuma conta encontrada</div>
                                                )}
                                                {contasFiltradas.map(conta => (
                                                    <div
                                                        key={conta.id}
                                                        className="searchable-option"
                                                        onClick={() => handleContaSelect(conta)}
                                                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    >
                                                        <div>
                                                            <span>{conta.nome}</span>
                                                            {conta.marca && (
                                                                <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                                    {conta.marca}
                                                                </small>
                                                            )}
                                                        </div>
                                                        {renderPlataformaBadge(conta.plataforma)}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mini guia de plataformas */}
                            <div className="plataformas-info" style={{ marginTop: '2rem' }}>
                                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Plataformas suportadas:</h4>
                                <div style={{ display: 'flex', gap: '1rem' }}>
                                    <div className="plataforma-card" style={{ flex: 1, padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '1.25rem' }}>📘</span>
                                            <strong>Meta Ads</strong>
                                        </div>
                                        <small style={{ color: 'var(--text-muted)' }}>Facebook & Instagram</small>
                                    </div>
                                    <div className="plataforma-card" style={{ flex: 1, padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '1.25rem' }}>🔍</span>
                                            <strong>Google Ads</strong>
                                        </div>
                                        <small style={{ color: 'var(--text-muted)' }}>Pesquisa & Display</small>
                                    </div>
                                </div>
                            </div>

                            {erro && (
                                <div className="error-box" style={{ marginTop: '1rem' }}>
                                    <span>{erro}</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ETAPA 2: Importador específico baseado na plataforma */
                        <>
                            {plataformaIdentificada === 'META' && (
                                <ImportadorAnunciosMeta
                                    contaSelecionada={contaSelecionada.id}
                                    contaNome={contaSelecionada.nome}
                                    onImportSuccess={onImportSuccess}
                                    onReset={handleReset}
                                />
                            )}
                            {plataformaIdentificada === 'GOOGLE' && (
                                <ImportadorAnunciosGoogle
                                    contaSelecionada={contaSelecionada.id}
                                    contaNome={contaSelecionada.nome}
                                    onImportSuccess={onImportSuccess}
                                    onReset={handleReset}
                                />
                            )}
                            {plataformaIdentificada === 'UNKNOWN' && (
                                <div className="plataforma-desconhecida" style={{ textAlign: 'center', padding: '2rem' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                                    <h3>Plataforma não identificada</h3>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                        Não foi possível identificar a plataforma desta conta ({contaSelecionada.plataforma || 'não definida'}).
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                        Atualmente suportamos Meta Ads e Google Ads.
                                    </p>
                                    <button className="btn btn-secondary" onClick={handleReset}>
                                        Selecionar outra conta
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="sidemenu-footer">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
                    </div>
                </div>
            </div>

            <style>{`
                .mini-badge {
                    display: inline-block;
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                .mini-badge.meta {
                    background: #1877f2;
                    color: white;
                }
                .mini-badge.google {
                    background: #4285f4;
                    color: white;
                }
                .mini-badge.unknown {
                    background: var(--bg-tertiary);
                    color: var(--text-muted);
                }
                .plataforma-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: 500;
                }
                .plataforma-badge.meta {
                    background: linear-gradient(135deg, #1877f2, #0d65d9);
                    color: white;
                }
                .plataforma-badge.google {
                    background: linear-gradient(135deg, #4285f4, #34a853);
                    color: white;
                }
                .plataforma-badge .badge-icon {
                    font-size: 1.1rem;
                }
            `}</style>
        </>
    );
};

export default ImportadorAnuncios;
