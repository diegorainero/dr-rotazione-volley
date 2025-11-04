// src/components/AuthStatusIndicator.tsx
import React, { useState, useEffect } from 'react';

interface AuthStatus {
  user: any | null;
  isReady: boolean;
  logs: string[];
}

/**
 * Componente per debugging dello stato di autenticazione in tempo reale
 */
const AuthStatusIndicator: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    user: null,
    isReady: false,
    logs: [],
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        const { auth } = await import('../config/firebase');

        unsubscribe = auth.onAuthStateChanged((user) => {
          const timestamp = new Date().toLocaleTimeString();
          const log = `[${timestamp}] Auth changed: ${
            user
              ? `${user.uid} (${user.isAnonymous ? 'anon' : 'google'})`
              : 'null'
          }`;

          setAuthStatus((prev) => ({
            user,
            isReady: true,
            logs: [...prev.logs.slice(-9), log], // Mantieni ultimi 10 log
          }));
        });
      } catch (error) {
        console.error('Auth indicator error:', error);
      }
    };

    initAuth();
    return () => unsubscribe?.();
  }, []);

  const { user, isReady, logs } = authStatus;

  return (
    <div className='fixed top-2 right-2 z-50'>
      <div
        className={`px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
          !isReady
            ? 'bg-yellow-200 text-yellow-800'
            : user && !user.isAnonymous
            ? 'bg-green-200 text-green-800'
            : user
            ? 'bg-blue-200 text-blue-800'
            : 'bg-gray-200 text-gray-800'
        }`}
        onClick={() => setShowDetails(!showDetails)}
        title='Click per dettagli autenticazione'
      >
        {!isReady
          ? '⏳'
          : user && !user.isAnonymous
          ? '🔐'
          : user
          ? '👤'
          : '❌'}
        Auth
      </div>

      {showDetails && (
        <div className='absolute top-8 right-0 bg-white border rounded-lg shadow-lg p-3 w-64 text-xs'>
          <div className='mb-2'>
            <strong>Status:</strong>{' '}
            {!isReady
              ? 'Loading...'
              : user
              ? 'Authenticated'
              : 'Not authenticated'}
          </div>
          {user && (
            <div className='mb-2 space-y-1'>
              <div>
                <strong>UID:</strong> {user.uid.substring(0, 8)}...
              </div>
              <div>
                <strong>Type:</strong>{' '}
                {user.isAnonymous ? 'Anonymous' : 'Google'}
              </div>
              {user.email && (
                <div>
                  <strong>Email:</strong> {user.email}
                </div>
              )}
            </div>
          )}
          <div>
            <strong>Recent logs:</strong>
            <div className='max-h-32 overflow-y-auto mt-1 space-y-1'>
              {logs.map((log, i) => (
                <div key={i} className='text-gray-600 font-mono text-xs'>
                  {log}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowDetails(false)}
            className='mt-2 bg-gray-200 px-2 py-1 rounded text-xs hover:bg-gray-300'
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthStatusIndicator;
