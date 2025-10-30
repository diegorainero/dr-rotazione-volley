# 🏐 Rotazioni Volley - App Allenatori

**Un'applicazione web completa per gestire rotazioni e formazioni nella pallavolo**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Firebase%20Hosting-orange?logo=firebase)](https://dr-rotazioni-volley.web.app)
[![GitHub Pages](https://img.shields.io/badge/Mirror-GitHub%20Pages-blue?logo=github)](https://diegorainero.github.io/dr-rotazioni-volley)

---

## ✨ Caratteristiche Principali

### 🎯 Modalità di Gioco
- **Senior**: Sistema completo P, S1, C2, O, S2, C1 + Libero
- **Under 13**: Sistema semplificato P, Z4, Z2

### 🏐 Gestione Squadre
- **Campo interattivo**: Trascina i giocatori per posizionarli
- **Rotazioni intelligenti**: Automatiche per entrambe le squadre
- **Controllo falli**: Rileva automaticamente errori di posizione
- **👁️ Tracking avversari**: Seleziona e segui giocatori avversari con colore dorato

### � Sistema Ricezioni
- **Salvataggio separato**: Senior e Under 13 indipendenti
- **Gestione Libero**: Sostituzioni automatiche C1/C2 ↔ L
- **Caricamento silenzioso**: Senza popup fastidiosi

### 💾 Persistenza Dati
- **Database locale**: localStorage per salvataggi offline immediati
- **Cloud Firestore**: Sincronizzazione universale tra dispositivi
- **🔄 Auto-Sync**: Backup automatico ogni X minuti con retry intelligente
- **Migrazione dati**: Sistema completo per trasferire dati locale ↔ cloud
- **Gestione offline**: Funzionamento robusto anche senza connessione
- **Formazioni multiple**: Gestione per squadre diverse con codici univoci
- **Autenticazione**: Google OAuth e accesso anonimo per privacy

### 📋 **NUOVO** Sistema Formazioni Cloud
- **☁️ Salvataggio Ibrido**: Formazioni salvate automaticamente locale + cloud
- **🏷️ Badge Identificativo**: Distingui facilmente formazioni locali (💾) vs cloud (☁️)
- **🔄 Sincronizzazione**: Carica formazioni locali nel cloud con un click
- **📊 Statistiche Live**: Conteggi in tempo reale di formazioni per fonte
- **🛡️ Sicurezza**: Accesso solo alle proprie formazioni (user-based)
- **📱 Multi-Device**: Accedi alle tue formazioni da qualsiasi dispositivo
- **🚫 No Duplicati**: Sistema intelligente che evita duplicazioni

### 📱 Interfaccia
- **Header compatto**: Tutti i controlli organizzati
- **Responsive**: Funziona su desktop e mobile
- **Design professionale**: Interfaccia pulita e intuitiva

---

## 🚀 Deploy e Utilizzo

### 🌐 App Live
L'applicazione è deployata su Firebase Hosting:

**🔥 Firebase Hosting**:
- **URL**: https://dr-rotazioni-volley.web.app
- **Vantaggi**: 
  - ☁️ **Sincronizzazione cloud** con Firestore
  - 🔐 **Autenticazione Google** sicura
  - 🔄 **Migrazione dati** locale ↔ cloud
  - 📱 **Accesso universale** da qualsiasi dispositivo
  - ⚡ **Performance ottimizzate** e CDN globale

**📊 Nuove Funzionalità Cloud**:
- **🔄 Auto-Sync**: Sincronizzazione automatica ogni 5 minuti  
- **Gestione squadre**: Codici univoci per condivisione sicura
- **Backup intelligente**: Dati sempre al sicuro con retry automatico
- **Accesso multi-dispositivo**: Le tue squadre sempre sincronizzate
- **Risoluzione errori**: Gestione automatica problemi connettività
- **Configurazione flessibile**: Intervalli da 1 a 60 minuti

### 🛠️ Sviluppo Locale

#### Installazione:
```bash
git clone https://github.com/diegorainero/dr-rotazioni-volley.git
cd dr-rotazioni-volley
npm install
```

#### Avvio:
```bash
npm start
```

#### Deploy Firebase:
```bash
# Deploy completo (build + deploy)
npm run firebase:deploy:full

# Oppure usa lo script automatico
./deploy.sh
```

#### Deploy GitHub Pages:
```bash
npm run deploy
```

### 🌍 Alternative Deploy Gratuite
Consulta `DEPLOY_GUIDE.md` per istruzioni complete su:
- **Vercel** (raccomandato)
- **Netlify** 
- **Surge.sh**
- **Railway**

---

## 📋 Guida Utilizzo

### 1️⃣ Modalità Senior
- **Etichette**: P, S1, C2, O, S2, C1
- **Libero**: Attivabile con pulsanti laterali
- **Sostituzioni**: C1/C2 → L in seconda linea (zone 1,6,5)

### 2️⃣ Modalità Under 13  
- **Etichette**: P, Z4, Z2 (semplificate)
- **Sistema**: Adatto alle categorie giovanili

### 3️⃣ Tracking Avversari (NUOVO!)
- **👁️ Modalità tracking**: Attiva/disattiva con un click
- **Selezione visuale**: Click su giocatore avversario per tracciarlo
- **Colore dorato**: Il giocatore selezionato diventa dorato e resta visibile
- **Analisi tattica**: Segui movimenti e posizioni durante le rotazioni
- **Feedback real-time**: Mostra quale giocatore stai seguendo e la sua zona

### 4️⃣ Gestione Ricezioni
- **Salva**: Solo rotazione corrente (distintamente per modalità)
- **Carica**: Automatico e silenzioso  
- **Reset**: Torna alle posizioni base

### 5️⃣ Gestione Cloud 
- **🔄 Auto-Sync**: Backup automatico ogni 5 minuti (configurabile 1-60 min)
- **Indicatore intelligente**: Stato connessione e prossimo sync visibili
- **Retry automatico**: Risolve errori WebChannel 400 e disconnessioni
- **Migrazione guidata**: Trasferisci squadre locali → cloud
- **Backup sicuro**: Scarica squadre cloud → locale  
- **Confronto dati**: Visualizza differenze e conflitti
- **Gestione offline**: Pause intelligenti e riconnessione automatica
- **Accesso universale**: Le tue squadre sempre sincronizzate

---

## 🏆 Casi d'Uso

### Per Allenatori
- ✅ Preparazione rotazioni di ricezione
- ✅ Studio formazioni avversarie con tracking visuale
- ✅ Analisi tattica giocatori chiave
- ✅ Correzione errori di posizione
- ✅ Backup configurazioni di squadra

### Per Team Management
- ✅ Condivisione schemi tra staff
- ✅ Archiviazione stagionale
- ✅ Analisi tattica
- ✅ Formazione giocatori

---

## 🔧 Tecnologie

- **Frontend**: React 19 + TypeScript
- **Canvas**: Konva.js per campo interattivo  
- **Database**: Dexie.js (IndexedDB wrapper)
- **Styling**: Tailwind CSS
- **Build**: Create React App
- **Deploy**: Firebase Hosting + GitHub Pages
- **Cloud**: Firebase Auth + Firestore

---

## 📄 Licenza

MIT License - Uso libero per scopi educativi e sportivi

**Sviluppato con ❤️ per la comunità del volley italiano**

---

## 🧰 Tech Stack

- ⚛️ **React + TypeScript** – responsive and modular frontend  
- 🎨 **Tailwind CSS** – fast, modern styling framework  
- 🖼️ **React Konva** – 2D canvas rendering for court and players  
- ☁️ *(Optional)* **Firebase / Firestore** – for saving team data and formations in the cloud

---

## 🚀 Getting Started

### 1️⃣ Clone the repository
```bash
git clone https://github.com/<your-username>/volleyball-rotation-analyzer.git
cd volleyball-rotation-analyzer
```

### 2️⃣ Install dependencies
```bash
npm install
```

### 3️⃣ Run the development server
```bash
npm start
```

Then open http://localhost:3000 in your browser.

## 🌍 Free Deployment Options

Deploy instantly and for free using one of these platforms:

Vercel
Netlify
GitHub Pages

## 🧩 Future Enhancements

- Automatic positional fault analysis

- Storage of multiple lineups and rotations

- Import/export data (JSON, Excel)

- “Coach Mode” with rotation suggestions

- Attack/receive simulation by rotation

## 📄 License

Released under the MIT License – open for educational and sports use.

## 👨‍🏫 Author

Developed by Diego Rainero
Contributions and feedback are welcome!