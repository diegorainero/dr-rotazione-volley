// src/hooks/useLocalMode.ts
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'rotazioni-local-mode';

function readStoredLocalMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch (error) {
    // localStorage may be unavailable (private mode, old WebViews)
    return false;
  }
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

type Listener = (localMode: boolean) => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener(readStoredLocalMode());
    } catch (error) {
      // ignore listener failures
    }
  });
}

function writeStoredLocalMode(enabled: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch (error) {
    // ignore persistence failures; state stays in memory for this session
  }
  notify();
}

/**
 * Local mode: uses the app fully offline, without any Firebase login.
 * The explicit user choice is persisted in localStorage; additionally,
 * "no network" (navigator.onLine === false) is treated as local mode
 * implicitly, so the app always opens when the gym has no connection.
 */
export const useLocalMode = () => {
  const [explicit, setExplicit] = useState<boolean>(readStoredLocalMode);
  const [offline, setOffline] = useState<boolean>(isOffline);

  useEffect(() => {
    const listener: Listener = (localMode) => setExplicit(localMode);
    listeners.add(listener);

    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setExplicit(readStoredLocalMode());
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('storage', handleStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const enableLocalMode = useCallback(() => {
    writeStoredLocalMode(true);
  }, []);

  const disableLocalMode = useCallback(() => {
    writeStoredLocalMode(false);
  }, []);

  return {
    isLocalMode: explicit || offline,
    isExplicitlyLocal: explicit,
    isOffline: offline,
    enableLocalMode,
    disableLocalMode,
  };
};
