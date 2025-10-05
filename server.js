const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

// Carica variabili d'ambiente
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY non trovata nelle variabili d\'ambiente');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Configurazione OpenAI
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ENABLED = !!OPENAI_API_KEY; // Abilita solo se la chiave è presente
const openai = OPENAI_ENABLED ? new OpenAI({
  apiKey: OPENAI_API_KEY
}) : null;

if (!OPENAI_ENABLED) {
    console.warn('⚠️  OpenAI API Key non trovata - OpenAI disabilitato');
}

// Configurazione sistema di autenticazione
const PASSWORD = '3471281124'; // Password hardcoded
const JWT_SECRET = 'ai-generator-secret-' + Date.now(); // Secret per JWT (generato al boot)

// Simple JWT implementation without external library
const simpleJWT = {
    sign: (payload) => {
        const header = Buffer.from(JSON.stringify({typ: 'JWT', alg: 'HS256'})).toString('base64url');
        const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const crypto = require('crypto');
        const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payloadStr}`).digest('base64url');
        return `${header}.${payloadStr}.${signature}`;
    },
    verify: (token) => {
        try {
            const [header, payload, signature] = token.split('.');
            const crypto = require('crypto');
            const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
            if (signature !== expectedSignature) return null;
            return JSON.parse(Buffer.from(payload, 'base64url').toString());
        } catch {
            return null;
        }
    }
};

// Middleware di autenticazione
const requireAuth = (req, res, next) => {
    // Escludi routes pubbliche
    if (req.path === '/login.html' || req.path === '/api/login' || req.path === '/api/verify-token') {
        return next();
    }
    
    // Controlla token nell'Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Token mancante', redirect: '/login.html' });
    }
    
    const payload = simpleJWT.verify(token);
    if (!payload || payload.exp < Date.now()) {
        return res.status(401).json({ error: 'Token non valido o scaduto', redirect: '/login.html' });
    }
    
    req.user = payload;
    next();
};

// Middleware
app.use(cors());
app.use(express.json());

// Middleware di autenticazione per file statici e API
app.use((req, res, next) => {
    // Permetti accesso a login.html e API di login
    if (req.path === '/login.html' || req.path === '/api/login' || req.path === '/api/verify-token') {
        return next();
    }
    
    // Per tutti gli altri file, controlla autenticazione
    if (req.path === '/' || req.path === '/index.html') {
        // Controlla se ha token valido nel localStorage (gestito dal frontend)
        return next();
    }
    
    // Per API protette
    if (req.path.startsWith('/api/')) {
        return requireAuth(req, res, next);
    }
    
    next();
});

app.use(express.static('public')); // Serve file statici dalla cartella public
app.use('/uploads', express.static('uploads')); // Serve immagini dalla cartella uploads
app.use('/generated', express.static('generated')); // Serve immagini generate dalla cartella generated

// Configurazione Multer per upload immagini
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Salva nella cartella uploads
  },
  filename: (req, file, cb) => {
    // Genera nome file unico con timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accetta solo immagini
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo file immagine sono permessi!'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite 5MB
  }
});

// Variabile per memorizzare temporaneamente i dati della sessione
let sessionData = {};

// Cartella per le immagini generate
const generatedDir = path.join(__dirname, 'generated');

// Route principale - reindirizza alla pagina di upload
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route di autenticazione
app.post('/api/login', (req, res) => {
    console.log('🔐 Login request ricevuta:', req.body);
    const { password } = req.body;
    
    if (password !== PASSWORD) {
        return res.status(401).json({ 
            success: false, 
            message: 'Password non corretta' 
        });
    }
    
    // Genera token JWT con scadenza 24h
    const token = simpleJWT.sign({
        authenticated: true,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 ore
    });
    
    res.json({ 
        success: true, 
        token: token,
        message: 'Login effettuato con successo' 
    });
});

// Test route
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server funzionante', timestamp: Date.now() });
});

// Verifica validità token
app.post('/api/verify-token', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.json({ valid: false });
    }
    
    const payload = simpleJWT.verify(token);
    if (!payload || payload.exp < Date.now()) {
        return res.json({ valid: false });
    }
    
    res.json({ valid: true });
});

// API: Upload immagine
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    // Salva i dati della sessione
    const sessionId = Date.now().toString();
    sessionData[sessionId] = {
      imagePath: req.file.filename,
      originalName: req.file.originalname
    };

    console.log(`✅ Immagine caricata: ${req.file.filename}`);
    
    res.json({
      success: true,
      sessionId: sessionId,
      imagePath: req.file.filename,
      message: 'Immagine caricata con successo!'
    });
  } catch (error) {
    console.error('Errore upload:', error);
    res.status(500).json({ error: 'Errore durante l\'upload' });
  }
});

// API: Elenca immagini esistenti nella cartella uploads
app.get('/api/images', (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Leggi il contenuto della cartella uploads
    const files = fs.readdirSync(uploadsDir);
    
    // Filtra solo i file immagine
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    }).map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        uploadDate: stats.mtime,
        size: stats.size
      };
    });
    
    // Ordina per data di modifica (più recenti prima)
    images.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    
    console.log(`📋 Trovate ${images.length} immagini esistenti`);
    res.json({ images });
    
  } catch (error) {
    console.error('Errore nel listare immagini:', error);
    res.status(500).json({ error: 'Errore nel recuperare le immagini' });
  }
});

// API: Elenca immagini generate dai modelli AI
app.get('/api/generated-images', (req, res) => {
  try {
    // Verifica che la cartella esista
    if (!fs.existsSync(generatedDir)) {
      return res.json({ images: [] });
    }
    
    // Leggi il contenuto della cartella generated
    const files = fs.readdirSync(generatedDir);
    
    // Filtra solo i file immagine
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const images = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext) && !file.startsWith('.');
    }).map(filename => {
      const filePath = path.join(generatedDir, filename);
      const stats = fs.statSync(filePath);
      
      // Determina il provider dal nome del file
      let provider = 'unknown';
      let providerIcon = '🤖';
      let providerName = 'AI Generator';
      
      if (filename.startsWith('openai-')) {
        provider = 'openai';
        providerIcon = '🎨';
        providerName = 'OpenAI GPT Image 1';
      } else if (filename.startsWith('gemini-')) {
        provider = 'gemini';
        providerIcon = '🔮';
        providerName = 'Google Gemini';
      }
      
      return {
        filename,
        provider,
        providerIcon,
        providerName,
        generatedDate: stats.mtime,
        size: stats.size,
        url: `/generated/${filename}`
      };
    });
    
    // Ordina per data di creazione (più recenti prima)
    images.sort((a, b) => new Date(b.generatedDate) - new Date(a.generatedDate));
    
    console.log(`🎨 Trovate ${images.length} immagini generate`);
    res.json({ images });
    
  } catch (error) {
    console.error('Errore nel listare immagini generate:', error);
    res.status(500).json({ error: 'Errore nel recuperare le immagini generate' });
  }
});

// API: Seleziona immagine esistente
app.post('/api/select-image', (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Nome file richiesto' });
    }
    
    const imagePath = path.join(__dirname, 'uploads', filename);
    
    // Verifica che il file esista
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Immagine non trovata' });
    }
    
    // Crea una nuova sessione per l'immagine selezionata
    const sessionId = Date.now().toString();
    sessionData[sessionId] = {
      imagePath: filename,
      originalName: filename
    };
    
    console.log(`✅ Immagine selezionata: ${filename}`);
    
    res.json({
      success: true,
      sessionId: sessionId,
      imagePath: filename,
      message: 'Immagine selezionata con successo!'
    });
    
  } catch (error) {
    console.error('Errore selezione immagine:', error);
    res.status(500).json({ error: 'Errore nella selezione dell\'immagine' });
  }
});

// API: Conferma immagine e ottieni dati
app.get('/api/image/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionData[sessionId]) {
    return res.status(404).json({ error: 'Sessione non trovata' });
  }

  res.json(sessionData[sessionId]);
});

// API: Ottieni risultati progressivi (polling)
app.get('/api/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionData[sessionId]) {
    return res.status(404).json({ error: 'Sessione non trovata' });
  }

  const session = sessionData[sessionId];
  res.json({
    status: session.status || 'idle',
    results: session.result || {},
    progress: session.progress || {},
    isComplete: session.isComplete || false
  });
});

// API: Genera immagine da prompt
app.post('/api/generate', async (req, res) => {
  try {
    const { sessionId, prompt, provider = 'both' } = req.body; // default: genera con entrambi

    if (!sessionData[sessionId]) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt richiesto' });
    }

    // Salva il prompt nella sessione
    sessionData[sessionId].prompt = prompt;
    sessionData[sessionId].status = 'generating';
    sessionData[sessionId].progress = {};
    sessionData[sessionId].result = {};
    sessionData[sessionId].isComplete = false;

    console.log(`🎨 Generazione immagine per: "${prompt}"`);
    console.log(`🔧 Provider: ${provider}`);

    // Inizia la generazione in background
    generateImagesAsync(sessionId, prompt, provider);

    // Risposta immediata per avviare il polling
    res.json({
      success: true,
      message: 'Generazione avviata',
      sessionId: sessionId,
      status: 'generating'
    });

  } catch (error) {
    console.error('Errore generazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// API: Batch Generation - Ritera prompt X volte
app.post('/api/batch-generate', async (req, res) => {
  try {
    const { sessionId, prompt, provider = 'both', iterations = 1 } = req.body;

    if (!sessionData[sessionId]) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt richiesto' });
    }

    if (iterations < 1 || iterations > 1000) {
      return res.status(400).json({ error: 'Numero di iterazioni deve essere tra 1 e 1000' });
    }

    // Inizializza batch session
    sessionData[sessionId].batchStatus = 'generating';
    sessionData[sessionId].batchProgress = {
      current: 0,
      total: iterations,
      completed: [],
      failed: []
    };

    console.log(`🔄 Batch generation avviata: ${iterations} iterazioni`);
    console.log(`🎨 Prompt: "${prompt}"`);
    console.log(`🔧 Provider: ${provider}`);

    // Avvia batch generation in background
    generateBatchAsync(sessionId, prompt, provider, iterations);

    res.json({
      success: true,
      message: `Batch generation avviata: ${iterations} iterazioni`,
      sessionId: sessionId,
      status: 'batch-generating',
      iterations: iterations
    });

  } catch (error) {
    console.error('Errore batch generation:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Funzione asincrona per generare immagini in background
async function generateImagesAsync(sessionId, prompt, provider) {
  try {
    const results = {};
    sessionData[sessionId].progress = {};

    // Lista dei provider da utilizzare
    const providers = [];
    if (provider === 'both') {
      providers.push('gemini', 'openai');
    } else {
      providers.push(provider);
    }

    // Funzioni di generazione per ogni provider
    const generationPromises = providers.map(async (providerName) => {
      try {
        sessionData[sessionId].progress[providerName] = 'generating';
        
        let result;
        switch (providerName) {
          case 'gemini':
            console.log('🤖 Generando con Gemini...');
            result = await generateWithGemini(prompt, sessionData[sessionId].imagePath);
            break;
          case 'openai':
            console.log('🎨 Generando con OpenAI GPT Image 1...');
            result = await generateWithOpenAI(prompt, sessionData[sessionId].imagePath);
            break;
        }
        
        results[providerName] = result;
        sessionData[sessionId].result[providerName] = result;
        sessionData[sessionId].progress[providerName] = 'completed';
        
        console.log(`✅ ${providerName} completato`);
        
      } catch (error) {
        console.error(`❌ Errore ${providerName}:`, error.message);
        results[providerName] = { error: error.message };
        sessionData[sessionId].result[providerName] = { error: error.message };
        sessionData[sessionId].progress[providerName] = 'error';
      }
    });

    // Aspetta che tutte le generazioni siano completate
    await Promise.allSettled(generationPromises);

    // Aggiorna lo stato finale
    sessionData[sessionId].status = 'completed';
    sessionData[sessionId].isComplete = true;
    console.log(`✅ Generazione completata per sessione ${sessionId}`);

  } catch (error) {
    console.error('Errore nella generazione asincrona:', error);
    sessionData[sessionId].status = 'error';
    sessionData[sessionId].progress = { error: error.message };
  }
}

// Funzione asincrona per batch generation con supporto parallelo
async function generateBatchAsync(sessionId, basePrompt, provider, iterations) {
  const PARALLEL_BATCH_SIZE = 100; // Genera 100 immagini in parallelo simultanee
  
  try {
    console.log(`🔄 Batch generation avviata: ${iterations} iterazioni`);
    
    // Inizializza stato batch
    sessionData[sessionId].batchResults = [];
    sessionData[sessionId].batchProgress.startTime = Date.now();
    
    // Suddividi le iterazioni in batch paralleli
    const batches = [];
    for (let start = 1; start <= iterations; start += PARALLEL_BATCH_SIZE) {
      const end = Math.min(start + PARALLEL_BATCH_SIZE - 1, iterations);
      batches.push({ start, end });
    }

    console.log(`📦 Suddiviso in ${batches.length} batch paralleli di max ${PARALLEL_BATCH_SIZE} iterazioni (supporto 100 simultanee)`);

    // Per batch di 100 o meno, tutto viene eseguito in parallelo
    if (iterations <= 100) {
      console.log(`🚀 MODALITÀ ULTRA-VELOCE: Tutte le ${iterations} iterazioni verranno elaborate simultaneamente!`);
    }

    // Elabora ogni batch in parallelo
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Elaborazione batch ${batchIndex + 1}/${batches.length}: iterazioni ${batch.start}-${batch.end}`);

      // Crea le promesse per tutte le iterazioni del batch corrente
      const batchPromises = [];
      for (let i = batch.start; i <= batch.end; i++) {
        const iterationPromise = generateSingleIteration(sessionId, basePrompt, provider, i);
        batchPromises.push(iterationPromise);
      }

      // Esegui tutte le iterazioni del batch in parallelo
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Elabora i risultati del batch
        for (let j = 0; j < batchResults.length; j++) {
          const iterationNumber = batch.start + j;
          const result = batchResults[j];
          
          sessionData[sessionId].batchProgress.current = iterationNumber;
          
          if (result.status === 'fulfilled') {
            sessionData[sessionId].batchResults.push(result.value);
            sessionData[sessionId].batchProgress.completed.push(iterationNumber);
            console.log(`  ✅ Iterazione ${iterationNumber} completata`);
          } else {
            console.error(`  ❌ Iterazione ${iterationNumber} fallita:`, result.reason);
            sessionData[sessionId].batchProgress.failed.push(iterationNumber);
            
            // Aggiungi comunque un risultato di errore
            sessionData[sessionId].batchResults.push({
              iteration: iterationNumber,
              error: result.reason?.message || 'Errore sconosciuto',
              timestamp: Date.now()
            });
          }
        }
        
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completato`);
        
      } catch (batchError) {
        console.error(`❌ Errore nel batch ${batchIndex + 1}:`, batchError);
        for (let i = batch.start; i <= batch.end; i++) {
          sessionData[sessionId].batchProgress.failed.push(i);
        }
      }
      
      // Pausa intelligente tra batch per evitare rate limiting
      if (batchIndex < batches.length - 1) {
        // Pausa più breve per batch più piccoli, nessuna pausa se tutto in un batch
        const pauseTime = iterations <= 100 ? 1000 : 2000; // 1s per batch ≤100, 2s per batch più grandi
        console.log(`⏳ Pausa di ${pauseTime/1000}s prima del prossimo batch...`);
        await new Promise(resolve => setTimeout(resolve, pauseTime));
      }
    }

    // Finalizza la batch generation
    sessionData[sessionId].batchStatus = 'completed';
    sessionData[sessionId].batchProgress.endTime = Date.now();
    sessionData[sessionId].batchProgress.duration = sessionData[sessionId].batchProgress.endTime - sessionData[sessionId].batchProgress.startTime;
    
    const totalTime = (sessionData[sessionId].batchProgress.duration / 1000).toFixed(1);
    const completedCount = sessionData[sessionId].batchProgress.completed.length;
    const failedCount = sessionData[sessionId].batchProgress.failed.length;
    
    console.log(`✅ Batch generation completata: ${iterations} iterazioni in ${totalTime}s`);
    console.log(`📊 Risultati: ${completedCount} successi, ${failedCount} fallimenti`);

  } catch (error) {
    console.error('Errore nella batch generation:', error);
    sessionData[sessionId].batchStatus = 'error';
    sessionData[sessionId].batchProgress.error = error.message;
  }
}

// Funzione helper per generare una singola iterazione
async function generateSingleIteration(sessionId, basePrompt, provider, iteration) {
  try {
    // Varia leggermente il prompt per ogni iterazione
    const iterationPrompt = varyPrompt(basePrompt, iteration);
    
    // Genera immagine per questa iterazione
    const iterationResult = {
      iteration: iteration,
      prompt: iterationPrompt,
      results: {},
      timestamp: Date.now()
    };

    // Lista dei provider da utilizzare - TUTTI I PROVIDER supportati per batch
    const providers = [];
    if (provider === 'both') {
      providers.push('gemini', 'openai'); // Multi-provider per batch
    } else if (provider === 'all') {
      providers.push('gemini', 'openai'); // Tutti i provider
    } else {
      // Provider specifico richiesto
      providers.push(provider);
    }

    console.log(`🔄 Iterazione ${iteration}`);
    
    // Mostra quale variazione viene utilizzata
    if (basePrompt.toLowerCase().includes('historical')) {
      try {
        const historicalData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/historical-characters.json'), 'utf8'));
        const sequentialIndex = (iteration - 1) % historicalData.historical_periods.length;
        const selectedCharacter = historicalData.historical_periods[sequentialIndex];
        console.log(`🏛️ Personaggio Storico ${iteration}: ${selectedCharacter.substring(0, 50)}...`);
      } catch (error) {
        console.log(`🏛️ Personaggio Storico ${iteration}: fallback variation`);
      }
    } else if (basePrompt.toLowerCase().includes('avatar')) {
      try {
        const outfitsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/avatar-outfits.json'), 'utf8'));
        const sequentialIndex = (iteration - 1) % outfitsData.outfits.length;
        const selectedOutfit = outfitsData.outfits[sequentialIndex];
        console.log(`👗 Avatar Outfit ${iteration}: ${selectedOutfit.substring(0, 50)}...`);
      } catch (error) {
        console.log(`👗 Avatar Outfit ${iteration}: fallback variation`);
      }
    } else if (basePrompt.toLowerCase().includes('vintage')) {
      try {
        const vintageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/vintage-outfits.json'), 'utf8'));
        const sequentialIndex = (iteration - 1) % vintageData.vintage_outfits.length;
        const selectedOutfit = vintageData.vintage_outfits[sequentialIndex];
        console.log(`👗 Vintage Outfit ${iteration}: ${selectedOutfit.substring(0, 50)}...`);
      } catch (error) {
        console.log(`👗 Vintage Outfit ${iteration}: fallback variation`);
      }
    }

    // Genera per ogni provider
    for (const providerName of providers) {
      try {
        console.log(`  🎨 ${providerName} - Iterazione ${iteration}`);
        
        let result;
        switch (providerName) {
          case 'gemini':
            result = await generateWithGemini(iterationPrompt, sessionData[sessionId].imagePath, 
              { basePrompt, iteration: iteration });
            break;
          case 'openai':
            result = await generateWithOpenAI(iterationPrompt, sessionData[sessionId].imagePath, 
              { basePrompt, iteration: iteration });
            break;
        }
        
        iterationResult.results[providerName] = result;
        console.log(`  ✅ ${providerName} - Iterazione ${iteration} completata`);
        
      } catch (error) {
        console.error(`  ❌ ${providerName} - Iterazione ${iteration} fallita:`, error.message);
        iterationResult.results[providerName] = { error: error.message };
      }
    }

    return iterationResult;
    
  } catch (error) {
    console.error(`❌ Errore nell'iterazione ${iteration}:`, error.message);
    throw error;
  }
}

