// Stato dell'applicazione
let state = {
    role: null, // 'sposo' o 'sposa'
    photoData: null,
    selectedStyles: [],
    generatedImageUrl: null
};

// Stream video
let videoStream = null;

// Funzione per selezionare il ruolo (sposo/sposa)
function selectRole(role) {
    state.role = role;
    console.log('Ruolo selezionato:', role);
    
    // Animazione di transizione
    const welcomePage = document.getElementById('welcomePage');
    welcomePage.classList.add('fade-out');
    
    setTimeout(() => {
        welcomePage.classList.remove('active');
        welcomePage.classList.remove('fade-out');
        
        const capturePage = document.getElementById('capturePage');
        capturePage.classList.add('active');
        capturePage.classList.add('fade-in');
        
        setTimeout(() => {
            capturePage.classList.remove('fade-in');
        }, 300);
    }, 300);
}

// Funzione per tornare alla pagina di benvenuto
function goToWelcome() {
    // Ferma la camera se attiva
    if (videoStream) {
        stopCamera();
    }
    
    // Reset stato
    state = {
        role: null,
        photoData: null,
        selectedStyles: [],
        generatedImageUrl: null
    };
    
    // Reset UI
    document.getElementById('video').style.display = 'none';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('startCamera').style.display = 'block';
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('confirmPhotoBtn').style.display = 'none';
    
    changePage('capturePage', 'welcomePage');
}

// Funzione per tornare alla pagina di cattura
function goToCapture() {
    changePage('stylePage', 'capturePage');
}

// Funzione helper per cambiare pagina
function changePage(fromPageId, toPageId) {
    const fromPage = document.getElementById(fromPageId);
    const toPage = document.getElementById(toPageId);
    
    fromPage.classList.add('fade-out');
    
    setTimeout(() => {
        fromPage.classList.remove('active');
        fromPage.classList.remove('fade-out');
        
        toPage.classList.add('active');
        toPage.classList.add('fade-in');
        
        setTimeout(() => {
            toPage.classList.remove('fade-in');
        }, 300);
    }, 300);
}

// Avvia la fotocamera
async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        const video = document.getElementById('video');
        video.srcObject = videoStream;
        video.style.display = 'block';
        
        // Aggiorna i pulsanti
        document.getElementById('startCamera').style.display = 'none';
        document.getElementById('captureBtn').style.display = 'block';
        
    } catch (error) {
        console.error('Errore accesso fotocamera:', error);
        alert('Impossibile accedere alla fotocamera. Assicurati di aver dato i permessi necessari.');
    }
}

// Ferma la fotocamera
function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

// Cattura la foto
function capturePhoto() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const photoPreview = document.getElementById('photoPreview');
    
    // Imposta dimensioni canvas uguale al video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Disegna il frame corrente sul canvas
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Converti in immagine
    state.photoData = canvas.toDataURL('image/jpeg', 0.9);
    
    // Mostra preview
    photoPreview.src = state.photoData;
    photoPreview.style.display = 'block';
    video.style.display = 'none';
    
    // Ferma la camera
    stopCamera();
    
    // Aggiorna i pulsanti
    document.getElementById('captureBtn').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'block';
    document.getElementById('confirmPhotoBtn').style.display = 'block';
}

// Rifai la foto
function retakePhoto() {
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('retakeBtn').style.display = 'none';
    document.getElementById('confirmPhotoBtn').style.display = 'none';
    
    state.photoData = null;
    startCamera();
}

