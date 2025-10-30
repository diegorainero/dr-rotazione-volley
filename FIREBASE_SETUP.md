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

### 🔐 Metodi di Autenticazione

**🔗 Google Sign-in (Raccomandato):**
- ✅ Account persistente e riconoscibile
- ✅ Sincronizzazione universale tra dispositivi
- ✅ Backup sicuro delle squadre
- ✅ Condivisione con nome utente visibile
- ✅ Recupero dati se si cambia dispositivo

**👤 Accesso Anonimo:**
- ✅ Veloce, nessun dato personale richiesto  
- ✅ Funziona immediatamente
- ⚠️ Account legato al dispositivo
- ⚠️ Dati persi se si cancella il browser
- ⚠️ Non recuperabile su altri dispositivi

**💡 Consiglio:** Inizia con accesso anonimo per testare, poi collega Google per la sincronizzazione completa.

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

#### Per Google Sign-in (Raccomandato):
4. Clicca su **"Google"** 
5. Clicca **"Abilita"**
6. Inserisci email di supporto del progetto
7. Clicca **"Salva"**

#### Per accesso anonimo (opzionale):
8. Scorri in basso e trova **"Accesso anonimo"**
9. Clicca su **"Accesso anonimo"** → **"Abilita"** → **"Salva"**

**Nota:** Puoi abilitare entrambi i metodi per dare più opzioni agli utenti.

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

### Errore "unauthorized-domain" 🚫
**Problema più comune** - Il dominio non è autorizzato per l'autenticazione Google.

**Risoluzione:**
1. Vai su [Firebase Console](https://console.firebase.google.com)
2. Seleziona il tuo progetto
3. Menu laterale: **Authentication** → **Settings**
4. Scorri fino a **"Authorized domains"**
5. Clicca **"Add domain"** e aggiungi:
   - `localhost` (per development)
   - Il tuo dominio di produzione
   - Domini Netlify/Vercel se li usi
6. **Salva** le modifiche

**Domini comuni da aggiungere:**
- `localhost` (development)  
- `127.0.0.1` (development alternativo)
- `tuodominio.com` (produzione)
- `app-name.netlify.app` (Netlify)
- `app-name.vercel.app` (Vercel)

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

### Errore "operation-not-allowed"
- Vai su Authentication → Sign-in method
- Assicurati che **Google** sia abilitato
- Inserisci email di supporto progetto se richiesta

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
    
    // Permetti lettura di squadre pubbliche a utenti autenticati
    match /teams/{teamId} {
      allow read: if request.auth != null && 
        resource.data.isPublic == true;
    }
  }
}
```

### 🔒 Spiegazione Regole:
- **Accesso privato**: Solo il creatore può leggere/modificare le sue squadre
- **Squadre pubbliche**: Tutti gli utenti autenticati possono leggere squadre pubbliche  
- **Autenticazione obbligatoria**: Sia Google che utenti anonimi devono essere autenticati
- **Nessun accesso anonimo al database**: Prevenzione spam e abusi

---

## ⚡ Quick Fix "unauthorized-domain"

**Se ricevi l'errore subito:**

1. 🚀 **[Apri Firebase Console](https://console.firebase.google.com)**
2. 📁 Seleziona progetto `dr-rotazioni-volley`  
3. 🔐 Vai su **Authentication** → **Settings**
4. 📝 Nella sezione **"Authorized domains"** clicca **"Add domain"**
5. ➕ Aggiungi: `localhost` e il dominio corrente
6. 💾 **Salva**

**Test rapido:** Apri console browser e scrivi:
```javascript
console.log('Current domain:', window.location.origin);
```

## ✅ Checklist finale

- [ ] Progetto Firebase creato
- [ ] Firestore Database abilitato
- [ ] Authentication (Google + Anonymous) abilitato  
- [ ] **Domini autorizzati configurati** ⚠️ 
- [ ] Configurazione copiata in `firebase.ts`
- [ ] App ricaricata e testata
- [ ] Cloud Sync attivato con successo
- [ ] Test di sincronizzazione squadra
- [ ] Regole di sicurezza configurate

---

## 🚀 Ottimizzazioni Performance

L'app è ottimizzata per evitare problemi di memoria:

- **🧠 Gestione Memoria**: Hook ottimizzati e cleanup automatico dei listener
- **⚡ Debouncing**: Limitazione delle chiamate Firebase frequenti  
- **🔄 Lazy Loading**: Componenti caricati solo quando necessari
- **📱 Mobile First**: Ottimizzato per dispositivi con memoria limitata

### 🛠️ Debug Performance
Se riscontri problemi di memoria, usa questi componenti:
- `AuthTest`: Debug dettagliato autenticazione
- `AuthStatus`: Status leggero senza overhead
- `Performance utils`: Monitor memoria e cleanup

**💡 Nota:** L'app funziona perfettamente anche senza Firebase. La configurazione cloud è opzionale e aggiunge solo funzionalità di sincronizzazione universale.