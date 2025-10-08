# 🚀 Quick Start - Wedding AI

## Avvio Rapido

1. **Assicurati di avere la chiave API di Gemini**
   ```bash
   # Nel file .env, aggiungi:
   GEMINI_API_KEY=your_gemini_api_key
   ```

2. **Avvia il server**
   ```bash
   cd app
   npm start
   ```

3. **Apri l'applicazione**
   ```
   http://localhost:3000/sposi.html
   ```

## 🎯 Test dell'Applicazione

### Flusso Completo:

1. **Pagina di Benvenuto**
   - Clicca su "Sposo" 🤵 o "Sposa" 👰

2. **Cattura Foto**
   - Clicca "Avvia Fotocamera"
   - Scatta una foto
   - Conferma la foto

3. **Seleziona Stili**
   - Scegli uno o più stili (min. 1, max illimitato)
   - Esempi: Classico, Moderno, Vintage, Romantica, Glamour, etc.

4. **Genera Immagine**
   - Clicca "Genera il tuo look!"
   - Attendi la generazione (5-15 secondi)
   - Visualizza il risultato

5. **Invia Email** (opzionale)
   - Inserisci un indirizzo email
   - Clicca "Invia Email"
   - Ricevi l'immagine via email

## 📧 Configurazione Email (Opzionale)

Per abilitare l'invio email con Brevo:

```bash
# Aggiungi nel file .env:
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=noreply@yourdomain.com
```

Senza Brevo configurato, l'invio email verrà simulato (utile per testing).

## 🎨 Personalizzazioni

### Modificare gli Stili

Modifica il file `public/sposi.html` nelle sezioni:
- `#sposoStyles` per gli stili sposo
- `#sposaStyles` per gli stili sposa

### Modificare il Design

Modifica `public/sposi-styles.css`:
- Variabili CSS in `:root` per colori
- Animazioni nelle sezioni `@keyframes`

### Modificare il Prompt AI

Modifica `server.js` nella funzione `/api/generate-wedding-look`:
- Cerca la variabile `prompt`
- Personalizza le istruzioni per l'AI

## 🐛 Problemi Comuni

### La webcam non si avvia
- Verifica i permessi del browser
- Usa HTTPS o localhost
- Controlla la console del browser

### L'immagine non si genera
- Verifica la chiave API Gemini
- Controlla i log del server
- Verifica la connessione internet

### L'email non viene inviata
- Verifica la configurazione Brevo
- Controlla i log del server
- Verifica l'indirizzo email destinatario

## 📁 Struttura File

```
app/
├── public/
│   ├── sposi.html          # Pagina principale
│   ├── sposi.js            # Logica JavaScript
│   └── sposi-styles.css    # Stili e animazioni
├── server.js               # Server con endpoint API
├── uploads/                # Foto originali
├── generated/              # Immagini generate
└── WEDDING_AI_README.md    # Documentazione completa
```

## 🎯 Testare gli Endpoint

### Test Generazione Immagine

```bash
curl -X POST http://localhost:3000/api/generate-wedding-look \
  -H "Content-Type: application/json" \
  -d '{
    "role": "sposo",
    "styles": ["classico", "elegante"],
    "photo": "data:image/jpeg;base64,/9j/4AAQ..."
  }'
```

### Test Invio Email

```bash
curl -X POST http://localhost:3000/api/send-wedding-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "imageUrl": "/generated/wedding-sposo-123456.jpg",
    "role": "sposo",
    "styles": ["classico"]
  }'
```

## 📊 Performance

- **Tempo di generazione**: 5-15 secondi
- **Dimensione immagine**: ~500KB - 2MB
- **Formato supportato**: JPEG
- **Risoluzione**: Alta qualità (determinata da Gemini)

## 🔒 Sicurezza

- Non salvare foto sensibili in produzione
- Implementa rate limiting
- Valida sempre gli input
- Usa HTTPS in produzione
- Proteggi le chiavi API

---

**Buon divertimento con Wedding AI!** 🤵👰✨
