# Wedding AI - Generatore di Look da Sposo/Sposa 🤵👰

Applicazione per generare immagini creative di spose e sposi utilizzando l'intelligenza artificiale.

## 🌟 Caratteristiche

- **Scelta del Ruolo**: Seleziona tra Sposo o Sposa
- **Cattura Foto**: Utilizza la webcam per scattare una foto
- **Selezione Stili**: Scegli tra oltre 12 stili diversi per personalizzare il tuo look
- **Generazione AI**: L'intelligenza artificiale crea un'immagine preservando perfettamente il tuo volto
- **Invio Email**: Invia il risultato via email utilizzando Brevo
- **Interfaccia Animata**: Grafica dinamica e attraente con animazioni fluide

## 🚀 Come Utilizzare

1. Apri il browser e vai su `http://localhost:3000/sposi.html`
2. Scegli se sei uno **Sposo** o una **Sposa**
3. Scatta una foto con la webcam
4. Seleziona uno o più stili che ti rappresentano
5. Clicca su "Genera il tuo look!"
6. Visualizza il risultato e invialo via email

## 🎨 Stili Disponibili

### Per Sposi:
- 🎩 Classico
- 💼 Moderno
- 👔 Elegante
- 🌿 Bohémien
- 🕰️ Vintage
- 👕 Casual Chic
- 🎖️ Formale
- 🎨 Artistico
- 🌊 Mediterraneo
- ⭐ Sofisticato
- 🌾 Rustico
- 🎸 Rock Star

### Per Spose:
- 👑 Principessa
- 💕 Romantica
- ✨ Moderna
- 🌸 Bohémien
- 💎 Vintage
- 🤍 Elegante Minimale
- 💃 Glamour
- 🌿 Naturale
- 🦋 Fiabesca
- 🌹 Sensuale
- ☀️ Mediterranea
- 👗 Haute Couture

## 🔧 Tecnologie Utilizzate

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Node.js, Express
- **AI**: Google Gemini 2.0 Flash (Image Generation)
- **Email**: Brevo API
- **Webcam**: MediaDevices API

## ⚙️ Configurazione

### Variabili d'Ambiente

Assicurati di avere queste variabili nel file `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
BREVO_API_KEY=your_brevo_api_key (opzionale)
BREVO_SENDER_EMAIL=noreply@weddingai.com (opzionale)
BASE_URL=http://localhost:3000 (opzionale)
```

### Installazione

```bash
# Installa le dipendenze (se non già fatto)
npm install

# Avvia il server
npm start
```

## 📁 File Principali

- `sposi.html` - Pagina principale dell'applicazione
- `sposi.js` - Logica JavaScript per gestire il flusso
- `sposi-styles.css` - Stili e animazioni
- `server.js` - Endpoints API (aggiunti `/api/generate-wedding-look` e `/api/send-wedding-email`)

## 🎯 Endpoint API

### POST `/api/generate-wedding-look`
Genera un'immagine wedding look con AI

**Body:**
```json
{
  "role": "sposo|sposa",
  "styles": ["classico", "moderno", ...],
  "photo": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "/generated/wedding-sposo-123456.jpg",
  "originalImagePath": "/uploads/wedding-original-123456.jpg",
  "role": "sposo",
  "styles": ["classico", "moderno"],
  "processingTime": "5432ms"
}
```

### POST `/api/send-wedding-email`
Invia l'immagine generata via email

**Body:**
```json
{
  "email": "user@example.com",
  "imageUrl": "/generated/wedding-sposo-123456.jpg",
  "role": "sposo",
  "styles": ["classico", "moderno"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email inviata con successo",
  "email": "user@example.com",
  "messageId": "..."
}
```

## 🎨 Animazioni e Design

L'applicazione include:
- Sfondo animato con cuori fluttuanti
- Transizioni fluide tra le pagine
- Effetti hover sui pulsanti
- Gradient text animato
- Loading spinner durante la generazione
- Design responsive per mobile

## 📝 Note

- L'applicazione richiede accesso alla webcam
- Le immagini generate vengono salvate nella cartella `generated/`
- Le foto originali vengono salvate nella cartella `uploads/`
- Se Brevo non è configurato, l'invio email verrà simulato

## 🐛 Troubleshooting

- **Webcam non funziona**: Verifica di aver dato i permessi nel browser
- **Generazione lenta**: La generazione AI può richiedere alcuni secondi
- **Email non inviata**: Verifica le credenziali Brevo nel file `.env`

## 📄 Licenza

Questo progetto è parte del sistema AI Image Generator.

---

Creato con ❤️ usando AI
