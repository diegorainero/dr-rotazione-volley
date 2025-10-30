// src/utils/firestoreTest.ts
import { FirestoreService } from '../services/firestoreService';
import { signInAnonymous } from '../config/firebase';

/**
 * Test di connettività Firestore
 */
export async function testFirestoreConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    console.log('🔍 Testing Firestore connection...');

    // 1. Test autenticazione
    console.log('1️⃣ Test autenticazione...');
    const user = await signInAnonymous();
    if (!user) {
      return { success: false, message: 'Autenticazione fallita' };
    }
    console.log('✅ Autenticazione riuscita:', user.uid);

    // 2. Test lettura squadre utente
    console.log('2️⃣ Test lettura squadre...');
    const teams = await FirestoreService.getUserTeams();
    console.log(
      '✅ Lettura squadre riuscita:',
      teams.length,
      'squadre trovate'
    );

    // 3. Test scrittura squadra di test
    console.log('3️⃣ Test scrittura squadra...');
    const testTeam = {
      code: `TEST_${Date.now()}`,
      name: 'Test Squad',
      description: 'Squadra di test per verificare connettività',
      players: [],
      createdAt: new Date().toISOString(),
      formations: 0,
      receptions: 0,
      isPublic: false,
    };

    const savedTeam = await FirestoreService.saveTeam(testTeam);
    console.log('✅ Scrittura squadra riuscita:', savedTeam.code);

    // 4. Test verifica esistenza
    console.log('4️⃣ Test verifica esistenza...');
    const exists = await FirestoreService.teamExists(testTeam.code);
    console.log('✅ Verifica esistenza riuscita:', exists);

    // 5. Test eliminazione squadra di test
    console.log('5️⃣ Test eliminazione squadra...');
    await FirestoreService.deleteTeam(testTeam.code);
    console.log('✅ Eliminazione squadra riuscita');

    return {
      success: true,
      message: 'Tutti i test Firestore completati con successo!',
      details: {
        userId: user.uid,
        existingTeams: teams.length,
        testTeamCode: testTeam.code,
      },
    };
  } catch (error: any) {
    console.error('❌ Test Firestore fallito:', error);

    let errorMessage = 'Errore sconosciuto';
    if (error.code === 'permission-denied') {
      errorMessage = 'Errore di permessi - verifica regole Firestore';
    } else if (error.code === 'unavailable') {
      errorMessage = 'Database non disponibile - verifica connessione';
    } else if (error.code === 'unauthenticated') {
      errorMessage = 'Errore di autenticazione';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
      details: {
        errorCode: error.code,
        errorMessage: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * Test rapido solo di lettura (senza modifiche)
 */
export async function quickFirestoreTest(): Promise<boolean> {
  try {
    const user = await signInAnonymous();
    if (!user) return false;

    await FirestoreService.getUserTeams();
    console.log('🟢 Firestore: Connessione OK');
    return true;
  } catch (error) {
    console.error('🔴 Firestore: Connessione FAILED', error);
    return false;
  }
}

/**
 * Test da console del browser
 */
declare global {
  interface Window {
    testFirestore: () => Promise<void>;
    quickTestFirestore: () => Promise<void>;
  }
}

if (typeof window !== 'undefined') {
  window.testFirestore = async () => {
    const result = await testFirestoreConnection();
    console.log('🔍 Test Firestore Result:', result);
  };

  window.quickTestFirestore = async () => {
    const result = await quickFirestoreTest();
    console.log('⚡ Quick Test Result:', result ? '✅ OK' : '❌ FAILED');
  };
}
