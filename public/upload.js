// Script per gestire l'upload delle immagini e la selezione

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
    // Elementi upload
    const uploadForm = document.getElementById('uploadForm');
    const imageInput = document.getElementById('imageInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadArea = document.getElementById('uploadArea');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('errorMessage');
    
    // Elementi selezione modalità
    const uploadModeBtn = document.getElementById('uploadModeBtn');
    const cameraModeBtn = document.getElementById('cameraModeBtn');
    const selectModeBtn = document.getElementById('selectModeBtn');
    const uploadSection = document.getElementById('uploadSection');
    const cameraSection = document.getElementById('cameraSection');
    const selectSection = document.getElementById('selectSection');
    const imagesGrid = document.getElementById('imagesGrid');
    const noImages = document.getElementById('noImages');
    
    // Elementi galleria immagini generate
    const generatedGallery = document.getElementById('generatedGallery');
    const noGenerated = document.getElementById('noGenerated');
    
    // Elementi camera
    const cameraVideo = document.getElementById('cameraVideo');
    const cameraCanvas = document.getElementById('cameraCanvas');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    const useCameraPhotoBtn = document.getElementById('useCameraPhotoBtn');
    const capturedImage = document.getElementById('capturedImage');
    const cameraPreviewResult = document.getElementById('cameraPreviewResult');
    
    let selectedImage = null;
    let currentMode = 'upload'; // 'upload', 'camera' o 'select'
    let cameraStream = null;
    let capturedBlob = null;
    
    // Inizializzazione
    init();
    
    function init() {
        setupModeButtons();
        setupUploadHandlers();
        setupCameraHandlers();
        loadExistingImages();
        loadGeneratedImages();
    }
    
    function setupModeButtons() {
        uploadModeBtn.addEventListener('click', () => switchMode('upload'));
        cameraModeBtn.addEventListener('click', () => switchMode('camera'));
        selectModeBtn.addEventListener('click', () => switchMode('select'));
    }
    
    function switchMode(mode) {
        currentMode = mode;
        
        // Reset tutti i pulsanti
        uploadModeBtn.classList.remove('active');
        cameraModeBtn.classList.remove('active');
        selectModeBtn.classList.remove('active');
        
        // Nascondi tutte le sezioni
        uploadSection.classList.add('hidden');
        cameraSection.classList.add('hidden');
        selectSection.classList.add('hidden');
        
        // Attiva il modo selezionato
        if (mode === 'upload') {
            uploadModeBtn.classList.add('active');
            uploadSection.classList.remove('hidden');
        } else if (mode === 'camera') {
            cameraModeBtn.classList.add('active');
            cameraSection.classList.remove('hidden');
        } else if (mode === 'select') {
            selectModeBtn.classList.add('active');
            selectSection.classList.remove('hidden');
            loadExistingImages(); // Ricarica immagini quando si seleziona
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
            
            const response = await authenticatedFetch('/api/images');
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
    
    async function loadGeneratedImages() {
        try {
            const response = await authenticatedFetch('/api/generated-images');
            const data = await response.json();
            
            if (data.images && data.images.length > 0) {
                displayGeneratedImages(data.images);
                noGenerated.classList.add('hidden');
            } else {
                generatedGallery.innerHTML = '<h3>🎨 Galleria Immagini Generate</h3>';
                noGenerated.classList.remove('hidden');
                generatedGallery.appendChild(noGenerated);
            }
            
        } catch (error) {
            console.error('Errore nel caricare le immagini generate:', error);
            // Non mostrare errore per le immagini generate, è opzionale
        }
    }
    
    function displayGeneratedImages(images) {
        // Ricreo la struttura base
        generatedGallery.innerHTML = '<h3>🎨 Galleria Immagini Generate</h3>';
        
        const galleryGrid = document.createElement('div');
        galleryGrid.className = 'gallery-grid';
        
        images.forEach(image => {
            const imageItem = createGeneratedImageItem(image);
            galleryGrid.appendChild(imageItem);
        });
        
        generatedGallery.appendChild(galleryGrid);
    }
    
    function createGeneratedImageItem(image) {
        const item = document.createElement('div');
        item.className = `generated-item ${image.provider}`;
        
        const img = document.createElement('img');
        img.src = image.url;
        img.alt = image.filename;
        img.className = 'generated-image';
        img.loading = 'lazy';
        
        const info = document.createElement('div');
        info.className = 'generated-info';
        
        const provider = document.createElement('div');
        provider.className = `provider ${image.provider}`;
        provider.innerHTML = `${image.providerIcon} ${image.providerName}`;
        
        const filename = document.createElement('div');
        filename.className = 'filename';
        filename.textContent = image.filename.length > 25 ? 
            image.filename.substring(0, 22) + '...' : 
            image.filename;
        
        const date = document.createElement('div');
        date.className = 'date';
        date.textContent = new Date(image.generatedDate).toLocaleString('it-IT');
        
        info.appendChild(provider);
        info.appendChild(filename);
        info.appendChild(date);
        
        item.appendChild(img);
        item.appendChild(info);
        
        // Click per vedere l'immagine a dimensione piena
        item.addEventListener('click', () => viewGeneratedImage(image));
        
        return item;
    }
    
    function viewGeneratedImage(image) {
        // Crea un overlay per mostrare l'immagine a dimensione piena
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.src = image.url;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        `;
        
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        
        // Chiudi al click
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        console.log('🖼️ Visualizzazione immagine:', image.filename);
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
            const response = await authenticatedFetch('/api/select-image', {
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

            const response = await authenticatedFetch('/api/upload', {
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
    
    // === FUNZIONI CAMERA ===
    
    function setupCameraHandlers() {
        startCameraBtn.addEventListener('click', startCamera);
        captureBtn.addEventListener('click', capturePhoto);
        retakeBtn.addEventListener('click', retakePhoto);
        useCameraPhotoBtn.addEventListener('click', useCameraPhoto);
    }
    
    async function startCamera() {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                } 
            });
            
            cameraVideo.srcObject = cameraStream;
            cameraVideo.play();
            
            startCameraBtn.disabled = true;
            captureBtn.disabled = false;
            startCameraBtn.textContent = '📷 Camera Attiva';
            
            hideError();
        } catch (error) {
            console.error('Errore accesso camera:', error);
            showError('Impossibile accedere alla camera. Verifica i permessi del browser.');
        }
    }
    
    function capturePhoto() {
        const canvas = cameraCanvas;
        const video = cameraVideo;
        
        // Imposta le dimensioni del canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Disegna il frame corrente del video sul canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        // Converti in blob
        canvas.toBlob((blob) => {
            capturedBlob = blob;
            
            // Mostra l'anteprima
            const url = URL.createObjectURL(blob);
            capturedImage.src = url;
            cameraPreviewResult.classList.remove('hidden');
            
            // Aggiorna i controlli
            captureBtn.classList.add('hidden');
            retakeBtn.classList.remove('hidden');
            useCameraPhotoBtn.classList.remove('hidden');
            
        }, 'image/jpeg', 0.8);
    }
    
    function retakePhoto() {
        // Reset anteprima
        cameraPreviewResult.classList.add('hidden');
        capturedBlob = null;
        
        // Reset controlli
        captureBtn.classList.remove('hidden');
        retakeBtn.classList.add('hidden');
        useCameraPhotoBtn.classList.add('hidden');
    }
    
    async function useCameraPhoto() {
        if (!capturedBlob) {
            showError('Nessuna foto catturata');
            return;
        }
        
        showLoader();
        
        try {
            // Crea FormData per l'upload
            const formData = new FormData();
            const fileName = `camera_${Date.now()}.jpg`;
            formData.append('image', capturedBlob, fileName);
            
            const response = await authenticatedFetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Salva session ID e vai alla pagina di conferma
                sessionStorage.setItem('sessionId', result.sessionId);
                window.location.href = 'confirm.html';
            } else {
                throw new Error(result.error || 'Errore durante l\'upload');
            }
            
        } catch (error) {
            console.error('Errore:', error);
            showError('Errore durante l\'upload della foto: ' + error.message);
        } finally {
            hideLoader();
        }
    }
    
    // Cleanup camera stream quando si cambia pagina
    window.addEventListener('beforeunload', () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
    });
    
    // Carica i batch completati all'avvio
    loadCompletedBatches();
});

// Funzioni per la galleria batch
async function loadCompletedBatches() {
    try {
        const response = await authenticatedFetch('/api/completed-batches');
        if (!response.ok) {
            throw new Error('Errore nel caricamento dei batch');
        }
        
        const batches = await response.json();
        displayBatchGallery(batches);
    } catch (error) {
        console.error('Errore nel caricamento dei batch:', error);
        displayBatchGallery([]);
    }
}

function displayBatchGallery(batches) {
    const batchGallery = document.getElementById('batchGallery');
    
    if (!batches || batches.length === 0) {
        batchGallery.innerHTML = `
            <div class="batch-gallery-empty">
                <span>🎨</span>
                <p>Nessun batch completato ancora.<br>Crea il tuo primo batch dalla sezione prompt!</p>
            </div>
        `;
        return;
    }
    
    batchGallery.innerHTML = batches.map(batch => `
        <div class="batch-item" onclick="viewBatchDetails('${batch.sessionId}')">
            <img src="${batch.previewImage}" alt="Preview batch" class="batch-preview-image" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"300\\" height=\\"200\\" viewBox=\\"0 0 300 200\\"><rect width=\\"300\\" height=\\"200\\" fill=\\"%23f8f9fa\\"/><text x=\\"150\\" y=\\"100\\" text-anchor=\\"middle\\" dy=\\".3em\\" fill=\\"%236c757d\\">Immagine non disponibile</text></svg>'">
            <div class="batch-info">
                <div class="batch-prompt">${escapeHtml(batch.prompt)}</div>
                <div class="batch-meta">
                    <span class="batch-date">${formatDate(batch.timestamp)}</span>
                </div>
                <div class="batch-stats-row">
                    <span class="batch-count">${batch.totalImages} immagini</span>
                    <span style="color: #27ae60; font-weight: 500;">✅ Completato</span>
                </div>
            </div>
        </div>
    `).join('');
}

function viewBatchDetails(sessionId) {
    // Reindirizza alla pagina dei risultati del batch
    window.location.href = `batch-result.html?sessionId=${sessionId}`;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        return 'Oggi';
    } else if (diffDays === 2) {
        return 'Ieri';
    } else if (diffDays <= 7) {
        return `${diffDays - 1} giorni fa`;
    } else {
        return date.toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
