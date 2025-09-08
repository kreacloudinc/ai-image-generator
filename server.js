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

    console.log(`🎨 Generazione immagine per: "${prompt}"`);
    console.log(`🔧 Provider: ${provider}`);

    let results = {};

    // Genera con Gemini (sempre per descrizione)
    if (provider === 'gemini' || provider === 'both') {
      console.log('🤖 Generando con Gemini...');
      try {
        results.gemini = await generateWithGemini(prompt, sessionData[sessionId].imagePath);
      } catch (error) {
        console.error('❌ Errore Gemini:', error.message);
        results.gemini = { error: error.message };
      }
    }

    // Genera con OpenAI DALL-E
    if (provider === 'openai' || provider === 'both') {
      console.log('🎨 Generando con OpenAI DALL-E...');
      try {
        results.openai = await generateWithOpenAI(prompt, sessionData[sessionId].imagePath);
      } catch (error) {
        console.error('❌ Errore OpenAI:', error.message);
        results.openai = { error: error.message };
      }
    }

    // Genera con Stability AI
    if (provider === 'stability' || provider === 'both') {
      console.log('⚡ Generando con Stability AI...');
      try {
        results.stability = await generateWithStabilityAI(prompt);
      } catch (error) {
        console.error('❌ Errore Stability AI:', error.message);
        results.stability = { error: error.message };
      }
    }

    // Genera con Google Imagen 4 Fast (se richiesto)
    if (provider === 'imagen4' || provider === 'both') {
      console.log('🚀 Generando con Google Imagen 4 Fast...');
      try {
        results.imagen4 = await generateWithImagen4(prompt);
      } catch (error) {
        console.error('❌ Errore Imagen 4:', error.message);
        results.imagen4 = { error: error.message };
      }
    }
    
    // Salva il risultato nella sessione
    sessionData[sessionId].result = results;

    console.log(`✅ Generazione completata`);

    res.json({
      success: true,
      results: results,
      message: 'Generazione completata!'
    });
  } catch (error) {
    console.error('Errore generazione:', error);
    res.status(500).json({ error: 'Errore durante la generazione: ' + error.message });
  }
});

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
 * Genera immagine usando Google Imagen 4 Fast
 */
async function generateWithImagen4(prompt) {
  try {
    console.log('🚀 Generazione immagine con Google Imagen 4 Fast...');
    console.log('🔑 API Key disponibile:', GEMINI_API_KEY ? 'SÌ' : 'NO');
    
    const startTime = Date.now();
    
    // Prova con l'API Gemini (dalla documentazione ufficiale)
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:generateImages';
    
    const requestData = {
      prompt: prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: '1:1',
        sampleImageSize: '1K'
      }
    };
    
    console.log('🌐 Chiamata API Imagen 4 a:', apiUrl);
    console.log('📦 Dati richiesta:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(apiUrl, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GEMINI_API_KEY}`
      },
      timeout: 120000 // 2 minuti di timeout
    });

    const processingTime = Date.now() - startTime;
    console.log('✅ Risposta ricevuta da Imagen 4:', response.status);
    
    if (response.data && response.data.generatedImages && response.data.generatedImages.length > 0) {
      const generatedImage = response.data.generatedImages[0];
      
      // L'immagine dovrebbe essere in formato base64
      const imageBase64 = generatedImage.bytesBase64Encoded;
      const generatedImageUrl = `data:image/png;base64,${imageBase64}`;
      
      // Salva l'immagine generata localmente
      let savedImagePath = null;
      try {
        const timestamp = Date.now();
        const randomId = Math.floor(Math.random() * 1000000000);
        const filename = `imagen4-${timestamp}-${randomId}.png`;
        const filepath = path.join(__dirname, 'generated', filename);
        
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        fs.writeFileSync(filepath, imageBuffer);
        savedImagePath = `/generated/${filename}`;
        console.log('💾 Immagine Imagen 4 salvata:', filename);
      } catch (saveError) {
        console.error('⚠️ Errore salvataggio immagine Imagen 4:', saveError.message);
      }
      
      // Calcola costi per Imagen 4 Fast ($0.02 per immagine)
      const outputCost = 0.02;
      
      console.log('✅ Generazione Imagen 4 Fast completata');
      
      return {
        provider: 'imagen4',
        success: true,
        type: 'image',
        generatedImageUrl: generatedImageUrl,
        savedImagePath: savedImagePath,
        imageUrl: savedImagePath,
        filename: savedImagePath ? savedImagePath.split('/').pop() : null,
        prompt: prompt,
        aiDescription: `Immagine generata con Google Imagen 4 Fast. Risoluzione: 1024x1024px, Aspect Ratio: 1:1. Modello ottimizzato per velocità di generazione con costi ridotti e qualità elevata. Imagen 4 offre generazione rapida con eccellente aderenza al prompt.`,
        cost: {
          input: '0.000',
          output: outputCost.toFixed(3),
          total: outputCost.toFixed(3),
          currency: 'USD',
          breakdown: 'Solo costi di output per Imagen 4 Fast'
        },
        generatedAt: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        imageSpecs: {
          model: "imagen-4.0-fast-generate-001",
          type: "text-to-image",
          quality: "fast",
          resolution: "1024x1024",
          provider: "Google AI (Imagen 4)"
        }
      };
    } else {
      throw new Error('Nessuna immagine generata da Imagen 4 - risposta vuota');
    }
    
  } catch (error) {
    console.error('❌ Errore generale Imagen 4:', error.message);
    
    // Gestisci errori specifici di Imagen 4
    if (error.response?.status === 404) {
      throw new Error('Modello Imagen 4 Fast non disponibile nell\'API Google AI. Il servizio potrebbe essere in anteprima limitata o richiede accesso speciale.');
    } else if (error.response?.status === 401) {
      throw new Error('Chiave API Google non autorizzata per Imagen 4. Verifica la chiave nel file .env');
    } else if (error.response?.status === 429) {
      throw new Error('Limite rate raggiunto per Imagen 4. Riprova più tardi.');
    } else if (error.response?.status === 400) {
      throw new Error(`Richiesta non valida per Imagen 4: ${error.response?.data?.error?.message || 'Parametri non validi'}`);
    } else if (error.response?.status === 403) {
      throw new Error('Accesso negato a Imagen 4. Il modello potrebbe richiedere accesso speciale o non essere disponibile nella tua regione.');
    } else {
      throw new Error(`Imagen 4: ${error.response?.data?.error?.message || error.message}`);
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
  console.log('      POST /api/generate - Genera immagine da prompt (Gemini + OpenAI + Stability + Imagen 4)');
  console.log('   GET  /api/result/:sessionId - Ottieni risultato');
  console.log('   DELETE /api/session/:sessionId - Reset sessione');
  console.log('\n🤖 AI Providers:');
  console.log('   🔮 Gemini 2.5 Flash Image Preview - Generazione immagini AI');
  console.log('   🎨 OpenAI DALL-E 3 - Generazione immagini');
  console.log('   ⚡ Stability AI Stable Diffusion XL - Generazione immagini di alta qualità');
  console.log('   🚀 Google Imagen 4 Fast - Generazione veloce e economica');
});
