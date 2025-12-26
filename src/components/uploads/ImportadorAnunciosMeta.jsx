import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '../../services-apis/supabase/client';
import { useToast } from '../../contexts/ToastContext';

/**
 * Componente para importar ANÚNCIOS da plataforma META (Facebook/Instagram Ads)
 * RPC: upload_tabela_anuncios
 * 
 * Formato CSV esperado: Exportação padrão do Meta Ads Manager
 * Colunas: Nome da campanha, Valor usado (BRL), CPC, CTR, Resultados, etc.
 * 
 * @param {string} contaSelecionada - ID da conta de anúncio selecionada
 * @param {string} contaNome - Nome da conta para exibição
 * @param {function} onImportSuccess - Callback após importação com sucesso
 * @param {function} onReset - Callback para resetar a seleção de conta
 */
const ImportadorAnunciosMeta = ({ contaSelecionada, contaNome, onImportSuccess, onReset }) => {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);

    const [arquivo, setArquivo] = useState(null);
    const [dadosPreview, setDadosPreview] = useState([]);
    const [etapa, setEtapa] = useState('upload'); // 'upload' | 'preview' | 'importing' | 'resultado'
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);

    const parseMetricValue = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;

        const str = String(value).trim();
        // Remove símbolos de moeda e porcentagem
        let cleaned = str.replace(/[R$\s%]/g, '');

        // Trata formato brasileiro (1.000,00) vs formato americano (1,000.00)
        // Assumindo que o CSV vem pt-BR baseada nos headers
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
            setErro('Selecione um arquivo CSV ou Excel.');
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
                error: (error) => setErro(`Erro: ${error.message}`)
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
                    setErro(`Erro: ${error.message}`);
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
            setErro('Conta de anúncio não selecionada');
            return;
        }

        setEtapa('importing');
        setErro(null);

        try {
            // MAP para garantir apenas UM registro por campanha (o mais recente)
            const campanhasUnicas = new Map();

            dadosPreview.forEach(linha => {
                const nomeRaw = getVal(linha, 'Nome da campanha');
                if (!nomeRaw) return;

                const nome = String(nomeRaw).trim();
                const dataFimStr = getVal(linha, 'Término dos relatórios'); // Ex: 2025-06-30

                // Cria objeto com os dados desta linha
                const dadosLinha = {
                    nome: nome,
                    external_id: String(getVal(linha, 'Identificação da campanha') || '').trim(),
                    data_fim: dataFimStr, // Usado apenas para comparar qual é mais novo
                    metricas: {
                        cpc: parseMetricValue(getVal(linha, 'CPC (custo por clique no link) (BRL)')),
                        ctr: parseMetricValue(getVal(linha, 'CTR (todos)')),
                        spend: parseMetricValue(getVal(linha, 'Valor usado (BRL)')),
                        conversao: parseInt(getVal(linha, 'Resultados') || '0', 10),
                        impressoes: parseInt(getVal(linha, 'Impressões') || '0', 10),
                        cpa: parseMetricValue(getVal(linha, 'Custo por resultados'))
                    }
                };

                // LÓGICA DO SNAPSHOT:
                // Se ainda não pegamos essa campanha, adiciona.
                // Se já pegamos, verifica se a linha atual é mais recente que a guardada.
                if (!campanhasUnicas.has(nome)) {
                    campanhasUnicas.set(nome, dadosLinha);
                } else {
                    const existente = campanhasUnicas.get(nome);
                    // Comparação de string de data ISO (YYYY-MM-DD) funciona bem
                    // Se a linha atual tiver data maior que a existente, substitui.
                    if (dadosLinha.data_fim > existente.data_fim) {
                        campanhasUnicas.set(nome, dadosLinha);
                    }
                }
            });

            // Transforma o Map em Array para envio, removendo o campo auxiliar data_fim
            const payload = Array.from(campanhasUnicas.values()).map(item => ({
                nome: item.nome,
                external_id: item.external_id,
                metricas: item.metricas
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

            // Envia para o Supabase - Função específica para META
            const { data, error } = await supabase.rpc('upload_tabela_anuncios', {
                p_conta_de_anuncio_id: contaSelecionada,
                p_anuncios: payload
            });

            if (error) {
                console.error('Erro RPC (Meta):', error);
                setResultado({
                    sucesso: false,
                    mensagem: `Erro: ${error.message}`,
                    resumo: { total: dadosPreview.length, importados: 0, ignorados: 0, erros: 1 }
                });
            } else {
                setResultado({
                    sucesso: true,
                    mensagem: `${payload.length} anúncios Meta atualizados.`,
                    resumo: {
                        total: dadosPreview.length,
                        importados: payload.length,
                        ignorados: dadosPreview.length - payload.length,
                        erros: 0
                    }
                });
                addToast('Snapshot de anúncios Meta atualizado!', 'success');
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

    const handleTrocarConta = () => {
        handleReset();
        if (onReset) onReset();
    };

    const formatVal = (v) => {
        if (v === null || v === undefined || v === '') return '-';
        const num = parseFloat(v);
        return isNaN(num) ? v : num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="importador-content">
            {/* Badge da Plataforma */}
            <div className="plataforma-badge meta" style={{ marginBottom: '1rem' }}>
                <span className="badge-icon">📘</span>
                <span>Meta Ads (Facebook/Instagram)</span>
            </div>

            {/* Conta Selecionada */}
            <div className="conta-info" style={{ marginBottom: '1.5rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <small style={{ color: 'var(--text-muted)' }}>Conta selecionada:</small>
                        <p style={{ margin: 0, fontWeight: 500 }}>{contaNome || 'N/A'}</p>
                    </div>
                    <button className="btn btn-sm btn-ghost" onClick={handleTrocarConta}>Trocar</button>
                </div>
            </div>

            {(etapa === 'upload' || etapa === 'preview') && (
                <div className="upload-section">
                    {etapa === 'upload' && (
                        <>
                            <div className="dropzone" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                                <Upload size={48} className="dropzone-icon" />
                                <h3>Arraste o CSV aqui</h3>
                                <p>ou clique para selecionar</p>
                                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
                            </div>
                            <div className="info-box" style={{ marginTop: '1.5rem' }}>
                                <Info size={16} />
                                <div>
                                    <strong>Formato Meta Ads:</strong>
                                    <p>CSV exportado do Meta Ads Manager com <code>Nome da campanha</code>, <code>Valor usado</code>, <code>CPC</code>, <code>CTR</code>, <code>Resultados</code></p>
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
                                            <th>Nome</th>
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
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                <button className="btn btn-secondary" onClick={handleReset}>Outro arquivo</button>
                                <button className="btn btn-primary" onClick={handleImportar}>
                                    <Upload size={16} style={{ marginRight: '0.5rem' }} />
                                    Importar {dadosPreview.length}
                                </button>
                            </div>
                        </div>
                    )}

                    {erro && <div className="error-box" style={{ marginTop: '1rem' }}><AlertCircle size={16} /><span>{erro}</span></div>}
                </div>
            )}

            {etapa === 'importing' && (
                <div className="importing-section">
                    <Loader2 size={64} className="spinner" />
                    <h3>Importando anúncios Meta...</h3>
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
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={handleReset}>Importar Outro</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImportadorAnunciosMeta;
