// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  connectAuthEmulator,
  User,
} from 'firebase/auth';

// Configurazione Firebase (sostituisci con i tuoi dati quando crei il progetto)
const firebaseConfig = {
  apiKey: 'AIzaSyDjr8wt1HSozTxUN8HVTTAqyPfn-8a6Axo',
  authDomain: 'dr-rotazioni-volley.firebaseapp.com',
  projectId: 'dr-rotazioni-volley',
  storageBucket: 'dr-rotazioni-volley.firebasestorage.app',
  messagingSenderId: '297241495629',
  appId: '1:297241495629:web:db135e474dca153d443404',
  measurementId: 'G-455701GZZ0',
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Provider per Google Authentication
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Funzione per autenticazione anonima automatica
/**
 * Tipi di autenticazione supportati
 */
export type AuthType = 'google' | 'anonymous';

/**
 * Autentica con Google
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    console.log(
      '🔐 Login Google completato:',
      result.user.displayName || result.user.email
    );
    return result.user;
  } catch (error: any) {
    console.error('❌ Errore login Google:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancellato dall'utente");
    }
    throw error;
  }
};

/**
 * Autentica anonimamente
 */
export const signInAnonymous = async (): Promise<User> => {
  try {
    const result = await signInAnonymously(auth);
    console.log('🔐 Login anonimo completato:', result.user.uid);
    return result.user;
  } catch (error) {
    console.error('❌ Errore login anonimo:', error);
    throw error;
  }
};

/**
 * Funzione per garantire l'autenticazione con scelta del metodo
 */
export const ensureAuth = async (
  preferredMethod: AuthType = 'anonymous'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser.uid);
      return;
    }

    // Listener per cambi di stato auth
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log(
          '🔐 Utente autenticato:',
          user.displayName || user.email || user.uid
        );
        unsubscribe();
        resolve(user.uid);
      }
    });

    // Avvia login in base al metodo preferito
    const signInMethod =
      preferredMethod === 'google' ? signInWithGoogle() : signInAnonymous();

    signInMethod
      .then(() => {
        console.log(`🔐 Login ${preferredMethod} completato`);
      })
      .catch((error) => {
        console.error('❌ Errore autenticazione:', error);
        unsubscribe();
        reject(error);
      });
  });
};

/**
 * Ottiene info utente corrente
 */
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

/**
 * Logout utente
 */
export const signOut = async (): Promise<void> => {
  try {
    await auth.signOut();
    console.log('🔐 Logout completato');
  } catch (error) {
    console.error('❌ Errore logout:', error);
    throw error;
  }
};

// Configurazione per development (usa Firebase Emulator se disponibile)
if (process.env.NODE_ENV === 'development') {
  // Decommentare per usare emulator locale in sviluppo
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}
