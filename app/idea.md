# Webapp: Generatore di Immagini da Prompt

## Struttura del progetto

- **Backend**: Node.js + Express
  - Entry point: `server.js`
  - Cartella `uploads/` per immagini caricate
- **Frontend**: HTML + JavaScript
  - Cartella `public/` per file statici

---

## Funzionalità

### Pagina 1: Upload immagine
- Bottone per caricare un file immagine
- Dopo l'upload, l'immagine viene salvata in `uploads/` sul server
- Redirect alla pagina di conferma

### Pagina 2: Conferma immagine
- Mostra l’immagine caricata
- Bottoni: “Accetta” (prosegue) e “Riprova” (torna all’upload)

### Pagina 3: Scrivi il prompt
- Campo testo per inserire un prompt descrittivo
- Bottone “Genera immagine”

### Pagina 4: Visualizza risultato
- Il backend invia immagine e prompt a `generateImage(prompt, image)` (mock o API reale)
- Mostra l’immagine risultante
- Stima il numero di token usati e mostra il costo (es. $0.04)
- Bottone “Ricomincia” (torna all’upload)

---

## Extra
- Tutte le immagini caricate vengono salvate in `uploads/`
- Codice commentato per chiarezza
- Stima token/costo calcolata in base alla lunghezza del prompt

---

## File e cartelle
- `server.js` (Express backend)
- `public/`
  - `index.html` (pagina upload)
  - `confirm.html` (pagina conferma)
  - `prompt.html` (pagina prompt)
  - `result.html` (pagina risultato)
  - `main.js` (logica frontend)
- `uploads/` (immagini caricate)

---

## Flusso utente
1. Carica immagine → 2. Conferma → 3. Scrivi prompt → 4. Visualizza risultato → Ricomincia

---

## API principali
- `POST /upload` – upload immagine
- `GET /image/:id` – recupera immagine
- `POST /generate` – genera immagine da prompt e immagine

---

## Mock funzione generazione
```js
// server.js
function generateImage(prompt, imagePath) {
  // Simula generazione immagine
  // Restituisce path di una immagine mock
  return '/public/mock_result.jpg';
}
```

---

## Stima token/costo
- Token stimati: `Math.ceil(prompt.length / 4)`
- Costo: `$0.04` (fisso o calcolato)

---

## Note
- Tutto il codice sarà commentato per facilitarne la lettura.
- La webapp sarà semplice, chiara e facilmente estendibile.


AIzaSyDuWL0qSMP-JFrSqPFDAMxp6EUEEhxhHPU api

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent" \
  -H 'Content-Type: application/json' \
  -H 'X-goog-api-key: GEMINI_API_KEY' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'