// Funzione per variare il prompt ad ogni iterazione
function varyPrompt(basePrompt, iteration) {
  // Riconoscimento tipo di prompt
  const isAvatar = basePrompt.toLowerCase().includes('avatar') || basePrompt.toLowerCase().includes('full-body avatar');
  const isHistorical = basePrompt.toLowerCase().includes('historical') || basePrompt.toLowerCase().includes('historical figure');
  const isVintage = basePrompt.toLowerCase().includes('vintage outfit') || basePrompt.toLowerCase().includes('vintage');
  
  if (isAvatar) {
    // Carica outfit in sequenza dal file JSON
    try {
      const outfitsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/avatar-outfits.json'), 'utf8'));
      // Usa iterazione per selezionare in sequenza (no random) 
      const sequentialIndex = (iteration - 1) % outfitsData.outfits.length;
      const selectedOutfit = outfitsData.outfits[sequentialIndex];
      console.log(`🎨 Avatar Outfit ${iteration}: ${selectedOutfit.substring(0, 50)}...`);
      return `${basePrompt.replace('Modern style', selectedOutfit)}`;
    } catch (error) {
      console.error('Errore nel leggere avatar-outfits.json:', error.message);
      // Fallback alle variazioni semplici
      const variations = ['casual style', 'formal look', 'business attire', 'streetwear', 'vintage style'];
      const variation = variations[(iteration - 1) % variations.length];
      return `${basePrompt.replace('Modern style', variation)}`;
    }
  } else if (isVintage) {
    // Carica outfit vintage in sequenza dal file JSON
    try {
      const vintageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/vintage-outfits.json'), 'utf8'));
      // Usa iterazione per selezionare in sequenza (no random)
      const sequentialIndex = (iteration - 1) % vintageData.vintage_outfits.length;
      const selectedOutfit = vintageData.vintage_outfits[sequentialIndex];
      console.log(`👗 Vintage Outfit ${iteration}: ${selectedOutfit.substring(0, 50)}...`);
      return `${basePrompt.replace('dress in elegant vintage clothing', `dress in ${selectedOutfit}`)}`;
    } catch (error) {
      console.error('Errore nel leggere vintage-outfits.json:', error.message);
      // Fallback alle variazioni semplici
      const variations = ['1920s flapper dress', '1950s pin-up style', 'Victorian gown', '1960s mod outfit', '1970s bohemian look'];
      const variation = variations[(iteration - 1) % variations.length];
      return `${basePrompt.replace('dress in elegant vintage clothing', `dress in ${variation}`)}`;
    }
  } else if (isHistorical) {
    // Carica personaggi storici in sequenza dal file JSON
    try {
      const historicalData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/historical-characters.json'), 'utf8'));
      // Usa iterazione per selezionare in sequenza (no random)
      const sequentialIndex = (iteration - 1) % historicalData.historical_periods.length;
      const selectedCharacter = historicalData.historical_periods[sequentialIndex];
      console.log(`🏛️ Personaggio Storico ${iteration}: ${selectedCharacter.substring(0, 50)}...`);
      return `${basePrompt.replace('Period-accurate clothing from any era', selectedCharacter)}`;
    } catch (error) {
      console.error('Errore nel leggere historical-characters.json:', error.message);
      // Fallback alle variazioni semplici
      const variations = ['Roman era', 'Medieval', 'Renaissance', 'Victorian', 'Ancient Egypt'];
      const variation = variations[(iteration - 1) % variations.length];
      return `${basePrompt.replace('any era', variation)}`;
    }
  } else if (isVintage) {
    // Carica outfit vintage in sequenza dal file JSON
    try {
      const vintageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/vintage-outfits.json'), 'utf8'));
      // Usa iterazione per selezionare in sequenza (no random)
      const sequentialIndex = (iteration - 1) % vintageData.vintage_outfits.length;
      const selectedOutfit = vintageData.vintage_outfits[sequentialIndex];
      console.log(`👗 Vintage Outfit ${iteration}: ${selectedOutfit.substring(0, 50)}...`);
      return `${basePrompt.replace('dress in elegant vintage clothing', `dress in ${selectedOutfit}`)}`;
    } catch (error) {
      console.error('Errore nel leggere vintage-outfits.json:', error.message);
      // Fallback alle variazioni semplici
      const variations = ['1920s flapper dress', '1950s pin-up style', 'Victorian gown', '1960s mod outfit', '1970s bohemian look'];
      const variation = variations[(iteration - 1) % variations.length];
      return `${basePrompt.replace('dress in elegant vintage clothing', `dress in ${variation}`)}`;
    }
  } else {
    // Variazioni brevi generiche
    const variations = [
      'soft lighting',
      'different angle',
      'artistic style',
      'dramatic effect',
      'vibrant colors',
      'classic style',
      'modern look',
      'studio style',
      'cinematic',
      'portrait style',
      'fashion style',
      'documentary',
      'artistic view',
      'contemporary',
      'professional'
    ];
    
    const variationIndex = (iteration - 1) % variations.length;
    const variation = variations[variationIndex];
    return `${basePrompt}, ${variation}`;
  }
}

