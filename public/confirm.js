// Script per gestire la conferma dell'immagine caricata

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
    const previewImage = document.getElementById('previewImage');
    const retryBtn = document.getElementById('retryBtn');
    const acceptBtn = document.getElementById('acceptBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Recupera il sessionId
    const sessionId = sessionStorage.getItem('sessionId');
    
    if (!sessionId) {
        // Se non c'è una sessione, torna alla pagina di upload
        showError('Nessuna immagine trovata. Verrai reindirizzato alla pagina di upload.');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    // Carica e mostra l'immagine
    loadImage(sessionId);

    // Event listeners per i bottoni
    retryBtn.addEventListener('click', function() {
        // Rimuove la sessione e torna alla pagina di upload
        sessionStorage.removeItem('sessionId');
        window.location.href = 'index.html';
    });

    acceptBtn.addEventListener('click', function() {
        // Conferma l'immagine e va alla pagina del prompt
        window.location.href = 'prompt.html';
    });

    // Funzione per caricare e mostrare l'immagine
    async function loadImage(sessionId) {
        try {
            const response = await authenticatedFetch(`/api/image/${sessionId}`);
            const data = await response.json();

            if (response.ok && data.imagePath) {
                const imageUrl = `/uploads/${data.imagePath}`;
                
                previewImage.onload = function() {
                    // Immagine caricata con successo
                    previewImage.style.display = 'block';
                    hideError();
                };
                
                previewImage.onerror = function() {
                    // Errore nel caricamento dell'immagine
                    showError('Errore nel caricamento dell\'immagine. Riprova.');
                    previewImage.style.display = 'none';
                };
                
                previewImage.src = imageUrl;
            } else {
                throw new Error(data.error || 'Dati immagine non trovati');
            }
        } catch (error) {
            console.error('Errore:', error);
            showError('Errore nel caricamento: ' + error.message);
        }
    }

    // Funzioni di utilità
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    function hideError() {
        errorMessage.classList.add('hidden');
    }

    // Gestisce la navigazione con i tasti freccia
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            retryBtn.click();
        } else if (e.key === 'ArrowRight') {
            acceptBtn.click();
        }
    });
});
