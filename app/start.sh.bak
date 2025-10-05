#!/bin/bash

# 🚀 AI Image Generator - Script di Avvio Completo
# Avvia ComfyUI + Node.js Server e verifica che tutto funzioni

echo "🎨 ===== AI IMAGE GENERATOR STARTUP ====="
echo "📅 $(date)"
echo ""

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Directory del progetto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMFYUI_DIR="$PROJECT_DIR/ComfyUI"

echo -e "${BLUE}📁 Directory progetto: $PROJECT_DIR${NC}"
echo ""

# Funzione per controllare se un processo è attivo
check_process() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Funzione per aspettare che un servizio sia pronto
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo -e "${YELLOW}⏳ Aspettando che $name sia pronto...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $name è pronto!${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $name non è riuscito ad avviarsi entro 60 secondi${NC}"
    return 1
}

# 1. Verifica prerequisiti
echo -e "${BLUE}🔍 VERIFICA PREREQUISITI${NC}"

# Controlla se siamo nella directory giusta
if [ ! -f "$PROJECT_DIR/package.json" ]; then
    echo -e "${RED}❌ package.json non trovato. Eseguire dalla directory del progetto.${NC}"
    exit 1
fi

if [ ! -d "$COMFYUI_DIR" ]; then
    echo -e "${RED}❌ Directory ComfyUI non trovata in: $COMFYUI_DIR${NC}"
    exit 1
fi

# Controlla Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non installato${NC}"
    exit 1
fi

# Controlla Python
if ! command -v python &> /dev/null; then
    echo -e "${RED}❌ Python non installato${NC}"
    exit 1
fi

# Controlla modello SDXL
SDXL_MODEL="$COMFYUI_DIR/models/checkpoints/sd_xl_base_1.0.safetensors"
if [ ! -f "$SDXL_MODEL" ]; then
    echo -e "${RED}❌ Modello SDXL non trovato: $SDXL_MODEL${NC}"
    echo -e "${YELLOW}💡 Scaricare il modello SDXL Base 1.0 in ComfyUI/models/checkpoints/${NC}"
    exit 1
fi

# Controlla file .env
if [ ! -f "$PROJECT_DIR/.env" ]; then
    echo -e "${RED}❌ File .env non trovato${NC}"
    echo -e "${YELLOW}💡 Creare il file .env con le API keys${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tutti i prerequisiti sono soddisfatti${NC}"
echo ""

# 2. Ferma processi esistenti
echo -e "${BLUE}🛑 PULIZIA PROCESSI ESISTENTI${NC}"

if check_process "node.*server.js"; then
    echo -e "${YELLOW}🔄 Fermando server Node.js esistente...${NC}"
    pkill -f "node.*server.js" 2>/dev/null || true
    sleep 2
fi

if check_process "python.*main.py"; then
    echo -e "${YELLOW}🔄 Fermando ComfyUI esistente...${NC}"
    pkill -f "python.*main.py" 2>/dev/null || true
    sleep 3
fi

echo -e "${GREEN}✅ Pulizia completata${NC}"
echo ""

# 3. Avvia ComfyUI
echo -e "${BLUE}🎨 AVVIO COMFYUI${NC}"

cd "$COMFYUI_DIR"

# Crea directory di log se non esiste
mkdir -p logs

# Avvia ComfyUI in background
echo -e "${YELLOW}🚀 Avviando ComfyUI sulla porta 8188...${NC}"
nohup python main.py --listen 127.0.0.1 --port 8188 > logs/comfyui.log 2>&1 &
COMFYUI_PID=$!

echo -e "${GREEN}✅ ComfyUI avviato (PID: $COMFYUI_PID)${NC}"

# Aspetta che ComfyUI sia pronto
if ! wait_for_service "http://127.0.0.1:8188/history" "ComfyUI"; then
    echo -e "${RED}❌ ComfyUI non si è avviato correttamente${NC}"
    echo -e "${YELLOW}📋 Log ComfyUI:${NC}"
    tail -n 20 logs/comfyui.log
    exit 1
fi

echo ""

# 4. Installa dipendenze Node.js se necessario
echo -e "${BLUE}📦 VERIFICA DIPENDENZE NODE.JS${NC}"

cd "$PROJECT_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📥 Installando dipendenze Node.js...${NC}"
    npm install
    echo -e "${GREEN}✅ Dipendenze installate${NC}"
else
    echo -e "${GREEN}✅ Dipendenze già presenti${NC}"
fi

echo ""

# 5. Avvia server Node.js
echo -e "${BLUE}🚀 AVVIO SERVER NODE.JS${NC}"

echo -e "${YELLOW}🚀 Avviando server Node.js sulla porta 3008...${NC}"
nohup node server.js > logs/server.log 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}✅ Server Node.js avviato (PID: $SERVER_PID)${NC}"

# Aspetta che il server sia pronto
if ! wait_for_service "http://localhost:3008" "Server Node.js"; then
    echo -e "${RED}❌ Server Node.js non si è avviato correttamente${NC}"
    echo -e "${YELLOW}📋 Log Server:${NC}"
    tail -n 20 logs/server.log
    exit 1
fi

echo ""

# 6. Test di funzionamento
echo -e "${BLUE}🧪 TEST DI FUNZIONAMENTO${NC}"

# Test ComfyUI
echo -e "${YELLOW}🔍 Testing ComfyUI API...${NC}"
if curl -s "http://127.0.0.1:8188/object_info" | grep -q "CheckpointLoaderSimple"; then
    echo -e "${GREEN}✅ ComfyUI API risponde correttamente${NC}"
else
    echo -e "${RED}❌ ComfyUI API non risponde${NC}"
fi

# Test Server Node.js
echo -e "${YELLOW}🔍 Testing Server Node.js...${NC}"
if curl -s "http://localhost:3008/api/images" | grep -q "images"; then
    echo -e "${GREEN}✅ Server Node.js API risponde correttamente${NC}"
else
    echo -e "${RED}❌ Server Node.js API non risponde${NC}"
fi

echo ""

# 7. Riepilogo finale
echo -e "${BLUE}📋 RIEPILOGO AVVIO${NC}"
echo -e "${GREEN}✅ ComfyUI:${NC} http://127.0.0.1:8188 (PID: $COMFYUI_PID)"
echo -e "${GREEN}✅ Server Node.js:${NC} http://localhost:3008 (PID: $SERVER_PID)"
echo -e "${GREEN}✅ Frontend Web:${NC} http://localhost:3008"
echo ""

# Salva PID per script di stop
echo "$COMFYUI_PID" > "$PROJECT_DIR/.comfyui.pid"
echo "$SERVER_PID" > "$PROJECT_DIR/.server.pid"

echo -e "${BLUE}💡 COMANDI UTILI:${NC}"
echo "  • Fermare tutto: ./stop.sh"
echo "  • Log ComfyUI: tail -f logs/comfyui.log"
echo "  • Log Server: tail -f logs/server.log"
echo "  • Status: ./status.sh"
echo ""

echo -e "${GREEN}🎉 TUTTI I SERVIZI SONO ATTIVI E FUNZIONANTI!${NC}"
echo -e "${BLUE}🌐 Apri il browser su: http://localhost:3008${NC}"

# Opzionalmente apri il browser
if command -v open &> /dev/null; then
    echo ""
    read -p "Aprire automaticamente il browser? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open "http://localhost:3008"
    fi
fi
