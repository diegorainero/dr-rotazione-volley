// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Configurazione Firebase (sostituisci con i tuoi dati quando crei il progetto)
const firebaseConfig = {
  apiKey: 'AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  authDomain: 'volley-rotazioni.firebaseapp.com',
  projectId: 'volley-rotazioni',
  storageBucket: 'volley-rotazioni.appspot.com',
  messagingSenderId: '123456789012',
  appId: '1:123456789012:web:abcdefghijklmnop',
};

// Inizializza Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Funzione per autenticazione anonima automatica
export const ensureAuth = async (): Promise<string> => {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  try {
    const result = await signInAnonymously(auth);
    console.log('🔐 Autenticazione anonima riuscita:', result.user.uid);
    return result.user.uid;
  } catch (error) {
    console.error('❌ Errore autenticazione:', error);
    throw new Error('Impossibile connettersi al cloud');
  }
};

// Configurazione per development (usa Firebase Emulator se disponibile)
if (process.env.NODE_ENV === 'development') {
  // Decommentare per usare emulator locale in sviluppo
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}
