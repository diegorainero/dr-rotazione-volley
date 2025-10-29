import React from 'react';
import { TeamCodeService } from '../services/teamCodeService';

const DebugTeamLoading: React.FC = () => {
  const [debugInfo, setDebugInfo] = React.useState<string[]>([]);
  
  React.useEffect(() => {
    const logs: string[] = [];
    
    // Debug URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    logs.push(`🌐 URL completo: ${window.location.href}`);
    logs.push(`🔍 Parametri URL: ${Array.from(urlParams.entries()).map(([k,v]) => `${k}=${v}`).join(', ')}`);
    
    // Debug team data from URL
    const teamData = TeamCodeService.getTeamDataFromUrl();
    if (teamData) {
      logs.push(`✅ Dati team trovati nell'URL: ${teamData.name} (${teamData.code})`);
    } else {
      logs.push(`❌ Nessun dato team embedded nell'URL`);
    }
    
    // Debug team code from URL
    const teamCode = TeamCodeService.getTeamCodeFromUrl();
    if (teamCode) {
      logs.push(`🔗 Codice team dall'URL: ${teamCode}`);
      const existingTeam = TeamCodeService.loadTeam(teamCode);
      if (existingTeam) {
        logs.push(`✅ Team locale trovato: ${existingTeam.name}`);
      } else {
        logs.push(`❌ Team locale NON trovato per codice ${teamCode}`);
      }
    } else {
      logs.push(`❌ Nessun codice team nell'URL`);
    }
    
    // Debug localStorage
    const currentTeam = TeamCodeService.getCurrentTeam();
    if (currentTeam) {
      logs.push(`💾 Team corrente nel localStorage: ${currentTeam.name} (${currentTeam.code})`);
    } else {
      logs.push(`💾 Nessun team corrente nel localStorage`);
    }
    
    const allTeams = TeamCodeService.getAllTeams();
    logs.push(`📋 Teams nel localStorage: ${allTeams.length} squadre`);
    allTeams.forEach(team => {
      logs.push(`  - ${team.name} (${team.code})`);
    });
    
    setDebugInfo(logs);
  }, []);

  // Solo mostra il debug in development o se c'è ?debug nell'URL
  const showDebug = process.env.NODE_ENV === 'development' || 
                   new URLSearchParams(window.location.search).has('debug');

  if (!showDebug) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs p-4 rounded-lg max-w-md max-h-60 overflow-y-auto z-50">
      <div className="font-bold mb-2">🐛 Debug Team Loading</div>
      {debugInfo.map((log, index) => (
        <div key={index} className="mb-1 font-mono">
          {log}
        </div>
      ))}
    </div>
  );
};

export default DebugTeamLoading;