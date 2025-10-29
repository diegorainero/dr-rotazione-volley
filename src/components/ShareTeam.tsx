import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { TeamCodeService } from '../services/teamCodeService';

interface ShareTeamProps {
  teamCode: string;
  teamName: string;
}

const ShareTeam: React.FC<ShareTeamProps> = ({ teamCode, teamName }) => {
  const [showQR, setShowQR] = useState(false);

  const shareUrl = TeamCodeService.generateShareUrl(teamCode);

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        alert('📋 Link copiato negli appunti!');
      })
      .catch(() => {
        // Fallback per browser senza clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('📋 Link copiato!');
      });
  };

  const shareNative = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Squadra: ${teamName}`,
          text: `Unisciti alla squadra ${teamName} su Rotazioni Volley!`,
          url: shareUrl,
        })
        .catch(console.error);
    } else {
      copyToClipboard();
    }
  };

  if (showQR) {
    return (
      <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
        <div className='bg-white rounded-lg p-6 max-w-sm w-full text-center'>
          <h3 className='font-bold text-lg mb-4'>📱 Condividi Squadra</h3>

          <div className='mb-4'>
            <p className='text-sm text-gray-600 mb-2'>
              Scansiona il QR code per <strong>unirti automaticamente</strong>{' '}
              alla squadra:
            </p>
            <p className='font-semibold text-blue-800'>{teamName}</p>
            <p className='text-xs text-gray-500 font-mono'>{teamCode}</p>
            <div className='bg-green-50 border border-green-200 rounded p-2 mt-2 text-xs text-green-800'>
              ✅ Include tutti i dati della squadra - Funziona su qualsiasi
              dispositivo!
            </div>
          </div>

          {/* QR Code */}
          <div className='bg-white p-4 rounded-lg shadow-inner mb-4 flex justify-center'>
            <QRCode value={shareUrl} size={200} />
          </div>

          {/* Link diretto */}
          <div className='mb-4'>
            <p className='text-xs text-gray-500 mb-2'>
              Oppure condividi il link:
            </p>
            <div className='bg-gray-100 p-2 rounded text-xs break-all font-mono'>
              {shareUrl}
            </div>
          </div>

          {/* Pulsanti */}
          <div className='flex gap-2'>
            <button
              onClick={copyToClipboard}
              className='flex-1 bg-blue-600 text-white px-3 py-2 text-sm rounded hover:bg-blue-700'
            >
              📋 Copia Link
            </button>
            <button
              onClick={shareNative}
              className='flex-1 bg-green-600 text-white px-3 py-2 text-sm rounded hover:bg-green-700'
            >
              📤 Condividi
            </button>
          </div>

          <button
            onClick={() => setShowQR(false)}
            className='mt-3 text-gray-500 hover:text-gray-700 text-sm'
          >
            ✕ Chiudi
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowQR(true)}
      className='bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs rounded transition-colors'
      title={`Condividi squadra ${teamName}`}
    >
      📱 QR
    </button>
  );
};

export default ShareTeam;
