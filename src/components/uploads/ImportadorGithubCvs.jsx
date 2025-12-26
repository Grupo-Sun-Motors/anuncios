
import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Info, ChevronDown } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { supabase } from '../../services-apis/supabase/client';
import * as XLSX from 'xlsx';

/**
 * Componente para importar PLANILHAS GITHUB
 * Descrição: Importar planilhas para o github Sun Motors via Edge Function
 */
const ImportadorGithubCvs = ({ onImportSuccess, onClose }) => {
    const { addToast } = useToast();
    const fileInputRef = useRef(null);
    const dropdownRef = useRef(null);

    const [plataforma, setPlataforma] = useState('');
    const [arquivo, setArquivo] = useState(null);
    const [etapa, setEtapa] = useState('upload'); // upload, preview, importing, resultado
    const [resultado, setResultado] = useState(null);
    const [erro, setErro] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Preview Data
    const [previewData, setPreviewData] = useState({ headers: [], rows: [], totalCount: 0 });

    const plataformas = [
        { id: 'google', label: 'Google Ads', path: 'planilhas/google' },
        { id: 'meta', label: 'Meta Ads', path: 'planilhas/meta' }
    ];

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const parseFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Get headers and rows
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonData.length === 0) {
                    setErro('O arquivo está vazio.');
                    return;
                }

                const headers = jsonData[0];
                const rows = jsonData.slice(1, 6); // First 5 rows for preview
                const totalCount = jsonData.length - 1; // Total rows minus header

                setPreviewData({ headers, rows, totalCount });
                setArquivo(file);
                setErro(null);
                setEtapa('preview');
            } catch (err) {
                console.error('Erro ao ler arquivo:', err);
                setErro('Falha ao processar arquivo. Verifique se é um CSV/Excel válido.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const extension = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(extension)) {
            setErro('Por favor, selecione um arquivo CSV ou Excel.');
            return;
        }

        parseFile(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect({ target: { files: [file] } });
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove o prefixo "data:application/xxx;base64," para enviar apenas a string pura
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleImportar = async () => {
        if (!plataforma) {
            setErro('Selecione uma plataforma (Google ou Meta)');
            return;
        }
        if (!arquivo) return;

        setEtapa('importing');
        setErro(null);

        try {
            const contentBase64 = await convertToBase64(arquivo);
            const selectedPlatform = plataformas.find(p => p.id === plataforma);

            const { data, error } = await supabase.functions.invoke('upload-to-github', {
                body: {
                    fileName: arquivo.name,
                    contentBase64: contentBase64,
                    repoPath: selectedPlatform.path
                }
            });

            if (error) throw error;

            console.log('Upload Sucesso:', data);
            addToast('Upload enviado para o GitHub com sucesso!', 'success');

            setResultado({
                sucesso: true,
                total: previewData.totalCount,
                importados: previewData.totalCount, // Como é upload de arquivo, consideramos tudo importado
                ignorados: 0,
                erros: 0
            });
            setEtapa('resultado');
            if (onImportSuccess) onImportSuccess();

        } catch (err) {
            console.error('Erro no upload:', err);
            const msg = err.message || 'Erro desconhecido ao processar upload.';
            setErro(`Falha no envio: ${msg} `);
            addToast('Erro ao enviar arquivo.', 'error');
            setEtapa('preview');
        }
    };

    const handleReset = () => {
        setArquivo(null);
        setPreviewData({ headers: [], rows: [], totalCount: 0 });
        setEtapa('upload');
        setResultado(null);
        setErro(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <>
            <div className="sidemenu-overlay open" onClick={onClose}></div>
            <div className={`upload-sidemenu import-sidemenu open ${etapa === 'resultado' ? 'resultado-view' : ''}`} style={{ maxWidth: '600px' }}>
                <div className="sidemenu-header">
                    <h2>
                        {etapa === 'resultado' ? 'Importação Concluída' : 'Importar Planilha GitHub'}
                    </h2>
                    <button className="btn-icon" onClick={onClose}><X size={24} /></button>
                </div>

                <div className="sidemenu-content">
                    {(etapa === 'upload' || etapa === 'preview') && (
                        <div className="upload-section">
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label>Plataforma *</label>
                                <div className="searchable-select" ref={dropdownRef}>
                                    <div
                                        className="searchable-trigger"
                                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    >
                                        <span>{plataforma ? plataformas.find(p => p.id === plataforma)?.label : 'Selecione a plataforma...'}</span>
                                        <ChevronDown size={16} />
                                    </div>
                                    {isDropdownOpen && (
                                        <div className="searchable-dropdown">
                                            <div className="searchable-options">
                                                {plataformas.map(p => (
                                                    <div
                                                        key={p.id}
                                                        className={`searchable-option ${p.id === plataforma ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setPlataforma(p.id);
                                                            setIsDropdownOpen(false);
                                                            setErro(null);
                                                        }}
                                                    >
                                                        {p.label}
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
                                        <h3>Arraste a Planilha</h3>
                                        <p>ou clique para selecionar</p>
                                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
                                    </div>
                                    <div className="info-box" style={{ marginTop: '1.5rem' }}>
                                        <Info size={16} />
                                        <div>
                                            <strong>Destino:</strong>
                                            <p>Arquivos serão enviados para o repositório <code>topstack-analytics</code>.</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {etapa === 'preview' && (
                                <div className="preview-section">
                                    <div className="arquivo-info">
                                        <FileSpreadsheet size={20} />
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontWeight: 600, display: 'block' }}>{arquivo?.name}</span>
                                            <span className="registros-count">{previewData.totalCount} registros encontrados</span>
                                        </div>
                                        <button className="btn-text" onClick={handleReset}>Trocar</button>
                                    </div>

                                    <div className="table-preview-container" style={{ maxHeight: '300px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px', margin: '1rem 0' }}>
                                        <table className="preview-table" style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    {previewData.headers.map((h, i) => (
                                                        <th key={i} style={{ padding: '8px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewData.rows.map((row, i) => (
                                                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        {previewData.headers.map((_, j) => (
                                                            <td key={j} style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                                                                {row[j]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {previewData.totalCount > 5 && (
                                            <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                                                ... e mais {previewData.totalCount - 5} linhas
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {erro && <div className="error-box" style={{ marginTop: '1rem' }}><AlertCircle size={16} /><span>{erro}</span></div>}
                        </div>
                    )}

                    {etapa === 'importing' && (
                        <div className="importing-section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                            <Loader2 size={48} className="spinner" style={{ margin: '0 auto 1.5rem', color: '#3b82f6' }} />
                            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Enviando para GitHub...</h3>
                            <p className="text-muted">Isso pode levar alguns segundos, dependendo do tamanho do arquivo.</p>
                        </div>
                    )}

                    {etapa === 'resultado' && resultado && (
                        <div className="resultado-section" style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{
                                width: '80px', height: '80px', background: '#ecfdf5', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem',
                                color: '#10b981'
                            }}>
                                <CheckCircle size={48} />
                            </div>

                            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#111827' }}>Importação Concluída!</h3>
                            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                                O arquivo foi enviado com sucesso para a pasta <strong>{plataformas.find(p => p.id === plataforma)?.path}</strong>
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>{resultado.total}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                                </div>
                                <div style={{ background: '#ecfdf5', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{resultado.importados}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Importados</div>
                                </div>
                                <div style={{ background: '#fefce8', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>{resultado.ignorados}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ignorados</div>
                                </div>
                                <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{resultado.erros}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Erros</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="sidemenu-footer" style={{ borderTop: '1px solid #e5e7eb', padding: '1rem 1.5rem', background: '#fff' }}>
                    {(etapa === 'upload' || etapa === 'preview') && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                            {etapa === 'preview' && (
                                <button className="btn btn-primary" onClick={handleImportar} disabled={!plataforma}>
                                    <Upload size={16} style={{ marginRight: '0.5rem' }} />
                                    {plataformas.find(p => p.id === plataforma)?.id === 'google' ? 'Importar Google' : 'Importar Meta'}
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

export default ImportadorGithubCvs;
