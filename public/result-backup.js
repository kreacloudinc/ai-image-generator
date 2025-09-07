// Script per gestire la pagina dei risultati
document.addEventListener('DOMContentLoaded', function() {
    const initialLoader = document.getElementById('initialLoader');
    const resultContent = document.getElementById('resultContent');
    const originalImage = document.getElementById('originalImage');
    const generatedImage = document.getElementById('generatedImage');
    const usedPrompt = document.getElementById('usedPrompt');
    const tokenCount = document.getElementById('tokenCount');
    const estimatedCost = document.getElementById('estimatedCost');
    const restartBtn = document.getElementById('restartBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMessage = document.getElementById('errorMessage');
    const aiDescription = document.getElementById('aiDescription');
    const aiDescriptionText = document.getElementById('aiDescriptionText');

    // Inizializza la pagina
    init();

    // Event listeners
    restartBtn.addEventListener('click', restart);
    downloadBtn.addEventListener('click', downloadImage);

    /**
     * Inizializza la pagina caricando i risultati
     */
    async function init() {
        const sessionId = sessionStorage.getItem('sessionId');

        if (!sessionId) {
            showError('Nessuna sessione trovata. Torna alla pagina di upload.');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return;
        }

        try {
            // Carica i dati del risultato dal server
            const response = await fetch(`/api/result/${sessionId}`);
            const data = await response.json();

            if (response.ok && data.result) {
                displayResults(data);
            } else {
                throw new Error(data.error || 'Risultato non trovato');
            }
        } catch (error) {
            console.error('Errore caricamento risultato:', error);
            showError('Errore nel caricamento del risultato: ' + error.message);
        } finally {
            hideLoader();
        }
    }

    /**
     * Mostra i risultati della generazione
     */
    function displayResults(data) {
        const result = data.result;
        
        // Mostra le immagini
        originalImage.src = result.originalImagePath;
        generatedImage.src = result.generatedImageUrl;
        
        // Mostra il prompt
        usedPrompt.textContent = result.prompt;
        
        // Mostra le statistiche
        tokenCount.textContent = result.estimatedTokens;
        estimatedCost.textContent = result.estimatedCost;
        
        // Se c'è una descrizione AI di Gemini, mostrala
        if (result.aiDescription) {
            aiDescriptionText.textContent = result.aiDescription;
            aiDescription.classList.remove('hidden');
        }
        
        // Mostra il contenuto dei risultati
        resultContent.classList.remove('hidden');
        
        console.log('✅ Risultati caricati');
    }

    /**
     * Ricomincia il processo
     */
    function restart() {
        // Pulisce la sessione
        sessionStorage.removeItem('sessionId');
        sessionStorage.removeItem('prompt');
        
        // Torna alla pagina di upload
        window.location.href = 'index.html';
    }

    /**
     * Scarica l'immagine generata
     */
    function downloadImage() {
        const imageUrl = generatedImage.src;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = 'immagine-generata.jpg';
        link.click();
    }

    /**
     * Mostra il loader
     */
    function showLoader() {
        initialLoader.classList.remove('hidden');
    }

    /**
     * Nasconde il loader
     */
    function hideLoader() {
        initialLoader.classList.add('hidden');
    }

    /**
     * Mostra un messaggio di errore
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
});