// Conferma la foto e vai alla selezione stili
function confirmPhoto() {
    if (!state.photoData) {
        alert('Nessuna foto catturata!');
        return;
    }
    
    // Passa alla pagina di selezione stili
    changePage('capturePage', 'stylePage');
    
    // Mostra la mini preview della foto
    document.getElementById('miniPhoto').src = state.photoData;
    
    // Mostra l'indicatore del ruolo
    const roleIndicator = document.getElementById('roleIndicator');
    roleIndicator.textContent = state.role === 'sposo' ? '🤵 Sposo' : '👰 Sposa';
    
    // Mostra le caratteristiche appropriate
    if (state.role === 'sposo') {
        document.getElementById('sposoStyles').style.display = 'grid';
        document.getElementById('sposaStyles').style.display = 'none';
    } else {
        document.getElementById('sposoStyles').style.display = 'none';
        document.getElementById('sposaStyles').style.display = 'grid';
    }
    
    // Inizializza i click sugli stili
    initializeStyleButtons();
}

// Inizializza i pulsanti di stile
function initializeStyleButtons() {
    const styleButtons = document.querySelectorAll('.style-btn');
    
    styleButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const style = this.getAttribute('data-style');
            
            if (this.classList.contains('selected')) {
                // Deseleziona
                this.classList.remove('selected');
                state.selectedStyles = state.selectedStyles.filter(s => s !== style);
            } else {
                // Seleziona
                this.classList.add('selected');
                state.selectedStyles.push(style);
            }
            
            updateSelectedStylesList();
            updateGenerateButton();
        });
    });
}

// Aggiorna la lista degli stili selezionati
function updateSelectedStylesList() {
    const listContainer = document.getElementById('selectedStylesList');
    
    if (state.selectedStyles.length === 0) {
        listContainer.innerHTML = '<span class="no-selection">Nessuno stile selezionato</span>';
    } else {
        listContainer.innerHTML = state.selectedStyles.map(style => 
            `<span class="selected-style-tag">${style}</span>`
        ).join('');
    }
}

// Abilita/disabilita il pulsante genera
function updateGenerateButton() {
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = state.selectedStyles.length === 0;
}

// Genera l'immagine
async function generateImage() {
    if (!state.photoData || state.selectedStyles.length === 0) {
        alert('Seleziona almeno uno stile prima di generare!');
        return;
    }
    
    // Passa alla pagina risultato
    changePage('stylePage', 'resultPage');
    
    // Mostra il loading
    document.getElementById('loadingContainer').style.display = 'block';
    document.getElementById('resultContent').style.display = 'none';
    
    try {
        // Prepara i dati per la richiesta
        const requestData = {
            role: state.role,
            styles: state.selectedStyles,
            photo: state.photoData
        };
        
        // Chiamata API
        const response = await fetch('/api/generate-wedding-look', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            throw new Error('Errore nella generazione dell\'immagine');
        }
        
        const result = await response.json();
        
        // Salva l'URL dell'immagine generata
        state.generatedImageUrl = result.imageUrl;
        
        // Nascondi loading e mostra risultato
        document.getElementById('loadingContainer').style.display = 'none';
        document.getElementById('resultContent').style.display = 'block';
        
        // Mostra le immagini
        document.getElementById('originalImage').src = state.photoData;
        document.getElementById('generatedImage').src = result.imageUrl;
        
        // Mostra la sezione video
        document.getElementById('videoSection').style.display = 'block';
        
    } catch (error) {
        console.error('Errore generazione immagine:', error);
        alert('Si è verificato un errore durante la generazione. Riprova!');
        
        // Torna alla pagina di selezione stili
        changePage('resultPage', 'stylePage');
    }
}

