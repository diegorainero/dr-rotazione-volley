// src/hooks/useAutoSync.ts
import { useState, useEffect, useCallback } from 'react';
import { AutoSyncService } from '../services/autoSyncService';
import { useAuth } from './useAuth';

interface UseAutoSyncReturn {
  // Stato
  isEnabled: boolean;
  isRunning: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  errors: string[];
  successfulSyncs: number;
  attempts: number;

  // Configurazione
  intervalMinutes: number;

  // Azioni
  enable: () => void;
  disable: () => void;
  setInterval: (minutes: number) => void;
  syncNow: () => Promise<boolean>;
  reset: () => void;

  // Statistiche
  getStats: () => any;
}

export function useAutoSync(): UseAutoSyncReturn {
  const { user } = useAuth();
  const autoSync = AutoSyncService.getInstance();

  // Stato locale
  const [state, setState] = useState(autoSync.getState());
  const [config, setConfig] = useState(autoSync.getConfig());

  // Setup listener per cambi di stato
  useEffect(() => {
    const unsubscribe = () => {
      autoSync.setStateChangeListener((newState) => {
        setState(newState);
      });
    };

    unsubscribe();

    // Aggiorna configurazione iniziale
    setConfig(autoSync.getConfig());
    setState(autoSync.getState());

    return () => {
      // Cleanup se necessario
    };
  }, [autoSync]);

  // Auto-disable quando l'utente si disconnette
  useEffect(() => {
    if (!user && config.enabled) {
      console.log('👤 Utente disconnesso - disabilito AutoSync');
      autoSync.configure({ enabled: false });
    }
  }, [user, config.enabled, autoSync]);

  // Azioni
  const enable = useCallback(() => {
    if (!user) {
      console.warn('⚠️ AutoSync richiede autenticazione');
      return;
    }

    autoSync.configure({ enabled: true });
    setConfig(autoSync.getConfig());
    console.log('▶️ AutoSync abilitato');
  }, [user, autoSync]);

  const disable = useCallback(() => {
    autoSync.configure({ enabled: false });
    setConfig(autoSync.getConfig());
    console.log('⏸️ AutoSync disabilitato');
  }, [autoSync]);

  const setInterval = useCallback(
    (minutes: number) => {
      if (minutes < 1) {
        console.warn('⚠️ Intervallo minimo: 1 minuto');
        return;
      }

      autoSync.configure({ intervalMinutes: minutes });
      setConfig(autoSync.getConfig());
      console.log(`⏰ AutoSync intervallo aggiornato: ${minutes} minuti`);
    },
    [autoSync]
  );

  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.warn('⚠️ Sync manuale richiede autenticazione');
      return false;
    }

    console.log('🚀 Sync manuale avviato...');
    return await autoSync.syncNow();
  }, [user, autoSync]);

  const reset = useCallback(() => {
    autoSync.reset();
    setState(autoSync.getState());
    console.log('🔄 AutoSync reset');
  }, [autoSync]);

  const getStats = useCallback(() => {
    return autoSync.getStats();
  }, [autoSync]);

  return {
    // Stato
    isEnabled: config.enabled,
    isRunning: state.isRunning,
    lastSync: state.lastSync,
    nextSync: state.nextSync,
    errors: state.errors,
    successfulSyncs: state.successfulSyncs,
    attempts: state.attempts,

    // Configurazione
    intervalMinutes: config.intervalMinutes,

    // Azioni
    enable,
    disable,
    setInterval,
    syncNow,
    reset,
    getStats,
  };
}
