// src/components/MigrationPanel.tsx
import React, { useState, useEffect } from 'react';
import { useMigration, ComparisonResult } from '../hooks/useMigration';
import { useAuth } from '../hooks/useAuth';
import { useAutoSync } from '../hooks/useAutoSync';
import { signInWithGoogle, signInAnonymous } from '../config/firebase';

interface MigrationPanelProps {
  onClose?: () => void;
}

export const MigrationPanel: React.FC<MigrationPanelProps> = ({ onClose }) => {
  const { user } = useAuth();
  const {
    isLoading,
    progress,
    error,
    completed,
    summary,
    isAuthenticated,
    getDataSummary,
    compareData,
    migrateToFirestore,
    backupToLocal,
    resetState,
  } = useMigration();

  const autoSync = useAutoSync();
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [activeTab, setActiveTab] = useState<
    'summary' | 'migrate' | 'backup' | 'autosync'
  >('summary');

  useEffect(() => {
    getDataSummary();
  }, [getDataSummary]);

  const handleCompareData = async () => {
    const result = await compareData();
    if (result) {
      setComparison(result);
    }
  };

  const handleMigrate = async () => {
    const success = await migrateToFirestore();
    if (success) {
      // Aggiorna confronto dopo migrazione
      handleCompareData();
    }
  };

  const renderAuthSection = () => {
    if (isAuthenticated) {
      return (
        <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-6'>
          <div className='flex items-center gap-2 text-green-700'>
            <span className='text-lg'>✅</span>
            <span>Accesso a Firestore attivo</span>
          </div>
          {user?.email && (
            <p className='text-sm text-green-600 mt-1'>
              Connesso come: {user.email}
            </p>
          )}
        </div>
      );
    }

    return (
      <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6'>
        <h3 className='font-medium text-amber-800 mb-2'>
          🔐 Accesso richiesto per Firestore
        </h3>
        <p className='text-sm text-amber-700 mb-4'>
          Per migrare i dati nel cloud è necessario autenticarsi
        </p>
        <div className='flex gap-2'>
          <button
            onClick={signInWithGoogle}
            className='bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700'
          >
            Accedi con Google
          </button>
          <button
            onClick={signInAnonymous}
            className='bg-gray-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700'
          >
            Accesso anonimo
          </button>
        </div>
      </div>
    );
  };

  const renderSummaryTab = () => (
    <div className='space-y-4'>
      {summary && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
            <h4 className='font-medium text-blue-800 mb-2'>💾 Dati Locali</h4>
            <p className='text-2xl font-bold text-blue-900'>
              {summary.localTeams}
            </p>
            <p className='text-sm text-blue-700'>squadre salvate localmente</p>
          </div>

          <div
            className={`border rounded-lg p-4 ${
              summary.hasFirestoreAccess
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <h4
              className={`font-medium mb-2 ${
                summary.hasFirestoreAccess ? 'text-green-800' : 'text-gray-800'
              }`}
            >
              ☁️ Firestore
            </h4>
            <p
              className={`text-sm ${
                summary.hasFirestoreAccess ? 'text-green-700' : 'text-gray-600'
              }`}
            >
              {summary.hasFirestoreAccess ? 'Disponibile' : 'Non autenticato'}
            </p>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className='space-y-3'>
          <button
            onClick={handleCompareData}
            disabled={isLoading}
            className='w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50'
          >
            {isLoading
              ? 'Confronto in corso...'
              : '🔍 Confronta dati locale vs cloud'}
          </button>

          {comparison && (
            <div className='bg-gray-50 border rounded-lg p-4'>
              <h4 className='font-medium mb-3'>📊 Risultato confronto:</h4>
              <div className='grid grid-cols-2 gap-3 text-sm'>
                <div>
                  <span className='font-medium text-blue-700'>
                    Solo locali:
                  </span>
                  <span className='ml-2 bg-blue-100 px-2 py-1 rounded'>
                    {comparison.localOnly.length}
                  </span>
                </div>
                <div>
                  <span className='font-medium text-green-700'>
                    Solo cloud:
                  </span>
                  <span className='ml-2 bg-green-100 px-2 py-1 rounded'>
                    {comparison.firestoreOnly.length}
                  </span>
                </div>
                <div>
                  <span className='font-medium text-purple-700'>
                    In entrambi:
                  </span>
                  <span className='ml-2 bg-purple-100 px-2 py-1 rounded'>
                    {comparison.both.length}
                  </span>
                </div>
                <div>
                  <span className='font-medium text-red-700'>Conflitti:</span>
                  <span className='ml-2 bg-red-100 px-2 py-1 rounded'>
                    {comparison.conflicts.length}
                  </span>
                </div>
              </div>

              {comparison.localOnly.length > 0 && (
                <div className='mt-3'>
                  <p className='text-sm font-medium text-blue-700 mb-1'>
                    Squadre solo locali:
                  </p>
                  <div className='flex flex-wrap gap-1'>
                    {comparison.localOnly.map((code) => (
                      <span
                        key={code}
                        className='bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs'
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderMigrateTab = () => (
    <div className='space-y-4'>
      {!isAuthenticated ? (
        <p className='text-gray-600 text-center py-8'>
          Effettua l'accesso per migrare i dati
        </p>
      ) : (
        <>
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
            <h4 className='font-medium text-blue-800 mb-2'>
              📤 Migrazione Locale → Firestore
            </h4>
            <p className='text-sm text-blue-700 mb-4'>
              Carica tutte le squadre locali su Firestore per l'accesso
              universale
            </p>

            {!completed && (
              <button
                onClick={handleMigrate}
                disabled={isLoading || summary?.localTeams === 0}
                className='w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50'
              >
                {isLoading
                  ? 'Migrazione in corso...'
                  : `🚀 Migra ${summary?.localTeams || 0} squadre`}
              </button>
            )}
          </div>

          {isLoading && (
            <div className='bg-white border rounded-lg p-4'>
              <div className='flex items-center justify-between mb-2'>
                <span className='text-sm font-medium'>
                  Progresso migrazione
                </span>
                <span className='text-sm text-gray-600'>
                  {progress.migrated + progress.failed} / {progress.total}
                </span>
              </div>
              <div className='w-full bg-gray-200 rounded-full h-2'>
                <div
                  className='bg-blue-600 h-2 rounded-full transition-all duration-300'
                  style={{
                    width: `${
                      progress.total > 0
                        ? ((progress.migrated + progress.failed) /
                            progress.total) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          )}

          {completed && (
            <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
              <div className='flex items-center gap-2 text-green-700 mb-2'>
                <span className='text-lg'>✅</span>
                <span className='font-medium'>Migrazione completata!</span>
              </div>
              <div className='text-sm text-green-600'>
                <p>✅ {progress.migrated} squadre migrate con successo</p>
                {progress.failed > 0 && (
                  <p>❌ {progress.failed} squadre fallite</p>
                )}
              </div>
              <button
                onClick={resetState}
                className='mt-3 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700'
              >
                🔄 Nuova migrazione
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderBackupTab = () => (
    <div className='space-y-4'>
      {!isAuthenticated ? (
        <p className='text-gray-600 text-center py-8'>
          Effettua l'accesso per scaricare i backup
        </p>
      ) : (
        <div className='bg-orange-50 border border-orange-200 rounded-lg p-4'>
          <h4 className='font-medium text-orange-800 mb-2'>
            📥 Backup Firestore → Locale
          </h4>
          <p className='text-sm text-orange-700 mb-4'>
            Scarica una copia di tutte le squadre dal cloud al dispositivo
          </p>
          <button
            onClick={backupToLocal}
            disabled={isLoading}
            className='w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50'
          >
            {isLoading ? 'Backup in corso...' : '💾 Esegui backup locale'}
          </button>
        </div>
      )}
    </div>
  );

  const renderAutoSyncTab = () => (
    <div className='space-y-4'>
      {!isAuthenticated ? (
        <p className='text-gray-600 text-center py-8'>
          Effettua l'accesso per configurare l'auto-sync
        </p>
      ) : (
        <>
          {/* Status AutoSync */}
          <div
            className={`border rounded-lg p-4 ${
              autoSync.isEnabled
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className='flex items-center justify-between mb-3'>
              <h4
                className={`font-medium ${
                  autoSync.isEnabled ? 'text-green-800' : 'text-gray-800'
                }`}
              >
                🔄 Sincronizzazione Automatica
              </h4>
              <div className='flex items-center gap-2'>
                <button
                  onClick={
                    autoSync.isEnabled ? autoSync.disable : autoSync.enable
                  }
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    autoSync.isEnabled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {autoSync.isEnabled ? 'Disabilita' : 'Abilita'}
                </button>
              </div>
            </div>

            <div className='text-sm space-y-2'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <span className='text-gray-600'>Stato:</span>
                  <span
                    className={`ml-2 font-medium ${
                      autoSync.isRunning
                        ? 'text-blue-600'
                        : autoSync.isEnabled
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {autoSync.isRunning
                      ? '🔄 In esecuzione...'
                      : autoSync.isEnabled
                      ? '✅ Attivo'
                      : '⏸️ Disattivo'}
                  </span>
                </div>
                <div>
                  <span className='text-gray-600'>Intervallo:</span>
                  <span className='ml-2 font-medium'>
                    {autoSync.intervalMinutes} min
                  </span>
                </div>
                <div>
                  <span className='text-gray-600'>Sync riusciti:</span>
                  <span className='ml-2 font-medium text-green-600'>
                    {autoSync.successfulSyncs}
                  </span>
                </div>
                <div>
                  <span className='text-gray-600'>Tentativi:</span>
                  <span className='ml-2 font-medium'>{autoSync.attempts}</span>
                </div>
              </div>

              {autoSync.lastSync && (
                <div>
                  <span className='text-gray-600'>Ultimo sync:</span>
                  <span className='ml-2 font-medium'>
                    {new Date(autoSync.lastSync).toLocaleString('it-IT')}
                  </span>
                </div>
              )}

              {autoSync.nextSync && autoSync.isEnabled && (
                <div>
                  <span className='text-gray-600'>Prossimo sync:</span>
                  <span className='ml-2 font-medium text-blue-600'>
                    {(() => {
                      const nextTime = new Date(autoSync.nextSync);
                      const now = new Date();
                      const diffMin = Math.round(
                        (nextTime.getTime() - now.getTime()) / 60000
                      );
                      return diffMin > 0
                        ? `tra ${diffMin} minuti`
                        : 'imminente';
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Configurazione */}
          {autoSync.isEnabled && (
            <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
              <h5 className='font-medium text-blue-800 mb-3'>
                ⚙️ Configurazione
              </h5>
              <div className='space-y-3'>
                <div>
                  <label className='block text-sm font-medium text-blue-700 mb-1'>
                    Intervallo sincronizzazione (minuti)
                  </label>
                  <select
                    value={autoSync.intervalMinutes}
                    onChange={(e) =>
                      autoSync.setInterval(Number(e.target.value))
                    }
                    className='w-full p-2 border border-blue-300 rounded bg-white text-sm'
                  >
                    <option value={1}>1 minuto</option>
                    <option value={2}>2 minuti</option>
                    <option value={5}>5 minuti</option>
                    <option value={10}>10 minuti</option>
                    <option value={15}>15 minuti</option>
                    <option value={30}>30 minuti</option>
                    <option value={60}>60 minuti</option>
                  </select>
                </div>

                <div className='flex gap-2'>
                  <button
                    onClick={autoSync.syncNow}
                    disabled={autoSync.isRunning}
                    className='bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50'
                  >
                    {autoSync.isRunning ? 'Sync in corso...' : '🚀 Sync ora'}
                  </button>

                  <button
                    onClick={autoSync.reset}
                    className='bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700'
                  >
                    🔄 Reset statistiche
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Errori */}
          {autoSync.errors.length > 0 && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
              <h5 className='font-medium text-red-800 mb-2'>
                ❌ Errori Recenti
              </h5>
              <div className='space-y-1'>
                {autoSync.errors.slice(-3).map((error, index) => (
                  <p key={index} className='text-sm text-red-700 font-mono'>
                    {error}
                  </p>
                ))}
                {autoSync.errors.length > 3 && (
                  <p className='text-xs text-red-600 italic'>
                    ... e altri {autoSync.errors.length - 3} errori
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
            <h5 className='font-medium text-gray-800 mb-2'>ℹ️ Come funziona</h5>
            <ul className='text-sm text-gray-700 space-y-1 list-disc list-inside'>
              <li>
                AutoSync trasferisce automaticamente le squadre locali su
                Firestore
              </li>
              <li>Funziona solo quando sei autenticato e online</li>
              <li>Si ferma automaticamente se vai offline</li>
              <li>Evita duplicati e gestisce errori con retry automatico</li>
              <li>Disabilitato automaticamente al logout per privacy</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
      <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden'>
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-xl font-bold'>🔄 Gestione Dati Cloud</h2>
          {onClose && (
            <button
              onClick={onClose}
              className='text-gray-500 hover:text-gray-700'
            >
              ✕
            </button>
          )}
        </div>

        <div className='p-6 overflow-y-auto'>
          {renderAuthSection()}

          {error && (
            <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
              <div className='flex items-center gap-2 text-red-700 mb-1'>
                <span>❌</span>
                <span className='font-medium'>Errore</span>
              </div>
              <pre className='text-sm text-red-600 whitespace-pre-wrap'>
                {error}
              </pre>
            </div>
          )}

          {/* Tabs */}
          <div className='flex border-b mb-6 overflow-x-auto'>
            {[
              { id: 'summary', label: '📊 Sommario', key: 'summary' },
              { id: 'migrate', label: '📤 Migra', key: 'migrate' },
              { id: 'backup', label: '📥 Backup', key: 'backup' },
              { id: 'autosync', label: '🔄 Auto-Sync', key: 'autosync' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'summary' && renderSummaryTab()}
          {activeTab === 'migrate' && renderMigrateTab()}
          {activeTab === 'backup' && renderBackupTab()}
          {activeTab === 'autosync' && renderAutoSyncTab()}
        </div>
      </div>
    </div>
  );
};
