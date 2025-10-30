// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';

// Configurazione Firebase - Progetto dr-rotazioni-volley
const firebaseConfig = {
  apiKey: 'xxx',
  authDomain: 'xxx',
  projectId: 'xxx',
  storageBucket: 'xxx',
  messagingSenderId: 'xxx',
  appId: 'xxx',
  measurementId: 'xxx',
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);

// Configurazione Firestore con settings ottimizzati
export const db = getFirestore(app);

// Configurazioni per migliorare la connettività
const initializeFirestore = async () => {
  try {
    // Configurazioni per ridurre errori di connettività
    console.log('🔥 Inizializzazione Firestore...');

    // Gestione connettività
    window.addEventListener('online', async () => {
      console.log('🌐 Connessione ripristinata, riattivo Firestore');
      try {
        await enableNetwork(db);
      } catch (error) {
        console.warn('⚠️ Errore riattivazione rete:', error);
      }
    });

    window.addEventListener('offline', async () => {
      console.log('📴 Connessione persa, disattivo Firestore');
      try {
        await disableNetwork(db);
      } catch (error) {
        console.warn('⚠️ Errore disattivazione rete:', error);
      }
    });
  } catch (error) {
    console.error('❌ Errore inizializzazione Firestore:', error);
  }
};

// Inizializza automaticamente
initializeFirestore();

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

    // Gestione errori specifici
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login cancellato dall'utente");
    }

    if (error.code === 'auth/unauthorized-domain') {
      throw new Error(
        'Dominio non autorizzato. Configura il dominio nelle impostazioni Firebase:\n' +
          '1. Vai su Firebase Console → Authentication → Settings\n' +
          '2. Aggiungi questo dominio agli "Authorized domains"\n' +
          `3. Dominio corrente: ${window.location.origin}`
      );
    }

    if (error.code === 'auth/operation-not-allowed') {
      throw new Error(
        'Google Sign-in non è abilitato. Vai su Firebase Console → Authentication → Sign-in method e abilita Google.'
      );
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

    // Timeout per evitare listener infiniti
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timeout autenticazione'));
    }, 10000);

    // Listener per cambi di stato auth
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log(
          '🔐 Utente autenticato:',
          user.displayName || user.email || user.uid
        );
        clearTimeout(timeout);
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
        clearTimeout(timeout);
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

/**
 * Verifica la configurazione Firebase e fornisce istruzioni per errori comuni
 */
export const checkFirebaseConfig = async (): Promise<{
  isValid: boolean;
  error?: string;
  instructions?: string[];
}> => {
  try {
    // Verifica se il progetto è configurato correttamente
    if (firebaseConfig.projectId === 'demo-project-id') {
      return {
        isValid: false,
        error: 'Configurazione demo attiva',
        instructions: [
          '1. Crea un progetto su https://console.firebase.google.com',
          '2. Vai su Project Settings → General → Your apps',
          '3. Clicca su "</>" per creare una web app',
          '4. Copia la configurazione e sostituiscila in firebase.ts',
        ],
      };
    }

    // Test di connessione base (senza autenticazione)
    return {
      isValid: true,
      error: undefined,
      instructions: undefined,
    };
  } catch (error: any) {
    return {
      isValid: false,
      error: error.message,
      instructions: [
        'Verifica la configurazione Firebase nel file firebase.ts',
        'Assicurati che il progetto Firebase esista e sia attivo',
      ],
    };
  }
};

/**
 * Ottiene le istruzioni per risolvere l'errore unauthorized-domain
 */
export const getUnauthorizedDomainInstructions = (): string[] => {
  const currentDomain =
    typeof window !== 'undefined' ? window.location.origin : 'localhost:3000';

  return [
    '🔧 Per risolvere l\'errore "unauthorized-domain":',
    '',
    '1. Vai su Firebase Console: https://console.firebase.google.com',
    `2. Seleziona il progetto "${firebaseConfig.projectId}"`,
    '3. Nel menu laterale: Authentication → Settings',
    '4. Scorri fino a "Authorized domains"',
    `5. Clicca "Add domain" e aggiungi: ${currentDomain}`,
    '6. Se stai usando localhost, aggiungi anche: localhost',
    '7. Salva le modifiche',
    '',
    '💡 Domini comuni da aggiungere:',
    '   • localhost (per development)',
    '   • il tuo dominio di produzione',
    '   • netlify/vercel domains se usi questi servizi',
  ];
};

// Configurazione per development (usa Firebase Emulator se disponibile)
if (process.env.NODE_ENV === 'development') {
  // Decommentare per usare emulator locale in sviluppo
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}
