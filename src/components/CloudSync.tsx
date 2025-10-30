// src/components/CloudSync.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { CloudService, CloudSyncStatus } from '../services/cloudService';
import { TeamCodeService } from '../services/teamCodeService';
import AuthManager from './AuthManager';
import FirebaseConfigHelper from './FirebaseConfigHelper';
import { useAuth } from '../hooks/useAuth';

interface CloudSyncProps {
  onSyncStatusChange?: (status: CloudSyncStatus) => void;
}

const CloudSync: React.FC<CloudSyncProps> = ({ onSyncStatusChange }) => {
  const { user: currentUser } = useAuth();
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>(
    CloudService.getSyncStatus()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Ottimizzazione: listener unico per cloud sync status
  useEffect(() => {
    const unsubscribe = CloudService.addSyncStatusListener(() => {
      const newStatus = CloudService.getSyncStatus();
      setSyncStatus(newStatus);
      onSyncStatusChange?.(newStatus);
    });

    return unsubscribe;
  }, [onSyncStatusChange]);

  // Ottimizzazione: aggiorna sync status quando cambia l'utente
  const handleAuthChange = useCallback(
    (user: User | null) => {
      const newStatus = CloudService.getSyncStatus();
      setSyncStatus(newStatus);
      onSyncStatusChange?.(newStatus);
    },
    [onSyncStatusChange]
  );

  const toggleCloudSync = useCallback(async () => {
    if (!currentUser) {
      console.warn('⚠️ Autenticazione richiesta per attivare cloud sync');
      return;
    }

    setIsLoading(true);

    try {
      if (syncStatus.isEnabled) {
        await CloudService.disableCloudSync();
      } else {
        const success = await CloudService.enableCloudSync();
        if (success) {
          // Backup delle squadre locali esistenti (non bloccante)
          const localTeams = TeamCodeService.getAllTeams();
          if (localTeams.length > 0) {
            console.log(
              `📤 Backup di ${localTeams.length} squadre nel cloud...`
            );
            // Esegui backup in background
            CloudService.backupAllTeams(localTeams).catch((err) =>
              console.error('❌ Errore backup:', err)
            );
          }
        }
      }
    } catch (error) {
      console.error('❌ Errore toggle cloud sync:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, syncStatus.isEnabled]);

  const syncAllTeams = useCallback(async () => {
    if (!syncStatus.isEnabled) return;

    setIsLoading(true);
    try {
      const localTeams = TeamCodeService.getAllTeams();
      const synced = await CloudService.backupAllTeams(localTeams);
      console.log(`✅ Sincronizzate ${synced} squadre`);
    } catch (error) {
      console.error('❌ Errore sincronizzazione:', error);
    } finally {
      setIsLoading(false);
    }
  }, [syncStatus.isEnabled]);

  return (
    <div className='space-y-4'>
      {/* Helper per configurazione Firebase */}
      <FirebaseConfigHelper />

      {/* Componente di Autenticazione */}
      <AuthManager onAuthChange={handleAuthChange} />

      {/* Cloud Sync Controls */}
      <div className='bg-white rounded-lg shadow-sm border p-4'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-lg font-semibold text-gray-800 flex items-center gap-2'>
            ☁️ Sync Cloud
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                syncStatus.isEnabled ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </h3>

          <button
            onClick={toggleCloudSync}
            disabled={isLoading || !currentUser}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              syncStatus.isEnabled
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            } ${
              isLoading || !currentUser ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading
              ? '⏳'
              : syncStatus.isEnabled
              ? '📱 Disattiva'
              : '☁️ Attiva'}
          </button>
        </div>

        {!currentUser && (
          <div className='mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm'>
            ⚠️ Autenticazione richiesta per il cloud sync
          </div>
        )}

        <div className='space-y-2 text-sm text-gray-600'>
          <div className='flex justify-between'>
            <span>Status:</span>
            <span
              className={`font-medium ${
                syncStatus.isEnabled ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {syncStatus.isEnabled ? '🟢 Attivo' : '🔴 Disattivo'}
            </span>
          </div>

          <div className='flex justify-between'>
            <span>Connessione:</span>
            <span
              className={`font-medium ${
                syncStatus.isOnline ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {syncStatus.isOnline ? '🌐 Online' : '📵 Offline'}
            </span>
          </div>

          {syncStatus.lastSync && (
            <div className='flex justify-between'>
              <span>Ultimo sync:</span>
              <span className='font-medium text-gray-700'>
                {syncStatus.lastSync.toLocaleTimeString()}
              </span>
            </div>
          )}

          {syncStatus.error && (
            <div className='text-amber-600 text-xs mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200'>
              {syncStatus.error.includes('demo') ? (
                <div>
                  <div className='font-medium mb-2'>
                    🚀 Cloud Sync non configurato
                  </div>
                  <div className='text-amber-700'>
                    Per abilitare il sync cloud:
                  </div>
                  <ol className='list-decimal list-inside mt-1 space-y-1 text-amber-700'>
                    <li>
                      Vai su{' '}
                      <a
                        href='https://console.firebase.google.com'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='underline font-medium'
                      >
                        Firebase Console
                      </a>
                    </li>
                    <li>Crea un nuovo progetto</li>
                    <li>Abilita Firestore Database</li>
                    <li>Abilita Authentication (Anonymous)</li>
                    <li>
                      Sostituisci la config in{' '}
                      <code className='bg-amber-100 px-1 rounded'>
                        firebase.ts
                      </code>
                    </li>
                  </ol>
                  <div className='mt-2 text-xs text-amber-600'>
                    L'app funziona perfettamente senza cloud, le squadre sono
                    salvate localmente
                  </div>
                </div>
              ) : (
                <div>⚠️ {syncStatus.error}</div>
              )}
            </div>
          )}
        </div>

        {syncStatus.isEnabled && (
          <div className='mt-4 pt-3 border-t border-gray-200'>
            <button
              onClick={syncAllTeams}
              disabled={isLoading || !syncStatus.isOnline}
              className='w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? '⏳ Sincronizzando...' : '🔄 Sincronizza Tutte'}
            </button>

            <p className='text-xs text-gray-500 mt-2 text-center'>
              Le squadre vengono sincronizzate automaticamente quando create o
              modificate
            </p>
          </div>
        )}

        <div className='mt-3 pt-3 border-t border-gray-200'>
          <div className='text-xs text-gray-500'>
            <p className='mb-1'>
              💡 <strong>Sync Cloud:</strong>
            </p>
            <ul className='list-disc list-inside space-y-1 ml-2'>
              <li>Accesso universale alle squadre da qualsiasi dispositivo</li>
              <li>Backup automatico nel cloud</li>
              <li>Condivisione semplificata tramite codici</li>
              <li>Funziona anche offline (sync al riconnettarsi)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudSync;
