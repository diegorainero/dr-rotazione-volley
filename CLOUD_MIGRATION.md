# 🔄 Sistema di Migrazione Dati Cloud

## Panoramica

Il sistema di migrazione consente di trasferire i dati delle squadre tra il database locale (localStorage) e Firestore Cloud, permettendo l'accesso universale ai dati da qualsiasi dispositivo.

## Funzionalità Principali

### 🔐 Autenticazione
- **Google OAuth**: Accesso completo con account Google
- **Accesso Anonimo**: Accesso temporaneo senza account (dati legati al browser)
- **Stato Visibile**: Indicatore di connessione nella UI principale

### 📊 Gestione Dati

#### 1. Sommario Dati
- Visualizza il numero di squadre locali
- Mostra lo stato di connessione a Firestore
- Confronta dati locali vs cloud con dettaglio delle differenze

#### 2. Migrazione Locale → Cloud
- Carica tutte le squadre dal dispositivo a Firestore
- Evita duplicati automaticamente
- Progresso in tempo reale con contatori
- Report completo dei risultati

#### 3. Backup Cloud → Locale  
- Scarica tutte le squadre da Firestore al dispositivo
- Sovrascrive dati locali esistenti
- Utile per backup offline o cambio dispositivo

## Come Usare

### Primo Accesso
1. Clicca sull'indicatore cloud nella barra superiore
2. Effettua l'accesso (Google consigliato per permanenza)
3. Usa "Confronta dati" per vedere la situazione attuale

### Migrazione Iniziale
1. Se hai squadre solo locali, usa "Migra squadre" 
2. Attendi il completamento (progresso visibile)
3. Verifica il risultato nel sommario

### Backup Preventivo
1. Prima di cambiare dispositivo, esegui "Backup locale"
2. Sul nuovo dispositivo, accedi con lo stesso account
3. I dati saranno automaticamente disponibili

## Gestione Conflitti

Il sistema rileva automaticamente:
- **Solo locali**: Squadre presenti solo sul dispositivo
- **Solo cloud**: Squadre presenti solo su Firestore  
- **In entrambi**: Squadre sincronizzate
- **Conflitti**: Squadre con timestamp diversi (modifiche separate)

## Sicurezza e Privacy

- **Dati Personali**: Solo il tuo account può accedere alle tue squadre
- **Crittografia**: Tutti i dati sono crittografati in transito e a riposo
- **Backup Locale**: I dati locali rimangono sempre disponibili
- **Accesso Anonimo**: Dati temporanei, non recuperabili se perdi l'accesso

## Troubleshooting

### "Utente non autenticato"
- Verifica di essere loggato (indicatore verde)
- Riprova l'accesso se necessario

### "Errore durante migrazione"  
- Controlla la connessione internet
- Verifica i permessi Firebase nel console
- Riprova dopo qualche minuto

### "Conflitti rilevati"
- Usa il confronto dati per vedere i dettagli
- Migra le squadre più recenti manualmente
- In caso di dubbi, fai backup di entrambi i lati

## Note Tecniche

- **Database Locale**: localStorage del browser (automatico)
- **Database Cloud**: Google Firestore (richiede autenticazione) 
- **Sincronizzazione**: Manuale tramite pannello migrazione
- **Formato Dati**: Compatibilità completa tra locale e cloud
- **Performance**: Ottimizzato per evitare memory leak

---

L'app ora supporta completamente la condivisione universale dei dati mantenendo la sicurezza e la privacy! 🎉