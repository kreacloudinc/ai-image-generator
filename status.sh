#!/bin/bash

# 📊 AI Image Generator - Script di Status
# Controlla lo stato di tutti i servizi

echo "📊 ===== AI IMAGE GENERATOR STATUS ====="
echo "📅 $(date)"
echo ""

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Funzione per controllare se un processo è attivo
check_process() {
    if pgrep -f "$1" > /dev/null; then
        return 0
    else
        return 1
    fi
}

# Funzione per testare un servizio HTTP
test_http_service() {
    local url=$1
    local name=$2
    
    if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ $name: ONLINE e risponde${NC}"
        return 0
    else
        echo -e "  ${RED}❌ $name: OFFLINE o non risponde${NC}"
        return 1
    fi
}

echo -e "${BLUE}🔍 CONTROLLO PROCESSI${NC}"

# Controllo Server Node.js
if check_process "node.*server.js"; then
    NODE_PID=$(pgrep -f "node.*server.js")
    echo -e "${GREEN}✅ Server Node.js: ATTIVO (PID: $NODE_PID)${NC}"
    NODE_RUNNING=true
else
    echo -e "${RED}❌ Server Node.js: NON ATTIVO${NC}"
    NODE_RUNNING=false
fi

# Controllo ComfyUI
if check_process "python.*main.py"; then
    COMFY_PID=$(pgrep -f "python.*main.py")
    echo -e "${GREEN}✅ ComfyUI: ATTIVO (PID: $COMFY_PID)${NC}"
    COMFY_RUNNING=true
else
    echo -e "${RED}❌ ComfyUI: NON ATTIVO${NC}"
    COMFY_RUNNING=false
fi

echo ""
echo -e "${BLUE}🌐 CONTROLLO SERVIZI WEB${NC}"

# Test servizi HTTP
test_http_service "http://localhost:3008" "Server Node.js (port 3008)"
test_http_service "http://127.0.0.1:8188/history" "ComfyUI API (port 8188)"

echo ""
echo -e "${BLUE}💾 CONTROLLO RISORSE${NC}"

# Memoria utilizzata
if [ "$NODE_RUNNING" = true ]; then
    NODE_MEM=$(ps -o rss= -p $NODE_PID 2>/dev/null | awk '{print int($1/1024)}')
    echo -e "  📊 Server Node.js: ${NODE_MEM}MB RAM"
fi

if [ "$COMFY_RUNNING" = true ]; then
    COMFY_MEM=$(ps -o rss= -p $COMFY_PID 2>/dev/null | awk '{print int($1/1024)}')
    echo -e "  📊 ComfyUI: ${COMFY_MEM}MB RAM"
fi

# Spazio disco
DISK_USAGE=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $5}')
echo -e "  💽 Spazio disco utilizzato: $DISK_USAGE"

# Controllo modello SDXL
SDXL_MODEL="$PROJECT_DIR/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors"
if [ -f "$SDXL_MODEL" ]; then
    SDXL_SIZE=$(ls -lah "$SDXL_MODEL" | awk '{print $5}')
    echo -e "  🎨 Modello SDXL: ${GREEN}✅ Presente ($SDXL_SIZE)${NC}"
else
    echo -e "  🎨 Modello SDXL: ${RED}❌ Non trovato${NC}"
fi

echo ""
echo -e "${BLUE}📋 CONTROLLO IMMAGINI GENERATE${NC}"

# Conteggio immagini generate
GENERATED_COUNT=$(find "$PROJECT_DIR/generated" -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
echo -e "  🖼️  Immagini totali generate: $GENERATED_COUNT"

# Ultime immagini per provider
for provider in "openai" "gemini" "stability" "comfyui"; do
    LATEST=$(find "$PROJECT_DIR/generated" -name "${provider}-*.png" 2>/dev/null | sort | tail -1)
    if [ -n "$LATEST" ]; then
        FILENAME=$(basename "$LATEST")
        echo -e "  📸 Ultima $provider: $FILENAME"
    fi
done

echo ""
echo -e "${BLUE}📝 LOG FILES${NC}"

# Controllo log files
if [ -f "$PROJECT_DIR/logs/server.log" ]; then
    SERVER_LOG_SIZE=$(wc -l < "$PROJECT_DIR/logs/server.log" 2>/dev/null || echo "0")
    echo -e "  📄 Server log: $SERVER_LOG_SIZE righe"
else
    echo -e "  📄 Server log: ${YELLOW}Non presente${NC}"
fi

if [ -f "$PROJECT_DIR/ComfyUI/logs/comfyui.log" ]; then
    COMFY_LOG_SIZE=$(wc -l < "$PROJECT_DIR/ComfyUI/logs/comfyui.log" 2>/dev/null || echo "0")
    echo -e "  📄 ComfyUI log: $COMFY_LOG_SIZE righe"
else
    echo -e "  📄 ComfyUI log: ${YELLOW}Non presente${NC}"
fi

echo ""

# Riepilogo finale
if [ "$NODE_RUNNING" = true ] && [ "$COMFY_RUNNING" = true ]; then
    echo -e "${GREEN}🎉 TUTTI I SERVIZI SONO ATTIVI E FUNZIONANTI!${NC}"
    echo -e "${BLUE}🌐 Frontend disponibile su: http://localhost:3008${NC}"
    echo ""
    echo -e "${BLUE}💡 COMANDI UTILI:${NC}"
    echo "  • Fermare tutto: ./stop.sh"
    echo "  • Log in tempo reale:"
    echo "    - Server: tail -f logs/server.log"
    echo "    - ComfyUI: tail -f ComfyUI/logs/comfyui.log"
    echo "  • Restart: ./stop.sh && ./start.sh"
elif [ "$NODE_RUNNING" = true ] || [ "$COMFY_RUNNING" = true ]; then
    echo -e "${YELLOW}⚠️  ALCUNI SERVIZI NON SONO ATTIVI${NC}"
    echo -e "${BLUE}💡 Per avviare tutto: ./start.sh${NC}"
else
    echo -e "${RED}❌ NESSUN SERVIZIO ATTIVO${NC}"
    echo -e "${BLUE}💡 Per avviare tutto: ./start.sh${NC}"
fi
