const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

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

// Configurazione Claude (Anthropic)
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_ENABLED = !!ANTHROPIC_API_KEY; // Abilita solo se la chiave è presente
const anthropic = CLAUDE_ENABLED ? new Anthropic({
  apiKey: ANTHROPIC_API_KEY
}) : null;

if (!CLAUDE_ENABLED) {
    console.warn('⚠️  Anthropic API Key non trovata - Claude disabilitato');
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
    const generatedDir = path.join(__dirname, 'generated');
    
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

    // Analizza con Claude Vision (se richiesto)
    if (provider === 'claude' || provider === 'both') {
      console.log('👁️ Analizzando con Claude Vision...');
      try {
        results.claude = await analyzeWithClaude(prompt, sessionData[sessionId].imagePath);
      } catch (error) {
        console.error('❌ Errore Claude:', error.message);
        results.claude = { error: error.message };
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

// Funzione per analizzare immagine con Claude Vision
async function analyzeWithClaude(prompt, originalImagePath) {
  if (!CLAUDE_ENABLED) {
    throw new Error('Claude non è configurato - API key mancante');
  }

  const startTime = Date.now();
  
  try {
    console.log('👁️ Analisi con Claude Vision...');
    
    // Leggi l'immagine e convertila in base64
    const imagePath = path.join(__dirname, 'uploads', originalImagePath);
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Determina il tipo mime
    const mimeType = originalImagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    // Analizza l'immagine con Claude
    console.log('🔍 Invio richiesta a Claude...');
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64Image
            }
          },
          {
            type: "text",
            text: `Analizza questa immagine e fornisci una descrizione dettagliata. Poi, considerando questo prompt: "${prompt}", fornisci suggerimenti per migliorare la generazione di immagini AI basate su questa foto. Includi dettagli su:
            
1. Descrizione visiva dettagliata
2. Elementi di stile e composizione
3. Suggerimenti per prompt migliorati
4. Aspetti tecnici da considerare

Rispondi in italiano con un formato strutturato.`
          }
        ]
      }]
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ Analisi Claude completata in ${processingTime}ms`);

    return {
      success: true,
      analysis: response.content[0].text,
      processingTime: `${processingTime}ms`,
      modelUsed: "claude-3-5-sonnet-20241022",
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    };
    
  } catch (error) {
    console.error('❌ Errore Claude:', error.message);
    
    // Gestisci diversi tipi di errore Claude
    if (error.status === 401) {
      throw new Error('Chiave API Claude non valida.');
    } else if (error.status === 429) {
      throw new Error('Limite rate Claude raggiunto. Riprova più tardi.');
    } else if (error.status === 400) {
      throw new Error('Richiesta non valida per Claude Vision.');
    } else {
      throw new Error(`Claude Vision: ${error.message}`);
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
  console.log('   POST /api/generate - Genera immagine da prompt (Gemini + OpenAI + Claude)');
  console.log('   GET  /api/result/:sessionId - Ottieni risultato');
  console.log('   DELETE /api/session/:sessionId - Reset sessione');
  console.log('\n🤖 AI Providers:');
  console.log('   🔮 Gemini 2.5 Flash Image Preview - Generazione immagini AI');
  console.log('   🎨 OpenAI DALL-E 3 - Generazione immagini');
  console.log('   👁️ Claude 3.5 Sonnet - Analisi e descrizione immagini');
});
