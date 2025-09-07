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
        selectedImage = null;
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
            this.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            
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

            await uploadImage(file);
        });
    }
    
    async function loadExistingImages() {
        try {
            showLoader();
            
            const response = await fetch('/api/images');
            const data = await response.json();
            
            hideLoader();
            
            if (data.images && data.images.length > 0) {
                displayImages(data.images);
                noImages.classList.add('hidden');
            } else {
                imagesGrid.innerHTML = '';
                noImages.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Errore nel caricare le immagini:', error);
            hideLoader();
            showError('Errore nel caricare le immagini esistenti');
        }
    }
    
    function displayImages(images) {
        imagesGrid.innerHTML = '';
        
        images.forEach(image => {
            const imageItem = createImageItem(image);
            imagesGrid.appendChild(imageItem);
        });
    }
    
    function createImageItem(image) {
        const item = document.createElement('div');
        item.className = 'image-item';
        
        const img = document.createElement('img');
        img.src = `/uploads/${image.filename}`;
        img.alt = image.filename;
        img.loading = 'lazy';
        
        const info = document.createElement('div');
        info.className = 'image-info';
        
        const filename = document.createElement('div');
        filename.className = 'filename';
        filename.textContent = image.filename.length > 20 ? 
            image.filename.substring(0, 17) + '...' : 
            image.filename;
        
        const date = document.createElement('div');
        date.className = 'date';
        date.textContent = new Date(image.uploadDate).toLocaleDateString('it-IT');
        
        info.appendChild(filename);
        info.appendChild(date);
        
        item.appendChild(img);
        item.appendChild(info);
        
        // Gestisce il click per selezionare l'immagine
        item.addEventListener('click', () => selectExistingImage(image.filename, item));
        
        return item;
    }
    
    async function selectExistingImage(filename, itemElement) {
        try {
            // Rimuovi selezione precedente
            document.querySelectorAll('.image-item.selected').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Aggiungi selezione corrente
            itemElement.classList.add('selected');
            selectedImage = filename;
            
            showLoader();
            
            // Invia richiesta di selezione al server
            const response = await fetch('/api/select-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ filename })
            });
            
            const data = await response.json();
            hideLoader();
            
            if (data.success) {
                // Salva sessionId e vai alla pagina di conferma
                sessionStorage.setItem('sessionId', data.sessionId);
                sessionStorage.setItem('imagePath', data.imagePath);
                
                console.log('✅ Immagine selezionata:', filename);
                window.location.href = 'confirm.html';
            } else {
                throw new Error(data.error || 'Errore nella selezione');
            }
            
        } catch (error) {
            console.error('Errore selezione immagine:', error);
            hideLoader();
            showError('Errore nella selezione dell\'immagine: ' + error.message);
            
            // Rimuovi selezione in caso di errore
            itemElement.classList.remove('selected');
            selectedImage = null;
        }
    }
    
    async function uploadImage(file) {
        try {
            showLoader();
            uploadBtn.style.display = 'none';

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            hideLoader();

            if (data.success) {
                // Salva i dati della sessione
                sessionStorage.setItem('sessionId', data.sessionId);
                sessionStorage.setItem('imagePath', data.imagePath);
                
                console.log('✅ Upload completato:', data.imagePath);
                
                // Reindirizza alla pagina di conferma
                window.location.href = 'confirm.html';
            } else {
                throw new Error(data.error || 'Errore durante l\'upload');
            }
        } catch (error) {
            console.error('Errore upload:', error);
            hideLoader();
            uploadBtn.style.display = 'block';
            showError('Errore durante l\'upload: ' + error.message);
        }
    }
    
    // Utility functions
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