// Invia email
async function sendEmail() {
    const emailInput = document.getElementById('emailInput');
    const email = emailInput.value.trim();
    
    if (!email) {
        alert('Inserisci un indirizzo email valido!');
        return;
    }
    
    // Validazione email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Inserisci un indirizzo email valido!');
        return;
    }
    
    const emailStatus = document.getElementById('emailStatus');
    emailStatus.innerHTML = '<span class="status-loading">📤 Invio in corso...</span>';
    
    try {
        const response = await fetch('/api/send-wedding-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                imageUrl: state.generatedImageUrl,
                role: state.role,
                styles: state.selectedStyles
            })
        });
        
        if (!response.ok) {
            throw new Error('Errore nell\'invio dell\'email');
        }
        
        const result = await response.json();
        
        emailStatus.innerHTML = '<span class="status-success">✅ Email inviata con successo!</span>';
        emailInput.value = '';
        
        setTimeout(() => {
            emailStatus.innerHTML = '';
        }, 5000);
        
    } catch (error) {
        console.error('Errore invio email:', error);
        emailStatus.innerHTML = '<span class="status-error">❌ Errore nell\'invio. Riprova!</span>';
        
        setTimeout(() => {
            emailStatus.innerHTML = '';
        }, 5000);
    }
}

// Scarica l'immagine
function downloadImage() {
    if (!state.generatedImageUrl) {
        alert('Nessuna immagine da scaricare!');
        return;
    }
    
    const link = document.createElement('a');
    link.href = state.generatedImageUrl;
    link.download = `wedding-look-${state.role}-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Ricomincia
function startOver() {
    // Reset completo dello stato
    state = {
        role: null,
        photoData: null,
        selectedStyles: [],
        generatedImageUrl: null
    };
    
    // Reset selezioni stili
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Reset email
    document.getElementById('emailInput').value = '';
    document.getElementById('emailStatus').innerHTML = '';
    
    // Reset video
    document.getElementById('videoSection').style.display = 'none';
    document.getElementById('videoStatus').innerHTML = '';
    document.getElementById('videoPlayer').style.display = 'none';
    
    // Torna alla pagina di benvenuto
    changePage('resultPage', 'welcomePage');
}

// Genera video con Veo 3
async function generateVideo() {
    const videoStatus = document.getElementById('videoStatus');
    const videoPlayer = document.getElementById('videoPlayer');
    const generatedVideo = document.getElementById('generatedVideo');
    
    if (!state.generatedImageUrl) {
        alert('Nessuna immagine disponibile per generare il video!');
        return;
    }
    
    // Mostra loading
    videoStatus.innerHTML = '<span class="status-loading">🎬 Generazione video in corso... Questo può richiedere fino a 2 minuti</span>';
    videoPlayer.style.display = 'none';
    
    try {
        // Prepara la richiesta
        const requestData = {
            imageUrl: state.generatedImageUrl,
            role: state.role,
            styles: state.selectedStyles
        };
        
        console.log('🎥 Richiesta generazione video:', requestData);
        
        // Chiamata API
        const response = await fetch('/api/generate-wedding-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.details || 'Errore nella generazione del video');
        }
        
        const result = await response.json();
        
        console.log('✅ Video generato:', result);
        
        // Mostra il video
        videoStatus.innerHTML = '<span class="status-success">✅ Video generato con successo!</span>';
        generatedVideo.src = result.videoUrl;
        videoPlayer.style.display = 'block';
        
        // Salva l'URL del video nello stato
        state.generatedVideoUrl = result.videoUrl;
        
    } catch (error) {
        console.error('❌ Errore generazione video:', error);
        videoStatus.innerHTML = `<span class="status-error">❌ ${error.message}</span>`;
        
        setTimeout(() => {
            videoStatus.innerHTML = '';
        }, 5000);
    }
}

// Apri immagine a schermo intero
function openFullscreen(imgElement) {
    const modal = document.getElementById('fullscreenModal');
    const fullscreenImg = document.getElementById('fullscreenImage');
    
    modal.classList.add('active');
    fullscreenImg.src = imgElement.src;
    
    // Previeni scroll del body quando il modal è aperto
    document.body.style.overflow = 'hidden';
}

// Chiudi schermo intero
function closeFullscreen() {
    const modal = document.getElementById('fullscreenModal');
    
    modal.classList.remove('active');
    
    // Ripristina scroll del body
    document.body.style.overflow = 'auto';
}

// Chiudi anche con tasto ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeFullscreen();
    }
});
