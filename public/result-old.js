// result.js - Gestione visualizzazione risultato (Pagina 4)

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const loadingSection = document.getElementById('loadingSection');
    const resultContent = document.getElementById('resultContent');
    const originalImage = document.getElementById('originalImage');
    const generatedImage = document.getElementById('generatedImage');
    const usedPrompt = document.getElementById('usedPrompt');
    const tokenCount = document.getElementById('tokenCount');
    const estimatedCost = document.getElementById('estimatedCost');
    const generationTime = document.getElementById('generationTime');
    const mockNotice = document.getElementById('mockNotice');
    const mockMessage = document.getElementById('mockMessage');
    const downloadBtn = document.getElementById('downloadBtn');
    const restartBtn = document.getElementById('restartBtn');
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    const backBtn = document.getElementById('backBtn');
    const homeBtn = document.getElementById('homeBtn');

    // Event listeners
    downloadBtn.addEventListener('click', downloadImage);
    restartBtn.addEventListener('click', restart);
    backBtn.addEventListener('click', goBack);
    homeBtn.addEventListener('click', goHome);

    // Inizializzazione
    init();

    /**
     * Inizializza la pagina caricando il risultato
     */
    async function init() {
        const sessionId = localStorage.getItem('sessionId');
        
        if (!sessionId) {
            showError('Nessun risultato trovato. Torna all\'inizio.');
            return;
        }

        try {
            // Carica il risultato dal server
            const response = await fetch(`/api/result/${sessionId}`);
            const data = await response.json();

            if (response.ok) {
                displayResult(data);
            } else {
                throw new Error(data.error || 'Errore nel caricamento del risultato');
            }
        } catch (error) {
            console.error('❌ Errore caricamento risultato:', error);
            showError(error.message || 'Errore di connessione');
        }
    }

    /**
     * Mostra il risultato della generazione
     */
    function displayResult(data) {
        // Mostra immagine originale
        originalImage.src = `/uploads/${data.imagePath}`;
        originalImage.alt = 'Immagine originale';

        // Mostra immagine generata (in questo mock è la stessa)
        generatedImage.src = `/uploads/${data.result.generatedImagePath}`;
        generatedImage.alt = 'Immagine generata';

        // Mostra prompt utilizzato
        usedPrompt.textContent = data.result.prompt;

        // Mostra statistiche
        tokenCount.textContent = `${data.result.estimatedTokens} token`;
        estimatedCost.textContent = `$${data.result.estimatedCost.toFixed(3)}`;
        
        // Formatta la data di generazione
        const generatedDate = new Date(data.result.generatedAt);
        generationTime.textContent = formatDateTime(generatedDate);

        // Mostra messaggio mock se presente
        if (data.result.mockMessage) {
            mockMessage.textContent = data.result.mockMessage;
            mockNotice.style.display = 'block';
        } else {
            mockNotice.style.display = 'none';
        }

        // Salva il path dell'immagine per il download
        downloadBtn.setAttribute('data-image-path', data.result.generatedImagePath);

        // Mostra il contenuto del risultato
        loadingSection.style.display = 'none';
        resultContent.style.display = 'block';
        errorSection.style.display = 'none';

        console.log('🎨 Risultato visualizzato:', data);
    }

    /**
     * Formatta data e ora per la visualizzazione
     */
    function formatDateTime(date) {
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        };
        return date.toLocaleDateString('it-IT', options);
    }

    /**
     * Download dell'immagine generata
     */
    function downloadImage() {
        const imagePath = downloadBtn.getAttribute('data-image-path');
        
        if (!imagePath) {
            alert('Impossibile scaricare l\'immagine.');
            return;
        }

        // Crea un link temporaneo per il download
        const link = document.createElement('a');
        link.href = `/uploads/${imagePath}`;
        link.download = `immagine-generata-${Date.now()}.jpg`;
        
        // Simula il click per avviare il download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('💾 Download avviato:', imagePath);
    }

    /**
     * Ricomincia il processo dall'inizio
     */
    function restart() {
        // Pulisci i dati della sessione
        const sessionId = localStorage.getItem('sessionId');
        if (sessionId) {
            // Invia richiesta al server per pulire la sessione
            fetch(`/api/session/${sessionId}`, { method: 'DELETE' })
                .catch(error => console.warn('Errore pulizia sessione:', error));
        }
        
        // Pulisci localStorage
        localStorage.removeItem('sessionId');
        localStorage.removeItem('imagePath');
        localStorage.removeItem('prompt');
        
        console.log('🔄 Riavvio dell\'applicazione');
        
        // Reindirizza alla home
        window.location.href = 'index.html';
    }

    /**
     * Torna alla pagina del prompt
     */
    function goBack() {
        window.location.href = 'prompt.html';
    }

    /**
     * Vai alla home
     */
    function goHome() {
        restart(); // Stessa logica del restart
    }

    /**
     * Mostra messaggio di errore
     */
    function showError(message) {
        errorMessage.textContent = message;
        loadingSection.style.display = 'none';
        resultContent.style.display = 'none';
        errorSection.style.display = 'block';
    }

    // Log per debug
    console.log('🎨 Pagina risultato inizializzata');
});
