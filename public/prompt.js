// Script per gestire il prompt per la generazione AI
document.addEventListener('DOMContentLoaded', function() {
    const originalImage = document.getElementById('originalImage');
    const promptText = document.getElementById('promptText');
    const charCount = document.getElementById('charCount');
    const estimatedTokens = document.getElementById('estimatedTokens');
    const estimatedCost = document.getElementById('estimatedCost');
    const generateBtn = document.getElementById('generateBtn');
    const backBtn = document.getElementById('backBtn');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');

    // Configurazioni
    const MAX_CHARS = 500;
    const CHARS_PER_TOKEN = 4; // Approssimazione: 1 token ogni 4 caratteri
    const COST_PER_TOKEN = 0.00004; // $0.04 per 1000 token

    // Inizializza la pagina
    init();

    // Event listeners
    promptText.addEventListener('input', updateEstimates);
    promptText.addEventListener('input', checkFormValidity);
    generateBtn.addEventListener('click', generateImage);
    backBtn.addEventListener('click', goBack);
    
    // Gestione bottoni di esempio
    setupExampleButtons();

    function setupExampleButtons() {
        const exampleButtons = document.querySelectorAll('.example-btn');
        exampleButtons.forEach(button => {
            button.addEventListener('click', function() {
                const examplePrompt = this.getAttribute('data-prompt');
                if (examplePrompt) {
                    promptText.value = examplePrompt;
                    updateEstimates();
                    checkFormValidity();
                    
                    // Chiudi il dettaglio se è aperto
                    const details = document.querySelector('.prompt-examples');
                    if (details) {
                        details.open = false;
                    }
                    
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

        if (!sessionId || !prompt) {
            showError('Sessione o prompt non validi');
            return;
        }

        // Mostra loader
        showLoader();
        generateBtn.style.display = 'none';

        // Aggiorna il messaggio del loader in base al provider
        const loaderText = document.querySelector('#loader p');
        if (selectedProvider === 'both') {
            loaderText.textContent = 'Generazione con Gemini + OpenAI in corso...';
        } else if (selectedProvider === 'openai') {
            loaderText.textContent = 'Generazione con OpenAI DALL-E in corso...';
        } else {
            loaderText.textContent = 'Analisi con Gemini in corso...';
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
                    provider: selectedProvider
                })
            });

            const result = await response.json();

            if (result.success) {
                // Salva il prompt per la pagina risultato
                sessionStorage.setItem('prompt', prompt);
                sessionStorage.setItem('selectedProvider', selectedProvider);
                
                // Vai alla pagina risultato
                window.location.href = 'result.html';
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
});
