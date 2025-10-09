#!/bin/bash

# 🚀 AI Image Generator - Startup Script (Cloud-Only Version)
# Avvia Node.js Server con 2 provider cloud: Gemini, OpenAI

set -e  # Esce al primo errore

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Directory del progetto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "${BLUE}🚀 AI IMAGE GENERATOR - CLOUD-ONLY STARTUP${NC}"
echo -e "${BLUE}============================================${NC}"

# Verifica Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js non trovato. Installa Node.js prima di continuare.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js:${NC} $NODE_VERSION"

# Verifica npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm non trovato. Installa npm prima di continuare.${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm:${NC} $NPM_VERSION"

# Verifica se package.json esiste
if [ ! -f package.json ]; then
    echo -e "${RED}❌ File package.json non trovato${NC}"
    exit 1
fi

echo -e "${GREEN}✅ package.json trovato${NC}"

# Installa dipendenze se node_modules non esiste
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}📦 Installando dipendenze...${NC}"
    npm install
else
    echo -e "${GREEN}✅ Dipendenze già installate${NC}"
fi

# Crea directory necessarie
mkdir -p logs
mkdir -p uploads  
mkdir -p generated

echo -e "${GREEN}✅ Directory create${NC}"

# Verifica file .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  File .env non trovato${NC}"
    echo -e "${YELLOW}💡 Crea un file .env con le tue API keys${NC}"
fi

# Crea e imposta permessi per cartelle uploads e generated
echo -e "${YELLOW}📁 Configurazione cartelle di lavoro...${NC}"
mkdir -p uploads generated
chmod 777 uploads generated
echo -e "${GREEN}✅ Permessi impostati su uploads/ e generated/${NC}"

# Controlla se il server è già in esecuzione
SERVER_PID=$(lsof -ti :3000 2>/dev/null || true)
if [ ! -z "$SERVER_PID" ]; then
    echo -e "${YELLOW}🔄 Fermando server esistente (PID: $SERVER_PID)...${NC}"
    kill "$SERVER_PID" 2>/dev/null || true
    sleep 2
fi

# Funzione per aspettare che un servizio sia pronto
wait_for_service() {
    local url=$1
    local service_name=$2
    local timeout=30
    local count=0
    
    echo -e "${YELLOW}⏳ Aspettando che $service_name sia pronto...${NC}"
    
    while ! curl -s "$url" >/dev/null 2>&1; do
        if [ $count -ge $timeout ]; then
            echo -e "${RED}❌ Timeout: $service_name non risponde dopo ${timeout}s${NC}"
            return 1
        fi
        echo -ne "${YELLOW}   Tentativo $((count + 1))/$timeout...\r${NC}"
        sleep 1
        count=$((count + 1))
    done
    
    echo -e "${GREEN}✅ $service_name pronto!${NC}"
    return 0
}

# Avvia il server Node.js
echo -e "${BLUE}🌐 AVVIO SERVER NODE.JS${NC}"

# Pulisci vecchi log
> logs/server.log

# Avvia il server in background
echo -e "${YELLOW}🚀 Avviando server Node.js sulla porta 3000...${NC}"
nohup node server.js > logs/server.log 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}✅ Server Node.js avviato (PID: $SERVER_PID)${NC}"

# Aspetta che il server sia pronto
if ! wait_for_service "http://localhost:3000" "Server Node.js"; then
    echo -e "${RED}❌ Server Node.js non si è avviato correttamente${NC}"
    echo -e "${YELLOW}📋 Log Server:${NC}"
    tail -n 20 logs/server.log
    exit 1
fi

echo -e "${GREEN}✅ Server Node.js pronto!${NC}"

# Test dei provider API
echo -e "${BLUE}🔍 TESTING PROVIDER API${NC}"

# Test Server API
echo -e "${YELLOW}🔍 Testing Server API...${NC}"
if curl -s http://localhost:3000/api/images >/dev/null; then
    echo -e "${GREEN}✅ Server API risponde correttamente${NC}"
else
    echo -e "${RED}❌ Server API non risponde${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 AVVIO COMPLETATO!${NC}"
echo -e ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🌐 Servizi attivi:${NC}"
echo -e "${GREEN}✅ Server Node.js:${NC} http://localhost:3000 (PID: $SERVER_PID)"
echo -e "${BLUE}========================================${NC}"

# Salva PID per script di stop
echo "$SERVER_PID" > "$PROJECT_DIR/.server.pid"

echo -e ""
echo -e "${PURPLE}🎯 Comandi utili:${NC}"
echo -e "  • Apri app: open http://localhost:3000"
echo -e "  • Log server: tail -f logs/server.log"
echo -e "  • Ferma servizi: ./stop.sh"
echo -e "  • Stato servizi: ./status.sh"
echo -e ""
echo -e "${GREEN}🚀 Avvio completato! Apri http://localhost:3000 per iniziare${NC}"

# Apri automaticamente nel browser (opzionale)
if command -v open &> /dev/null; then
    echo -e "${YELLOW}🌐 Apertura automatica nel browser...${NC}"
    sleep 2
    open http://localhost:3000
fi
