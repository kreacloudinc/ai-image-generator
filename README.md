# 🚀 AI Image Generator

Un'applicazione web completa per la generazione di immagini AI che utilizza **Gemini 2.5 Flash Image Preview** e **OpenAI DALL-E 3** per trasformare le tue foto in capolavori artistici.

## ✨ Caratteristiche principali

- 🎨 **Dual AI Provider**: Confronta risultati tra Gemini e OpenAI
- 📸 **Upload flessibile**: Carica nuove immagini o scegli da quelle esistenti  
- 🎯 **Prompt predefiniti**: 3 stili professionali pronti all'uso
- 💰 **Analisi costi**: Confronto dettagliato dei costi per provider
- ⚡ **Interfaccia moderna**: Design responsive e user-friendly
- 🔄 **Risultati in tempo reale**: Generazione simultanea con entrambi i provider

## 🛠️ Tecnologie utilizzate

### Backend
- **Node.js** + **Express.js**
- **Google Generative AI** (Gemini 2.5 Flash Image Preview)
- **OpenAI API** (DALL-E 3)
- **Multer** per gestione upload file

### Frontend  
- **HTML5** + **CSS3** + **JavaScript**
- **Responsive Design**
- **Session Storage** per gestione stato

## 🚀 Installazione e Setup

### Prerequisiti
- Node.js (v14 o superiore)
- Chiave API Google Gemini
- Chiave API OpenAI

### 1. Clona il repository
\`\`\`bash
git clone https://github.com/tuousername/ai-image-generator.git
cd ai-image-generator
\`\`\`

### 2. Installa le dipendenze
\`\`\`bash
npm install
\`\`\`

### 3. Configura le API Keys
Modifica il file \`server.js\` alle righe 12-17:

\`\`\`javascript
// Configurazione Google Gemini
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';

// Configurazione OpenAI  
const OPENAI_API_KEY = 'YOUR_OPENAI_API_KEY';
\`\`\`

### 4. Avvia l'applicazione
\`\`\`bash
npm start
# oppure
node server.js
\`\`\`

### 5. Apri nel browser
Vai su: **http://localhost:3000**

## 🎯 Come utilizzare

### 1. **Upload/Selezione Immagine**
- 📤 Carica una nuova immagine (JPG, PNG, GIF - max 5MB)
- 🖼️ Oppure scegli da quelle già caricate

### 2. **Selezione Provider**
- 🔮 **Solo Gemini**: Usa Gemini 2.5 Flash Image Preview
- 🎨 **Solo OpenAI**: Usa DALL-E 3  
- 🔄 **Entrambi**: Confronta i risultati

### 3. **Prompt Creativi**
Scegli tra 3 stili predefiniti:
- 🏎️ **The Racer**: Pilota futuristico con tuta da corsa hi-tech
- ✈️ **The Pilot**: Aviatore vintage con atmosfera cinematografica
- 🔮 **The Futurist**: Ritratto cyberpunk con elementi AR

### 4. **Risultati e Confronto**
- 📊 Visualizza immagini generate da entrambi i provider
- 💰 Confronta costi di generazione
- ⏱️ Analizza tempi di processamento
- 📈 Valuta qualità e stile

## 💰 Costi AI Provider

### Gemini 2.5 Flash Image Preview
- **Input**: $0.30 per input
- **Output (immagine)**: $0.039 per immagine  
- **Output (testo)**: $2.50 per 1000 token

### OpenAI DALL-E 3
- **Standard 1024x1024**: $0.040 per immagine

## 📁 Struttura del progetto

\`\`\`
ai-image-generator/
├── server.js              # Server Express con API
├── package.json            # Dipendenze e script
├── public/                 # Frontend files
│   ├── index.html         # Homepage upload/selezione
│   ├── prompt.html        # Pagina input prompt
│   ├── result.html        # Pagina risultati
│   ├── styles.css         # Styling completo
│   ├── upload.js          # Logica upload/selezione
│   ├── prompt.js          # Gestione prompt e provider
│   └── result.js          # Visualizzazione risultati
├── uploads/               # Directory immagini caricate
└── README.md              # Documentazione
\`\`\`

## 🔧 API Endpoints

- \`POST /api/upload\` - Upload nuova immagine
- \`GET /api/images\` - Lista immagini esistenti  
- \`POST /api/select-image\` - Seleziona immagine esistente
- \`GET /api/image/:sessionId\` - Ottieni dati immagine
- \`POST /api/generate\` - Genera con AI (Gemini + OpenAI)
- \`GET /api/result/:sessionId\` - Ottieni risultati
- \`DELETE /api/session/:sessionId\` - Reset sessione

## 🎨 Esempi di trasformazione

L'applicazione può trasformare qualsiasi ritratto in:
- 🏎️ Pilota da corsa futuristico con tuta hi-tech
- ✈️ Aviatore vintage con atmosfera cinematografica  
- 🔮 Personaggio cyberpunk con elementi AR
- 🎭 Qualsiasi stile personalizzato tramite prompt

## 🔐 Sicurezza

- ✅ API Keys non incluse nel repository
- ✅ Uploads esclusi da git per privacy
- ✅ Validazione input lato server
- ✅ Gestione errori completa

## 🤝 Contribuire

1. Fork il progetto
2. Crea un branch per la feature (\`git checkout -b feature/AmazingFeature\`)
3. Commit le modifiche (\`git commit -m 'Add some AmazingFeature'\`)
4. Push al branch (\`git push origin feature/AmazingFeature\`)
5. Apri una Pull Request

## 📝 Licenza

Questo progetto è distribuito sotto licenza MIT. Vedi \`LICENSE\` per maggiori informazioni.

## 👨‍💻 Autore

**Luca Milano** - Developer

## 🙏 Ringraziamenti

- Google per l'API Gemini 2.5 Flash Image Preview
- OpenAI per l'API DALL-E 3
- La community open source per le librerie utilizzate

---

⭐ **Se ti piace questo progetto, lascia una stella!** ⭐
