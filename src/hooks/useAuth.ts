// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { auth, getCurrentUser } from '../config/firebase';

/**
 * Hook ottimizzato per gestire l'autenticazione Firebase
 * Evita memory leak e riconnessioni multiple
 */
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized callback per evitare re-render continui
  const handleAuthStateChange = useCallback(
    (user: User | null) => {
      setUser(user);
      setIsLoading(false);
      if (error && user) {
        setError(null);
      }
    },
    [error]
  );

  useEffect(() => {
    setIsLoading(true);

    const unsubscribe = auth.onAuthStateChanged(handleAuthStateChange);

    // Cleanup garantito
    return () => {
      unsubscribe();
    };
  }, [handleAuthStateChange]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setAuthError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  return {
    user,
    isLoading,
    error,
    clearError,
    setAuthError,
    isAuthenticated: !!user,
    isAnonymous: user?.isAnonymous || false,
  };
};

/**
 * Hook per gestire lo stato del cloud sync
 * Ottimizzato per evitare listener duplicati
 */
export const useCloudSync = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Monitor connessione internet
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateSyncStatus = useCallback(
    (enabled: boolean, syncTime?: Date, errorMsg?: string) => {
      setIsEnabled(enabled);
      if (syncTime) setLastSync(syncTime);
      if (errorMsg !== undefined) setError(errorMsg);
    },
    []
  );

  return {
    isEnabled,
    isOnline,
    lastSync,
    error,
    updateSyncStatus,
  };
};
