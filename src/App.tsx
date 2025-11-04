import React, { useState } from 'react';
import VolleyballCourt from './components/VolleyballCourt';
import AppInfo from './components/AppInfo';
import { MigrationPanel } from './components/MigrationPanel';
import { CloudStatus } from './components/CloudStatus';
import AuthManager from './components/AuthManager';
import AuthStatusIndicator from './components/AuthStatusIndicator';
import { useAuth } from './hooks/useAuth';
import { User } from 'firebase/auth';
import './utils/firestoreTest'; // Import test utilities

function App() {
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);
  const { user, isLoading } = useAuth();

  // Loading state
  if (isLoading) {
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
  if (!user) {
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
        </div>

        {/* Info app ridotta per pagina login */}
        <div className='mt-8 text-center text-sm text-gray-500'>
          <p>🚀 App per allenatori di pallavolo</p>
          <p>Gestione rotazioni e formazioni professionali</p>
        </div>
      </div>
    );
  }

  // User authenticated - show main app
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-green-100'>
      {/* Auth Status Indicator - solo in development */}
      {process.env.NODE_ENV === 'development' && <AuthStatusIndicator />}
      
      <div className='flex items-center gap-4 mb-4'>
        <h1 className='text-2xl font-bold'>Analizzatore Rotazioni Pallavolo</h1>
        <CloudStatus onOpenMigration={() => setShowMigrationPanel(true)} />
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
