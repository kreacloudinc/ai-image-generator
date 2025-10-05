// Script per gestire il prompt per la generazione AI
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
        openai: 0.080,
        gemini: 0.339,
        stability: 0.020,
        comfyui: 0.000 // free local
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
        
        let totalCost = 0;
        
        if (selectedProvider === 'both') {
            // Calculate for all providers
            totalCost = iterations * (PROVIDER_COSTS.openai + PROVIDER_COSTS.gemini + PROVIDER_COSTS.stability);
        } else {
            totalCost = iterations * (PROVIDER_COSTS[selectedProvider] || 0);
        }
        
        batchPreview.textContent = `${iterations} immagini`;
        costEstimate.textContent = `💰 Costo stimato: $${totalCost.toFixed(2)}`;
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
            const response = await fetch(`/api/image/${sessionId}`);
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
        } else if (selectedProvider === 'comfyui') {
            loaderText.textContent = 'Generazione con ComfyUI SD 3.5 Large Turbo in corso...';
        } else if (selectedProvider === 'openai') {
            loaderText.textContent = 'Generazione con OpenAI GPT Image 1 in corso...';
        } else if (selectedProvider === 'stability') {
            loaderText.textContent = 'Generazione con Stability AI in corso...';
        } else if (selectedProvider === 'gemini') {
            loaderText.textContent = 'Analisi con Gemini in corso...';
        } else {
            loaderText.textContent = 'Generazione AI in corso...';
        }

        try {
            const response = await fetch('/api/generate', {
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
     * Torna alla pagina di conferma
     */
    function goBack() {
        window.location.href = 'confirm.html';
    }

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
            const response = await fetch('/api/batch-generate', {
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
                const response = await fetch(`/api/batch-progress/${sessionId}`);
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
                        // Vai alla pagina dei risultati
                        window.location.href = 'result.html';
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
     * Avvia il polling per risultati progressivi
     */
    function startProgressPolling(sessionId, selectedProvider) {
        const pollInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/progress/${sessionId}`);
                const progressData = await response.json();

                if (progressData.status === 'completed' || progressData.isComplete) {
                    clearInterval(pollInterval);
                    // Vai alla pagina risultato quando completato
                    window.location.href = 'result.html';
                    return;
                }

                // Aggiorna il messaggio del loader con i progressi
                updateLoaderProgress(progressData.progress, selectedProvider);

            } catch (error) {
                console.error('Errore polling:', error);
                // Continua il polling anche in caso di errore temporaneo
            }
        }, 1000); // Polling ogni secondo

        // Timeout di sicurezza (5 minuti)
        setTimeout(() => {
            clearInterval(pollInterval);
            if (document.querySelector('#loader:not(.hidden)')) {
                // Se il loader è ancora visibile, vai alla pagina risultato
                window.location.href = 'result.html';
            }
        }, 300000); // 5 minuti
    }

    /**
     * Aggiorna il messaggio del loader con i progressi
     */
    function updateLoaderProgress(progress, selectedProvider) {
        const loaderText = document.querySelector('#loader p');
        if (!loaderText) return;

        if (selectedProvider === 'both') {
            const providers = ['gemini', 'openai', 'stability', 'comfyui'];
            const completed = providers.filter(p => progress[p] === 'completed').length;
            const total = providers.length;
            
            if (completed > 0) {
                loaderText.textContent = `Generazione in corso... (${completed}/${total} completati)`;
            }
        } else {
            const status = progress[selectedProvider];
            if (status === 'generating') {
                loaderText.textContent = `Generazione con ${getProviderName(selectedProvider)} in corso...`;
            } else if (status === 'completed') {
                loaderText.textContent = `${getProviderName(selectedProvider)} completato!`;
            } else if (status === 'error') {
                loaderText.textContent = `Errore con ${getProviderName(selectedProvider)}, caricamento risultati...`;
            }
        }
    }

    /**
     * Ottieni il nome del provider per visualizzazione
     */
    function getProviderName(provider) {
        switch (provider) {
            case 'gemini': return 'Gemini';
            case 'openai': return 'OpenAI GPT Image 1';
            case 'stability': return 'Stability AI';
            case 'comfyui': return 'ComfyUI';
            default: return provider;
        }
    }
});
