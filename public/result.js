// Script per gestire la pagina dei risultati con confronto AI
document.addEventListener('D', function() {
    const initialLoader = document.getElementById('initialLoader');
    const resultContent = document.getElementById('resultContent');
    const originalImage = document.getElementById('originalImage');
    const usedPrompt = document.getElementById('usedPrompt');
    const aiResults = document.getElementById('aiResults');
    const costComparison = document.getElementById('costComparison');
    const restartBtn = document.getElementById('restartBtn');
    const newPromptBtn = document.getElementById('newPromptBtn');
    const errorMessage = document.getElementById('errorMessage');

    // Inizializza la pagina
    init();

    // Event listeners
    restartBtn.addEventListener('click', restart);
    newPromptBtn.addEventListener('click', newPrompt);

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
            // Prima verifica se la generazione è completata
            await waitForCompletion(sessionId);
            
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
            // Nasconde loader e mostra contenuto
            initialLoader.classList.add('hidden');
            resultContent.classList.remove('hidden');
        }
    }

    /**
     * Mostra i risultati nella pagina
     */
    function displayResults(data) {
        const { result, imagePath, originalName, prompt } = data;
        
        // Mostra immagine originale
        originalImage.src = `/uploads/${imagePath}`;
        originalImage.alt = originalName || 'Immagine originale';
        
        // Mostra prompt utilizzato
        usedPrompt.textContent = prompt || sessionStorage.getItem('prompt') || 'Prompt non disponibile';

        // Pulisce i risultati precedenti
        aiResults.innerHTML = '';
        
        let hasResults = false;
        let costs = [];

        // Mostra risultati Gemini
        if (result.gemini) {
            hasResults = true;
            const geminiCard = createResultCard('gemini', result.gemini);
            aiResults.appendChild(geminiCard);
            
            if (result.gemini.cost) {
                costs.push({
                    provider: 'Gemini',
                    cost: result.gemini.cost.total,
                    type: result.gemini.type,
                    time: result.gemini.processingTime || 'N/A'
                });
            }
        }

        // Mostra risultati ComfyUI
        if (result.comfyui) {
            hasResults = true;
            const comfyuiCard = createResultCard('comfyui', result.comfyui);
            aiResults.appendChild(comfyuiCard);
            
            if (result.comfyui.cost) {
                costs.push({
                    provider: 'ComfyUI SD 3.5',
                    cost: result.comfyui.cost.total,
                    type: result.comfyui.type,
                    time: result.comfyui.processingTime || 'N/A'
                });
            }
        }

        // Mostra risultati OpenAI
        if (result.openai) {
            hasResults = true;
            const openaiCard = createResultCard('openai', result.openai);
            aiResults.appendChild(openaiCard);
            
            if (result.openai.cost) {
                costs.push({
                    provider: 'OpenAI GPT Image 1',
                    cost: result.openai.cost.total,
                    type: result.openai.type,
                    time: result.openai.processingTime || 'N/A'
                });
            }
        }

        // Mostra risultati Stability AI
        if (result.stability) {
            hasResults = true;
            const stabilityCard = createResultCard('stability', result.stability);
            aiResults.appendChild(stabilityCard);
            
            // Calcola costi stimati per Stability AI
            costs.push({
                provider: 'Stability AI',
                cost: '0.020',
                type: 'Generazione immagine',
                time: result.stability.processingTime || 'N/A'
            });
        }

        // Mostra confronto costi se ci sono più provider
        if (costs.length > 1) {
            displayCostComparison(costs);
        }

        if (!hasResults) {
            showError('Nessun risultato disponibile');
        }
    }

    /**
     * Crea una card per i risultati di un provider AI
     */
    function createResultCard(provider, data) {
        const card = document.createElement('div');
        card.className = `ai-result-card ${provider}`;

        if (data.error) {
            const providerName = provider === 'openai' ? '🎨 OpenAI GPT Image 1' : 
                                provider === 'stability' ? '⚡ Stability AI' : '🔮 Google Gemini';
            card.innerHTML = `
                <div class="ai-result-header">
                    <div class="ai-provider ${provider}">
                        ${providerName}
                    </div>
                </div>
                <div class="ai-error">
                    ❌ Errore: ${data.error}
                </div>
            `;
            return card;
        }

        const providerName = provider === 'openai' ? '🎨 OpenAI GPT Image 1' : 
                            provider === 'stability' ? '⚡ Stability AI SDXL' : '🔮 Google Gemini 2.5';
        const costDisplay = data.cost ? `$${data.cost.total}` : 'N/A';

        card.innerHTML = `
            <div class="ai-result-header">
                <div class="ai-provider ${provider}">${providerName}</div>
                <div class="ai-cost">💰 ${costDisplay}</div>
            </div>
            <div class="ai-result-content">
                ${data.type === 'image' && data.generatedImageUrl ? `
                    <div class="ai-image-section">
                        <h4>✨ Immagine Generata</h4>
                        <img src="${data.generatedImageUrl}" alt="Immagine generata da ${provider}" class="ai-image">
                    </div>
                ` : ''}
                <div class="ai-description-section">
                    <h4>${data.type === 'image' ? '📝 Dettagli' : '🧠 Analisi AI'}</h4>
                    <div class="ai-description-text">
                        ${data.aiDescription || 'Nessuna descrizione disponibile'}
                    </div>
                    ${createSpecsSection(data)}
                </div>
            </div>
        `;

        return card;
    }

    /**
     * Crea la sezione specifiche tecniche
     */
    function createSpecsSection(data) {
        let specs = '<div class="ai-specs">';
        
        if (data.tokens && data.tokens.total) {
            specs += `<div class="spec-item"><span>🔤 Token:</span><span>${data.tokens.total}</span></div>`;
        }
        
        if (data.processingTime) {
            specs += `<div class="spec-item"><span>⏱️ Tempo:</span><span>${data.processingTime}</span></div>`;
        }
        
        if (data.modelUsed) {
            specs += `<div class="spec-item"><span>🤖 Modello:</span><span>${data.modelUsed}</span></div>`;
        }
        
        if (data.imageSpecs) {
            specs += `<div class="spec-item"><span>📐 Dimensioni:</span><span>${data.imageSpecs.size}</span></div>`;
            specs += `<div class="spec-item"><span>🎯 Qualità:</span><span>${data.imageSpecs.quality}</span></div>`;
        }
        
        if (data.generatedAt) {
            const date = new Date(data.generatedAt).toLocaleString('it-IT');
            specs += `<div class="spec-item"><span>📅 Generato:</span><span>${date}</span></div>`;
        }
        
        specs += '</div>';
        return specs;
    }

    /**
     * Mostra il confronto costi
     */
    function displayCostComparison(costs) {
        const table = costComparison.querySelector('.comparison-table');
        
        table.innerHTML = `
            <div class="comparison-header">Provider</div>
            <div class="comparison-header">Tipo</div>
            <div class="comparison-header">Costo (USD)</div>
            ${costs.map(cost => `
                <div class="comparison-cell"><strong>${cost.provider}</strong></div>
                <div class="comparison-cell">${cost.type === 'image' ? '🎨 Immagine' : '📝 Descrizione'}</div>
                <div class="comparison-cell">$${cost.cost}</div>
            `).join('')}
        `;
        
        costComparison.classList.remove('hidden');
    }

    /**
     * Riavvia l'applicazione
     */
    function restart() {
        // Pulisce sessionStorage
        sessionStorage.clear();
        
        // Torna alla pagina di upload
        window.location.href = 'index.html';
    }

    /**
     * Torna alla pagina prompt per un nuovo prompt
     */
    function newPrompt() {
        // Mantiene sessionId e imagePath ma rimuove risultati
        sessionStorage.removeItem('prompt');
        
        // Torna alla pagina prompt
        window.location.href = 'prompt.html';
    }

    /**
     * Mostra messaggio di errore
     */
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    /**
     * Nasconde messaggio di errore
     */
    function hideError() {
        errorMessage.classList.add('hidden');
    }

    /**
     * Aspetta che la generazione sia completata con polling progressivo
     */
    async function waitForCompletion(sessionId) {
        return new Promise((resolve) => {
            const pollInterval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/progress/${sessionId}`);
                    const progressData = await response.json();

                    // Aggiorna il contenuto con risultati parziali
                    if (progressData.results && Object.keys(progressData.results).length > 0) {
                        updatePartialResults(progressData.results);
                    }

                    // Aggiorna il loader con i progressi
                    updateProgressLoader(progressData.progress);

                    if (progressData.status === 'completed' || progressData.isComplete) {
                        clearInterval(pollInterval);
                        resolve();
                        return;
                    }

                } catch (error) {
                    console.error('Errore polling:', error);
                    // Continua il polling anche in caso di errore temporaneo
                }
            }, 1000); // Polling ogni secondo

            // Timeout di sicurezza (5 minuti)
            setTimeout(() => {
                clearInterval(pollInterval);
                resolve(); // Procedi comunque dopo il timeout
            }, 300000);
        });
    }

    /**
     * Aggiorna i risultati parziali man mano che arrivano
     */
    function updatePartialResults(results) {
        // Nasconde il loader iniziale e mostra il contenuto
        if (initialLoader && !initialLoader.classList.contains('hidden')) {
            initialLoader.classList.add('hidden');
            resultContent.classList.remove('hidden');
        }

        // Aggiorna solo i risultati che sono arrivati
        Object.keys(results).forEach(provider => {
            const result = results[provider];
            
            // Controlla se questo risultato è già stato mostrato
            const existingCard = document.querySelector(`[data-provider="${provider}"]`);
            if (!existingCard && result && !result.error) {
                const card = createResultCard(provider, result);
                card.setAttribute('data-provider', provider);
                aiResults.appendChild(card);
            }
        });
    }

    /**
     * Aggiorna il messaggio del loader con i progressi
     */
    function updateProgressLoader(progress) {
        const loaderText = initialLoader.querySelector('p');
        if (!loaderText || !progress) return;

        const providers = ['gemini', 'openai', 'stability'];
        const completed = providers.filter(p => progress[p] === 'completed').length;
        const generating = providers.filter(p => progress[p] === 'generating').length;
        const total = providers.length;

        if (completed > 0) {
            loaderText.textContent = `Generazione in corso... (${completed}/${total} completati)`;
        } else if (generating > 0) {
            loaderText.textContent = 'Generazione in corso...';
        }
    }
});
