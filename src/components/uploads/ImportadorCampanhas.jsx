import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../services-apis/supabase/client';
import { buscarRelatorioCompletoMarcas } from '../../services-apis/supabase/configService';
import { useToast } from '../../contexts/ToastContext';

/**
 * Componente para importar CAMPANHAS
 * Usa a planilha de campanhas do Meta Ads
 * RPC: upload_tabela_anuncios
 */
const ImportadorCampanhas = ({ onImportSuccess, onClose }) => {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [contas, setContas] = useState([]);
    const [contaSelecionada, setContaSelecionada] = useState('');
    const [arquivo, setArquivo] = useState(null);
    const [dadosPreview, setDadosPreview] = useState([]);
    const [etapa, setEtapa] = useState('upload');
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);
    const [searchDropdown, setSearchDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Coluna obrigatória
    const colunasEsperadas = ['Nome da campanha'];

    useEffect(() => {
        loadContas();
    }, []);

    const loadContas = async () => {
        try {
            const viewData = await buscarRelatorioCompletoMarcas();
            const contasUnicas = [...new Map(
                viewData.map(item => [item.conta_id, {
                    id: item.conta_id,
                    nome: item.conta_nome
                }])
            ).values()];
            setContas(contasUnicas);
        } catch (error) {
            console.error('Erro ao carregar contas:', error);
            setErro('Erro ao carregar contas de anúncio');
        }
    };

    const contasFiltradas = useMemo(() => {
        if (!searchTerm) return contas;
        return contas.filter(conta =>
            conta.nome?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contas, searchTerm]);

    const handleContaSelect = (contaId) => {
        setContaSelecionada(contaId);
        setSearchDropdown(false);
        setSearchTerm('');
        setErro(null);
    };

    const parseMetricValue = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const str = String(value).trim();
        let cleaned = str.replace(/[R$\s%]/g, '');

        if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else if (cleaned.includes(',')) {
            cleaned = cleaned.replace(',', '.');
        }

        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const extension = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(extension)) {
            setErro('Por favor, selecione um arquivo CSV ou Excel.');
            return;
        }

        setArquivo(file);
        setErro(null);

        if (extension === 'csv') {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                encoding: 'UTF-8',
                complete: (results) => processFileData(results.data, results.errors),
                error: (error) => setErro(`Erro ao processar: ${error.message}`)
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
                    const sheet = workbook.SheetNames[0];
                    const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
                    processFileData(json, []);
                } catch (error) {
                    setErro(`Erro ao ler Excel: ${error.message}`);
                }
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const processFileData = (data, errors) => {
        if (errors?.length > 0) {
            setErro(`Erro: ${errors[0].message}`);
            return;
        }
        if (!data || data.length === 0) {
            setErro('Arquivo vazio.');
            return;
        }

        const colunasArquivo = Object.keys(data[0] || {}).map(c => c.toLowerCase().trim());
        const colunasFaltantes = colunasEsperadas.filter(
            col => !colunasArquivo.some(c => c === col.toLowerCase())
        );

        if (colunasFaltantes.length > 0) {
            setErro(`Colunas faltantes: ${colunasFaltantes.join(', ')}`);
            return;
        }

        setDadosPreview(data);
        setEtapa('preview');
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect({ target: { files: [file] } });
    };

    const getVal = (linha, coluna) => {
        const keys = Object.keys(linha);
        const found = keys.find(k => k.toLowerCase().trim() === coluna.toLowerCase());
        return found ? linha[found] : null;
    };

    const handleImportar = async () => {
        if (!contaSelecionada) {
            setErro('Selecione uma conta');
            return;
        }

        setEtapa('importing');
        setErro(null);

        try {
            // Monta payload EXATAMENTE como especificado
            const payload = dadosPreview
                .filter(linha => {
                    const nome = getVal(linha, 'Nome da campanha');
                    return nome && String(nome).trim();
                })
                .map(linha => ({
                    nome: String(getVal(linha, 'Nome da campanha') || '').trim(),
                    external_id: String(getVal(linha, 'Identificação da campanha') || '').trim(),
                    metricas: {
                        cpc: parseMetricValue(getVal(linha, 'CPC (custo por clique no link) (BRL)')),
                        ctr: parseMetricValue(getVal(linha, 'CTR (todos)')),
                        spend: parseMetricValue(getVal(linha, 'Valor usado (BRL)')),
                        conversao: parseInt(getVal(linha, 'Resultados') || '0', 10),
                        impressoes: parseInt(getVal(linha, 'Impressões') || '0', 10)
                    }
                }));

            if (payload.length === 0) {
                setResultado({
                    sucesso: false,
                    mensagem: 'Nenhum registro válido',
                    resumo: { total: dadosPreview.length, importados: 0, ignorados: dadosPreview.length, erros: 0 }
                });
                setEtapa('resultado');
                return;
            }

            console.log('Payload upload_tabela_anuncios:', {
                p_conta_de_anuncio_id: contaSelecionada,
                p_anuncios: payload
            });

            const { data, error } = await supabase.rpc('upload_tabela_anuncios', {
                p_conta_de_anuncio_id: contaSelecionada,
                p_anuncios: payload
            });

            if (error) {
                console.error('Erro RPC:', error);
                setResultado({
                    sucesso: false,
                    mensagem: `Erro: ${error.message}`,
                    resumo: { total: dadosPreview.length, importados: 0, ignorados: 0, erros: 1 }
                });
            } else {
                setResultado({
                    sucesso: true,
                    mensagem: `${payload.length} campanhas importadas`,
                    resumo: {
                        total: dadosPreview.length,
                        importados: payload.length,
                        ignorados: dadosPreview.length - payload.length,
                        erros: 0
                    }
                });
                addToast('Campanhas importadas com sucesso!', 'success');
                if (onImportSuccess) onImportSuccess();
            }
            setEtapa('resultado');
        } catch (error) {
            console.error('Erro:', error);
            setErro(`Erro: ${error.message}`);
            setEtapa('preview');
        }
    };

    const handleReset = () => {
        setArquivo(null);
        setDadosPreview([]);
        setEtapa('upload');
        setResultado(null);
        setErro(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const formatVal = (v) => {
        if (v === null || v === undefined || v === '') return '-';
        const num = parseFloat(v);
        return isNaN(num) ? v : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getContaNome = () => contas.find(c => c.id === contaSelecionada)?.nome || '';

    return (
        <>
            <div className="sidemenu-overlay open" onClick={onClose}></div>
            <div className="upload-sidemenu import-sidemenu open">
                <div className="sidemenu-header">
                    <h2><FileSpreadsheet size={20} /> Importar Campanhas</h2>
                    <button className="btn-icon" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="sidemenu-content">
                    {(etapa === 'upload' || etapa === 'preview') && (
                        <div className="upload-section">
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Conta de Anúncio *</label>
                                <div className="searchable-select">
                                    <div className="searchable-trigger" onClick={() => setSearchDropdown(!searchDropdown)}>
                                        <span>{contaSelecionada ? getContaNome() : 'Selecione...'}</span>
                                        <ChevronDown size={16} />
                                    </div>
                                    {searchDropdown && (
                                        <div className="searchable-dropdown">
                                            <input
                                                type="text"
                                                placeholder="Buscar..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                autoFocus
                                            />
                                            <div className="searchable-options">
                                                {contasFiltradas.length === 0 && <div className="searchable-empty">Nenhuma conta</div>}
                                                {contasFiltradas.map(conta => (
                                                    <div
                                                        key={conta.id}
                                                        className={`searchable-option ${conta.id === contaSelecionada ? 'selected' : ''}`}
                                                        onClick={() => handleContaSelect(conta.id)}
                                                    >
                                                        {conta.nome}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {etapa === 'upload' && (
                                <>
                                    <div className="dropzone" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                                        <Upload size={48} className="dropzone-icon" />
                                        <h3>Arraste o CSV de Campanhas</h3>
                                        <p>ou clique para selecionar</p>
                                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
                                    </div>
                                    <div className="info-box" style={{ marginTop: '1.5rem' }}>
                                        <Info size={16} />
                                        <div>
                                            <strong>Formato:</strong>
                                            <p>CSV do Meta Ads com <code>Nome da campanha</code></p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {etapa === 'preview' && (
                                <div className="preview-section">
                                    <div className="arquivo-info">
                                        <FileSpreadsheet size={20} />
                                        <span>{arquivo?.name}</span>
                                        <span className="registros-count">({dadosPreview.length} registros)</span>
                                    </div>
                                    <div className="preview-table-container">
                                        <table className="preview-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Nome da Campanha</th>
                                                    <th>Spend</th>
                                                    <th>CPC</th>
                                                    <th>Resultados</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dadosPreview.slice(0, 10).map((linha, i) => (
                                                    <tr key={i}>
                                                        <td>{i + 1}</td>
                                                        <td>{String(getVal(linha, 'Nome da campanha') || '').substring(0, 30)}</td>
                                                        <td>R$ {formatVal(getVal(linha, 'Valor usado (BRL)'))}</td>
                                                        <td>R$ {formatVal(getVal(linha, 'CPC (custo por clique no link) (BRL)'))}</td>
                                                        <td>{getVal(linha, 'Resultados') || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {dadosPreview.length > 10 && <div className="preview-more">...e mais {dadosPreview.length - 10}</div>}
                                    </div>
                                    <button className="btn btn-secondary" onClick={handleReset} style={{ marginTop: '1rem' }}>Outro arquivo</button>
                                </div>
                            )}

                            {erro && <div className="error-box" style={{ marginTop: '1rem' }}><AlertCircle size={16} /><span>{erro}</span></div>}
                        </div>
                    )}

                    {etapa === 'importing' && (
                        <div className="importing-section">
                            <Loader2 size={64} className="spinner" />
                            <h3>Importando campanhas...</h3>
                        </div>
                    )}

                    {etapa === 'resultado' && resultado && (
                        <div className="resultado-section">
                            <div className={`resultado-icon ${resultado.sucesso ? 'success' : 'error'}`}>
                                {resultado.sucesso ? <CheckCircle size={64} /> : <AlertCircle size={64} />}
                            </div>
                            <h3>{resultado.sucesso ? 'Concluído!' : 'Erro'}</h3>
                            <p>{resultado.mensagem}</p>
                            <div className="resultado-resumo">
                                <div className="resumo-item"><span className="resumo-valor">{resultado.resumo.total}</span><span className="resumo-label">Total</span></div>
                                <div className="resumo-item success"><span className="resumo-valor">{resultado.resumo.importados}</span><span className="resumo-label">Importados</span></div>
                                <div className="resumo-item warning"><span className="resumo-valor">{resultado.resumo.ignorados}</span><span className="resumo-label">Ignorados</span></div>
                                <div className="resumo-item error"><span className="resumo-valor">{resultado.resumo.erros}</span><span className="resumo-label">Erros</span></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="sidemenu-footer">
                    {(etapa === 'upload' || etapa === 'preview') && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                            {etapa === 'preview' && (
                                <button className="btn btn-primary" onClick={handleImportar} disabled={!contaSelecionada}>
                                    <Upload size={16} style={{ marginRight: '0.5rem' }} />
                                    Importar {dadosPreview.length}
                                </button>
                            )}
                        </div>
                    )}
                    {etapa === 'resultado' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" onClick={handleReset}>Importar Outro</button>
                            <button className="btn btn-primary" onClick={onClose}>Fechar</button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ImportadorCampanhas;
