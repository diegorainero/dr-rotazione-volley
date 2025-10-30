#!/bin/bash

# 🚀 Script di deploy rapido per Firebase Hosting
# Usage: ./deploy.sh [message]

set -e

echo "🏐 DR Rotazioni Volley - Deploy Firebase Hosting"
echo "================================================"

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Messaggio di commit (opzionale)
COMMIT_MSG="${1:-Deploy aggiornamento $(date +'%Y-%m-%d %H:%M')}"

echo -e "${YELLOW}📋 Checklist pre-deploy:${NC}"

# 1. Verifica Git status
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Ci sono cambiamenti non committati${NC}"
    echo "Vuoi continuare? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Deploy annullato"
        exit 1
    fi
    
    # Commit automatico
    echo -e "${YELLOW}📝 Commit automatico dei cambiamenti...${NC}"
    git add .
    git commit -m "$COMMIT_MSG"
else
    echo -e "${GREEN}✅ Git repository pulito${NC}"
fi

# 2. Verifica connessione Firebase
echo -e "${YELLOW}🔐 Verifica autenticazione Firebase...${NC}"
if ! firebase projects:list >/dev/null 2>&1; then
    echo -e "${RED}❌ Firebase login richiesto${NC}"
    firebase login
fi
echo -e "${GREEN}✅ Firebase autenticato${NC}"

# 3. Build dell'app
echo -e "${YELLOW}🏗️  Build dell'applicazione...${NC}"
npm run build

if [ ! -d "build" ]; then
    echo -e "${RED}❌ Build fallita - cartella build non trovata${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build completata${NC}"

# 4. Test build locale (opzionale)
echo "Vuoi testare il build localmente prima del deploy? (y/n)"
read -r test_local
if [[ "$test_local" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🧪 Avvio server locale per test...${NC}"
    echo "Apri http://localhost:5000 per testare"
    echo "Premi Ctrl+C per interrompere e procedere con il deploy"
    npx serve -s build -l 5000 || true
fi

# 5. Deploy su Firebase
echo -e "${YELLOW}🚀 Deploy su Firebase Hosting...${NC}"
firebase deploy --only hosting

# 6. Ottieni URL
HOSTING_URL=$(firebase hosting:site:get dr-rotazioni-volley 2>/dev/null | grep "https://" || echo "https://dr-rotazioni-volley.web.app")

echo ""
echo -e "${GREEN}🎉 Deploy completato con successo!${NC}"
echo "================================"
echo -e "🌐 URL Principale: ${GREEN}https://dr-rotazioni-volley.web.app${NC}"
echo -e "🌐 URL Alternativo: ${GREEN}https://dr-rotazioni-volley.firebaseapp.com${NC}"
echo -e "🔧 Console Firebase: ${GREEN}https://console.firebase.google.com/project/dr-rotazioni-volley${NC}"
echo ""

# 7. Push su GitHub (se confermato)
if [ -n "$(git status --porcelain 2>/dev/null)" ] || [ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main 2>/dev/null)" ]; then
    echo "Vuoi pushare i cambiamenti su GitHub? (y/n)"
    read -r push_git
    if [[ "$push_git" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}📤 Push su GitHub...${NC}"
        git push origin main
        echo -e "${GREEN}✅ Push completato${NC}"
    fi
fi

echo -e "${GREEN}🏐 DR Rotazioni Volley è online!${NC}"