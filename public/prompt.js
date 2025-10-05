// Script per gestire la generazione di prompt AI

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
    const originalImage = document.getElementById('originalImage');
    const promptText = document.getElementById('promptText');
    const negativePrompt = document.getElementById('negativePrompt');
    const charCount = document.getElementById('charCount');
    const estimatedTokens = document.getElementById('estimatedTokens');
    const estimatedCost = document.getElementById('estimatedCost');
    const generateBtn = document.getElementById('generateBtn');
    const backBtn = document.getElementById('backBtn');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');

    // Batch generation elements
    const batchSettings = document.getElementById('batchSettings');
    const iterationsRange = document.getElementById('iterationsRange');
    const iterationsNumber = document.getElementById('iterations');
    const batchPreview = document.getElementById('batchPreview');
    const costEstimate = document.getElementById('costEstimate');

    // Configurazioni
    const CHARS_PER_TOKEN = 4; // Approssimazione: 1 token ogni 4 caratteri
    const COST_PER_TOKEN = 0.00004; // $0.04 per 1000 token

    // Provider costs (per image)
    const PROVIDER_COSTS = {
        gemini: 0.075,   // $0.075 per prompt
        openai: 0.040   // $0.040 per immagine
    };

    // Inizializza la pagina
    init();

    // Event listeners
    promptText.addEventListener('input', updateEstimates);
    promptText.addEventListener('input', checkFormValidity);
    generateBtn.addEventListener('click', generateImage);
    backBtn.addEventListener('click', goBack);
    
    // Batch generation listeners
    document.querySelectorAll('input[name="generationType"]').forEach(radio => {
        radio.addEventListener('change', toggleBatchSettings);
    });
    
    iterationsRange.addEventListener('input', syncIterations);
    iterationsNumber.addEventListener('input', syncIterations);
    
    // Provider change listener for cost calculation
    document.querySelectorAll('input[name="provider"]').forEach(radio => {
        radio.addEventListener('change', updateBatchCostEstimate);
    });
    
    // Gestione bottoni preset
    setupPresetButtons();

    function toggleBatchSettings() {
        const generationType = document.querySelector('input[name="generationType"]:checked').value;
        const isVisible = generationType === 'batch';
        
        batchSettings.style.display = isVisible ? 'block' : 'none';
        
        if (isVisible) {
            updateBatchCostEstimate();
        }
        
        // Update button text
        generateBtn.textContent = isVisible ? '🔄 Avvia Batch Generation' : '🎨 Genera Immagine';
    }

    function syncIterations(event) {
        const value = event.target.value;
        
        if (event.target === iterationsRange) {
            iterationsNumber.value = value;
        } else {
            iterationsRange.value = Math.max(2, Math.min(100, value));
            iterationsNumber.value = iterationsRange.value;
        }
        
        updateBatchCostEstimate();
    }

    function updateBatchCostEstimate() {
        const iterations = parseInt(iterationsNumber.value) || 10;
        const selectedProvider = document.querySelector('input[name="provider"]:checked').value;
        
        // Calcola costo basato sul provider selezionato
        let cost = 0;
        let providerName = '';
        
        switch(selectedProvider) {
            case 'both':
                cost = iterations * (PROVIDER_COSTS.gemini + PROVIDER_COSTS.openai);
                providerName = 'Gemini + OpenAI';
                break;
            case 'all':
                cost = iterations * (PROVIDER_COSTS.gemini + PROVIDER_COSTS.openai);
                providerName = 'Tutti i provider';
                break;
            case 'gemini':
                cost = iterations * PROVIDER_COSTS.gemini;
                providerName = 'Gemini';
                break;
            case 'openai':
                cost = iterations * PROVIDER_COSTS.openai;
                providerName = 'OpenAI';
                break;

            default:
                cost = iterations * PROVIDER_COSTS.gemini;
                providerName = 'Gemini';
        }
        
        batchPreview.textContent = `${iterations} immagini con ${providerName}`;
        costEstimate.textContent = `💰 Costo stimato: $${cost.toFixed(3)}`;
    }

    function setupPresetButtons() {
        const presetButtons = document.querySelectorAll('.preset-btn');
        presetButtons.forEach(button => {
            button.addEventListener('click', function() {
                const presetPrompt = this.getAttribute('data-prompt');
                if (presetPrompt) {
                    promptText.value = presetPrompt;
                    
                    // Simula l'evento input per attivare tutti i controlli
                    promptText.dispatchEvent(new Event('input', { bubbles: true }));
                    
                    // Focus sul campo per mostrare che è attivo
                    promptText.focus();
                    
                    console.log('✅ Prompt predefinito selezionato:', this.textContent.trim());
                }
            });
        });
    }

    /**
     * Inizializza la pagina caricando l'immagine
     */
    async function init() {
        const sessionId = sessionStorage.getItem('sessionId');

        if (!sessionId) {
            showError('Nessuna immagine trovata. Torna alla pagina di upload.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }

        try {
            // Carica i dati dell'immagine dal server
            const response = await authenticatedFetch(`/api/image/${sessionId}`);
            const data = await response.json();

            if (response.ok && data.imagePath) {
                // Mostra l'immagine originale
                originalImage.src = `/uploads/${data.imagePath}`;
                originalImage.alt = data.originalName || 'Immagine originale';
                
                // Inizializza le stime
                updateEstimates();
                checkFormValidity();
                
                console.log('✅ Immagine caricata per il prompt');
            } else {
                throw new Error(data.error || 'Immagine non trovata');
            }
        } catch (error) {
            console.error('Errore caricamento immagine:', error);
            showError('Errore nel caricamento dell\'immagine: ' + error.message);
        }
    }

    /**
     * Aggiorna le stime dei token e costi
     */
    function updateEstimates() {
        const text = promptText.value;
        const charLength = text.length;
        const tokens = Math.ceil(charLength / CHARS_PER_TOKEN);
        const cost = (tokens * COST_PER_TOKEN).toFixed(4);

        // Aggiorna contatori
        charCount.textContent = charLength;
        estimatedTokens.textContent = tokens;
        estimatedCost.textContent = `$${cost}`;
    }

    /**
     * Controlla se il form è valido
     */
    function checkFormValidity() {
        const text = promptText.value.trim();
        generateBtn.disabled = text.length === 0;
    }

    /**
     * Genera l'immagine
     */
    async function generateImage() {
        const sessionId = sessionStorage.getItem('sessionId');
        const prompt = promptText.value.trim();
        const selectedProvider = document.querySelector('input[name="provider"]:checked').value;
        const generationType = document.querySelector('input[name="generationType"]:checked').value;

        if (!sessionId || !prompt) {
            showError('Sessione o prompt non validi');
            return;
        }

        // Mostra loader
        showLoader();
        generateBtn.style.display = 'none';

        if (generationType === 'batch') {
            await generateBatch(sessionId, prompt, selectedProvider);
        } else {
            await generateSingle(sessionId, prompt, selectedProvider);
        }
    }

    /**
     * Genera una singola immagine
     */
    async function generateSingle(sessionId, prompt, selectedProvider) {
        // Aggiorna il messaggio del loader in base al provider
        const loaderText = document.querySelector('#loader p');
        if (selectedProvider === 'both') {
            loaderText.textContent = 'Generazione con tutti i modelli AI in corso...';
        } else if (selectedProvider === 'openai') {
            loaderText.textContent = 'Generazione con OpenAI GPT Image 1 in corso...';

        } else if (selectedProvider === 'gemini') {
            loaderText.textContent = 'Analisi con Gemini in corso...';
        } else {
            loaderText.textContent = 'Generazione AI in corso...';
        }

        try {
            const response = await authenticatedFetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    prompt: prompt,
                    negativePrompt: negativePrompt.value.trim(),
                    provider: selectedProvider
                })
            });

            const result = await response.json();

            if (result.success) {
                // Salva il prompt per la pagina risultato
                sessionStorage.setItem('prompt', prompt);
                sessionStorage.setItem('selectedProvider', selectedProvider);
                
                // Avvia il polling per i risultati progressivi
                startProgressPolling(sessionId, selectedProvider);
                
            } else {
                throw new Error(result.error || 'Errore durante generazione');
            }

        } catch (error) {
            console.error('Errore generazione:', error);
            showError('Errore durante la generazione: ' + error.message);
            hideLoader();
            generateBtn.style.display = 'block';
        }
    }

    /**
     * Genera batch di immagini
     */
    async function generateBatch(sessionId, prompt, selectedProvider) {
        const iterations = parseInt(iterationsNumber.value) || 10;
        
        const loaderText = document.querySelector('#loader p');
        loaderText.textContent = `Avvio batch generation: ${iterations} iterazioni...`;

        try {
            const response = await authenticatedFetch('/api/batch-generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    prompt: prompt,
                    provider: selectedProvider,
                    iterations: iterations
                })
            });

            const result = await response.json();

            if (result.success) {
                // Salva dati per la pagina risultato
                sessionStorage.setItem('prompt', prompt);
                sessionStorage.setItem('selectedProvider', selectedProvider);
                sessionStorage.setItem('generationType', 'batch');
                sessionStorage.setItem('iterations', iterations);
                
                // Avvia il polling per batch progress
                startBatchProgressPolling(sessionId);
                
            } else {
                throw new Error(result.error || 'Errore durante batch generation');
            }

        } catch (error) {
            console.error('Errore batch generation:', error);
            showError('Errore durante la batch generation: ' + error.message);
            hideLoader();
            generateBtn.style.display = 'block';
        }
    }

    /**
     * Avvia il polling per batch progress
     */
    function startBatchProgressPolling(sessionId) {
        const pollInterval = setInterval(async () => {
            try {
                const response = await authenticatedFetch(`/api/batch-progress/${sessionId}`);
                const data = await response.json();

                if (response.ok) {
                    const { status, progress } = data;
                    
                    // Aggiorna loader text
                    const loaderText = document.querySelector('#loader p');
                    if (progress && progress.total) {
                        loaderText.textContent = `Batch generation: ${progress.current}/${progress.total} completate`;
                    }

                    if (status === 'completed') {
                        clearInterval(pollInterval);
                        // Imposta flag per batch e vai alla pagina dei risultati batch
                        sessionStorage.setItem('generationType', 'batch');
                        window.location.href = 'batch-result.html';
                    } else if (status === 'error') {
                        clearInterval(pollInterval);
                        showError('Errore durante la batch generation');
                        hideLoader();
                        generateBtn.style.display = 'block';
                    }
                } else {
                    console.error('Errore polling batch progress:', data.error);
                }
            } catch (error) {
                console.error('Errore richiesta batch progress:', error);
            }
        }, 3000); // Poll ogni 3 secondi

        // Timeout di sicurezza (30 minuti)
        setTimeout(() => {
            clearInterval(pollInterval);
            showError('Timeout batch generation - Controlla i risultati manualmente');
            hideLoader();
            generateBtn.style.display = 'block';
        }, 30 * 60 * 1000);
    }

    /**
     * Torna alla pagina di conferma
     */
    function goBack() {
        window.location.href = 'confirm.html';
    }

    /**
     * Mostra il loader
     */
    function showLoader() {
        loader.classList.remove('hidden');
    }

    /**
     * Nasconde il loader
     */
    function hideLoader() {
        loader.classList.add('hidden');
    }

    /**
     * Mostra un messaggio di errore
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    /**
     * Nasconde il messaggio di errore
     */
    function hideError() {
        errorMessage.classList.add('hidden');
    }

    /**
     * Avvia polling per i risultati progressivi
     */
    function startProgressPolling(sessionId, selectedProvider) {
        const pollInterval = setInterval(async () => {
            try {
                const response = await authenticatedFetch(`/api/result/${sessionId}`);
                const data = await response.json();

                if (response.ok) {
                    const { status, progress, isComplete } = data;
                    
                    updateLoaderProgress(progress, selectedProvider);

                    if (isComplete || status === 'completed') {
                        clearInterval(pollInterval);
                        // Vai alla pagina dei risultati
                        window.location.href = 'result.html';
                    } else if (status === 'error') {
                        clearInterval(pollInterval);
                        showError('Errore durante la generazione');
                        hideLoader();
                        generateBtn.style.display = 'block';
                    }
                } else {
                    console.error('Errore polling risultati:', data.error);
                }
            } catch (error) {
                console.error('Errore richiesta polling:', error);
            }
        }, 2000); // Poll ogni 2 secondi

        // Timeout di sicurezza (5 minuti)
        setTimeout(() => {
            clearInterval(pollInterval);
            showError('Timeout generazione - Controlla i risultati manualmente');
            hideLoader();
            generateBtn.style.display = 'block';
        }, 5 * 60 * 1000);
    }

    function updateLoaderProgress(progress, selectedProvider) {
        const loaderText = document.querySelector('#loader p');
        
        if (!progress) return;

        let progressMessages = [];
        
        // Controllo dello stato di ogni provider
        if (selectedProvider === 'both') {
            const providers = ['gemini', 'openai'];
            providers.forEach(provider => {
                if (progress[provider]) {
                    const status = progress[provider];
                    const name = getProviderName(provider);
                    if (status === 'generating') {
                        progressMessages.push(`${name}: In corso...`);
                    } else if (status === 'completed') {
                        progressMessages.push(`${name}: ✅ Completato`);
                    } else if (status === 'error') {
                        progressMessages.push(`${name}: ❌ Errore`);
                    }
                }
            });
        } else {
            const status = progress[selectedProvider];
            const name = getProviderName(selectedProvider);
            if (status === 'generating') {
                progressMessages.push(`${name}: Generazione in corso...`);
            } else if (status === 'completed') {
                progressMessages.push(`${name}: Completato con successo!`);
            }
        }

        if (progressMessages.length > 0) {
            loaderText.textContent = progressMessages.join(' | ');
        }
    }

    function getProviderName(provider) {
        const names = {
            'gemini': 'Gemini',
            'openai': 'OpenAI'
        };
        return names[provider] || provider;
    }
});
