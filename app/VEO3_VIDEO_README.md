# 🎥 Wedding AI - Integrazione Veo 3 Video Generation

## Panoramica

Questa funzionalità aggiunge la capacità di generare video cinematici dal look generato utilizzando **Google Veo 3**, il modello di generazione video AI di Google.

## 🌟 Caratteristiche

- **Generazione Video AI**: Trasforma l'immagine statica in un video dinamico
- **Veo 3 Integration**: Utilizza il modello di generazione video più avanzato di Google
- **Video Cinematico**: 5 secondi di video di alta qualità con movimento fluido
- **Formato Ottimizzato**: Video in 9:16 (verticale) per social media

## 🎬 Come Funziona

1. Dopo aver generato il tuo look da sposo/sposa
2. Apparirà un bottone "🎥 Genera Video con Veo 3"
3. Clicca sul bottone per avviare la generazione
4. Attendi 1-2 minuti per la generazione del video
5. Visualizza e scarica il video generato

## 🔧 Configurazione

### Stato Attuale

⚠️ **IMPORTANTE**: L'API Veo 3 è attualmente in **preview limitata** e richiede accesso speciale da Google Cloud.

### Abilitare Veo 3 (quando disponibile)

1. **Richiedi accesso a Veo 3**:
   - Visita: https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview
   - Compila il modulo di richiesta per l'accesso anticipato
   - Attendi l'approvazione da Google

2. **Configura il progetto Google Cloud**:
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Abilita l'API nel codice**:
   
   Nel file `server.js`, trova questa linea:
   ```javascript
   const VEO_API_AVAILABLE = false;
   ```
   
   Cambiala in:
   ```javascript
   const VEO_API_AVAILABLE = true;
   ```

4. **Decommentare il codice Veo 3**:
   
   Nel file `server.js`, trova il blocco commentato e decommentalo:
   ```javascript
   // Quando Veo 3 sarà disponibile, usa questo codice:
   /*
   console.log('🎬 Invio richiesta a Veo 3...');
   ...
   */
   ```

## 📋 Endpoint API

### POST `/api/generate-wedding-video`

Genera un video cinematico dal look generato.

**Body:**
```json
{
  "imageUrl": "/generated/wedding-sposo-123456.jpg",
  "role": "sposo|sposa",
  "styles": ["classico", "romantica", ...]
}
```

**Response (successo):**
```json
{
  "success": true,
  "videoUrl": "/generated/wedding-video-sposo-123456.mp4",
  "duration": 5,
  "processingTime": "87234ms"
}
```

**Response (API non disponibile):**
```json
{
  "error": "Generazione video temporaneamente non disponibile",
  "details": "L'API Veo 3 è attualmente in preview limitata..."
}
```

## 🎨 Parametri Video

Quando Veo 3 sarà abilitato, il video avrà le seguenti caratteristiche:

- **Durata**: 5 secondi
- **Aspect Ratio**: 9:16 (verticale per TikTok/Instagram/Reels)
- **FPS**: 24 frame per secondo
- **Risoluzione**: 4K
- **Stile**: Cinematico, professionale, elegante

## 💡 Prompt Engineering

Il prompt generato per Veo 3 include:

```
A cinematic video of a [groom/bride] in an elegant wedding outfit.
The [groom/bride] is turning slowly, showing the beautiful [styles] style wedding attire.
Soft wind gently moves the fabric.
Professional wedding videography, smooth camera movement, elegant atmosphere, soft lighting.
High quality, 4K resolution, romantic mood.
```

## 🚀 Roadmap Futuro

Quando Veo 3 sarà disponibile, pianifichiamo di aggiungere:

- [ ] Durata video personalizzabile (3-10 secondi)
- [ ] Scelta formato (9:16, 16:9, 1:1)
- [ ] Effetti transizione personalizzati
- [ ] Musica di sottofondo generata con AI
- [ ] Esportazione in diversi formati (MP4, WebM, GIF)
- [ ] Condivisione diretta su social media

## 📊 Costi Stimati

**Nota**: I prezzi di Veo 3 non sono ancora pubblici. Stime basate su modelli simili:

- ~$0.50 - $2.00 per video di 5 secondi
- Il costo varia in base a risoluzione e durata

## 🐛 Troubleshooting

### Il bottone video non appare
- Verifica di aver generato prima un'immagine
- Controlla che `videoSection` sia visibile

### Errore "API non disponibile"
- Normale! Veo 3 è in preview limitata
- Richiedi l'accesso a Google Cloud

### Video non si genera
- Verifica la chiave API Gemini
- Controlla i log del server
- Assicurati che `VEO_API_AVAILABLE = true`

## 📚 Risorse

- [Veo 3 Documentation](https://cloud.google.com/vertex-ai/generative-ai/docs/video/overview)
- [Google AI Studio](https://aistudio.google.com/)
- [Vertex AI Pricing](https://cloud.google.com/vertex-ai/pricing)

## 📝 Note di Implementazione

L'integrazione è stata progettata per essere:

1. **Modulare**: Facile da abilitare/disabilitare
2. **Scalabile**: Pronta per l'uso in produzione
3. **User-Friendly**: Interfaccia intuitiva
4. **Future-Proof**: Pronta per quando Veo 3 sarà disponibile

---

**Stato**: 🟡 In Attesa di Accesso API Veo 3

Ultimo aggiornamento: 8 Ottobre 2025
