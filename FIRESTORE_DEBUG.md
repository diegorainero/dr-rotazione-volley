# 🔧 Risoluzione Errori Firestore - Guida Debug

## Problema Identificato

Gli errori **WebChannel 400** e **"client is offline"** erano causati da:
1. **Regole Firestore non configurate** correttamente
2. **Database collections non inizializzate** 
3. **Gestione errori insufficiente** nel codice

## ✅ Soluzioni Implementate

### 1️⃣ Configurazione Firestore Database
```bash
# Deploy regole e indici Firestore
firebase deploy --only firestore
```

**Regole di Sicurezza** (`firestore.rules`):
```javascript
// Accesso solo ai propri dati per utente autenticato
match /teams/{teamId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}
```

**Indici Database** (`firestore.indexes.json`):
```json
// Indici per query efficienti per utente + timestamp
{
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "lastUsed", "order": "DESCENDING" }
  ]
}
```

### 2️⃣ Gestione Errori Migliorata

**Prima** (Problematico):
```typescript
} catch (error) {
  console.error('❌ Errore:', error);
  throw error; // Errore generico
}
```

**Ora** (Robusto):
```typescript
} catch (error: any) {
  if (error.code === 'permission-denied') {
    throw new Error('Accesso negato: verifica le regole Firestore');
  }
  if (error.code === 'unavailable') {
    throw new Error('Database temporaneamente non disponibile');
  }
  if (error.code === 'unauthenticated') {
    throw new Error('Sessione scaduta - effettua nuovamente l\'accesso');
  }
  throw new Error(`Errore: ${error.message}`);
}
```

### 3️⃣ Test Automatici di Connettività

**Test completo da console browser**:
```javascript
// Nella console del browser su https://dr-rotazioni-volley.web.app
await window.testFirestore();
```

**Test rapido**:
```javascript
await window.quickTestFirestore();
```

---

## 🚀 Come Testare

### Test 1: Verifica Regole Database
```javascript
// Console browser
await window.testFirestore();

// Deve mostrare:
// ✅ Autenticazione riuscita
// ✅ Lettura squadre riuscita  
// ✅ Scrittura squadra riuscita
// ✅ Verifica esistenza riuscita
// ✅ Eliminazione squadra riuscita
```

### Test 2: Verifica Auto-Sync
```
1. Vai su https://dr-rotazioni-volley.web.app
2. Clicca indicatore cloud → Login Google
3. Vedi "🔄 Auto-Sync" nell'indicatore
4. Crea una squadra locale  
5. Attendi 5 minuti O vai a "Auto-Sync" → "🚀 Sync ora"
6. Controlla nella console: "✅ Squadra TEST_123 salvata con successo"
```

### Test 3: Verifica Cross-Device
```
1. Device A: Crea squadra "Test Cross Device" 
2. Device A: Attendi auto-sync O sync manuale
3. Device B: Login stesso account Google
4. Device B: Vai a "Gestione Cloud" → "📥 Backup" 
5. Device B: Vedi la squadra apparire
```

---

## 🐛 Debug Errori Comuni

### Errore: `permission-denied`
**Causa**: Regole Firestore troppo restrittive o utente non autenticato
**Soluzione**: 
```bash
# Rideploy regole
firebase deploy --only firestore:rules

# Verifica autenticazione
console.log('User:', getCurrentUser());
```

### Errore: `unavailable` / `offline`
**Causa**: Connessione di rete instabile
**Soluzione**: Auto-gestito da AutoSync con pause/retry

### Errore: `unauthenticated` 
**Causa**: Sessione Firebase scaduta
**Soluzione**: Re-login automatico nel sistema

### Errore: `not-found`
**Causa**: Collection o documento non esiste
**Soluzione**: Viene creato automaticamente al primo salvataggio

---

## 📊 Monitoring in Produzione

### Firebase Console
1. Vai su [Firebase Console](https://console.firebase.google.com/project/dr-rotazioni-volley)
2. **Firestore Database** → Vedi dati real-time
3. **Authentication** → Vedi utenti connessi
4. **Usage** → Monitora read/write quotas

### Browser DevTools
```javascript
// Monitora stato AutoSync
setInterval(() => {
  console.log('AutoSync Status:', 
    AutoSyncService.getInstance().getStats()
  );
}, 30000); // Ogni 30 secondi
```

### Log Applicazione
```
🔄 AutoSync avviato - intervallo: 5 minuti
💾 Salvando squadra ABC123 per utente xyz789
✅ Squadra ABC123 salvata con successo
🔄 AutoSync completato: 3 migrate, 0 fallite
```

---

## ⚡ Performance Ottimizzazioni

### 1. Batch Operations
```typescript
// Invece di salvare squadre una per una
const batch = writeBatch(db);
teams.forEach(team => {
  batch.set(doc(db, 'teams', team.code), team);
});
await batch.commit(); // Una sola operazione di rete
```

### 2. Real-time Listeners Solo Quando Necessario
```typescript
// Listener attivato solo quando user è online
if (navigator.onLine) {
  const unsubscribe = onSnapshot(collection(db, 'teams'), callback);
}
```

### 3. Offline Persistence Automatica
```typescript
// Firestore cache automatica - funziona offline
const teams = await getDocs(query(
  collection(db, 'teams'), 
  where('userId', '==', user.uid)
));
```

---

## 🎯 Risultato Finale

### Prima (Problematico)
❌ Errori WebChannel 400 continui  
❌ "Failed to get document because the client is offline"  
❌ Perdita connessione = perdita dati  
❌ Nessun feedback all'utente  

### Ora (Risolto)
✅ **Database configurato** correttamente con regole e indici  
✅ **Gestione errori specifica** per ogni tipo di problema  
✅ **Auto-retry intelligente** per problemi temporanei  
✅ **Test automatici** per verificare connettività  
✅ **Monitoring real-time** dello stato connessione  
✅ **Offline-first** con sync quando torna online  

---

## 📝 Checklist Manutenzione

### Deploy Changes
- [ ] `npm run build` - Build senza errori
- [ ] `firebase deploy --only firestore` - Regole aggiornate  
- [ ] `firebase deploy --only hosting` - App deployata
- [ ] `window.testFirestore()` - Test connettività OK

### Monitoring Regolare  
- [ ] Firebase Console → Usage < 90% quota
- [ ] Browser DevTools → No errori console
- [ ] AutoSync Status → Verde e funzionante
- [ ] Cross-device test → Sync funziona

Il database Firestore è ora **completamente configurato e robusto**! 🎉