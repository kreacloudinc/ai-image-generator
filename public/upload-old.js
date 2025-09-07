// upload.js - Gestione upload immagini (Pagina 1)

document.addEventListener('DOMContentLoaded', func    /**
     * Carica l'immagine sul server
     */
    async function uploadImage() {
        showLoader();
        uploadBtn.style.display = 'none';

        try {
            const formData = new FormData();
            formData.append('image', selectedFile);

            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Salva il filename in sessionStorage per la pagina successiva
                sessionStorage.setItem('uploadedImage', result.filename);
                
                // Redirect alla pagina di conferma
                window.location.href = 'confirm.html';
            } else {
                throw new Error(result.error || 'Errore durante upload');
            }

        } catch (error) {
            console.error('Errore upload:', error);
            showError('Errore durante il caricamento: ' + error.message);
            hideLoader();
            uploadBtn.style.display = 'block';
        }
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

    console.log('📷 Pagina upload inizializzata');
});menti DOM
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadForm = document.getElementById('uploadForm');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');

    let selectedFile = null;

    // Event listeners
    uploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleFileSelect);
    uploadForm.addEventListener('submit', handleFormSubmit);

    // Gestione drag & drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);

    /**
     * Gestisce l'evento di selezione file
     */
    function handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            processFile(file);
        }
    }

    /**
     * Gestisce il submit del form
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        
        if (!selectedFile) {
            showError('Seleziona un\'immagine prima di caricare');
            return;
        }

        await uploadImage();
    }

    /**
     * Gestisce il drag over
     */
    function handleDragOver(event) {
        event.preventDefault();
        uploadArea.classList.add('drag-over');
    }

    /**
    /**
     * Gestisce il drag leave
     */
    function handleDragLeave(event) {
        event.preventDefault();
        uploadArea.classList.remove('drag-over');
    }

    /**
     * Gestisce il drop del file
     */
    function handleDrop(event) {
        event.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            imageInput.files = files;
            processFile(files[0]);
        }
    }

    /**
     * Processa il file selezionato
     */
    function processFile(file) {
        // Validazione tipo file
        if (!file.type.startsWith('image/')) {
            showError('Il file selezionato non è un\'immagine valida.');
            return;
        }

        // Validazione dimensione (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showError('Il file è troppo grande. Dimensione massima: 10MB.');
            return;
        }

        selectedFile = file;
        
        // Abilita il bottone upload
        uploadBtn.disabled = false;
        uploadBtn.textContent = `📤 Carica ${file.name}`;
        
        hideError();
    }
        uploadArea.style.display = 'none';
        previewSection.style.display = 'block';
        errorSection.style.display = 'none';
        uploadBtn.disabled = false;
    }

    /**
     * Reset dell'upload
     */
    function resetUpload() {
        selectedFile = null;
        fileInput.value = '';
        uploadArea.style.display = 'block';
        previewSection.style.display = 'none';
        loadingSection.style.display = 'none';
        errorSection.style.display = 'none';
        uploadBtn.disabled = true;
    }

    /**
     * Upload dell'immagine al server
     */
    async function uploadImage() {
        if (!selectedFile) {
            showError('Nessun file selezionato.');
            return;
        }

        // Mostra loading
        previewSection.style.display = 'none';
        loadingSection.style.display = 'block';
        errorSection.style.display = 'none';

        try {
            // Prepara FormData per l'upload
            const formData = new FormData();
            formData.append('image', selectedFile);

            // Invia richiesta al server
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Salva sessionId nel localStorage per le prossime pagine
                localStorage.setItem('sessionId', result.sessionId);
                localStorage.setItem('imagePath', result.imagePath);
                
                console.log('✅ Upload completato:', result);
                
                // Reindirizza alla pagina di conferma
                window.location.href = 'confirm.html';
            } else {
                throw new Error(result.error || 'Errore durante l\'upload');
            }
        } catch (error) {
            console.error('❌ Errore upload:', error);
            showError(error.message || 'Errore di connessione. Riprova.');
            
            // Torna alla preview
            loadingSection.style.display = 'none';
            previewSection.style.display = 'block';
        }
    }

    /**
     * Mostra messaggio di errore
     */
    function showError(message) {
        errorMessage.textContent = message;
        uploadArea.style.display = 'none';
        previewSection.style.display = 'none';
        loadingSection.style.display = 'none';
        errorSection.style.display = 'block';
    }

    // Log per debug
    console.log('📷 Pagina upload inizializzata');
});