// Funzione per creare nome file descrittivo dalle variazioni
function createDescriptiveFilename(basePrompt, iteration, provider, extension = 'png') {
  const isAvatar = basePrompt.toLowerCase().includes('avatar') || basePrompt.toLowerCase().includes('full-body avatar');
  const isHistorical = basePrompt.toLowerCase().includes('historical') || basePrompt.toLowerCase().includes('historical figure');
  const isVintage = basePrompt.toLowerCase().includes('vintage outfit') || basePrompt.toLowerCase().includes('vintage');
  
  let description = '';
  
  if (isAvatar) {
    // Ottieni la descrizione dell'outfit per Avatar
    try {
      const outfitsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/avatar-outfits.json'), 'utf8'));
      const sequentialIndex = (iteration - 1) % outfitsData.outfits.length;
      const selectedOutfit = outfitsData.outfits[sequentialIndex];
      
      // Pulisci e accorcia la descrizione per il filename
      description = selectedOutfit.substring(0, 50)
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Rimuovi caratteri speciali
        .replace(/\s+/g, '-') // Sostituisci spazi con trattini
        .toLowerCase()
        .replace(/-+/g, '-') // Rimuovi trattini multipli
        .replace(/^-|-$/g, ''); // Rimuovi trattini all'inizio/fine
      
      description = `avatar-${iteration}-${description}`;
    } catch (error) {
      description = `avatar-${iteration}-outfit${((iteration - 1) % 5) + 1}`;
    }
  } else if (isVintage) {
    // Ottieni la descrizione dell'outfit vintage
    try {
      const vintageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/vintage-outfits.json'), 'utf8'));
      const sequentialIndex = (iteration - 1) % vintageData.vintage_outfits.length;
      const selectedOutfit = vintageData.vintage_outfits[sequentialIndex];
      
      // Pulisci e accorcia la descrizione per il filename
      description = selectedOutfit.substring(0, 50)
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Rimuovi caratteri speciali
        .replace(/\s+/g, '-') // Sostituisci spazi con trattini
        .toLowerCase()
        .replace(/-+/g, '-') // Rimuovi trattini multipli
        .replace(/^-|-$/g, ''); // Rimuovi trattini all'inizio/fine
      
      description = `vintage-${iteration}-${description}`;
    } catch (error) {
      description = `vintage-${iteration}-outfit${((iteration - 1) % 5) + 1}`;
    }
  } else if (isHistorical) {
    // Ottieni la descrizione del personaggio storico
    try {
      const historicalData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/historical-characters.json'), 'utf8'));
      const sequentialIndex = (iteration - 1) % historicalData.historical_periods.length;
      const selectedCharacter = historicalData.historical_periods[sequentialIndex];
      
      // Pulisci e accorcia la descrizione per il filename
      description = selectedCharacter.substring(0, 50)
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Rimuovi caratteri speciali
        .replace(/\s+/g, '-') // Sostituisci spazi con trattini
        .toLowerCase()
        .replace(/-+/g, '-') // Rimuovi trattini multipli
        .replace(/^-|-$/g, ''); // Rimuovi trattini all'inizio/fine
      
      description = `historical-${iteration}-${description}`;
    } catch (error) {
      description = `historical-${iteration}-character${((iteration - 1) % 5) + 1}`;
    }
  } else if (isVintage) {
    // Ottieni la descrizione dell'outfit vintage
    try {
      const vintageData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/vintage-outfits.json'), 'utf8'));
      const sequentialIndex = (iteration - 1) % vintageData.vintage_outfits.length;
      const selectedOutfit = vintageData.vintage_outfits[sequentialIndex];
      
      // Pulisci e accorcia la descrizione per il filename
      description = selectedOutfit.substring(0, 50)
        .replace(/[^a-zA-Z0-9\s-]/g, '') // Rimuovi caratteri speciali
        .replace(/\s+/g, '-') // Sostituisci spazi con trattini
        .toLowerCase()
        .replace(/-+/g, '-') // Rimuovi trattini multipli
        .replace(/^-|-$/g, ''); // Rimuovi trattini all'inizio/fine
      
      description = `vintage-${iteration}-${description}`;
    } catch (error) {
      description = `vintage-${iteration}-outfit${((iteration - 1) % 5) + 1}`;
    }
  } else {
    // Per altri tipi di prompt, usa una descrizione generica
    const variations = ['soft-lighting', 'different-angle', 'artistic-style', 'dramatic-effect', 'vibrant-colors'];
    const variationIndex = (iteration - 1) % variations.length;
    description = `batch-${iteration}-${variations[variationIndex]}`;
  }
  
  // Aggiungi timestamp per unicità e provider
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 1000000);
  
  return `${provider}-${description}-${timestamp}-${randomId}.${extension}`;
}

