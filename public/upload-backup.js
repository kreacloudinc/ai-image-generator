// Script per gestire l'upload delle immagini e la selezione
document.addEventListener('DOMContentLoaded', function() {
    // Elementi upload
    const uploadForm = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadArea = document.getElementById('uploadArea');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    
    // Elementi selezione modalità
    const uploadModeBtn = document.getElementById('uploadModeBtn');
    const selectModeBtn = document.getElementById('selectModeBtn');
    const uploadSection = document.getElementById('uploadSection');
    const selectSection = document.getElementById('selectSection');
    const imagesGrid = document.getElementById('imagesGrid');
    const noImages = document.getElementById('noImages');
    
    let selectedImage = null;
    let currentMode = 'upload'; // 'upload' o 'select'
    
    // Inizializzazione
    init();
    
    function init() {
        setupModeButtons();
        setupUploadHandlers();
        loadExistingImages();
    }
    
    function setupModeButtons() {
        uploadModeBtn.addEventListener('click', () => switchMode('upload'));
        selectModeBtn.addEventListener('click', () => switchMode('select'));
    }
    
    function switchMode(mode) {
        currentMode = mode;
        
        if (mode === 'upload') {
            uploadModeBtn.classList.add('active');
            selectModeBtn.classList.remove('active');
            uploadSection.classList.remove('hidden');
            selectSection.classList.add('hidden');
        } else {
            selectModeBtn.classList.add('active');
            uploadModeBtn.classList.remove('active');
            selectSection.classList.remove('hidden');
            uploadSection.classList.add('hidden');
            loadExistingImages(); // Ricarica le immagini quando si cambia modalità
        }
        
        hideError();
    }
    
    function setupUploadHandlers() {

    // Abilita il bottone quando un file è selezionato
    imageInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = `📤 Carica ${file.name}`;
            hideError();
        } else {
            uploadBtn.disabled = true;
            uploadBtn.textContent = '📤 Carica Immagine';
        }
    });

    // Gestisce il drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            imageInput.files = files;
            uploadBtn.disabled = false;
            uploadBtn.textContent = `📤 Carica ${files[0].name}`;
            hideError();
        }
    });

    // Click sull'area di upload
    uploadArea.addEventListener('click', function() {
        imageInput.click();
    });

    // Gestisce l'invio del form
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const file = imageInput.files[0];
        if (!file) {
            showError('Seleziona un\'immagine prima di caricare');
            return;
        }

        // Mostra loader e nasconde bottone
        showLoader();
        uploadBtn.style.display = 'none';

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Salva il sessionId in sessionStorage per la pagina successiva
                sessionStorage.setItem('sessionId', result.sessionId);
                
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
    });

    // Funzioni di utilità
    function showLoader() {
        loader.classList.remove('hidden');
    }

    function hideLoader() {
        loader.classList.add('hidden');
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }
});
