// src/utils/firebaseTest.ts

import { auth } from '../config/firebase';

/**
 * Test rapido per verificare la configurazione Firebase
 */
export const testFirebaseConfig = () => {
  const results = {
    domain: window.location.origin,
    projectId: auth.app.options.projectId,
    authDomain: auth.app.options.authDomain,
    tests: {
      configLoaded: false,
      authInitialized: false,
      domainMatch: false,
    },
    recommendations: [] as string[],
  };

  try {
    // Test 1: Configurazione caricata
    if (
      auth.app.options.projectId &&
      auth.app.options.projectId !== 'demo-project-id'
    ) {
      results.tests.configLoaded = true;
    } else {
      results.recommendations.push(
        '⚠️ Sostituire configurazione demo con dati reali del progetto Firebase'
      );
    }

    // Test 2: Auth inizializzato
    if (auth) {
      results.tests.authInitialized = true;
    }

    // Test 3: Dominio compatibile
    const authDomain = auth.app.options.authDomain;
    if (authDomain) {
      const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const isAuthDomain = window.location.hostname.includes(
        authDomain.replace('.firebaseapp.com', '')
      );

      if (isLocalhost) {
        results.tests.domainMatch = true;
        results.recommendations.push(
          '💡 In development su localhost - assicurati che "localhost" sia negli Authorized domains'
        );
      } else if (isAuthDomain) {
        results.tests.domainMatch = true;
      } else {
        results.recommendations.push(
          `❌ Dominio ${window.location.origin} non corrisponde ad authDomain ${authDomain}`
        );
        results.recommendations.push(
          '🔧 Aggiungi questo dominio agli "Authorized domains" in Firebase Console'
        );
      }
    }

    // Raccomandazioni generali
    if (!results.tests.configLoaded || !results.tests.domainMatch) {
      results.recommendations.push(
        '📖 Consulta FIREBASE_SETUP.md per istruzioni dettagliate'
      );
    }
  } catch (error: any) {
    results.recommendations.push(
      `❌ Errore test configurazione: ${error.message}`
    );
  }

  return results;
};

/**
 * Log risultati test nella console
 */
export const logFirebaseTest = () => {
  const results = testFirebaseConfig();

  console.log('🔥 FIREBASE CONFIGURATION TEST');
  console.log('================================');
  console.log(`Domain: ${results.domain}`);
  console.log(`Project ID: ${results.projectId}`);
  console.log(`Auth Domain: ${results.authDomain}`);
  console.log('');
  console.log('Tests:');
  console.log(`  Config Loaded: ${results.tests.configLoaded ? '✅' : '❌'}`);
  console.log(
    `  Auth Initialized: ${results.tests.authInitialized ? '✅' : '❌'}`
  );
  console.log(`  Domain Match: ${results.tests.domainMatch ? '✅' : '❌'}`);
  console.log('');

  if (results.recommendations.length > 0) {
    console.log('Recommendations:');
    results.recommendations.forEach((rec) => console.log(`  ${rec}`));
  } else {
    console.log('✅ All tests passed!');
  }

  return results;
};
