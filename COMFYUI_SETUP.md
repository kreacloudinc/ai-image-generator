# ComfyUI Setup per Stable Diffusion 3.5 Large Turbo

## Installazione ComfyUI

1. **Clona ComfyUI:**
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

2. **Installa dipendenze:**
```bash
pip install -r requirements.txt
```

3. **Scarica il modello SD 3.5 Large Turbo GGUF:**
```bash
# Crea cartella modelli se non esiste
mkdir -p models/checkpoints

# Scarica il modello (circa 8GB)
wget https://huggingface.co/city96/SD3.5-Large-Turbo-GGUF/resolve/main/sd3.5_large_turbo-Q4_0.gguf \
     -O models/checkpoints/sd3.5_large_turbo-Q4_0.gguf
```

## Avvio ComfyUI

```bash
python main.py --listen 127.0.0.1 --port 8188
```

## Verifica Installazione

1. Apri il browser su `http://127.0.0.1:8188`
2. Verifica che il modello `sd3.5_large_turbo-Q4_0.gguf` sia disponibile nel menu dei checkpoint
3. L'API sarà disponibile per il nostro server Node.js

## Caratteristiche del Modello

- **Modello:** Stable Diffusion 3.5 Large Turbo
- **Formato:** GGUF (ottimizzato per velocità)
- **Risoluzione:** 1024x1024
- **Velocità:** Ultra-veloce (25 steps)
- **Supporto:** Text-to-Image e Image-to-Image
- **Costi:** Gratuito (locale)

## Integrazione nel Progetto

Il nostro server Node.js si connette automaticamente a ComfyUI tramite:
- URL: `http://127.0.0.1:8188` (configurabile in .env)
- API REST per workflow submission
- Polling per controllo completamento
- Download automatico immagini generate

## Workflow Supportati

1. **Text-to-Image:** Solo prompt testuale
2. **Image-to-Image:** Trasformazione di immagini esistenti con prompt
3. **Parametri ottimizzati:** 25 steps, CFG 7.5, Euler sampler

## Troubleshooting

- Assicurati che ComfyUI sia in esecuzione prima di testare
- Verifica che il modello sia correttamente scaricato
- Controlla i log di ComfyUI per eventuali errori
- Il primo caricamento del modello può richiedere alcuni minuti
