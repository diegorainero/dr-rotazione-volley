# 👁️ Sistema Tracking Giocatori Avversari

## Panoramica

Il sistema di tracking permette di selezionare un giocatore avversario per "seguirlo" visualmente durante le rotazioni, facilitando l'analisi tattica delle formazioni avversarie.

---

## 🎯 Funzionalità

### **Attivazione Tracking**
- **Pulsante**: 👁️ "Traccia Avversario" nei controlli principali
- **Stato OFF**: Giocatori avversari normali (rossi)
- **Stato ON**: Modalità tracking attiva (pulsante giallo)

### **Selezione Giocatore**
- **Click** su qualsiasi giocatore avversario per iniziare a tracciarlo
- **Colore speciale**: Il giocatore selezionato diventa **DORATO** (#FFD700)
- **Feedback visivo**: Messaggio che indica quale giocatore è tracciato

### **Gestione Tracking**
- **Cambio giocatore**: Click su altro avversario per switchare
- **Disattivazione**: Click sullo stesso giocatore O disattiva modalità
- **Auto-reset**: Si disattiva automaticamente quando disattivi la modalità

---

## 🚀 Come Utilizzare

### **Scenario Tipico: Analisi Ricevitore**
```
1. Identifica il ricevitore principale avversario
2. Clicca "👁️ Traccia Avversario" 
3. Clicca sul giocatore avversario che vuoi seguire
4. Ora è evidenziato in DORATO
5. Ruota le squadre per vedere come si muove
6. Analizza le sue posizioni in ogni rotazione
```

### **Scenario: Studio Alzatore**
```
1. Attiva tracking mode
2. Seleziona l'alzatore avversario (solitamente S1/S2)  
3. Osserva le sue posizioni durante rotazioni
4. Identifica punti deboli nelle formazioni
```

### **Scenario: Tracking Opposto**
```
1. Seleziona l'opposto avversario (zona 2)
2. Segui la sua posizione durante le rotazioni
3. Nota quando è in prima linea vs seconda linea
4. Pianifica attacchi di conseguenza
```

---

## 🎨 Codici Colore

| Stato Giocatore | Colore | Significato |
|----------------|---------|-------------|
| **Normale Home** | Blu | Tua squadra (normale) |
| **Normale Away** | Rosso | Avversari (normale) |
| **Tracked Away** | **Dorato** | Giocatore avversario tracciato |
| **Errore Posizione** | Rosso intenso | Fallo di posizione |

---

## 📱 Interfaccia Utente

### **Pulsante Tracking**
```
👁️ "Traccia Avversario"  [GRIGIO - OFF]
👁️ "Disattiva Track"     [GIALLO - ON]
👁️ "Track"               [MOBILE - Versione compatta]
```

### **Feedback Messaggi**
```
🟡 "Modalità tracking attiva - Clicca su un giocatore avversario per seguirlo"
🎯 "Tracciando giocatore avversario P (zona 1)"  
🎯 "Tracciando giocatore avversario S1 (zona 3)"
```

---

## 🔧 Dettagli Tecnici

### **Stato Interno**
```typescript
const [trackedAwayPlayer, setTrackedAwayPlayer] = useState<number | null>(null);
const [trackingMode, setTrackingMode] = useState(false);
```

### **Logica Colori**
```typescript
const getPlayerColor = (player: PlayerData) => {
  // Tracking ha priorità sui falli
  if (player.team === 'away' && trackedAwayPlayer === player.id) {
    return '#FFD700'; // Gold
  }
  
  // Poi controlla falli
  if (falli.includes(player.id)) {
    return 'red';
  }
  
  return player.color; // Colore normale
};
```

### **Click Handling**
```typescript
onClick={() => {
  if (p.team === 'away') {
    handleAwayPlayerClick(p.id);
  }
}}
```

---

## 🎓 Casi d'Uso Avanzati

### **Allenamento Tattico**
1. **Pre-partita**: Studia formazioni avversarie note
2. **Durante timeout**: Traccia giocatore che sta creando problemi
3. **Post-rotazione**: Verifica se avversario è nella posizione prevista

### **Scouting Avversari**
1. **Identifica ruoli**: Traccia ogni giocatore per identificare il ruolo
2. **Pattern di gioco**: Osserva movimenti ricorrenti
3. **Punti deboli**: Trova posizioni vulnerabili nelle rotazioni

### **Formazione Team**
1. **Dimostrazioni**: Mostra ai giocatori dove guardare
2. **Simulazioni**: Recrea situazioni di gioco specifiche
3. **Analisi video**: Combina con registrazioni per spiegazioni dettagliate

---

## 🔄 Integrazione con Rotazioni

### **Mantenimento Tracking**
- ✅ **Il giocatore tracciato rimane dorato durante tutte le rotazioni**
- ✅ **L'ID del giocatore è preservato automaticamente**  
- ✅ **Il feedback si aggiorna mostrando la nuova zona**

### **Compatibilità Completa**
- ✅ **Rotazione singola squadra**: Tracking mantenuto
- ✅ **Rotazione entrambe squadre**: Tracking mantenuto  
- ✅ **Modalità Libero**: Funziona anche con sostituzioni
- ✅ **Senior/Under13**: Compatibile con entrambe le modalità

---

## 💡 Tips & Tricks

### **Performance**
- Il tracking è **leggero** e non impatta performance
- Nessun overhead quando disattivato
- Rendering ottimizzato per mobile

### **UX Migliore**
- **Feedback immediato** su selezione giocatore  
- **Colore distintivo** facile da vedere anche su schermi piccoli
- **Reset automatico** per evitare stati inconsistenti

### **Debugging**
```javascript
// Console del browser per vedere stato tracking
console.log('Tracked player:', trackedAwayPlayer);
console.log('Tracking mode:', trackingMode);
```

---

## 🚀 Roadmap Futuri Miglioramenti

- [ ] **Multi-tracking**: Tracciare più giocatori contemporaneamente
- [ ] **Colori personalizzati**: Scegliere colore per ogni giocatore tracciato
- [ ] **Statistiche tracking**: Contare tempo in ogni zona
- [ ] **Salvataggio tracking**: Salvare giocatori tracciati nelle formazioni
- [ ] **Heatmap**: Visualizzare zone più frequentate dal giocatore tracciato

---

La funzionalità di tracking rende l'app **ancora più utile per allenatori e analisti** fornendo uno strumento visivo semplice ma potente per seguire giocatori chiave durante l'analisi delle rotazioni! 🎯