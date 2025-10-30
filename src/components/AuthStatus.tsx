// src/components/AuthStatus.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * Componente leggero per mostrare solo lo status di autenticazione
 * Sostituisce AuthTest quando non serve debug completo
 */
const AuthStatus: React.FC = () => {
  const { user, isLoading, isAuthenticated, isAnonymous } = useAuth();

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 text-sm text-gray-500'>
        <div className='w-2 h-2 bg-yellow-500 rounded-full animate-pulse'></div>
        Connessione...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='flex items-center gap-2 text-sm text-gray-500'>
        <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
        Non autenticato
      </div>
    );
  }

  return (
    <div className='flex items-center gap-2 text-sm'>
      <div className='w-2 h-2 bg-green-500 rounded-full'></div>
      <span className='text-green-700 font-medium'>
        {isAnonymous ? '👤 Anonimo' : '👨‍💻 Google'}
      </span>
      {!isAnonymous && user?.displayName && (
        <span className='text-gray-600'>• {user.displayName}</span>
      )}
    </div>
  );
};

export default AuthStatus;
