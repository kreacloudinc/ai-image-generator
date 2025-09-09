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

// Configurazione Stability AI
const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
const STABILITY_ENABLED = !!STABILITY_API_KEY;
if (!STABILITY_ENABLED) {
    console.warn('⚠️  Stability API Key non trovata - Stability AI disabilitato');
}

// Configurazione ComfyUI
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const COMFYUI_ENABLED = true; // ComfyUI locale sempre abilitato se accessibile

if (COMFYUI_ENABLED) {
    console.log('🎨 ComfyUI configurato su:', COMFYUI_URL);
}

// Middleware
app.use(cors());
app.use(express.json());
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
        providerName = 'OpenAI DALL-E';
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

// Funzione asincrona per generare immagini in background
async function generateImagesAsync(sessionId, prompt, provider) {
  try {
    const results = {};
    sessionData[sessionId].progress = {};

    // Lista dei provider da utilizzare
    const providers = [];
    if (provider === 'both') {
      providers.push('gemini', 'openai', 'stability', 'comfyui');
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
            console.log('🎨 Generando con OpenAI DALL-E...');
            result = await generateWithOpenAI(prompt, sessionData[sessionId].imagePath);
            break;
          case 'stability':
            console.log('⚡ Generando con Stability AI...');
            result = await generateWithStabilityAI(prompt);
            break;
          case 'comfyui':
            console.log('🎨 Generando con ComfyUI...');
            result = await generateWithComfyUI(prompt, sessionData[sessionId].imagePath);
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

// API: Ottieni risultato generazione
app.get('/api/result/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionData[sessionId] || !sessionData[sessionId].result) {
    return res.status(404).json({ error: 'Risultato non trovato' });
  }

  res.json(sessionData[sessionId]);
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
async function generateWithGemini(prompt, originalImagePath) {
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
    
    // Crea un prompt ottimizzato per la generazione di immagini
    const imagePrompt = `Based on this reference image, generate a new image that transforms the subject according to this description: ${prompt}. 

Maintain the person's facial features, expressions, and basic appearance, but completely transform their style, clothing, and environment as described. Create a high-quality, detailed, photorealistic result.

Generate the image now.`;

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
                const timestamp = Date.now();
                const randomId = Math.floor(Math.random() * 1000000000);
                const extension = part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
                const filename = `gemini-${timestamp}-${randomId}.${extension}`;
                const filepath = path.join(__dirname, 'generated', filename);
                
                const imageBuffer = Buffer.from(generatedImageData, 'base64');
                fs.writeFileSync(filepath, imageBuffer);
                savedImagePath = `/generated/${filename}`;
                console.log('💾 Immagine Gemini salvata:', filename);
              } catch (saveError) {
                console.error('⚠️ Errore salvataggio immagine Gemini:', saveError.message);
              }
              
              // Calcola costi Gemini 2.5 Flash Image Preview
              const inputCost = 0.30; // $0.30 per input
              const outputCost = 0.039; // $0.039 per immagine output
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
      
      const inputCostPer1000 = 0.30; // $0.30 per 1000 input tokens  
      const outputCostPer1000 = 2.50; // $2.50 per 1000 output tokens
      
      const inputCost = (inputTokens / 1000) * inputCostPer1000;
      const outputCost = (outputTokens / 1000) * outputCostPer1000;
      const totalCost = inputCost + outputCost;

      console.log('⚠️  Gemini ha fornito descrizione invece di immagine');

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
        aiDescription: description,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
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
 * Genera immagine usando OpenAI DALL-E
 */
async function generateWithOpenAI(prompt, originalImagePath) {
  try {
    // Controlla se OpenAI è abilitato
    if (!OPENAI_ENABLED) {
      console.log('⚠️  OpenAI disabilitato per test');
      return {
        success: false,
        error: 'OpenAI temporaneamente disabilitato. Configura una chiave API valida per abilitarlo.',
        cost: 0,
        processingTime: 0
      };
    }

    console.log('🎨 Generazione con OpenAI DALL-E...');
    
    const startTime = Date.now();
    
    // Ottimizza il prompt per DALL-E
    const optimizedPrompt = `Transform the style and appearance of the subject to match this description: ${prompt}. Maintain facial features and expressions. High quality, detailed, professional artwork.`;
    
    // Genera l'immagine con DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: optimizedPrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url"
    });
    
    const processingTime = Date.now() - startTime;
    
    // Salva l'immagine generata localmente
    let savedImagePath = null;
    try {
      const imageResponse = await fetch(response.data[0].url);
      const arrayBuffer = await imageResponse.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const timestamp = Date.now();
      const randomId = Math.floor(Math.random() * 1000000000);
      const filename = `openai-${timestamp}-${randomId}.png`;
      const filepath = path.join(__dirname, 'generated', filename);
      
      fs.writeFileSync(filepath, imageBuffer);
      savedImagePath = `/generated/${filename}`;
      console.log('💾 Immagine OpenAI salvata:', filename);
    } catch (saveError) {
      console.error('⚠️ Errore salvataggio immagine OpenAI:', saveError.message);
    }
    
    // Calcola costi OpenAI DALL-E 3
    const dallE3Cost = 0.040; // $0.04 per immagine 1024x1024 standard
    
    console.log('✅ Generazione OpenAI completata');

    return {
      provider: 'openai',
      success: true,
      type: 'image', // OpenAI genera immagine reale
      generatedImageUrl: response.data[0].url,
      savedImagePath: savedImagePath, // Path locale dell'immagine salvata
      originalImagePath: `/uploads/${originalImagePath}`,
      prompt: prompt,
      optimizedPrompt: optimizedPrompt,
      aiDescription: `Immagine generata da OpenAI DALL-E 3 basata sul prompt: "${prompt}"`,
      tokens: {
        input: null, // DALL-E non usa token standard
        output: null,
        total: null
      },
      cost: {
        input: 0,
        output: dallE3Cost,
        total: dallE3Cost,
        currency: 'USD'
      },
      generatedAt: new Date().toISOString(),
      processingTime: `${processingTime}ms`,
      imageSpecs: {
        model: "dall-e-3",
        size: "1024x1024",
        quality: "standard"
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
      throw new Error(`OpenAI DALL-E: ${error.message}`);
    }
  }
}

/**
 * Genera immagine usando Stability AI
 */
async function generateWithStabilityAI(prompt) {
  try {
    console.log('⚡ Generazione immagine con Stability AI...');
    console.log('🔑 API Key disponibile:', STABILITY_API_KEY ? 'SÌ' : 'NO');
    
    const startTime = Date.now();
    
    const response = await axios.post('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image', {
      text_prompts: [
        {
          text: prompt,
          weight: 1
        }
      ],
      cfg_scale: 7,
      height: 1024,
      width: 1024,
      samples: 1,
      steps: 30
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${STABILITY_API_KEY}`
      }
    });

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    if (response.data.artifacts && response.data.artifacts.length > 0) {
      const base64Image = response.data.artifacts[0].base64;
      const buffer = Buffer.from(base64Image, 'base64');
      
      // Genera nome file unico
      const timestamp = Date.now();
      const randomNum = Math.floor(Math.random() * 1000000000);
      const filename = `stability-${timestamp}-${randomNum}.png`;
      const filepath = path.join(generatedDir, filename);
      
      // Salva l'immagine
      fs.writeFileSync(filepath, buffer);
      console.log(`💾 Immagine Stability AI salvata: ${filename}`);
      
      return {
        success: true,
        type: 'image',
        imagePath: `/generated/${filename}`,
        generatedImageUrl: `/generated/${filename}`,
        filename: filename,
        processingTime: `${processingTime}s`,
        provider: 'Stability AI',
        modelUsed: 'Stable Diffusion XL 1024',
        aiDescription: `Immagine generata con Stability AI Stable Diffusion XL utilizzando il prompt: "${prompt}". Modello ottimizzato per immagini di alta qualità a risoluzione 1024x1024 pixel.`,
        imageSpecs: {
          size: '1024x1024',
          quality: 'Alta qualità',
          format: 'PNG'
        },
        generatedAt: new Date().toISOString()
      };
    } else {
      throw new Error('Nessuna immagine generata da Stability AI');
    }
  } catch (error) {
    console.error('❌ Errore Stability AI:', error.message);
    if (error.response?.status === 401) {
      throw new Error('Chiave API Stability AI non valida.');
    } else if (error.response?.status === 429) {
      throw new Error('Limite di richieste raggiunto per Stability AI.');
    } else {
      throw new Error(`Stability AI: ${error.message}`);
    }
  }
}

/**
 * Genera immagine usando ComfyUI con Stable Diffusion 3.5 Large Turbo
 */
async function generateWithComfyUI(prompt, inputImagePath = null) {
  try {
    console.log('🎨 Generazione immagine con ComfyUI SD 3.5 Large Turbo...');
    console.log('🖼️ Immagine input:', inputImagePath || 'Text-to-Image');
    
    const startTime = Date.now();
    
    // Workflow JSON corretto per SDXL
    const workflow = {
      "1": {
        "inputs": {
          "ckpt_name": "sd_xl_base_1.0.safetensors"
        },
        "class_type": "CheckpointLoaderSimple",
        "_meta": {
          "title": "Load Checkpoint"
        }
      },
      "2": {
        "inputs": {
          "text": prompt,
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Prompt)"
        }
      },
      "3": {
        "inputs": {
          "text": "low quality, blurry, distorted, watermark, text, signature",
          "clip": ["1", 1]
        },
        "class_type": "CLIPTextEncode",
        "_meta": {
          "title": "CLIP Text Encode (Negative)"
        }
      },
      "4": {
        "inputs": {
          "width": 1024,
          "height": 1024,
          "batch_size": 1
        },
        "class_type": "EmptyLatentImage",
        "_meta": {
          "title": "Empty Latent Image"
        }
      },
      "5": {
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 25,
          "cfg": 8.0,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": inputImagePath ? 0.75 : 1.0,
          "model": ["1", 0],
          "positive": ["2", 0],
          "negative": ["3", 0],
          "latent_image": inputImagePath ? ["13", 0] : ["4", 0]
        },
        "class_type": "KSampler",
        "_meta": {
          "title": "KSampler"
        }
      },
      "6": {
        "inputs": {
          "samples": ["5", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEDecode",
        "_meta": {
          "title": "VAE Decode"
        }
      },
      "7": {
        "inputs": {
          "filename_prefix": "ComfyUI_SDXL",
          "images": ["6", 0]
        },
        "class_type": "SaveImage",
        "_meta": {
          "title": "Save Image"
        }
      }
    };

    // Se abbiamo un'immagine di input, aggiungiamo i nodi per image-to-image
    if (inputImagePath) {
      // ComfyUI si aspetta solo il nome del file, non il path completo
      const imageName = path.basename(inputImagePath);
      
      // Copia l'immagine nella cartella input di ComfyUI
      const comfyInputPath = '/Users/kreativemilano/PROGETTI GIT/ComfyUI/input/';
      const sourceImagePath = path.resolve(inputImagePath);
      const destImagePath = path.join(comfyInputPath, imageName);
      
      console.log(`📁 Copiando immagine: ${sourceImagePath} → ${destImagePath}`);
      fs.copyFileSync(sourceImagePath, destImagePath);
      
      workflow["10"] = {
        "inputs": {
          "image": imageName
        },
        "class_type": "LoadImage",
        "_meta": {
          "title": "Load Image"
        }
      };
      
      workflow["13"] = {
        "inputs": {
          "pixels": ["10", 0],
          "vae": ["1", 2]
        },
        "class_type": "VAEEncode",
        "_meta": {
          "title": "VAE Encode"
        }
      };
    }

    console.log('🌐 Chiamata API ComfyUI...');
    
    // Prima chiamiamo l'API per mettere in coda il prompt
    const queueResponse = await axios.post(`${COMFYUI_URL}/prompt`, {
      prompt: workflow,
      client_id: `nodejs-${Date.now()}`
    }, {
      timeout: 10000
    });

    const promptId = queueResponse.data.prompt_id;
    console.log('📝 Prompt ID ComfyUI:', promptId);

    // Polling per controllare lo stato
    let completed = false;
    let attempts = 0;
    const maxAttempts = 120; // 2 minuti massimo
    
    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attendi 1 secondo
      attempts++;
      
      try {
        const historyResponse = await axios.get(`${COMFYUI_URL}/history/${promptId}`, {
          timeout: 5000
        });
        
        console.log(`🔍 Polling tentativo ${attempts}: Controllando promptId ${promptId}`);
        
        if (historyResponse.data[promptId]) {
          const history = historyResponse.data[promptId];
          console.log('📊 Storia trovata:', JSON.stringify(history.status, null, 2));
          
          if (history.status && history.status.completed) {
            completed = true;
            console.log('✅ Generazione ComfyUI completata');
            
            // Ottieni i dati dell'immagine
            const outputs = history.outputs;
            if (outputs && outputs["7"] && outputs["7"].images && outputs["7"].images.length > 0) {
              const imageInfo = outputs["7"].images[0];
              
              // Scarica l'immagine da ComfyUI
              const imageResponse = await axios.get(`${COMFYUI_URL}/view`, {
                params: {
                  filename: imageInfo.filename,
                  subfolder: imageInfo.subfolder || '',
                  type: imageInfo.type || 'output'
                },
                responseType: 'arraybuffer'
              });
              
              // Salva l'immagine localmente
              const timestamp = Date.now();
              const randomId = Math.floor(Math.random() * 1000000000);
              const filename = `comfyui-${timestamp}-${randomId}.png`;
              const filepath = path.join(generatedDir, filename);
              
              fs.writeFileSync(filepath, imageResponse.data);
              const savedImagePath = `/generated/${filename}`;
              
              console.log('💾 Immagine ComfyUI salvata:', filename);
              
              const processingTime = Date.now() - startTime;
              
              return {
                provider: 'comfyui',
                success: true,
                type: 'image',
                generatedImageUrl: savedImagePath,
                savedImagePath: savedImagePath,
                imageUrl: savedImagePath,
                filename: filename,
                prompt: prompt,
                aiDescription: `Immagine generata con ComfyUI e Stable Diffusion XL Base 1.0. Modello di alta qualità ottimizzato per immagini 1024x1024 con supporto completo per image-to-image transformation. Eccellente balance tra velocità e qualità.`,
                cost: {
                  input: '0.000',
                  output: '0.000',
                  total: '0.000',
                  currency: 'USD',
                  breakdown: 'ComfyUI locale - nessun costo API'
                },
                generatedAt: new Date().toISOString(),
                processingTime: `${processingTime}ms`,
                imageSpecs: {
                  model: "stable-diffusion-xl-base-1.0",
                  type: inputImagePath ? "image-to-image" : "text-to-image",
                  quality: "high",
                  resolution: "1024x1024",
                  provider: "ComfyUI Local",
                  denoise: inputImagePath ? 0.75 : 1.0,
                  steps: 25,
                  cfg: 7.5
                }
              };
            } else {
              throw new Error('Nessuna immagine trovata nell\'output di ComfyUI');
            }
          }
        } else {
          console.log(`⏳ Tentativo ${attempts}: promptId ${promptId} non ancora nella history`);
        }
      } catch (pollError) {
        console.log(`⏳ Polling tentativo ${attempts}/${maxAttempts}... (${pollError.message})`);
      }
    }
    
    if (!completed) {
      throw new Error('Timeout: ComfyUI non ha completato la generazione entro 2 minuti');
    }
    
  } catch (error) {
    console.error('❌ Errore ComfyUI:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ComfyUI non è accessibile. Assicurati che sia in esecuzione su ' + COMFYUI_URL);
    } else if (error.response?.status === 400) {
      throw new Error('Workflow ComfyUI non valido o modello non trovato');
    } else if (error.response?.status === 500) {
      throw new Error('Errore interno di ComfyUI durante la generazione');
    } else {
      throw new Error(`ComfyUI: ${error.message}`);
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
  console.log('      POST /api/generate - Genera immagine da prompt (Gemini + OpenAI + Stability + ComfyUI)');
  console.log('   GET  /api/result/:sessionId - Ottieni risultato');
  console.log('   DELETE /api/session/:sessionId - Reset sessione');
  console.log('\n🤖 AI Providers:');
  console.log('   🔮 Gemini 2.5 Flash Image Preview - Generazione immagini AI');
  console.log('   🎨 OpenAI DALL-E 3 - Generazione immagini');
  console.log('   ⚡ Stability AI Stable Diffusion XL - Generazione immagini di alta qualità');
  console.log('   🎨 ComfyUI SD 3.5 Large Turbo - Generazione locale ultra-veloce');
});
