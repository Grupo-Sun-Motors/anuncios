window.initUploads = () => {
    // Use a small delay to ensure the main app and supabase client are initialized
    setTimeout(() => {
        let supabase;
        try {
            supabase = window.getSupabaseClient();
        } catch (e) {
            console.error('Supabase client is not available.');
            return;
        }

        // DOM Elements
        const adAccountSelect = document.getElementById('importer-ad-account');
        const uploadFieldset = document.getElementById('upload-fieldset');
        const campaignsFileInput = document.getElementById('importer-campaigns-file');
        const adsetsFileInput = document.getElementById('importer-adsets-file');
        const adsFileInput = document.getElementById('importer-ads-file');
        const startImportBtn = document.getElementById('start-import-btn');
        const feedbackLog = document.getElementById('importer-log');
        const spinner = startImportBtn.querySelector('.spinner');

        let selectedAccountId = null;
        const files = {
            campaigns: null,
            adsets: null,
            ads: null,
        };

        // --- INITIALIZATION ---

        async function loadAdAccounts() {
            logToPanel('info', 'Carregando contas de anúncio...');
            const { data, error } = await supabase
                .from('contas_de_anuncio')
                .select('id, nome');

            if (error) {
                console.error('Error fetching ad accounts:', error);
                logToPanel('error', `Erro ao carregar contas de anúncio: ${error.message}`);
                return;
            }

            if (data) {
                adAccountSelect.innerHTML = '<option value="">Selecione uma conta...</option>'; // Reset
                data.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.id;
                    option.textContent = account.nome;
                    adAccountSelect.appendChild(option);
                });
                logToPanel('success', 'Contas de anúncio carregadas.');
            }
        }

        // --- UI LOGIC ---

        function checkFormValidity() {
            const isAccountSelected = !!selectedAccountId;
            const areAllFilesSelected = files.campaigns && files.adsets && files.ads;
            startImportBtn.disabled = !(isAccountSelected && areAllFilesSelected);
        }

        function logToPanel(type, message) {
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            feedbackLog.appendChild(entry);
            feedbackLog.scrollTop = feedbackLog.scrollHeight;
        }

        function resetForm() {
            adAccountSelect.value = '';
            campaignsFileInput.value = '';
            adsetsFileInput.value = '';
            adsFileInput.value = '';
            files.campaigns = null;
            files.adsets = null;
            files.ads = null;
            selectedAccountId = null;
            uploadFieldset.disabled = true;
            startImportBtn.disabled = true;
        }

        // --- EVENT LISTENERS ---

        adAccountSelect.addEventListener('change', () => {
            selectedAccountId = adAccountSelect.value;
            uploadFieldset.disabled = !selectedAccountId;
            checkFormValidity();
        });

        campaignsFileInput.addEventListener('change', (e) => {
            files.campaigns = e.target.files[0];
            checkFormValidity();
        });

        adsetsFileInput.addEventListener('change', (e) => {
            files.adsets = e.target.files[0];
            checkFormValidity();
        });

        adsFileInput.addEventListener('change', (e) => {
            files.ads = e.target.files[0];
            checkFormValidity();
        });

        startImportBtn.addEventListener('click', handleImport);

        // --- CORE IMPORT LOGIC ---

        function parseCsvToJSON(file) {
            return new Promise((resolve, reject) => {
                if (!file) {
                    return reject(new Error("Arquivo não fornecido."));
                }
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        resolve(results.data);
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            });
        }

        async function handleImport() {
            // 1. Set loading state
            startImportBtn.disabled = true;
            spinner.style.display = 'inline-block';
            feedbackLog.innerHTML = ''; // Clear log
            logToPanel('info', 'Iniciando importação...');

            try {
                // 2. Parse CSV files
                logToPanel('info', 'Lendo arquivos CSV...');
                const [campaignsData, adsetsData, adsData] = await Promise.all([
                    parseCsvToJSON(files.campaigns),
                    parseCsvToJSON(files.adsets),
                    parseCsvToJSON(files.ads),
                ]);
                logToPanel('success', 'Arquivos CSV lidos e convertidos para JSON.');

                // 3. Sequential RPC Execution
                // Step A: Import Campaigns
                logToPanel('info', 'Etapa 1/3: Processando Campanhas...');
                const { error: campaignsError, data: campaignsResult } = await supabase.rpc('importar_campanhas_meta', {
                    p_conta_anuncio_id: selectedAccountId,
                    p_campanhas_json: campaignsData
                });

                if (campaignsError) throw new Error(`Campanhas: ${campaignsError.message}`);
                if (!campaignsResult) {
                    throw new Error("Erro na Etapa 1: A função RPC falhou (404) e não retornou dados.");
                }
                const campResult = campaignsResult[0] || campaignsResult; // Handle both array and object returns
                logToPanel('success', `Etapa 1/3: Campanhas processadas. ${campResult.criados} criadas, ${campResult.atualizados} atualizadas.`);


                // Step B: Import Ad Sets
                logToPanel('info', 'Etapa 2/3: Processando Conjuntos de Anúncios...');
                const { error: adsetsError, data: adsetsResult } = await supabase.rpc('importar_conjuntos_meta', {
                    p_conjuntos_json: adsetsData
                });
                if (adsetsError) throw new Error(`Conjuntos: ${adsetsError.message}`);
                if (!adsetsResult) {
                    throw new Error("Erro na Etapa 2: A função RPC não retornou dados.");
                }
                const adsetResult = adsetsResult[0] || adsetsResult;
                logToPanel('success', `Etapa 2/3: Conjuntos processados. ${adsetResult.criados} criadas, ${adsetResult.atualizados} atualizadas.`);

                // Step C: Import Ads
                logToPanel('info', 'Etapa 3/3: Processando Anúncios...');
                const { error: adsError, data: adsResult } = await supabase.rpc('importar_anuncios_meta', {
                    p_anuncios_json: adsData
                });
                if (adsError) throw new Error(`Anúncios: ${adsError.message}`);
                if (!adsResult) {
                    throw new Error("Erro na Etapa 3: A função RPC não retornou dados.");
                }
                const adResult = adsResult[0] || adsResult;
                logToPanel('success', `Etapa 3/3: Anúncios processados. ${adResult.criados} criadas, ${adResult.atualizados} atualizadas.`);

                // 4. Conclusion
                logToPanel('success', 'Importação concluída com sucesso!');
                resetForm();

            } catch (error) {
                console.error('Import failed:', error);
                logToPanel('error', `Falha na importação: ${error.message}`);
            } finally {
                // Reset loading state
                spinner.style.display = 'none';
                // Re-enable button on failure, but keep it disabled on success as the form is reset
                if (feedbackLog.innerText.includes('Falha')) {
                    startImportBtn.disabled = false;
                }
            }
        }

        // --- LOAD INITIAL DATA ---
        // Only load if the uploads view is visible
        const uploadsView = document.getElementById('view-uploads');
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && uploadsView.style.display !== 'none') {
                    loadAdAccounts();
                }
            });
        });

        observer.observe(uploadsView, { attributes: true });

        // Initial check in case the page loads with the view visible
        if (uploadsView.style.display !== 'none') {
            loadAdAccounts();
        }
    }, 100); // 100ms delay should be enough
};
