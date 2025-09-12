// Script per gestire i risultati batch dell'AI

// Helper per chiamate API autenticate
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Wrapper per fetch autenticato
async function authenticatedFetch(url, options = {}) {
    const authHeaders = getAuthHeaders();
    const headers = { ...authHeaders, ...(options.headers || {}) };
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    // Se non autorizzato, reindirizza al login
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/login.html';
        return;
    }
    
    return response;
}

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const batchLoader = document.getElementById('batchLoader');
    const batchResultContent = document.getElementById('batchResultContent');
    const batchErrorSection = document.getElementById('batchErrorSection');
    const batchLoaderText = document.getElementById('batchLoaderText');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    // Summary elements
    const totalIterations = document.getElementById('totalIterations');
    const successfulIterations = document.getElementById('successfulIterations');
    const failedIterations = document.getElementById('failedIterations');
    const totalCost = document.getElementById('totalCost');
    const usedPrompt = document.getElementById('usedPrompt');
    const providerUsed = document.getElementById('providerUsed');
    
    // Results containers
    const batchResults = document.getElementById('batchResults');
    const batchResultsList = document.getElementById('batchResultsList');
    
    // Controls
    const viewButtons = document.querySelectorAll('.view-btn');
    const providerFilter = document.getElementById('providerFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    // Action buttons
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const newBatchBtn = document.getElementById('newBatchBtn');
    const backToUploadBtn = document.getElementById('backToUploadBtn');
    const retryBatchBtn = document.getElementById('retryBatchBtn');

    // Dati batch
    let batchData = null;
    let currentView = 'grid';
    let pollInterval = null;

    // Inizializza la pagina
    init();

    // Event listeners
    viewButtons.forEach(btn => {
        btn.addEventListener('click', (e) => switchView(e.target.dataset.view));
    });
    
    providerFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    
    downloadAllBtn.addEventListener('click', downloadAllImages);
    newBatchBtn.addEventListener('click', startNewBatch);
    backToUploadBtn.addEventListener('click', () => window.location.href = 'index.html');
    retryBatchBtn.addEventListener('click', init);

    /**
     * Inizializza il caricamento dei risultati batch
     */
    async function init() {
        const sessionId = sessionStorage.getItem('sessionId');
        const generationType = sessionStorage.getItem('generationType');

        if (!sessionId) {
            showError('Nessuna sessione trovata. Torna alla pagina di upload.');
            return;
        }

        if (generationType !== 'batch') {
            // Reindirizza alla pagina risultati normale
            window.location.href = 'result.html';
            return;
        }

        // Recupera i dati salvati
        const prompt = sessionStorage.getItem('prompt');
        const provider = sessionStorage.getItem('selectedProvider');
        const iterations = sessionStorage.getItem('iterations');

        if (prompt) usedPrompt.textContent = prompt;
        if (provider) providerUsed.textContent = `Provider: ${getProviderName(provider)}`;

        // Avvia il polling per i risultati
        startBatchPolling(sessionId);
    }

    /**
     * Avvia il polling per monitorare il progresso del batch
     */
    function startBatchPolling(sessionId) {
        batchLoaderText.textContent = 'Monitoraggio batch generation in corso...';
        
        pollInterval = setInterval(async () => {
            try {
                const response = await authenticatedFetch(`/api/batch-progress/${sessionId}`);
                const data = await response.json();

                if (response.ok) {
                    updateProgress(data);
                    
                    if (data.status === 'completed') {
                        clearInterval(pollInterval);
                        loadBatchResults(sessionId);
                    } else if (data.status === 'error') {
                        clearInterval(pollInterval);
                        showError('Errore durante la batch generation: ' + (data.progress?.error || 'Errore sconosciuto'));
                    }
                } else {
                    console.error('Errore polling batch:', data.error);
                }
            } catch (error) {
                console.error('Errore richiesta polling:', error);
            }
        }, 2000); // Poll ogni 2 secondi

        // Timeout di sicurezza
        setTimeout(() => {
            if (pollInterval) {
                clearInterval(pollInterval);
                loadBatchResults(sessionId); // Prova a caricare comunque
            }
        }, 60000); // 1 minuto timeout
    }

    /**
     * Aggiorna la barra di progresso
     */
    function updateProgress(data) {
        const { progress } = data;
        
        if (progress && progress.total > 0) {
            const percentage = Math.round((progress.current / progress.total) * 100);
            progressFill.style.width = percentage + '%';
            progressFill.textContent = percentage + '%';
            progressText.textContent = `Iterazione ${progress.current}/${progress.total}`;
            
            if (progress.completed && progress.completed.length > 0) {
                progressText.textContent += ` (${progress.completed.length} completate`;
                if (progress.failed && progress.failed.length > 0) {
                    progressText.textContent += `, ${progress.failed.length} fallite`;
                }
                progressText.textContent += ')';
            }
        }
    }

    /**
     * Carica i risultati finali del batch
     */
    async function loadBatchResults(sessionId) {
        try {
            batchLoaderText.textContent = 'Caricamento risultati finali...';
            
            const response = await authenticatedFetch(`/api/batch-progress/${sessionId}`);
            const data = await response.json();

            if (response.ok && data.results) {
                batchData = data;
                displayBatchResults();
                showResults();
            } else {
                throw new Error(data.error || 'Risultati non disponibili');
            }
        } catch (error) {
            console.error('Errore caricamento risultati:', error);
            showError('Errore nel caricamento dei risultati: ' + error.message);
        }
    }

    /**
     * Mostra la sezione risultati
     */
    function showResults() {
        batchLoader.style.display = 'none';
        batchResultContent.classList.remove('hidden');
        batchErrorSection.style.display = 'none';
    }

    /**
     * Mostra errore
     */
    function showError(message) {
        const errorMessage = document.getElementById('batchErrorMessage');
        errorMessage.textContent = message;
        
        batchLoader.style.display = 'none';
        batchResultContent.classList.add('hidden');
        batchErrorSection.style.display = 'block';
    }

    /**
     * Visualizza i risultati del batch
     */
    function displayBatchResults() {
        if (!batchData || !batchData.results) return;

        const results = batchData.results;
        
        // Aggiorna le statistiche
        updateSummaryStats(results);
        
        // Visualizza i risultati in base alla vista corrente
        displayResultsGrid(results);
        displayResultsList(results);
        
        // Applica filtri
        applyFilters();
    }

    /**
     * Aggiorna le statistiche di riepilogo
     */
    function updateSummaryStats(results) {
        const total = results.length;
        let successful = 0;
        let failed = 0;
        let cost = 0;

        results.forEach(iteration => {
            Object.values(iteration.results).forEach(result => {
                if (result.success) {
                    successful++;
                    if (result.cost && result.cost.total) {
                        cost += parseFloat(result.cost.total);
                    }
                } else {
                    failed++;
                }
            });
        });

        totalIterations.textContent = total;
        successfulIterations.textContent = successful;
        failedIterations.textContent = failed;
        totalCost.textContent = '$' + cost.toFixed(2);
    }

    /**
     * Visualizza i risultati in griglia
     */
    function displayResultsGrid(results) {
        batchResults.innerHTML = '';
        
        results.forEach((iteration, index) => {
            const iterationCard = document.createElement('div');
            iterationCard.className = 'iteration-card';
            iterationCard.innerHTML = `
                <div class="iteration-header">
                    <h4>Iterazione ${iteration.iteration}</h4>
                    <span class="iteration-time">${new Date(iteration.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="iteration-prompt">
                    <small>${iteration.prompt}</small>
                </div>
                <div class="iteration-results">
                    ${Object.entries(iteration.results).map(([provider, result]) => `
                        <div class="provider-result ${result.success ? 'success' : 'error'}" data-provider="${provider}">
                            <div class="provider-header">
                                <strong>${getProviderName(provider)}</strong>
                                ${result.success ? '✅' : '❌'}
                            </div>
                            ${result.success && result.generatedImageUrl ? `
                                <img src="${result.generatedImageUrl}" alt="Generated by ${provider}" class="result-image">
                                <div class="result-info">
                                    <span class="cost">${result.cost ? '$' + parseFloat(result.cost.total).toFixed(4) : 'N/A'}</span>
                                </div>
                            ` : `
                                <div class="error-info">
                                    <small>${result.error || 'Errore sconosciuto'}</small>
                                </div>
                            `}
                        </div>
                    `).join('')}
                </div>
            `;
            
            batchResults.appendChild(iterationCard);
        });
    }

    /**
     * Visualizza i risultati in lista
     */
    function displayResultsList(results) {
        batchResultsList.innerHTML = '';
        
        results.forEach((iteration, index) => {
            const listItem = document.createElement('div');
            listItem.className = 'iteration-list-item';
            listItem.innerHTML = `
                <div class="list-iteration-header">
                    <h4>Iterazione ${iteration.iteration} - ${new Date(iteration.timestamp).toLocaleString()}</h4>
                </div>
                <div class="list-iteration-prompt">
                    <strong>Prompt:</strong> ${iteration.prompt}
                </div>
                <div class="list-iteration-results">
                    ${Object.entries(iteration.results).map(([provider, result]) => `
                        <div class="list-provider-result ${result.success ? 'success' : 'error'}" data-provider="${provider}">
                            <div class="list-result-header">
                                <span class="provider-name">${getProviderName(provider)}</span>
                                <span class="result-status">${result.success ? '✅ Successo' : '❌ Errore'}</span>
                                ${result.cost ? `<span class="result-cost">$${parseFloat(result.cost.total).toFixed(4)}</span>` : ''}
                            </div>
                            ${result.success && result.generatedImageUrl ? `
                                <img src="${result.generatedImageUrl}" alt="Generated by ${provider}" class="list-result-image">
                            ` : `
                                <div class="list-error-info">${result.error || 'Errore sconosciuto'}</div>
                            `}
                        </div>
                    `).join('')}
                </div>
            `;
            
            batchResultsList.appendChild(listItem);
        });
    }

    /**
     * Cambia vista
     */
    function switchView(view) {
        currentView = view;
        
        // Aggiorna bottoni
        viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Mostra/nascondi viste
        document.getElementById('gridView').classList.toggle('hidden', view !== 'grid');
        document.getElementById('listView').classList.toggle('hidden', view !== 'list');
        document.getElementById('comparisonView').classList.toggle('hidden', view !== 'comparison');
    }

    /**
     * Applica filtri
     */
    function applyFilters() {
        const providerFilter = document.getElementById('providerFilter').value;
        const statusFilter = document.getElementById('statusFilter').value;
        
        const results = document.querySelectorAll('.provider-result, .list-provider-result');
        results.forEach(result => {
            const provider = result.dataset.provider;
            const isSuccess = result.classList.contains('success');
            
            let showProvider = providerFilter === 'all' || provider === providerFilter;
            let showStatus = statusFilter === 'all' || 
                             (statusFilter === 'success' && isSuccess) ||
                             (statusFilter === 'error' && !isSuccess);
            
            result.style.display = (showProvider && showStatus) ? 'block' : 'none';
        });
    }

    /**
     * Scarica tutte le immagini
     */
    async function downloadAllImages() {
        if (!batchData || !batchData.results) return;
        
        const images = [];
        batchData.results.forEach(iteration => {
            Object.entries(iteration.results).forEach(([provider, result]) => {
                if (result.success && result.generatedImageUrl) {
                    images.push({
                        url: result.generatedImageUrl,
                        filename: `iteration_${iteration.iteration}_${provider}.${result.generatedImageUrl.split('.').pop()}`
                    });
                }
            });
        });
        
        // Download sequenziale per evitare blocchi del browser
        for (const image of images) {
            try {
                const link = document.createElement('a');
                link.href = image.url;
                link.download = image.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Piccola pausa tra download
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error('Errore download:', image.filename, error);
            }
        }
    }

    /**
     * Avvia una nuova batch generation
     */
    function startNewBatch() {
        // Mantieni la sessione corrente ma torna al prompt
        sessionStorage.removeItem('generationType');
        sessionStorage.removeItem('iterations');
        window.location.href = 'prompt.html';
    }

    /**
     * Ottieni nome provider
     */
    function getProviderName(provider) {
        const names = {
            'gemini': '🔮 Gemini',
            'openai': '🎨 OpenAI',
            'stability': '⚡ Stability AI',

            'both': '🔥 Tutti'
        };
        return names[provider] || provider;
    }
});
