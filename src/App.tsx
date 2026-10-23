import React, { useState } from 'react';
import VolleyballCourt from './components/VolleyballCourt';
import AppInfo from './components/AppInfo';
import { MigrationPanel } from './components/MigrationPanel';
import { CloudStatus } from './components/CloudStatus';
import AuthManager from './components/AuthManager';
import AuthStatusIndicator from './components/AuthStatusIndicator';
import { useAuth } from './hooks/useAuth';
import { useLocalMode } from './hooks/useLocalMode';
import './utils/firestoreTest'; // Import test utilities

function App() {
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);
  const { user, isLoading } = useAuth();
  const { isLocalMode, isExplicitlyLocal, enableLocalMode, disableLocalMode } =
    useLocalMode();

  // Local mode (explicit choice or no network): enter the app directly,
  // without waiting for or requiring Firebase auth.
  const inLocalMode = isLocalMode && !user;

  // Loading state (skipped in local mode: never block on Firebase)
  if (isLoading && !inLocalMode) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-green-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Caricamento...</p>
        </div>
      </div>
    );
  }

  // Authentication required - show login screen
  if (!user && !inLocalMode) {
    return (
      <div className='min-h-screen flex flex-col items-center justify-center bg-green-100'>
        <div className='bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4'>
          <div className='text-center mb-6'>
            <h1 className='text-2xl font-bold text-gray-800 mb-2'>
              🏐 Rotazioni Volley
            </h1>
            <p className='text-gray-600 mb-4'>
              Accesso richiesto per utilizzare l'app
            </p>
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4'>
              <p className='text-sm text-blue-800'>
                <strong>🔐 Autenticazione Obbligatoria</strong>
                <br />
                Per utilizzare l'app è necessario effettuare l'accesso con
                Google. I tuoi dati saranno protetti e associati al tuo account.
              </p>
            </div>
          </div>

          <AuthManager
            preferredMethod='google'
            onAuthChange={() => {
              // Ricarica automatica dopo login
            }}
          />

          {/* Secondaria: utilizzo offline senza account (es. palestra senza rete) */}
          <div className='mt-4 pt-4 border-t border-gray-200'>
            <button
              onClick={enableLocalMode}
              className='w-full min-h-[48px] px-4 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 active:bg-gray-800 transition-colors'
            >
              📴 Continua in modalità locale
            </button>
            <p className='mt-2 text-xs text-gray-500 text-center'>
              Funziona senza connessione e senza account. I dati restano sul
              dispositivo.
            </p>
          </div>
        </div>

        {/* Info app ridotta per pagina login */}
        <div className='mt-8 text-center text-sm text-gray-500'>
          <p>🚀 App per allenatori di pallavolo</p>
          <p>Gestione rotazioni e formazioni professionali</p>
        </div>
      </div>
    );
  }

  // User authenticated (or local mode) - show main app
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-green-100'>
      {/* Auth Status Indicator - solo in development */}
      {process.env.NODE_ENV === 'development' && <AuthStatusIndicator />}

      <div className='flex items-center gap-4 mb-4'>
        <h1 className='text-2xl font-bold'>Analizzatore Rotazioni Pallavolo</h1>
        <CloudStatus onOpenMigration={() => setShowMigrationPanel(true)} />
        {inLocalMode && (
          <span className='bg-gray-200 text-gray-700 border border-gray-300 text-sm px-3 py-1 rounded-full'>
            📴 Modalità locale
          </span>
        )}
        {inLocalMode && isExplicitlyLocal && (
          <button
            onClick={disableLocalMode}
            className='min-h-[40px] px-3 py-1 text-sm bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-100 transition-colors'
            title='Esci dalla modalità locale e torna alla pagina di accesso'
          >
            🌐 Esci dalla modalità locale
          </button>
        )}
      </div>

      <VolleyballCourt />

      {/* Info app e deployment */}
      <AppInfo />

      {/* Pannello migrazione */}
      {showMigrationPanel && (
        <MigrationPanel onClose={() => setShowMigrationPanel(false)} />
      )}
    </div>
  );
}

export default App;
