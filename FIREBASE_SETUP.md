# 🚀 Configurazione Firebase per Cloud Sync

L'app **DR Rotazioni Volley** funziona perfettamente in modalità locale senza bisogno di configurazioni aggiuntive. Tuttavia, per abilitare il **Cloud Sync** e permettere l'accesso universale alle squadre da qualsiasi dispositivo, è necessario configurare Firebase.

## ⚡ Funzionalità senza Firebase
- ✅ Creazione e gestione squadre
- ✅ Rotazioni e sostituzioni
- ✅ Condivisione tramite QR code (con dati embedded nell'URL)
- ✅ Salvataggio locale persistente
- ✅ Interfaccia mobile-responsive

## ☁️ Funzionalità aggiuntive con Firebase
- 🌐 Accesso universale da qualsiasi dispositivo
- 🔄 Sincronizzazione automatica
- 💾 Backup cloud delle squadre
- 🔗 Condivisione semplificata tramite codici
- 📱 Funziona offline con sync al riconnettarsi

---

## 🛠️ Setup Firebase (Opzionale)

### 1. Crea un progetto Firebase

1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Clicca **"Aggiungi progetto"**
3. Nome progetto: `dr-rotazioni-volley` (o quello che preferisci)
4. Disabilita Google Analytics (non necessario)
5. Clicca **"Crea progetto"**

### 2. Configura Firestore Database

1. Nel menu laterale, vai su **"Firestore Database"**
2. Clicca **"Crea database"**
3. Seleziona **"Avvia in modalità test"** (per ora)
4. Scegli una location (es. `europe-west3` per Europa)

### 3. Configura Authentication

1. Nel menu laterale, vai su **"Authentication"**
2. Clicca **"Inizia"**
3. Vai su tab **"Sign-in method"**
4. Abilita **"Accesso anonimo"** (scorri in basso)
5. Clicca su **"Accesso anonimo"** → **"Abilita"** → **"Salva"**

### 4. Ottieni la configurazione

1. Vai su **"Impostazioni progetto"** (icona ingranaggio)
2. Scorri verso il basso e clicca **"</>" (Web app)**
3. Nome app: `dr-rotazioni-volley-web`
4. **NON** abilitare Firebase Hosting per ora
5. Clicca **"Registra app"**
6. **Copia la configurazione** che appare (oggetto `firebaseConfig`)

### 5. Aggiorna il codice

Apri il file `/src/config/firebase.ts` e sostituisci la configurazione demo:

```typescript
// SOSTITUISCI questa configurazione demo
const firebaseConfig = {
  apiKey: "TUA_API_KEY",
  authDomain: "tuo-progetto.firebaseapp.com", 
  projectId: "tuo-progetto-id",
  storageBucket: "tuo-progetto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:tua-app-id"
};
```

### 6. Test della configurazione

1. Salva il file `firebase.ts`
2. Ricarica l'app nel browser
3. Vai nella sezione **"☁️ Sync Cloud"**  
4. Clicca **"☁️ Attiva"**
5. Se tutto funziona, vedrai **"🟢 Attivo"**

---

## 🔧 Risoluzione Problemi

### Errore "configuration-not-found"
- Verifica che il progetto Firebase sia stato creato
- Controlla che la configurazione in `firebase.ts` sia corretta
- Assicurati che Firestore e Authentication siano abilitati

### Errore "Permission denied"
- Vai su Firestore Database → Regole
- Per il testing, usa queste regole temporanee:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### L'app non funziona offline
- L'app dovrebbe funzionare sempre offline
- Firebase si sincronizza automaticamente quando torna online
- Verifica la console del browser per errori

---

## 📋 Regole di sicurezza finali

Una volta testato tutto, sostituisci le regole Firestore con queste più sicure:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Le squadre possono essere lette/scritte solo dal proprietario
    match /teams/{teamId} {
      allow read, write: if request.auth != null && 
        (resource == null || resource.data.userId == request.auth.uid);
    }
  }
}
```

---

## ✅ Checklist finale

- [ ] Progetto Firebase creato
- [ ] Firestore Database abilitato
- [ ] Authentication (Anonymous) abilitato  
- [ ] Configurazione copiata in `firebase.ts`
- [ ] App ricaricata e testata
- [ ] Cloud Sync attivato con successo
- [ ] Test di sincronizzazione squadra
- [ ] Regole di sicurezza configurate

---

**💡 Nota:** L'app funziona perfettamente anche senza Firebase. La configurazione cloud è opzionale e aggiunge solo funzionalità di sincronizzazione universale.