// API: Ottieni risultato generazione
app.get('/api/result/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionData[sessionId] || !sessionData[sessionId].result) {
    return res.status(404).json({ error: 'Risultato non trovato' });
  }

  res.json(sessionData[sessionId]);
});

// API: Ottieni progresso batch generation
app.get('/api/batch-progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionData[sessionId]) {
    return res.status(404).json({ error: 'Sessione non trovata' });
  }

  const batchData = {
    status: sessionData[sessionId].batchStatus || 'not-started',
    progress: sessionData[sessionId].batchProgress || {},
    results: sessionData[sessionId].batchResults || [],
    isComplete: sessionData[sessionId].batchStatus === 'completed'
  };

  res.json(batchData);
});

// API: Reset sessione (per ricominciare)
app.delete('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (sessionData[sessionId]) {
    delete sessionData[sessionId];
    console.log(`🗑️ Sessione ${sessionId} eliminata`);
  }

  res.json({ success: true, message: 'Sessione resettata' });
});

/**
 * Genera immagine usando Google Gemini AI (2.5 Flash Image Preview)
 */
async function generateWithGemini(prompt, originalImagePath, batchInfo = null) {
  try {
    console.log('🤖 Generazione immagine con Gemini 2.5 Flash Image Preview...');
    
    const startTime = Date.now();
    
    // Usa il modello corretto per generazione immagini
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    
    // Leggi l'immagine originale
    const imagePath = path.join(__dirname, 'uploads', originalImagePath);
    const imageData = fs.readFileSync(imagePath);
    const imageBase64 = imageData.toString('base64');
    
    // Determina il tipo MIME dell'immagine
    const ext = path.extname(originalImagePath).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    if (ext === '.gif') mimeType = 'image/gif';
    
    // Crea un prompt ottimizzato per FORZARE la generazione di immagini
    const imagePrompt = `GENERATE IMAGE: Transform person from reference photo as: ${prompt}

REQUIRED OUTPUT: Visual image file only
MAINTAIN: Same face and identity 
FORBIDDEN: Text descriptions or analysis

CREATE IMAGE NOW.`;

    try {
      const result = await model.generateContent([
        imagePrompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: imageBase64
          }
        }
      ]);

      const response = result.response;
      const processingTime = Date.now() - startTime;
      
      // Verifica se c'è un'immagine generata
      if (response && response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];
        
        // Cerca l'immagine nei parts della risposta
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
              // Trovata immagine generata
              const generatedImageData = part.inlineData.data;
              const generatedImageUrl = `data:${part.inlineData.mimeType};base64,${generatedImageData}`;
              
              // Salva l'immagine generata localmente
              let savedImagePath = null;
              try {
                let filename;
                
                // Se è una batch generation, usa nome descrittivo
                if (batchInfo && batchInfo.basePrompt && batchInfo.iteration) {
                  const extension = part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
                  filename = createDescriptiveFilename(batchInfo.basePrompt, batchInfo.iteration, 'gemini', extension);
                } else {
                  // Nome standard per generazioni singole
                  const timestamp = Date.now();
                  const randomId = Math.floor(Math.random() * 1000000000);
                  const extension = part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
                  filename = `gemini-${timestamp}-${randomId}.${extension}`;
                }
                
                const filepath = path.join(__dirname, 'generated', filename);
                
                const imageBuffer = Buffer.from(generatedImageData, 'base64');
                fs.writeFileSync(filepath, imageBuffer);
                savedImagePath = `/generated/${filename}`;
                console.log('💾 Immagine Gemini salvata:', filename);
              } catch (saveError) {
                console.error('⚠️ Errore salvataggio immagine Gemini:', saveError.message);
              }
              
              // Calcola costi Gemini 2.5 Flash Image Preview
              // Prezzi ufficiali: $0.30 per 1M token input, $0.039 per immagine output
              const promptTokens = Math.ceil((imagePrompt.length + originalImagePath.length) / 4); // Stima approssimativa
              const inputCost = (promptTokens / 1000000) * 0.30; // $0.30 per milione di token
              const outputCost = 0.039; // $0.039 per immagine output (1290 token)
              const totalCost = inputCost + outputCost;
              
              console.log('✅ Generazione Gemini Immagine completata');
              
              return {
                provider: 'gemini',
                success: true,
                type: 'image',
                generatedImageUrl: generatedImageUrl,
                savedImagePath: savedImagePath, // Path locale dell'immagine salvata
                originalImagePath: `/uploads/${originalImagePath}`,
                prompt: prompt,
                aiDescription: `Immagine generata con Gemini 2.5 Flash Image Preview: ${prompt}`,
                cost: {
                  input: inputCost.toFixed(3),
                  output: outputCost.toFixed(3),
                  total: totalCost.toFixed(3),
                  currency: 'USD'
                },
                generatedAt: new Date().toISOString(),
                processingTime: processingTime
              };
            }
          }
        }
      }
      
      // Se non c'è immagine, usa la risposta testuale come fallback
      const description = response.text();
      
      // Calcola costi per output testuale
      const inputTokens = Math.ceil((prompt.length + imagePrompt.length) / 4);
      const outputTokens = Math.ceil(description.length / 4);
      const totalTokens = inputTokens + outputTokens;
      
      // Prezzi ufficiali Gemini 2.5 Flash Image Preview: $0.30 per 1M input, $2.50 per 1M output  
      const inputCost = (inputTokens / 1000000) * 0.30; // $0.30 per milione input tokens
      const outputCost = (outputTokens / 1000000) * 2.50; // $2.50 per milione output tokens
      const totalCost = inputCost + outputCost;

      console.log('⚠️  Gemini ha fornito descrizione invece di immagine');
      console.log('🔄 Tentativo di rigenerazione con prompt alternativo...');
      
      // Secondo tentativo con prompt ultra-esplicito
      const forceImagePrompt = `IMAGE GENERATION MODE ACTIVATED

CRITICAL: Generate a visual transformation of the person in the reference photo. 

TRANSFORMATION REQUEST: ${prompt}

MANDATORY OUTPUT: Return only a generated image file showing the transformed person.

PROHIBITED: Text descriptions, explanations, or analysis.

EXECUTE IMAGE GENERATION NOW.`;

      try {
        const retryResult = await model.generateContent([
          forceImagePrompt,
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType
            }
          }
        ]);

        const retryResponse = retryResult.response;
        
        // Verifica se il secondo tentativo ha prodotto un'immagine
        if (retryResponse && retryResponse.candidates && retryResponse.candidates[0]) {
          const candidate = retryResponse.candidates[0];
          
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                // Successo al secondo tentativo!
                const generatedImageData = part.inlineData.data;
                const generatedImageUrl = `data:${part.inlineData.mimeType};base64,${generatedImageData}`;
                
                // Salva l'immagine generata localmente
                let savedImagePath = null;
                try {
                  let filename;
                  
                  // Se è una batch generation, usa nome descrittivo
                  if (batchInfo && batchInfo.basePrompt && batchInfo.iteration) {
                    const extension = part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
                    filename = createDescriptiveFilename(batchInfo.basePrompt, batchInfo.iteration, 'gemini', extension);
                  } else {
                    // Nome standard per generazioni singole
                    const timestamp = Date.now();
                    const randomId = Math.floor(Math.random() * 1000000000);
                    const extension = part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
                    filename = `gemini-${timestamp}-${randomId}.${extension}`;
                  }
                  
                  const filepath = path.join(__dirname, 'generated', filename);
                  
                  const imageBuffer = Buffer.from(generatedImageData, 'base64');
                  fs.writeFileSync(filepath, imageBuffer);
                  savedImagePath = `/generated/${filename}`;
                  console.log('✅ Immagine Gemini salvata al secondo tentativo:', filename);
                } catch (saveError) {
                  console.error('⚠️ Errore salvataggio immagine Gemini:', saveError.message);
                }
                
                // Calcola costi per entrambi i tentativi
                const promptTokens = Math.ceil((imagePrompt.length + forceImagePrompt.length + originalImagePath.length) / 4);
                const inputCost = (promptTokens / 1000000) * 0.30; // $0.30 per milione di token
                const outputCost = 0.039 * 2; // $0.039 per immagine output (2 tentativi)
                const totalCost = inputCost + outputCost;
                
                console.log('✅ Generazione Gemini Immagine completata al secondo tentativo');
                
                return {
                  provider: 'gemini',
                  success: true,
                  type: 'image',
                  generatedImageUrl: generatedImageUrl,
                  savedImagePath: savedImagePath,
                  originalImagePath: `/uploads/${originalImagePath}`,
                  prompt: prompt,
                  aiDescription: `Immagine generata con Gemini 2.5 Flash (retry): ${prompt}`,
                  retryAttempt: true,
                  cost: {
                    input: inputCost.toFixed(3),
                    output: outputCost.toFixed(3),
                    total: totalCost.toFixed(3),
                    currency: 'USD'
                  },
                  generatedAt: new Date().toISOString(),
                  processingTime: Date.now() - startTime
                };
              }
            }
          }
        }
        
        console.log('⚠️ Anche il secondo tentativo ha fallito, restituisco descrizione');
      } catch (retryError) {
        console.error('⚠️ Errore nel retry Gemini:', retryError.message);
      }

      return {
        provider: 'gemini',
        success: true,
        type: 'description',
        generatedImageUrl: null,
        originalImagePath: `/uploads/${originalImagePath}`,
        prompt: prompt,
        aiDescription: description,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens
        },
        cost: {
          input: inputCost.toFixed(6),
          output: outputCost.toFixed(6),
          total: totalCost.toFixed(6),
          currency: 'USD'
        },
        generatedAt: new Date().toISOString(),
        processingTime: processingTime
      };
      
    } catch (modelError) {
      console.error('❌ Errore nel modello Gemini:', modelError.message);
      throw new Error(`Gemini 2.5 Flash Image Preview: ${modelError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Errore Gemini:', error.message);
    throw new Error(`Gemini AI: ${error.message}`);
  }
}

/**
 * Genera immagine usando OpenAI GPT Image 1
 */
async function generateWithOpenAI(prompt, originalImagePath, batchInfo = null) {
  try {
    console.log('🚀 DEBUG: generateWithOpenAI chiamata - prompt:', prompt, 'originalImagePath:', originalImagePath);
    
    // Controlla se OpenAI è abilitato
    if (!OPENAI_ENABLED) {
      console.log('⚠️  OpenAI disabilitato per test - OPENAI_ENABLED:', OPENAI_ENABLED);
      return {
        success: false,
        error: 'OpenAI temporaneamente disabilitato. Configura una chiave API valida per abilitarlo.',
        cost: 0,
        processingTime: 0
      };
    }

    console.log('🎨 Generazione con OpenAI GPT Image 1...');
    
    const startTime = Date.now();
    
    // Ottimizza il prompt per GPT Image 1
    const optimizedPrompt = `Transform the style and appearance of the subject to match this description: ${prompt}. Maintain facial features and expressions. High quality, detailed, professional artwork.`;
    
    // Genera l'immagine con GPT Image 1
    // Supporta formato wide/portrait per prompt cinematografici
    const isWideFormat = prompt.toLowerCase().includes('cinema') || 
                        prompt.toLowerCase().includes('wide') || 
                        prompt.toLowerCase().includes('panorama') ||
                        prompt.toLowerCase().includes('landscape');
    
    const isPortraitFormat = prompt.toLowerCase().includes('portrait') ||
                            prompt.toLowerCase().includes('vertical') ||
                            prompt.toLowerCase().includes('tall');
    
    // Seleziona dimensioni supportate da GPT Image 1
    let imageSize = "1024x1024"; // Default quadrato
    if (isWideFormat) {
      imageSize = "1536x1024"; // Wide format
    } else if (isPortraitFormat) {
      imageSize = "1024x1536"; // Portrait format
    }
    
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: optimizedPrompt,
      n: 1,
      size: imageSize,
      quality: "high"
    });
    
    console.log('✅ OpenAI API chiamata completata! Response keys:', Object.keys(response));
    
    const processingTime = Date.now() - startTime;
    
    // Debug: Logga la struttura della risposta OpenAI
    console.log('🔍 Debug OpenAI response structure:', JSON.stringify(response, null, 2));
    
    // Calcolo del costo basato sui token se disponibili
    let actualCost = 0;
    if (response.usage) {
        // Prezzi per gpt-image-1 (verifica i prezzi attuali OpenAI)
        const inputTokenPrice = 0.000002; // $0.002 per 1K input tokens
        const outputTokenPrice = 0.000008; // $0.008 per 1K output tokens
        
        const inputCost = (response.usage.input_tokens / 1000) * inputTokenPrice;
        const outputCost = (response.usage.output_tokens / 1000) * outputTokenPrice;
        actualCost = inputCost + outputCost;
        
        console.log(`💰 OpenAI Cost Calculation:
            Input tokens: ${response.usage.input_tokens} × $${inputTokenPrice}/1K = $${inputCost.toFixed(6)}
            Output tokens: ${response.usage.output_tokens} × $${outputTokenPrice}/1K = $${outputCost.toFixed(6)}
            Total cost: $${actualCost.toFixed(6)}`);
    }
    
    // Salva l'immagine generata localmente
    let savedImagePath = null;
    let generatedImageUrl = null;
    try {
      console.log('🔍 OpenAI Response data array length:', response.data?.length);
      console.log('🔍 First image object keys:', response.data[0] ? Object.keys(response.data[0]) : 'none');
      
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000000000);
      
      // Usa nome descrittivo se è una batch generation
      let filename;
      if (batchInfo) {
        filename = createDescriptiveFilename('openai', batchInfo.basePrompt, batchInfo.iteration, timestamp, randomId);
      } else {
        filename = `openai-${timestamp}-${randomId}.png`;
      }
      
      const filepath = path.join(__dirname, 'generated', filename);
      
      // Gestisci sia URL che dati base64
      if (response.data[0].url) {
        // Caso URL (vecchio comportamento)
        console.log('🔗 Utilizzando URL OpenAI:', response.data[0].url);
        generatedImageUrl = response.data[0].url;
        const imageResponse = await fetch(response.data[0].url);
        const arrayBuffer = await imageResponse.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(filepath, imageBuffer);
      } else if (response.data[0].b64_json) {
        // Caso base64 (nuovo comportamento)
        console.log('📊 Utilizzando dati base64 OpenAI (lunghezza:', response.data[0].b64_json.length, 'caratteri)');
        const imageBuffer = Buffer.from(response.data[0].b64_json, 'base64');
        fs.writeFileSync(filepath, imageBuffer);
        generatedImageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
      } else {
        throw new Error('Nessun URL o dati base64 disponibili nella risposta OpenAI');
      }
      
      savedImagePath = `/generated/${filename}`;
      console.log('💾 Immagine OpenAI salvata:', filename);
    } catch (saveError) {
      console.error('⚠️ Errore salvataggio immagine OpenAI:', saveError.message);
    }
    
    // Calcola costi OpenAI GPT Image 1 - usa i token reali se disponibili
    let finalCost = actualCost;
    if (actualCost === 0) {
        // Fallback al costo fisso se i token non sono disponibili
        const isLargeFormat = imageSize !== "1024x1024";
        finalCost = isLargeFormat ? 0.080 : 0.040; // $0.08 per formati grandi, $0.04 per 1024x1024
        console.log(`⚠️ Usando costo fisso: $${finalCost} (formato: ${imageSize})`);
    }
    
    console.log('✅ Generazione OpenAI completata');

    return {
      provider: 'openai',
      success: true,
      type: 'image', // OpenAI genera immagine reale
      generatedImageUrl: generatedImageUrl,
      savedImagePath: savedImagePath, // Path locale dell'immagine salvata
      originalImagePath: `/uploads/${originalImagePath}`,
      prompt: prompt,
      optimizedPrompt: optimizedPrompt,
      aiDescription: `Immagine generata da OpenAI GPT Image 1 basata sul prompt: "${prompt}"`,
      tokens: {
        input: response.usage ? response.usage.input_tokens : null,
        output: response.usage ? response.usage.output_tokens : null,
        total: response.usage ? response.usage.total_tokens : null
      },
      cost: {
        input: response.usage ? (response.usage.input_tokens / 1000) * 0.000002 : 0,
        output: response.usage ? (response.usage.output_tokens / 1000) * 0.000008 : finalCost,
        total: finalCost,
        currency: 'USD'
      },
      generatedAt: new Date().toISOString(),
      processingTime: `${processingTime}ms`,
      imageSpecs: {
        model: "gpt-image-1",
        size: imageSize,
        quality: "high",
        n: 1
      }
    };
    
  } catch (error) {
    console.error('❌ Errore OpenAI:', error.message);
    
    // Gestisci diversi tipi di errore OpenAI
    if (error.code === 'insufficient_quota') {
      throw new Error('Quota OpenAI esaurita. Verifica il tuo piano di fatturazione.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Chiave API OpenAI non valida.');
    } else {
      throw new Error(`OpenAI GPT Image 1: ${error.message}`);
    }
  }
}



// Gestione errori Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File troppo grande (max 5MB)' });
    }
  }
  
  if (error.message === 'Solo file immagine sono permessi!') {
    return res.status(400).json({ error: error.message });
  }
  
  console.error('Errore server:', error);
  res.status(500).json({ error: 'Errore interno del server' });
});

// Avvio del server
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su http://localhost:${PORT}`);
  console.log(`📁 File statici serviti da: public/`);
  console.log(`📷 Upload immagini in: uploads/`);
  console.log('\n📋 API disponibili:');
  console.log('   POST /api/upload - Upload immagine');
  console.log('   GET  /api/images - Elenca immagini esistenti');
  console.log('   POST /api/select-image - Seleziona immagine esistente');
  console.log('   GET  /api/image/:sessionId - Ottieni dati immagine');
  console.log('   POST /api/generate - Genera immagine da prompt (Gemini + OpenAI)');
  console.log('   POST /api/batch-generate - Genera X iterazioni dello stesso prompt');
  console.log('   GET  /api/batch-progress/:sessionId - Monitoraggio batch generation');
  console.log('   GET  /api/result/:sessionId - Ottieni risultato');
  console.log('   DELETE /api/session/:sessionId - Reset sessione');
  console.log('\n🤖 AI Providers:');
  console.log('   🔮 Gemini 2.5 Flash Image Preview - Generazione immagini AI');
  console.log('   🎨 OpenAI GPT Image 1 - Generazione immagini');
});
