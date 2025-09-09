#!/bin/bash

# 🛑 AI Image Generator - Script di Stop
# Ferma tutti i servizi (ComfyUI + Node.js Server)

echo "🛑 ===== AI IMAGE GENERATOR STOP ====="
echo "📅 $(date)"
echo ""

# Colori per output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

echo -e "${BLUE}🛑 FERMANDO TUTTI I SERVIZI${NC}"

# Ferma usando i PID salvati se disponibili
if [ -f "$PROJECT_DIR/.server.pid" ]; then
    SERVER_PID=$(cat "$PROJECT_DIR/.server.pid")
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo -e "${YELLOW}🔄 Fermando Server Node.js (PID: $SERVER_PID)...${NC}"
        kill "$SERVER_PID" 2>/dev/null || true
        sleep 2
        if kill -0 "$SERVER_PID" 2>/dev/null; then
            echo -e "${YELLOW}💀 Force killing Server Node.js...${NC}"
            kill -9 "$SERVER_PID" 2>/dev/null || true
        fi
        rm -f "$PROJECT_DIR/.server.pid"
        echo -e "${GREEN}✅ Server Node.js fermato${NC}"
    else
        echo -e "${YELLOW}ℹ️  Server Node.js non era attivo (PID non valido)${NC}"
        rm -f "$PROJECT_DIR/.server.pid"
    fi
else
    # Fallback: ferma per nome processo
    if check_process "node.*server.js"; then
        echo -e "${YELLOW}🔄 Fermando Server Node.js (ricerca per nome)...${NC}"
        pkill -f "node.*server.js" 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✅ Server Node.js fermato${NC}"
    else
        echo -e "${YELLOW}ℹ️  Server Node.js non era attivo${NC}"
    fi
fi

if [ -f "$PROJECT_DIR/.comfyui.pid" ]; then
    COMFYUI_PID=$(cat "$PROJECT_DIR/.comfyui.pid")
    if kill -0 "$COMFYUI_PID" 2>/dev/null; then
        echo -e "${YELLOW}🔄 Fermando ComfyUI (PID: $COMFYUI_PID)...${NC}"
        kill "$COMFYUI_PID" 2>/dev/null || true
        sleep 3
        if kill -0 "$COMFYUI_PID" 2>/dev/null; then
            echo -e "${YELLOW}💀 Force killing ComfyUI...${NC}"
            kill -9 "$COMFYUI_PID" 2>/dev/null || true
        fi
        rm -f "$PROJECT_DIR/.comfyui.pid"
        echo -e "${GREEN}✅ ComfyUI fermato${NC}"
    else
        echo -e "${YELLOW}ℹ️  ComfyUI non era attivo (PID non valido)${NC}"
        rm -f "$PROJECT_DIR/.comfyui.pid"
    fi
else
    # Fallback: ferma per nome processo
    if check_process "python.*main.py"; then
        echo -e "${YELLOW}🔄 Fermando ComfyUI (ricerca per nome)...${NC}"
        pkill -f "python.*main.py" 2>/dev/null || true
        sleep 3
        echo -e "${GREEN}✅ ComfyUI fermato${NC}"
    else
        echo -e "${YELLOW}ℹ️  ComfyUI non era attivo${NC}"
    fi
fi

echo ""

# Verifica che tutto sia fermato
echo -e "${BLUE}🔍 VERIFICA FINALE${NC}"

if check_process "node.*server.js"; then
    echo -e "${RED}❌ Server Node.js ancora attivo${NC}"
else
    echo -e "${GREEN}✅ Server Node.js fermato${NC}"
fi

if check_process "python.*main.py"; then
    echo -e "${RED}❌ ComfyUI ancora attivo${NC}"
else
    echo -e "${GREEN}✅ ComfyUI fermato${NC}"
fi

echo ""
echo -e "${GREEN}🎉 TUTTI I SERVIZI SONO STATI FERMATI${NC}"
echo -e "${BLUE}💡 Per riavviare tutto: ./start.sh${NC}"
