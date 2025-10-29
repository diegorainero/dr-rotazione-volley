# 🏐 Rotazioni Volley - App Allenatori

**Un'applicazione web completa per gestire rotazioni e formazioni nella pallavolo**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?logo=github)](https://diegorainero.github.io/dr-rotazioni-volley)

---

## ✨ Caratteristiche Principali

### 🎯 Modalità di Gioco
- **Senior**: Sistema completo P, S1, C2, O, S2, C1 + Libero
- **Under 13**: Sistema semplificato P, Z4, Z2

### 🏐 Gestione Squadre
- **Campo interattivo**: Trascina i giocatori per posizionarli
- **Rotazioni intelligenti**: Automatiche per entrambe le squadre
- **Controllo falli**: Rileva automaticamente errori di posizione

### � Sistema Ricezioni
- **Salvataggio separato**: Senior e Under 13 indipendenti
- **Gestione Libero**: Sostituzioni automatiche C1/C2 ↔ L
- **Caricamento silenzioso**: Senza popup fastidiosi

### 💾 Persistenza Dati
- **Database locale**: IndexedDB per salvataggi offline
- **Formazioni multiple**: Gestione per squadre diverse
- **Import/Export**: Backup e condivisione configurazioni

### 📱 Interfaccia
- **Header compatto**: Tutti i controlli organizzati
- **Responsive**: Funziona su desktop e mobile
- **Design professionale**: Interfaccia pulita e intuitiva

---

## 🚀 Deploy e Utilizzo

### 🌐 App Live
L'applicazione è già deployata e pronta all'uso:
- **URL**: https://diegorainero.github.io/dr-rotazioni-volley
- **Accesso**: Immediato da qualsiasi dispositivo

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

#### Deploy:
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

### 3️⃣ Gestione Ricezioni
- **Salva**: Solo rotazione corrente (distintamente per modalità)
- **Carica**: Automatico e silenzioso  
- **Reset**: Torna alle posizioni base

### 4️⃣ Formazioni Complete
- **Salva**: Nome squadra + descrizione
- **Carica**: Visualizza e applica formazioni salvate
- **Gestione**: Elimina, esporta, importa

---

## 🏆 Casi d'Uso

### Per Allenatori
- ✅ Preparazione rotazioni di ricezione
- ✅ Studio formazioni avversarie
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
- **Deploy**: GitHub Pages

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