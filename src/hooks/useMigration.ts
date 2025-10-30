// src/hooks/useMigration.ts
import { useState, useCallback } from 'react';
import { MigrationService } from '../services/migrationService';
import { useAuth } from './useAuth';

export interface MigrationState {
  isLoading: boolean;
  progress: {
    migrated: number;
    failed: number;
    total: number;
  };
  error: string | null;
  completed: boolean;
  summary: {
    localTeams: number;
    hasFirestoreAccess: boolean;
  } | null;
}

export interface ComparisonResult {
  localOnly: string[];
  firestoreOnly: string[];
  both: string[];
  conflicts: string[];
}

export function useMigration() {
  const { user } = useAuth();
  const [state, setState] = useState<MigrationState>({
    isLoading: false,
    progress: { migrated: 0, failed: 0, total: 0 },
    error: null,
    completed: false,
    summary: null,
  });

  /**
   * Ottiene sommario dei dati disponibili
   */
  const getDataSummary = useCallback(() => {
    try {
      const summary = MigrationService.getDataSummary();
      setState((prev) => ({
        ...prev,
        summary: {
          localTeams: summary.local.teams,
          hasFirestoreAccess: summary.firestore.available,
        },
        error: null,
      }));
      return summary;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message,
      }));
      return null;
    }
  }, []);

  /**
   * Confronta dati locali con Firestore
   */
  const compareData =
    useCallback(async (): Promise<ComparisonResult | null> => {
      if (!user) {
        setState((prev) => ({
          ...prev,
          error: 'Utente non autenticato',
        }));
        return null;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const comparison = await MigrationService.compareLocalWithFirestore();
        setState((prev) => ({ ...prev, isLoading: false }));
        return comparison;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
        return null;
      }
    }, [user]);

  /**
   * Migra tutte le squadre locali a Firestore
   */
  const migrateToFirestore = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        error: 'Utente non autenticato - effettua il login',
      }));
      return false;
    }

    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        completed: false,
        progress: { migrated: 0, failed: 0, total: 0 },
      }));

      // Ottieni il totale prima di iniziare
      const summary = MigrationService.getDataSummary();
      const total = summary.local.teams;

      setState((prev) => ({
        ...prev,
        progress: { ...prev.progress, total },
      }));

      // Esegui migrazione
      const result = await MigrationService.migrateAllTeamsToFirestore();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        completed: true,
        progress: {
          migrated: result.migrated,
          failed: result.failed,
          total,
        },
        error: result.errors.length > 0 ? result.errors.join('\n') : null,
      }));

      return result.migrated > 0;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
        completed: false,
      }));
      return false;
    }
  }, [user]);

  /**
   * Esegue backup da Firestore a localStorage
   */
  const backupToLocal = useCallback(async () => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        error: 'Utente non autenticato - effettua il login',
      }));
      return false;
    }

    try {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        completed: false,
      }));

      const result = await MigrationService.backupFirestoreToLocal();

      setState((prev) => ({
        ...prev,
        isLoading: false,
        completed: true,
        progress: {
          migrated: result.backed,
          failed: result.failed,
          total: result.backed + result.failed,
        },
        error: result.errors.length > 0 ? result.errors.join('\n') : null,
      }));

      return result.backed > 0;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      return false;
    }
  }, [user]);

  /**
   * Sincronizza una squadra specifica
   */
  const syncTeam = useCallback(
    async (teamCode: string) => {
      if (!user) {
        setState((prev) => ({
          ...prev,
          error: 'Utente non autenticato',
        }));
        return false;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
        const result = await MigrationService.syncTeamToFirestore(teamCode);
        setState((prev) => ({ ...prev, isLoading: false }));
        return result;
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
        return false;
      }
    },
    [user]
  );

  /**
   * Reset dello stato
   */
  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      progress: { migrated: 0, failed: 0, total: 0 },
      error: null,
      completed: false,
      summary: null,
    });
  }, []);

  return {
    // Stato
    ...state,
    isAuthenticated: !!user,

    // Azioni
    getDataSummary,
    compareData,
    migrateToFirestore,
    backupToLocal,
    syncTeam,
    resetState,
  };
}
