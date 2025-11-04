// src/components/DebugTeamLoading.tsx
import React, { useState, useEffect } from 'react';
import { TeamCodeService } from '../services/teamCodeService';

interface DebugTeamLoadingProps {
  onClose: () => void;
}

const DebugTeamLoading: React.FC<DebugTeamLoadingProps> = ({ onClose }) => {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const runDebug = async () => {
    console.log('🔍 === AVVIO DEBUG TEAM LOADING ===');

    const logs: string[] = [];

    // Debug embedded team data in URL
    const teamData = TeamCodeService.getTeamDataFromUrl();
    if (teamData) {
      logs.push(
        `✅ Dati team trovati nell'URL: ${teamData.name} (${teamData.code})`
      );
    } else {
      logs.push(`❌ Nessun dato team embedded nell'URL`);
    }

    // Debug team code from URL (async)
    const teamCode = TeamCodeService.getTeamCodeFromUrl();
    if (teamCode) {
      logs.push(`🔗 Codice team dall'URL: ${teamCode}`);
      try {
        const result = await TeamCodeService.loadTeam(teamCode);
        if (result.success && result.team) {
          logs.push(`✅ Team locale trovato: ${result.team.name}`);
        } else {
          logs.push(`❌ Team locale NON trovato per codice ${teamCode}: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        logs.push(`❌ Errore caricamento team: ${error}`);
      }
    } else {
      logs.push(`❌ Nessun codice team nell'URL`);
    }

    // Debug localStorage (async)
    try {
      const currentTeam = await TeamCodeService.getCurrentTeam();
      if (currentTeam) {
        logs.push(
          `💾 Team corrente nel localStorage: ${currentTeam.name} (${currentTeam.code})`
        );
      } else {
        logs.push(`💾 Nessun team corrente nel localStorage`);
      }
    } catch (error) {
      logs.push(`❌ Errore caricamento team corrente: ${error}`);
    }

    const allTeams = TeamCodeService.getAllTeams();
    logs.push(`📋 Teams nel localStorage: ${allTeams.length} squadre`);
    allTeams.forEach((team) => {
      logs.push(`  - ${team.name} (${team.code})`);
    });

    setDebugInfo(logs);
  };

  useEffect(() => {
    runDebug();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">
            🔍 Debug Team Loading
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-96">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            {debugInfo.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {line}
              </div>
            ))}
            {debugInfo.length === 0 && (
              <div>⏳ Caricamento debug info...</div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Chiudi Debug
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugTeamLoading;