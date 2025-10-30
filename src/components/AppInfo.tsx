// src/components/AppInfo.tsx
import React, { useState } from 'react';

/**
 * Componente che mostra informazioni sull'app e il deployment
 */
const AppInfo: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);

  const deployInfo = {
    version: process.env.REACT_APP_VERSION || '1.0.0',
    buildTime: process.env.REACT_APP_BUILD_TIME || new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hosting:
      window.location.hostname.includes('firebaseapp.com') ||
      window.location.hostname.includes('.web.app')
        ? 'Firebase Hosting'
        : 'Local/Other',
    domain: window.location.origin,
  };

  const isFirebaseHosted = deployInfo.hosting === 'Firebase Hosting';

  return (
    <div className='fixed bottom-4 right-4 z-50'>
      <button
        onClick={() => setShowInfo(!showInfo)}
        className='w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm font-medium'
        title='Info App'
      >
        ℹ️
      </button>

      {showInfo && (
        <div className='absolute bottom-12 right-0 bg-white rounded-lg shadow-xl border p-4 min-w-80 max-w-sm'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='font-semibold text-gray-800'>
              🏐 DR Rotazioni Volley
            </h3>
            <button
              onClick={() => setShowInfo(false)}
              className='text-gray-400 hover:text-gray-600 text-lg'
            >
              ×
            </button>
          </div>

          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-600'>Versione:</span>
              <span className='font-mono text-gray-800'>
                {deployInfo.version}
              </span>
            </div>

            <div className='flex justify-between'>
              <span className='text-gray-600'>Ambiente:</span>
              <span
                className={`font-medium ${
                  deployInfo.environment === 'production'
                    ? 'text-green-600'
                    : 'text-orange-600'
                }`}
              >
                {deployInfo.environment}
              </span>
            </div>

            <div className='flex justify-between'>
              <span className='text-gray-600'>Hosting:</span>
              <span
                className={`font-medium flex items-center gap-1 ${
                  isFirebaseHosted ? 'text-orange-600' : 'text-blue-600'
                }`}
              >
                {isFirebaseHosted ? '🔥' : '💻'} {deployInfo.hosting}
              </span>
            </div>

            <div className='flex justify-between'>
              <span className='text-gray-600'>Dominio:</span>
              <span className='font-mono text-xs text-gray-600 break-all'>
                {deployInfo.domain}
              </span>
            </div>
          </div>

          {isFirebaseHosted && (
            <div className='mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700'>
              ✅ App hostata su Firebase - Domini automaticamente autorizzati!
            </div>
          )}

          <div className='mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500'>
            <div className='flex items-center justify-between'>
              <span>Build:</span>
              <span className='font-mono'>
                {new Date(deployInfo.buildTime).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className='mt-3 flex gap-1'>
            <a
              href='https://github.com/diegorainero/dr-rotazione-volley'
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 px-2 py-1 bg-gray-100 text-gray-700 text-center rounded text-xs hover:bg-gray-200'
            >
              📂 GitHub
            </a>
            <a
              href='https://console.firebase.google.com/project/dr-rotazioni-volley'
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 px-2 py-1 bg-orange-100 text-orange-700 text-center rounded text-xs hover:bg-orange-200'
            >
              🔥 Console
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppInfo;
