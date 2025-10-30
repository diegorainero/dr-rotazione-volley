// src/components/AuthTest.tsx
import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, getCurrentUser } from '../config/firebase';

/**
 * Componente di test per verificare il funzionamento dell'autenticazione
 * Mostra informazioni dettagliate sull'utente corrente
 */
const AuthTest: React.FC = () => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [authHistory, setAuthHistory] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);

      const timestamp = new Date().toLocaleTimeString();
      if (user) {
        const method = user.isAnonymous ? 'Anonimo' : 'Google';
        const name = user.displayName || user.email || 'N/A';
        setAuthHistory((prev) => [
          `${timestamp}: Login ${method} - ${name}`,
          ...prev.slice(0, 4), // Mantieni solo gli ultimi 5 eventi
        ]);
      } else {
        setAuthHistory((prev) => [`${timestamp}: Logout`, ...prev.slice(0, 4)]);
      }
    });

    return unsubscribe;
  }, []);

  if (!user) {
    return (
      <div className='bg-gray-100 rounded-lg p-4 border-2 border-dashed border-gray-300'>
        <div className='text-center text-gray-500'>
          <div className='text-2xl mb-2'>🔒</div>
          <div className='font-medium'>Nessun utente autenticato</div>
          <div className='text-sm mt-1'>
            Effettua il login per vedere i dettagli
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white rounded-lg shadow-sm border p-4'>
      <h3 className='text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2'>
        🔍 Debug Autenticazione
        <span className='text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full'>
          CONNESSO
        </span>
      </h3>

      <div className='space-y-3'>
        {/* Tipo di utente */}
        <div className='bg-blue-50 rounded-lg p-3'>
          <div className='font-medium text-blue-800 mb-1'>
            {user.isAnonymous ? '👤 Utente Anonimo' : '👨‍💻 Utente Google'}
          </div>
          <div className='text-sm text-blue-700'>
            {user.isAnonymous
              ? 'Account temporaneo legato a questo dispositivo'
              : 'Account persistente sincronizzabile'}
          </div>
        </div>

        {/* Informazioni utente */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
          <div>
            <span className='font-medium text-gray-600'>UID:</span>
            <div className='font-mono text-xs text-gray-800 bg-gray-100 p-1 rounded mt-1'>
              {user.uid}
            </div>
          </div>

          {user.email && (
            <div>
              <span className='font-medium text-gray-600'>Email:</span>
              <div className='text-gray-800 mt-1'>{user.email}</div>
            </div>
          )}

          {user.displayName && (
            <div>
              <span className='font-medium text-gray-600'>Nome:</span>
              <div className='text-gray-800 mt-1'>{user.displayName}</div>
            </div>
          )}

          <div>
            <span className='font-medium text-gray-600'>Verificato:</span>
            <div className='text-gray-800 mt-1'>
              {user.emailVerified ? '✅ Sì' : '❌ No'}
            </div>
          </div>

          {user.photoURL && (
            <div>
              <span className='font-medium text-gray-600'>Avatar:</span>
              <img
                src={user.photoURL}
                alt='Avatar'
                className='w-8 h-8 rounded-full mt-1'
              />
            </div>
          )}

          <div>
            <span className='font-medium text-gray-600'>Creato:</span>
            <div className='text-gray-800 mt-1 text-xs'>
              {user.metadata.creationTime}
            </div>
          </div>

          <div>
            <span className='font-medium text-gray-600'>Ultimo accesso:</span>
            <div className='text-gray-800 mt-1 text-xs'>
              {user.metadata.lastSignInTime}
            </div>
          </div>
        </div>

        {/* Provider informazioni */}
        <div>
          <span className='font-medium text-gray-600'>Provider:</span>
          <div className='mt-1 space-y-1'>
            {user.providerData.map((provider, index) => (
              <div key={index} className='text-sm bg-gray-50 p-2 rounded'>
                <span className='font-medium'>{provider.providerId}</span>
                {provider.email && (
                  <span className='text-gray-600 ml-2'>• {provider.email}</span>
                )}
              </div>
            ))}
            {user.providerData.length === 0 && (
              <div className='text-sm text-gray-500 italic'>
                Nessun provider esterno (utente anonimo)
              </div>
            )}
          </div>
        </div>

        {/* Cronologia eventi */}
        {authHistory.length > 0 && (
          <div>
            <span className='font-medium text-gray-600'>Eventi recenti:</span>
            <div className='mt-1 space-y-1 max-h-32 overflow-y-auto'>
              {authHistory.map((event, index) => (
                <div
                  key={index}
                  className='text-xs text-gray-600 bg-gray-50 p-1 rounded font-mono'
                >
                  {event}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Token info (per debug) */}
      <details className='mt-4'>
        <summary className='text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-800'>
          🔧 Informazioni tecniche (Debug)
        </summary>
        <div className='mt-2 p-2 bg-gray-50 rounded text-xs font-mono'>
          <div>
            <strong>Anonymous:</strong> {user.isAnonymous.toString()}
          </div>
          <div>
            <strong>Refresh Token:</strong>{' '}
            {user.refreshToken ? 'Presente' : 'Assente'}
          </div>
          <div>
            <strong>Providers:</strong> {user.providerData.length}
          </div>
        </div>
      </details>
    </div>
  );
};

export default AuthTest;
