# 🎨 Integrazione Stability AI

## 📋 Panoramica

Abbiamo sostituito **Claude Vision** con **Stability AI** per offrire un terzo generatore di immagini AI invece di un analizzatore. Ora l'applicazione supporta tre potenti generatori di immagini:

- 🔮 **Google Gemini** 2.5 Flash Image Preview
- 🎨 **OpenAI DALL-E 3** 
- ⚡ **Stability AI** Stable Diffusion v1.6

## 🔧 Configurazione Tecnica

### API Endpoint
- **URL**: `https://api.stability.ai/v1/generation/stable-diffusion-v1-6/text-to-image`
- **Metodo**: POST
- **Autenticazione**: Bearer Token

### Parametri utilizzati
```javascript
{
  text_prompts: [{ text: prompt, weight: 1 }],
  cfg_scale: 7,
  height: 1024,
  width: 1024,
  samples: 1,
  steps: 30
}
```

## ⚙️ Setup Stability AI

### 1. Ottenere l'API Key
1. Vai su [Stability AI Platform](https://platform.stability.ai/)
2. Crea un account o effettua il login
3. Naviga nella sezione "API Keys"
4. Genera una nuova API key

### 2. Configurazione nel file .env
```bash
STABILITY_API_KEY=your_stability_api_key_here
```

## 💰 Costi Stimati

- **Stability AI**: ~$0.020 per immagine (1024x1024)
- **OpenAI DALL-E 3**: $0.040 per immagine
- **Google Gemini**: ~$0.001 per prompt

## 🎯 Caratteristiche

### Vantaggi di Stability AI
- **Alta qualità**: Stable Diffusion produce immagini molto dettagliate
- **Versatilità**: Ottimo per stili artistici diversi
- **Costo efficiente**: Meno costoso di DALL-E 3
- **Controllo**: Parametri configurabili per personalizzazione

### Parametri Ottimizzati
- **CFG Scale**: 7 (bilanciamento creatività/fedeltà)
- **Steps**: 30 (qualità immagine)
- **Risoluzione**: 1024x1024 (alta definizione)

## 🔄 Cambiamenti nell'Applicazione

### Backend (server.js)
- ✅ Rimossa dipendenza `@anthropic-ai/sdk`
- ✅ Aggiunta configurazione Stability AI
- ✅ Implementata funzione `generateWithStabilityAI()`
- ✅ Aggiornata logica provider da `claude` a `stability`

### Frontend
- ✅ **prompt.html**: Provider selection aggiornata
- ✅ **prompt.js**: Messaggi loader aggiornati
- ✅ **result.js**: Gestione risultati Stability AI
- ✅ **styles.css**: Nuovo stile arancione per Stability AI

### Configurazione
- ✅ **.env**: Sostituita `ANTHROPIC_API_KEY` con `STABILITY_API_KEY`
- ✅ **README.md**: Documentazione aggiornata

## 🎨 Stile UI

### Colori Stability AI
- **Primario**: `#ff6b35` (arancione vibrante)
- **Hover**: `#e55a2e` (arancione scuro)
- **Icona**: ⚡ (fulmine per velocità)

## 📊 Confronto Providers

| Provider | Tipo | Costo | Tempo medio | Qualità |
|----------|------|-------|-------------|---------|
| Gemini | Generazione | ~$0.001 | 3-5s | Buona |
| OpenAI | Generazione | $0.040 | 10-15s | Eccellente |
| Stability AI | Generazione | ~$0.020 | 5-8s | Molto buona |

## 🚀 Come testare

1. **Aggiungi la tua API key** nel file `.env`
2. **Riavvia il server**: `npm start`
3. **Seleziona "Stability AI"** nell'interfaccia
4. **Genera un'immagine** con un prompt
5. **Confronta i risultati** usando "Tutti i provider"

## 🐛 Troubleshooting

### Errore 401 - Unauthorized
- Verifica che `STABILITY_API_KEY` sia corretta nel file `.env`
- Controlla che l'API key sia attiva su Stability AI Platform

### Errore 429 - Rate Limit
- Stability AI ha limiti di rate per account gratuiti
- Aspetta alcuni secondi tra le richieste

### Nessuna immagine generata
- Verifica la connessione internet
- Controlla i log del server per errori dettagliati

## 📚 Risorse Utili

- [Stability AI Documentation](https://platform.stability.ai/docs)
- [Stable Diffusion API Reference](https://platform.stability.ai/docs/api-reference)
- [Pricing Information](https://platform.stability.ai/pricing)

---

**Nota**: Questa integrazione sostituisce completamente Claude Vision, mantenendo lo stesso numero di provider (3) ma focalizzandosi esclusivamente sulla generazione di immagini invece che sull'analisi.
