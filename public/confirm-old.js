// confirm.js - Gestione conferma immagine (Pagina 2)

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const loadingSection = document.getElementById('loadingSection');
    const imageConfirm = document.getElementById('imageConfirm');
    const uploadedImage = document.getElementById('uploadedImage');
    const fileName = document.getElementById('fileName');
    const imageDimensions = document.getElementById('imageDimensions');
    const retryBtn = document.getElementById('retryBtn');
    const acceptBtn = document.getElementById('acceptBtn');
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    const backBtn = document.getElementById('backBtn');

    // Event listeners
    retryBtn.addEventListener('click', goBackToUpload);
    acceptBtn.addEventListener('click', acceptImage);
    backBtn.addEventListener('click', goBackToUpload);

    // Inizializzazione
    init();

    /**
     * Inizializza la pagina caricando i dati dell'immagine
     */
    async function init() {
        const sessionId = sessionStorage.getItem('sessionId');

        if (!sessionId) {
            showError('Nessuna immagine trovata. Torna alla pagina di upload.');
            return;
        }

        try {
            // Carica i dati dell'immagine dal server
            const response = await fetch(`/api/image/${sessionId}`);
            const data = await response.json();

            if (response.ok) {
                displayImage(data);
            } else {
                throw new Error(data.error || 'Errore nel caricamento dell\'immagine');
            }
        } catch (error) {
            console.error('❌ Errore caricamento:', error);
            showError(error.message || 'Errore di connessione');
        }
    }

    /**
     * Mostra l'immagine caricata
     */
    function displayImage(data) {
        // Imposta il src dell'immagine
        const imageUrl = `/uploads/${data.imagePath}`;
        uploadedImage.src = imageUrl;
        uploadedImage.alt = data.originalName;

        // Mostra informazioni del file
        fileName.textContent = data.originalName;

        // Quando l'immagine si carica, calcola le dimensioni
        uploadedImage.onload = function() {
            const naturalWidth = uploadedImage.naturalWidth;
            const naturalHeight = uploadedImage.naturalHeight;
            const fileSize = calculateFileSize();
            
            imageDimensions.textContent = `${naturalWidth} × ${naturalHeight} px${fileSize}`;
            
            // Mostra la sezione di conferma
            loadingSection.style.display = 'none';
            imageConfirm.style.display = 'block';
            errorSection.style.display = 'none';
        };

        // Gestione errore caricamento immagine
        uploadedImage.onerror = function() {
            showError('Impossibile caricare l\'immagine. Riprova l\'upload.');
        };

        console.log('✅ Immagine caricata per conferma:', data);
    }

    /**
     * Calcola una stima della dimensione del file (approssimativa)
     */
    function calculateFileSize() {
        // Questa è una stima approssimativa basata sulle dimensioni dell'immagine
        // In un'implementazione reale, avresti la dimensione del file dal server
        const pixels = uploadedImage.naturalWidth * uploadedImage.naturalHeight;
        const estimatedBytes = pixels * 3; // Stima 3 bytes per pixel (RGB)
        
        if (estimatedBytes < 1024) {
            return ` (~ ${estimatedBytes} B)`;
        } else if (estimatedBytes < 1024 * 1024) {
            return ` (~ ${(estimatedBytes / 1024).toFixed(1)} KB)`;
        } else {
            return ` (~ ${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB)`;
        }
    }

    /**
     * Torna alla pagina di upload
     */
    function goBackToUpload() {
        // Pulisce i dati della sessione
        const sessionId = sessionStorage.getItem('sessionId');
        if (sessionId) {
            // Opzionalmente, invia richiesta al server per pulire la sessione
            fetch(`/api/session/${sessionId}`, { method: 'DELETE' })
                .catch(error => console.warn('Errore pulizia sessione:', error));
        }
        
        sessionStorage.removeItem('sessionId');
        
        // Reindirizza alla pagina di upload
        window.location.href = 'index.html';
    }

    /**
     * Accetta l'immagine e vai alla pagina del prompt
     */
    function acceptImage() {
        const sessionId = sessionStorage.getItem('sessionId');
        
        if (!sessionId) {
            showError('Sessione non valida. Torna all\'upload.');
            return;
        }

        console.log('✅ Immagine accettata, vai al prompt');
        
        // Reindirizza alla pagina del prompt
        window.location.href = 'prompt.html';
    }

    /**
     * Mostra messaggio di errore
     */
    function showError(message) {
        errorMessage.textContent = message;
        loadingSection.style.display = 'none';
        imageConfirm.style.display = 'none';
        errorSection.style.display = 'block';
    }

    // Log per debug
    console.log('✅ Pagina conferma inizializzata');
});
