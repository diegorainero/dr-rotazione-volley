// src/components/AuthManager.tsx
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signOut,
  AuthType,
  getUnauthorizedDomainInstructions,
} from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

interface AuthManagerProps {
  onAuthChange?: (user: User | null) => void;
  preferredMethod?: AuthType;
}

const AuthManager: React.FC<AuthManagerProps> = ({
  onAuthChange,
  preferredMethod = 'google',
}) => {
  const {
    user,
    isLoading: authLoading,
    error: authError,
    clearError,
    setAuthError,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Notifica cambi di autenticazione al parent
  useEffect(() => {
    onAuthChange?.(user);
  }, [user, onAuthChange]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    clearError();
    try {
      await signInWithGoogle();
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const isAnonymous = user?.isAnonymous;

  return (
    <div className='bg-white rounded-lg shadow-sm border p-4 mb-4'>
      <div className='flex items-center justify-between mb-3'>
        <h3 className='text-lg font-semibold text-gray-800 flex items-center gap-2'>
          🔐 Autenticazione
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              user ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </h3>
      </div>

      {user ? (
        <div className='space-y-3'>
          <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
            <div className='flex items-center gap-2 mb-2'>
              ‍💻
              <span className='font-medium text-green-800'>
                Utente Google Autenticato
              </span>
            </div>

            {user.displayName && (
              <div className='text-sm text-green-700'>
                Nome: {user.displayName}
              </div>
            )}

            {user.email && (
              <div className='text-sm text-green-700'>Email: {user.email}</div>
            )}

            <div className='text-xs text-green-600 mt-1'>
              ID: {user.uid.substring(0, 12)}...
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className='w-full px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm'
          >
            {isLoading ? '⏳' : '🚪'} Logout
          </button>
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='text-sm text-gray-600 mb-3'>
            Accedi con il tuo account Google per utilizzare l'app:
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className='w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {isLoading ? '⏳' : '🔗'} Accedi con Google
          </button>

          <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
            <p className='text-xs text-yellow-700'>
              <strong>📋 Nota:</strong> L'accesso è obbligatorio per utilizzare
              l'app. I tuoi dati saranno associati al tuo account Google per la
              sicurezza.
            </p>
          </div>
        </div>
      )}

      {authError && (
        <div className='mt-3 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3'>
          {authError.includes('Dominio non autorizzato') ? (
            <div>
              <div className='font-medium text-red-800 mb-2'>
                🚫 Dominio Non Autorizzato
              </div>
              <div className='text-red-700 text-xs space-y-1'>
                {getUnauthorizedDomainInstructions().map(
                  (instruction, index) => (
                    <div
                      key={index}
                      className={
                        instruction.startsWith('💡') ? 'font-medium mt-2' : ''
                      }
                    >
                      {instruction}
                    </div>
                  )
                )}
              </div>
              <button
                onClick={() =>
                  window.open('https://console.firebase.google.com', '_blank')
                }
                className='mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200'
              >
                🔧 Apri Firebase Console
              </button>
            </div>
          ) : (
            <div>⚠️ {authError}</div>
          )}
        </div>
      )}

      <div className='mt-4 pt-3 border-t border-gray-200'>
        <div className='text-xs text-gray-500 space-y-1'>
          <div>
            <strong>🔗 Google:</strong> Accesso universale, squadre condivise
          </div>
          <div>
            <strong>👤 Anonimo:</strong> Veloce, nessun dato personale
          </div>
          <div className='text-amber-600 mt-2'>
            💡 Puoi sempre collegare Google dopo l'accesso anonimo
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthManager;
