// src/components/FirebaseConfigHelper.tsx
import React, { useState, useEffect } from 'react';
import {
  checkFirebaseConfig,
  getUnauthorizedDomainInstructions,
} from '../config/firebase';

/**
 * Componente helper per diagnosticare e risolvere problemi di configurazione Firebase
 */
const FirebaseConfigHelper: React.FC = () => {
  const [configStatus, setConfigStatus] = useState<{
    isValid: boolean;
    error?: string;
    instructions?: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const status = await checkFirebaseConfig();
        setConfigStatus(status);
      } catch (error: any) {
        setConfigStatus({
          isValid: false,
          error: error.message,
          instructions: [
            'Errore durante la verifica della configurazione Firebase',
          ],
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkConfig();
  }, []);

  if (isLoading) {
    return (
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4'>
        <div className='flex items-center gap-2'>
          <div className='w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
          <span className='text-blue-700 text-sm'>
            Verifica configurazione Firebase...
          </span>
        </div>
      </div>
    );
  }

  if (!configStatus || configStatus.isValid) {
    return null; // Non mostra nulla se tutto è ok
  }

  return (
    <div className='bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4'>
      <div className='flex items-start gap-3'>
        <div className='text-amber-600 text-xl mt-0.5'>⚠️</div>
        <div className='flex-1'>
          <div className='font-medium text-amber-800 mb-2'>
            Problema Configurazione Firebase
          </div>

          <div className='text-amber-700 text-sm mb-3'>
            <strong>Errore:</strong> {configStatus.error}
          </div>

          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className='text-amber-700 underline text-sm hover:text-amber-800 mb-3'
          >
            {showInstructions ? '🔼 Nascondi' : '🔽 Mostra'} istruzioni per la
            risoluzione
          </button>

          {showInstructions && (
            <div className='space-y-3'>
              {/* Istruzioni generali */}
              {configStatus.instructions && (
                <div className='bg-amber-100 rounded p-3'>
                  <div className='font-medium text-amber-800 mb-2'>
                    📋 Istruzioni Generali:
                  </div>
                  <div className='text-amber-700 text-xs space-y-1'>
                    {configStatus.instructions.map((instruction, index) => (
                      <div key={index}>• {instruction}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Istruzioni specifiche per unauthorized-domain */}
              <div className='bg-amber-100 rounded p-3'>
                <div className='font-medium text-amber-800 mb-2'>
                  🔧 Risoluzione "Unauthorized Domain":
                </div>
                <div className='text-amber-700 text-xs space-y-1'>
                  {getUnauthorizedDomainInstructions().map(
                    (instruction, index) => (
                      <div
                        key={index}
                        className={
                          instruction.startsWith('💡')
                            ? 'font-medium mt-2'
                            : instruction.trim() === ''
                            ? 'h-1'
                            : ''
                        }
                      >
                        {instruction}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Link utili */}
              <div className='flex gap-2'>
                <button
                  onClick={() =>
                    window.open('https://console.firebase.google.com', '_blank')
                  }
                  className='px-3 py-2 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 flex items-center gap-1'
                >
                  🔧 Firebase Console
                </button>
                <button
                  onClick={() =>
                    window.open(
                      'https://firebase.google.com/docs/auth/web/start',
                      '_blank'
                    )
                  }
                  className='px-3 py-2 bg-amber-100 text-amber-700 rounded text-xs hover:bg-amber-200 flex items-center gap-1'
                >
                  📚 Documentazione
                </button>
              </div>

              {/* Info dominio corrente */}
              <div className='bg-gray-100 rounded p-2 text-xs text-gray-600'>
                <strong>Dominio corrente:</strong> {window.location.origin}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirebaseConfigHelper;
