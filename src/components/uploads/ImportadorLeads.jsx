import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, CheckCircle, Upload, Users, Info, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../../contexts/ToastContext';
import { buscarMarcas, buscarPlataformas } from '../../services-apis/supabase/configService';
import { importarLeadsViaFuncao } from '../../services-apis/supabase/leadsService';
import SearchableSelect from '../ui/SearchableSelect';
import './ImportadorLeads.css';

const ImportadorLeads = ({ onClose, onImportSuccess }) => {
    const { addToast } = useToast();
    const [brands, setBrands] = useState([]);
    const [platforms, setPlatforms] = useState([]);
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [leadPreview, setLeadPreview] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [brandsData, platformsData] = await Promise.all([
                    buscarMarcas(),
                    buscarPlataformas()
                ]);

                setBrands(brandsData.map(b => ({ value: b.id, label: b.nome })));
                setPlatforms(platformsData.map(p => ({ value: p.id, label: p.nome })));
            } catch (error) {
                console.error('Erro ao carregar dados para leads:', error);
                addToast('Erro ao carregar dados para importação.', 'error');
            }
        };
        loadData();
    }, [addToast]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) {
            setLeadPreview(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // Force UTF-8 (codepage 65001) to fix encoding issues
                const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
                const sheet = workbook.SheetNames[0];
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
                setLeadPreview({
                    fileName: file.name,
                    recordCount: json.length,
                    data: json
                });
                setError(null);
            } catch (error) {
                console.error('Erro ao ler arquivo de leads:', error);
                setError('Erro ao ler arquivo. Verifique se é um Excel válido.');
                setLeadPreview(null);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const importLeads = async () => {
        if (!selectedBrand || !selectedPlatform || !leadPreview) {
            addToast('Selecione marca, plataforma e um arquivo válido.', 'error');
            return;
        }
        setIsImporting(true);
        setError(null);

        try {
            // Helper para encontrar o nome do formulário na primeira linha com várias possibilidades de alias
            const firstRow = leadPreview.data?.[0] || {};
            const defaultFormName = firstRow['Formulário'] || firstRow['formulario'] || firstRow['Nome do Formulário'] || firstRow['nome_formulario'] || firstRow['Form Name'] || 'Importação Geral';

            const formatted = (leadPreview.data || []).map(row => ({
                nome: row['Nome'] || row['nome'] || row['Name'] || '',
                email: row['Email'] || row['email'] || '',
                telefone: row['Telefone'] || row['telefone'] || row['Phone'] || '',
                whatsapp: row['WhatsApp'] || row['whatsapp'] || '',
                nome_formulario: row['Formulário'] || row['formulario'] || row['Nome do Formulário'] || row['nome_formulario'] || row['Form Name'] || defaultFormName,
                fonte: row['Fonte'] || row['fonte'] || '',
                canal: row['Canal'] || row['canal'] || '',
                estagio: row['Estágio'] || row['estagio'] || row['Stage'] || 'Em análise',
                proprietario: row['Proprietário'] || row['proprietario'] || row['Owner'] || '',
                rotulos: row['Rótulos'] || row['rotulos'] || row['Labels'] || '',
                telefone_secundario: row['Telefone Secundário'] || row['telefone_secundario'] || ''
            }));

            await importarLeadsViaFuncao(selectedBrand, selectedPlatform, formatted);

            addToast(`Importação de ${formatted.length} leads concluída.`, 'success');
            if (onImportSuccess) onImportSuccess();
            onClose();
        } catch (error) {
            console.error('Erro ao importar leads:', error);
            const msg = error.message || '';
            if (msg.includes('Conta não localizada')) {
                setError('Conta não localizada para esta Marca/Plataforma. Verifique se existe uma conta de anúncio vinculada.');
            } else {
                setError('Erro ao importar leads. Verifique o console para mais detalhes.');
            }
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <div className="sidemenu-overlay open" onClick={onClose}></div>
            <div className="upload-sidemenu open">
                <div className="sidemenu-header">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={20} />
                        Importar Leads
                    </h2>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="sidemenu-content">
                    <p className="sidemenu-description">
                        Upload em massa de leads. Selecione a Marca e a Plataforma para vincular à conta correta.
                    </p>

                    <div className="form-group">
                        <label>Marca *</label>
                        <SearchableSelect
                            options={brands}
                            value={selectedBrand}
                            onChange={setSelectedBrand}
                            placeholder="Selecione uma marca..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Plataforma *</label>
                        <SearchableSelect
                            options={platforms}
                            value={selectedPlatform}
                            onChange={setSelectedPlatform}
                            placeholder="Selecione uma plataforma..."
                        />
                    </div>

                    <div className="form-group">
                        <label>Arquivo (Excel/CSV) *</label>
                        <div
                            className="dropzone"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', border: '2px dashed #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}
                        >
                            <Upload size={32} className="dropzone-icon" style={{ margin: '0 auto 10px', color: '#64748b' }} />
                            <p style={{ margin: 0, color: '#64748b' }}>Clique para selecionar o arquivo</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <small className="help-text" style={{ display: 'block', marginTop: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                            <Info size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                            Colunas esperadas: Nome, Email, Telefone, WhatsApp, Nome do Formulário, Fonte, Canal, Estágio, Proprietário, Rótulos.
                        </small>
                    </div>

                    <div className="import-preview">
                        {leadPreview ? (
                            <>
                                <div className="preview-line">
                                    <FileText size={16} />
                                    <span>{leadPreview.fileName}</span>
                                </div>
                                <div className="preview-line success">
                                    <CheckCircle size={16} />
                                    <span>{leadPreview.recordCount} registro(s) encontrado(s)</span>
                                </div>
                            </>
                        ) : (
                            <div className="preview-line muted">
                                <FileText size={16} />
                                <span>Nenhum arquivo selecionado</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="error-box" style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            color: '#dc2626',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            fontSize: '0.9rem'
                        }}>
                            <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="sidemenu-actions">
                        <button className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={importLeads}
                            disabled={isImporting || !selectedBrand || !selectedPlatform || !leadPreview}
                        >
                            {isImporting ? 'Importando...' : 'Importar Leads'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ImportadorLeads;
