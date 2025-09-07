// prompt.js - Gestione prompt per generazione (Pagina 3)

document.addEventListener('DOMContentLoaded', function() {
    // Elementi DOM
    const originalImage = document.getElementById('originalImage');
    const promptText = document.getElementById('promptText');
    const charCount = document.getElementById('charCount');
    const tokenEstimate = document.getElementById('tokenEstimate');
    const costEstimate = document.getElementById('costEstimate');
    const exampleBtns = document.querySelectorAll('.example-btn');
    const backBtn = document.getElementById('backBtn');
    const generateBtn = document.getElementById('generateBtn');
    const loadingSection = document.getElementById('loadingSection');
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    const retryBtn = document.getElementById('retryBtn');

    // Configurazioni
    const MAX_CHARS = 500;
    const BASE_COST = 0.04; // Costo base per immagine
    const CHARS_PER_TOKEN = 4; // Approssimazione: 1 token ogni 4 caratteri

    // Event listeners
    promptText.addEventListener('input', updateEstimates);
    promptText.addEventListener('input', checkFormValidity);
    exampleBtns.forEach(btn => btn.addEventListener('click', useExample));
    backBtn.addEventListener('click', goBack);
    generateBtn.addEventListener('click', generateImage);
    retryBtn.addEventListener('click', showForm);

    // Inizializzazione
    init();

    /**
     * Inizializza la pagina
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
        updateEstimates();
        checkFormValidity();

        console.log('📝 Pagina prompt inizializzata');
    }

    /**
     * Aggiorna le stime di token e costo in tempo reale
     */
    function updateEstimates() {
        const text = promptText.value;
        const charLength = text.length;
        
        // Aggiorna contatore caratteri
        charCount.textContent = charLength;
        
        // Cambia colore se vicino al limite
        if (charLength > MAX_CHARS * 0.9) {
            charCount.style.color = '#dc3545'; // Rosso
        } else if (charLength > MAX_CHARS * 0.7) {
            charCount.style.color = '#ffc107'; // Giallo
        } else {
            charCount.style.color = '#666'; // Grigio normale
        }

        // Calcola token stimati
        const estimatedTokens = Math.ceil(charLength / CHARS_PER_TOKEN);
        tokenEstimate.textContent = estimatedTokens;

        // Calcola costo stimato (costo base + token extra)
        const tokenCost = estimatedTokens * 0.001; // $0.001 per token (esempio)
        const totalCost = BASE_COST + tokenCost;
        costEstimate.textContent = `$${totalCost.toFixed(3)}`;
    }

    /**
     * Controlla se il form è valido per abilitare il bottone
     */
    function checkFormValidity() {
        const text = promptText.value.trim();
        const isValid = text.length > 0 && text.length <= MAX_CHARS;
        
        generateBtn.disabled = !isValid;
        
        // Aggiorna il messaggio del bottone
        if (text.length === 0) {
            generateBtn.textContent = '🎨 Inserisci un prompt';
        } else if (text.length > MAX_CHARS) {
            generateBtn.textContent = '⚠️ Prompt troppo lungo';
        } else {
            generateBtn.textContent = '🎨 Genera Immagine';
        }
    }

    /**
     * Usa un prompt di esempio
     */
    function useExample(event) {
        const examplePrompt = event.target.getAttribute('data-prompt');
        promptText.value = examplePrompt;
        updateEstimates();
        checkFormValidity();
        
        // Focus sul campo per permettere modifiche
        promptText.focus();
        
        console.log('💡 Prompt di esempio utilizzato:', examplePrompt);
    }

    /**
     * Torna alla pagina precedente
     */
    function goBack() {
        window.location.href = 'confirm.html';
    }

    /**
     * Genera l'immagine
     */
    async function generateImage() {
        const sessionId = localStorage.getItem('sessionId');
        const prompt = promptText.value.trim();

        if (!sessionId) {
            showError('Sessione non valida. Torna all\'inizio.');
            return;
        }

        if (!prompt) {
            showError('Inserisci un prompt descrittivo.');
            return;
        }

        // Mostra loading
        showLoading();

        try {
            // Invia richiesta di generazione al server
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    prompt: prompt
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('🎨 Generazione completata:', result);
                
                // Salva il prompt per la pagina del risultato
                localStorage.setItem('prompt', prompt);
                
                // Reindirizza alla pagina del risultato
                window.location.href = 'result.html';
            } else {
                throw new Error(result.error || 'Errore durante la generazione');
            }
        } catch (error) {
            console.error('❌ Errore generazione:', error);
            showError(error.message || 'Errore di connessione. Riprova.');
        }
    }

    /**
     * Mostra la sezione di loading
     */
    function showLoading() {
        document.querySelector('.prompt-form').style.display = 'none';
        document.querySelector('.original-image-preview').style.display = 'none';
        loadingSection.style.display = 'block';
        errorSection.style.display = 'none';
    }

    /**
     * Mostra il form
     */
    function showForm() {
        document.querySelector('.prompt-form').style.display = 'block';
        document.querySelector('.original-image-preview').style.display = 'block';
        loadingSection.style.display = 'none';
        errorSection.style.display = 'none';
    }

    /**
     * Mostra messaggio di errore
     */
    function showError(message) {
        errorMessage.textContent = message;
        document.querySelector('.prompt-form').style.display = 'none';
        document.querySelector('.original-image-preview').style.display = 'none';
        loadingSection.style.display = 'none';
        errorSection.style.display = 'block';
    }

    // Log per debug
    console.log('📝 Pagina prompt inizializzata');
});
