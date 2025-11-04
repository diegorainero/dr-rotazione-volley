// src/utils/firebaseErrorHandler.ts
export interface FirebaseErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  canRetry: boolean;
  requiresAuth: boolean;
}

/**
 * Gestisce e traduce gli errori Firebase in messaggi user-friendly
 */
export const handleFirebaseError = (error: any): FirebaseErrorInfo => {
  const errorCode = error?.code || 'unknown';

  switch (errorCode) {
    case 'permission-denied':
      return {
        code: errorCode,
        message: error.message,
        userMessage:
          '🔒 Accesso cloud limitato. Effettua il login Google per accedere alle formazioni cloud.',
        canRetry: false,
        requiresAuth: true,
      };

    case 'unauthenticated':
      return {
        code: errorCode,
        message: error.message,
        userMessage:
          '🔐 Sessione scaduta. Effettua nuovamente il login per accedere al cloud.',
        canRetry: true,
        requiresAuth: true,
      };

    case 'unavailable':
    case 'deadline-exceeded':
      return {
        code: errorCode,
        message: error.message,
        userMessage:
          '📡 Connessione cloud temporaneamente non disponibile. Riprova tra qualche momento.',
        canRetry: true,
        requiresAuth: false,
      };

    case 'not-found':
      return {
        code: errorCode,
        message: error.message,
        userMessage: '📂 Nessuna formazione trovata nel cloud.',
        canRetry: false,
        requiresAuth: false,
      };

    case 'failed-precondition':
      return {
        code: errorCode,
        message: error.message,
        userMessage: '⚠️ Operazione non valida. Verifica i dati e riprova.',
        canRetry: false,
        requiresAuth: false,
      };

    default:
      return {
        code: errorCode,
        message: error.message || 'Errore sconosciuto',
        userMessage: `❌ Errore cloud: ${
          error.message || 'Operazione fallita'
        }`,
        canRetry: true,
        requiresAuth: false,
      };
  }
};

/**
 * Log strutturato per errori Firebase
 */
export const logFirebaseError = (
  operation: string,
  error: any,
  context?: Record<string, any>
): void => {
  const errorInfo = handleFirebaseError(error);

  console.group(`❌ Firebase Error: ${operation}`);
  console.log('🔍 Code:', errorInfo.code);
  console.log('📝 Message:', errorInfo.message);
  console.log('👤 User Message:', errorInfo.userMessage);
  console.log('🔄 Can Retry:', errorInfo.canRetry);
  console.log('🔐 Requires Auth:', errorInfo.requiresAuth);

  if (context) {
    console.log('📋 Context:', context);
  }

  console.groupEnd();
};
