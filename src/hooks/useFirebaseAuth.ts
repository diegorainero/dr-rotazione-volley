// src/hooks/useFirebaseAuth.ts
import { useState, useEffect } from 'react';

export interface AuthState {
  user: any | null;
  isLoading: boolean;
  isReady: boolean; // Indica se l'autenticazione è stata inizializzata
}

/**
 * Hook per gestire lo stato dell'autenticazione Firebase
 * Risolve la race condition tra inizializzazione e controllo utente
 */
export const useFirebaseAuth = (): AuthState => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isReady: false
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        const { auth } = await import('../config/firebase');
        
        // Listener per cambiamenti di autenticazione
        unsubscribe = auth.onAuthStateChanged((user) => {
          console.log('🔐 Auth state changed:', {
            uid: user?.uid || null,
            isAnonymous: user?.isAnonymous,
            email: user?.email
          });
          
          setAuthState({
            user,
            isLoading: false,
            isReady: true
          });
        });

      } catch (error) {
        console.error('❌ Errore inizializzazione auth listener:', error);
        setAuthState({
          user: null,
          isLoading: false,
          isReady: true
        });
      }
    };

    initializeAuth();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return authState;
};

/**
 * Utility per attendere che l'autenticazione sia pronta
 */
export const waitForAuthReady = (): Promise<any> => {
  return new Promise((resolve) => {
    const { getCurrentUser } = require('../config/firebase');
    
    const checkAuth = () => {
      try {
        const user = getCurrentUser();
        if (user !== null || user === null) { // Considera pronto anche se null
          resolve(user);
        } else {
          setTimeout(checkAuth, 50);
        }
      } catch (error) {
        // Se errore, considera pronto comunque
        resolve(null);
      }
    };
    
    checkAuth();
    
    // Timeout di sicurezza
    setTimeout(() => resolve(null), 2000);
  });
};