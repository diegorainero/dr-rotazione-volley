// src/components/AuthManager.tsx
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signInAnonymous,
  signOut,
  AuthType,
} from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

interface AuthManagerProps {
  onAuthChange?: (user: User | null) => void;
  preferredMethod?: AuthType;
}

const AuthManager: React.FC<AuthManagerProps> = ({
  onAuthChange,
  preferredMethod = 'anonymous',
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

  const handleAnonymousSignIn = async () => {
    setIsLoading(true);
    clearError();
    try {
      await signInAnonymous();
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
              {isAnonymous ? '👤' : '👨‍💻'}
              <span className='font-medium text-green-800'>
                {isAnonymous ? 'Utente Anonimo' : 'Utente Google'}
              </span>
            </div>

            {!isAnonymous && user.displayName && (
              <div className='text-sm text-green-700'>
                Nome: {user.displayName}
              </div>
            )}

            {!isAnonymous && user.email && (
              <div className='text-sm text-green-700'>Email: {user.email}</div>
            )}

            <div className='text-xs text-green-600 mt-1'>
              ID: {user.uid.substring(0, 12)}...
            </div>
          </div>

          <div className='flex gap-2'>
            {isAnonymous && (
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className='flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 text-sm'
              >
                {isLoading ? '⏳' : '🔗'} Collega Google
              </button>
            )}

            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className='px-3 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 text-sm'
            >
              {isLoading ? '⏳' : '🚪'} Logout
            </button>
          </div>
        </div>
      ) : (
        <div className='space-y-3'>
          <div className='text-sm text-gray-600 mb-3'>
            Scegli come accedere al cloud sync:
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className='w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {isLoading ? '⏳' : '🔗'} Accedi con Google
          </button>

          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-gray-300'></div>
            </div>
            <div className='relative flex justify-center text-xs'>
              <span className='bg-white px-2 text-gray-500'>oppure</span>
            </div>
          </div>

          <button
            onClick={handleAnonymousSignIn}
            disabled={isLoading}
            className='w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2'
          >
            {isLoading ? '⏳' : '👤'} Accesso Anonimo
          </button>
        </div>
      )}

      {authError && (
        <div className='mt-3 text-red-600 text-sm bg-red-50 p-2 rounded'>
          ⚠️ {authError}
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
