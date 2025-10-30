# 🚀 Deploy su Firebase Hosting

Guida completa per hostare **DR Rotazioni Volley** su Firebase Hosting, eliminando completamente i problemi di domini non autorizzati.

## ✅ Vantaggi Firebase Hosting

- **🔗 Dominio Nativo**: Automaticamente autorizzato per Firebase Auth
- **⚡ Performance**: CDN globale di Google
- **🔒 HTTPS**: SSL/TLS automatico e gratuito
- **📱 PWA Support**: Service worker e caching ottimizzato
- **💰 Gratuito**: 10GB storage + 360MB/giorno transfer
- **🔄 CI/CD**: Deploy automatico da GitHub (opzionale)

---

## 🛠️ Setup Iniziale

### 1. Prerequisiti
```bash
# Firebase CLI già installato ✅
# Login già fatto ✅
# Progetto dr-rotazioni-volley già creato ✅
```

### 2. Configurazione Completata
I file di configurazione sono già pronti:
- ✅ `.firebaserc` - Collegamento al progetto
- ✅ `firebase.json` - Configurazione hosting
- ✅ Scripts npm - Comandi di deploy

---

## 🚀 Deploy dell'App

### Deploy Rapido
```bash
# Build + Deploy in un comando
npm run firebase:deploy:full
```

### Deploy Passo-passo
```bash
# 1. Build dell'app React
npm run build

# 2. Deploy su Firebase Hosting
firebase deploy --only hosting
```

### Solo Build (senza deploy)
```bash
npm run firebase:build
```

---

## 🌐 URL e Domini

### URL Firebase Hosting
Dopo il deploy, l'app sarà disponibile su:
```
https://dr-rotazioni-volley.web.app
https://dr-rotazioni-volley.firebaseapp.com
```

### Dominio Personalizzato (Opzionale)
1. **Firebase Console** → **Hosting** → **Add custom domain**
2. Inserisci il tuo dominio (es. `volleyrotazioni.com`)
3. Segui le istruzioni DNS
4. Firebase gestisce automaticamente SSL

---

## 🔧 Configurazione Avanzata

### Headers di Sicurezza
Il file `firebase.json` include:
```json
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "max-age=31536000"
}
```

### Rewrite Rules
SPA routing configurato:
```json
{
  "source": "**",
  "destination": "/index.html"
}
```

### File Ignorati
```json
[
  "firebase.json",
  "**/.*", 
  "**/node_modules/**"
]
```

---

## 🔄 Workflow Deploy

### Deploy Manuale
1. `npm run build` - Genera build production
2. `firebase deploy --only hosting` - Upload su Firebase
3. Visita URL per testare

### Deploy Automatico (GitHub Actions)
Crea `.github/workflows/firebase-hosting.yml`:
```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [ main ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install and Build
        run: |
          npm ci
          npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: dr-rotazioni-volley
```

---

## 📊 Monitoraggio

### Firebase Console
- **Hosting Dashboard**: Traffico e performance
- **Analytics**: Utilizzo app (se abilitato)
- **Performance**: Web Vitals automatici

### Comandi Utili
```bash
# Serve locale con Firebase emulator
firebase serve --only hosting

# Deploy con preview URL
firebase hosting:channel:deploy preview-123

# Lista deploy recenti
firebase hosting:releases:list

# Rollback a versione precedente
firebase hosting:releases:rollback
```

---

## 🚨 Troubleshooting

### Build Fallisce
```bash
# Pulisci cache e node_modules
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deploy Fallisce
```bash
# Verifica login
firebase login --reauth

# Verifica progetto
firebase projects:list
firebase use dr-rotazioni-volley
```

### Performance
```bash
# Analizza bundle size
npm run build
npx serve -s build
# Apri Network tab per verificare dimensioni
```

---

## 🎯 Checklist Deploy

- [ ] **Build Success**: `npm run build` completato senza errori
- [ ] **Local Test**: `npm start` funziona correttamente  
- [ ] **Firebase Login**: `firebase login` attivo
- [ ] **Project Selected**: `firebase use dr-rotazioni-volley`
- [ ] **Deploy**: `firebase deploy --only hosting`
- [ ] **Test Production**: Verifica URL Firebase
- [ ] **Auth Test**: Login Google funziona su produzione
- [ ] **Cloud Sync**: Test sincronizzazione squadre
- [ ] **Mobile Test**: Responsive su dispositivi

---

## 💡 Pro Tips

### Ottimizzazioni Build
- **Code Splitting**: React.lazy() per componenti pesanti
- **Tree Shaking**: Import solo funzioni necessarie
- **Compression**: Firebase abilita gzip automaticamente
- **Caching**: Headers ottimizzati già configurati

### SEO e Meta Tags
Aggiungi in `public/index.html`:
```html
<meta name="description" content="App per gestione rotazioni pallavolo">
<meta property="og:title" content="DR Rotazioni Volley">
<meta property="og:description" content="Gestione squadre e rotazioni">
```

### PWA Features
Firebase Hosting supporta:
- Service Workers
- App Manifest
- Add to Home Screen
- Offline Caching

---

## 🔄 Maintenance

### Updates Regolari
```bash
# Update dependencies
npm update

# Security audit
npm audit fix

# Rebuild e redeploy
npm run firebase:deploy:full
```

### Backup
- **Automatic**: Firebase mantiene cronologia deploy
- **Manual**: `firebase hosting:clone source target`
- **Code**: Repository Git già backup del codice

---

**🎉 Con Firebase Hosting non avrai mai più problemi di domini non autorizzati!**