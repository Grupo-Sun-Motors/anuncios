import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../services-apis/supabase/client';
import { buscarRelatorioCompletoMarcas } from '../../services-apis/supabase/configService';
import { parseMetricValue, parseDataBrasileira, normalizeToMonday } from '../../services-apis/supabase/relatorioAnunciosService';
import { useToast } from '../../contexts/ToastContext';
import './ImportadorCSV.css';

const ImportadorCSV = ({ onImportSuccess, onClose }) => {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    // Estados
    const [contas, setContas] = useState([]);
    const [contaSelecionada, setContaSelecionada] = useState('');
    const [arquivo, setArquivo] = useState(null);
    const [dadosPreview, setDadosPreview] = useState([]);
    const [etapa, setEtapa] = useState('upload'); // 'upload' | 'preview' | 'importing' | 'resultado'
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);

    // Colunas esperadas do CSV
    const colunasEsperadas = [
        'Identificação da campanha',
        'Início dos relatórios',
        'Valor usado (BRL)'
    ];

    // Carrega contas de anúncio via view relatorio_completo_marcas
    useEffect(() => {
        loadContas();
    }, []);

    const loadContas = async () => {
        try {
            const viewData = await buscarRelatorioCompletoMarcas();
            // Extrai contas únicas da view
            const contasUnicas = [...new Map(
                viewData.map(item => [item.conta_id, {
                    id: item.conta_id,
                    nome: item.conta_nome,
                    marca: item.marca,
                    plataforma: item.plataforma
                }])
            ).values()];
            setContas(contasUnicas);
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
            setErro('Erro ao carregar contas de anúncio');
        }
    };

    const handleContaChange = (e) => {
        setContaSelecionada(e.target.value);
        setErro(null);
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setErro('Por favor, selecione um arquivo CSV.');
            return;
        }

        setArquivo(file);
        setErro(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            complete: (results) => {
                if (results.errors.length > 0) {
                    setErro(`Erro ao ler o arquivo: ${results.errors[0].message}`);
                    return;
                }

                const colunasArquivo = Object.keys(results.data[0] || {});
                const colunasFaltantes = colunasEsperadas.filter(
                    col => !colunasArquivo.includes(col)
                );

                if (colunasFaltantes.length > 0) {
                    setErro(`Colunas obrigatórias faltantes: ${colunasFaltantes.join(', ')}`);
                    return;
                }

                setDadosPreview(results.data);
                setEtapa('preview');
            },
            error: (error) => {
                setErro(`Erro ao processar o arquivo: ${error.message}`);
            }
        });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];
        if (file) {
            const fakeEvent = { target: { files: [file] } };
            handleFileSelect(fakeEvent);
        }
    };

    const handleImportar = async () => {
        if (!contaSelecionada) {
            setErro('Selecione uma conta de anúncio');
            return;
        }

        setEtapa('importing');
        setErro(null);

        try {
            // Mapeia dados do CSV para o formato esperado pela RPC
            const dadosFormatados = dadosPreview
                .filter(linha => {
                    const externalId = linha['Identificação da campanha'];
                    const spend = parseFloat(linha['Valor usado (BRL)'] || 0);
                    return externalId && externalId.trim() && spend > 0;
                })
                .map(linha => ({
                    external_id: linha['Identificação da campanha'],
                    data_inicio: normalizeToMonday(parseDataBrasileira(linha['Início dos relatórios'])),
                    data_fim: parseDataBrasileira(linha['Término dos relatórios'] || linha['Início dos relatórios']),
                    spend: parseMetricValue(linha['Valor usado (BRL)']),
                    cpc: parseMetricValue(linha['CPC (custo por clique no link) (BRL)'] || '0'),
                    ctr: parseMetricValue(linha['CTR (taxa de cliques no link)'] || '0'),
                    conversao: parseInt(linha['Resultados'] || '0', 10)
                }));

            if (dadosFormatados.length === 0) {
                setResultado({
                    sucesso: false,
                    mensagem: 'Nenhum registro válido para importar',
                    resumo: { total: dadosPreview.length, importados: 0, ignorados: dadosPreview.length, erros: 0 }
                });
                setEtapa('resultado');
                return;
            }

            // Chama a função RPC do Supabase
            const { error } = await supabase.rpc('importar_relatorio_anuncios_csv', {
                dados_json: dadosFormatados
            });

            if (error) {
                console.error('Erro na importação via RPC:', error);
                setResultado({
                    sucesso: false,
                    mensagem: `Erro na importação: ${error.message}`,
                    resumo: { total: dadosPreview.length, importados: 0, ignorados: 0, erros: 1 }
                });
            } else {
                setResultado({
                    sucesso: true,
                    mensagem: `Importação concluída: ${dadosFormatados.length} registros processados`,
                    resumo: {
                        total: dadosPreview.length,
                        importados: dadosFormatados.length,
                        ignorados: dadosPreview.length - dadosFormatados.length,
                        erros: 0
                    }
                });
                addToast('Importação concluída com sucesso!', 'success');
                if (onImportSuccess) onImportSuccess();
            }
            setEtapa('resultado');

        } catch (error) {
            console.error('Erro na importação:', error);
            setErro(`Erro durante a importação: ${error.message}`);
            setEtapa('preview');
            addToast('Erro durante a importação', 'error');
        }
    };

    const handleReset = () => {
        setArquivo(null);
        setDadosPreview([]);
        setEtapa('upload');
        setResultado(null);
        setErro(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const formatarValor = (valor) => {
        if (valor === null || valor === undefined || valor === '') return '-';
        const num = parseFloat(valor);
        if (isNaN(num)) return valor;
        return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getContaNome = () => {
        const conta = contas.find(c => c.id === contaSelecionada);
        return conta?.nome || '';
    };

    return (
        <>
            {/* Overlay */}
            <div className="sidemenu-overlay open" onClick={onClose}></div>

            {/* Sidemenu */}
            <div className="upload-sidemenu import-sidemenu open">
                {/* Header */}
                <div className="sidemenu-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileSpreadsheet size={20} />
                                Importar Relatório CSV
                            </h2>
                        </div>
                    </div>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="sidemenu-content">
                    {/* Etapa: Upload (com dropdown sempre visível) */}
                    {(etapa === 'upload' || etapa === 'preview') && (
                        <div className="upload-section">
                            {/* Dropdown de Conta - SEMPRE VISÍVEL */}
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label htmlFor="conta-anuncio">Conta de Anúncio *</label>
                                <select
                                    id="conta-anuncio"
                                    value={contaSelecionada}
                                    onChange={handleContaChange}
                                    className="form-select"
                                >
                                    <option value="">Selecione uma conta...</option>
                                    {contas.map(conta => (
                                        <option key={conta.id} value={conta.id}>
                                            {conta.nome} ({conta.plataforma})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* File Upload - SEMPRE VISÍVEL */}
                            {etapa === 'upload' && (
                                <>
                                    <div
                                        className="dropzone"
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={48} className="dropzone-icon" />
                                        <h3>Arraste o arquivo CSV aqui</h3>
                                        <p>ou clique para selecionar</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileSelect}
                                            style={{ display: 'none' }}
                                        />
                                    </div>

                                    <div className="info-box" style={{ marginTop: '1.5rem' }}>
                                        <Info size={16} />
                                        <div>
                                            <strong>Formato esperado:</strong>
                                            <p>CSV exportado do Meta Ads com colunas: Identificação da campanha, Valor usado (BRL), CPC, CTR, Resultados.</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Preview */}
                            {etapa === 'preview' && (
                                <div className="preview-section">
                                    <div className="preview-header">
                                        <div className="arquivo-info">
                                            <FileSpreadsheet size={20} />
                                            <span>{arquivo?.name}</span>
                                            <span className="registros-count">
                                                ({dadosPreview.length} registros)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="preview-table-container">
                                        <table className="preview-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>ID Campanha</th>
                                                    <th>Período</th>
                                                    <th>Investido</th>
                                                    <th>Resultados</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dadosPreview.slice(0, 10).map((linha, index) => (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td className="campanha-nome" title={linha['Identificação da campanha']}>
                                                            {linha['Identificação da campanha']?.substring(0, 15)}...
                                                        </td>
                                                        <td className="periodo">
                                                            {linha['Início dos relatórios']}
                                                        </td>
                                                        <td className="valor currency">
                                                            R$ {formatarValor(linha['Valor usado (BRL)'])}
                                                        </td>
                                                        <td className="valor">
                                                            {linha['Resultados'] || '0'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {dadosPreview.length > 10 && (
                                            <div className="preview-more">
                                                ...e mais {dadosPreview.length - 10} registros
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        className="btn btn-secondary"
                                        onClick={handleReset}
                                        style={{ marginTop: '1rem' }}
                                    >
                                        Escolher outro arquivo
                                    </button>
                                </div>
                            )}

                            {erro && (
                                <div className="error-box" style={{ marginTop: '1rem' }}>
                                    <AlertCircle size={16} />
                                    <span>{erro}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Etapa: Importing */}
                    {etapa === 'importing' && (
                        <div className="importing-section">
                            <Loader2 size={64} className="spinner" />
                            <h3>Importando dados...</h3>
                            <p>Aguarde enquanto os registros são processados</p>
                        </div>
                    )}

                    {/* Etapa: Resultado */}
                    {etapa === 'resultado' && resultado && (
                        <div className="resultado-section">
                            <div className={`resultado-icon ${resultado.sucesso ? 'success' : 'error'}`}>
                                {resultado.sucesso ? (
                                    <CheckCircle size={64} />
                                ) : (
                                    <AlertCircle size={64} />
                                )}
                            </div>

                            <h3>{resultado.sucesso ? 'Importação Concluída!' : 'Importação com Erros'}</h3>
                            <p>{resultado.mensagem}</p>

                            <div className="resultado-resumo">
                                <div className="resumo-item">
                                    <span className="resumo-valor">{resultado.resumo.total}</span>
                                    <span className="resumo-label">Total</span>
                                </div>
                                <div className="resumo-item success">
                                    <span className="resumo-valor">{resultado.resumo.importados}</span>
                                    <span className="resumo-label">Importados</span>
                                </div>
                                <div className="resumo-item warning">
                                    <span className="resumo-valor">{resultado.resumo.ignorados}</span>
                                    <span className="resumo-label">Ignorados</span>
                                </div>
                                <div className="resumo-item error">
                                    <span className="resumo-valor">{resultado.resumo.erros}</span>
                                    <span className="resumo-label">Erros</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sidemenu-footer">
                    {(etapa === 'upload' || etapa === 'preview') && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" onClick={onClose}>
                                Cancelar
                            </button>
                            {etapa === 'preview' && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleImportar}
                                    disabled={!contaSelecionada}
                                >
                                    <Upload size={16} style={{ marginRight: '0.5rem' }} />
                                    Importar {dadosPreview.length} registros
                                </button>
                            )}
                        </div>
                    )}

                    {etapa === 'resultado' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" onClick={handleReset}>
                                Importar Outro
                            </button>
                            <button className="btn btn-primary" onClick={onClose}>
                                Fechar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ImportadorCSV;
