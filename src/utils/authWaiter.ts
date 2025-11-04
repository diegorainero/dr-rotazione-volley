// src/utils/authWaiter.ts
/**
 * Utility per attendere in modo robusto che l'autenticazione sia pronta
 */
export class AuthWaiter {
  /**
   * Attende che Firebase Auth sia inizializzato e abbia uno stato stabile
   */
  static async waitForAuth(maxAttempts: number = 30): Promise<any> {
    return new Promise((resolve) => {
      let attempts = 0;
      
      const checkAuth = () => {
        attempts++;
        
        try {
          const { getCurrentUser } = require('../config/firebase');
          const user = getCurrentUser();
          
          // Se abbiamo un utente (anche anonimo) o abbiamo fatto abbastanza tentativi
          if (user !== undefined || attempts >= maxAttempts) {
            console.log(`🔐 AuthWaiter: Auth risolto dopo ${attempts} tentativi`, 
              user ? { uid: user.uid.substring(0, 8), isAnonymous: user.isAnonymous } : 'null');
            resolve(user);
            return;
          }
          
          // Riprova dopo un breve delay
          setTimeout(checkAuth, 100);
          
        } catch (error) {
          // Se c'è un errore, probabilmente Firebase non è ancora pronto
          if (attempts >= maxAttempts) {
            console.warn('⚠️ AuthWaiter: Timeout raggiunto, procedo senza auth');
            resolve(null);
          } else {
            setTimeout(checkAuth, 100);
          }
        }
      };
      
      checkAuth();
    });
  }

  /**
   * Versione rapida per controlli non critici
   */
  static async quickCheck(): Promise<any> {
    try {
      const { getCurrentUser } = require('../config/firebase');
      return getCurrentUser();
    } catch (error) {
      return null;
    }
  }
}