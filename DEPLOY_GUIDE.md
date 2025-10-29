# 🚀 Guida al Deploy - App Rotazioni Volley

## 🟢 OPZIONE 1: Vercel (Raccomandato)

### Vantaggi
- ✅ Deploy automatico da GitHub
- ✅ HTTPS automatico 
- ✅ Velocità eccellente (CDN globale)
- ✅ 100GB bandwidth gratuiti/mese
- ✅ Build automatiche ad ogni push

### Setup Vercel
1. **Vai su**: https://vercel.com
2. **Registrati** con GitHub
3. **Clicca**: "New Project"
4. **Seleziona**: il tuo repository `dr-rotazione-volley`
5. **Settings**:
   - Framework Preset: `Create React App`
   - Build Command: `npm run build`
   - Output Directory: `build`
6. **Deploy**: Clicca "Deploy"

### URL Finale
- Avrai un URL tipo: `https://dr-rotazioni-volley-xyz.vercel.app`

---

## 🔵 OPZIONE 2: Netlify

### Vantaggi  
- ✅ Deploy da GitHub
- ✅ 100GB bandwidth gratuiti
- ✅ Form handling
- ✅ Redirects personalizzabili

### Setup Netlify
1. **Vai su**: https://netlify.com
2. **Registrati** con GitHub
3. **New site from Git** → GitHub
4. **Seleziona**: `dr-rotazione-volley`
5. **Settings**:
   - Build command: `npm run build`
   - Publish directory: `build`
6. **Deploy**

---

## 🟠 OPZIONE 3: GitHub Pages

### Vantaggi
- ✅ Completamente gratuito
- ✅ Integrato con GitHub
- ✅ Semplice da configurare

### Setup GitHub Pages
1. **Installa** gh-pages:
```bash
npm install --save-dev gh-pages
```

2. **Aggiungi** al package.json:
```json
{
  "homepage": "https://diegorainero.github.io/dr-rotazione-volley",
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d build"
  }
}
```

3. **Deploy**:
```bash
npm run deploy
```

4. **Abilita Pages** su GitHub:
   - Settings → Pages → Source: "gh-pages branch"

---

## 🟡 OPZIONE 4: Surge.sh

### Vantaggi
- ✅ Deploy da terminale
- ✅ Domini custom gratuiti
- ✅ Veloce e semplice

### Setup Surge
1. **Installa**:
```bash
npm install -g surge
```

2. **Build**:
```bash
npm run build
```

3. **Deploy**:
```bash
cd build
surge
```

4. **Scegli dominio**: es. `volley-rotazioni.surge.sh`

---

## 🔴 OPZIONE 5: Railway

### Vantaggi
- ✅ $5 credito gratuito/mese
- ✅ Deploy da GitHub
- ✅ Supporta database

### Setup Railway
1. **Vai su**: https://railway.app
2. **Deploy from GitHub**
3. **Seleziona**: repository
4. **Auto-deploy**

---

## 📱 RACCOMANDAZIONE

### Per il tuo caso d'uso:
**🥇 VERCEL** - Perfetto per React apps, veloce, affidabile
**🥈 NETLIFY** - Ottima alternativa, più features
**🥉 GITHUB PAGES** - Se vuoi rimanere tutto in GitHub

### Setup Consigliato (Vercel):
1. Push del codice su GitHub
2. Connetti repository a Vercel 
3. Deploy automatico ad ogni push
4. URL pubblico subito disponibile

### Domini Custom (Opzionale):
- Vercel: Domini custom gratuiti 
- Netlify: Domini custom gratuiti
- Altri: Circa €10/anno per dominio .com

## 🛠️ Preparazione Pre-Deploy

### 1. Ottimizzazioni Build
Aggiungi al package.json:
```json
{
  "scripts": {
    "build": "react-scripts build && echo 'Build completed!'",
    "build:analyze": "npm run build && npx source-map-explorer 'build/static/js/*.js'"
  }
}
```

### 2. Variabili Ambiente (Se necessarie)
Crea `.env.production`:
```
REACT_APP_VERSION=1.0.0
REACT_APP_ENV=production
```

### 3. Performance
- ✅ App già ottimizzata per build
- ✅ IndexedDB funziona offline
- ✅ PWA-ready con service workers

## 🎯 Risultato Finale
- **URL pubblico** accessibile da qualsiasi dispositivo
- **Salvataggio locale** tramite IndexedDB 
- **Funziona offline** dopo primo caricamento
- **Mobile-friendly** responsive design