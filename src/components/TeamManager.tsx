import React, { useState, useEffect } from 'react';
import { TeamCodeService, TeamData } from '../services/teamCodeService';
import ShareTeam from './ShareTeam';

interface TeamManagerProps {
  onTeamSelected: (team: TeamData | null) => void;
  currentTeam: TeamData | null;
}

const TeamManager: React.FC<TeamManagerProps> = ({ onTeamSelected, currentTeam }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    loadTeams();
    
    // Controlla se c'è un team code nell'URL
    const urlTeamCode = TeamCodeService.getTeamCodeFromUrl();
    if (urlTeamCode && !currentTeam) {
      const team = TeamCodeService.loadTeam(urlTeamCode);
      if (team) {
        onTeamSelected(team);
      }
    }
  }, [currentTeam, onTeamSelected]);

  const loadTeams = () => {
    const allTeams = TeamCodeService.getAllTeams();
    setTeams(allTeams);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    const newTeam = TeamCodeService.createTeam(newTeamName.trim());
    setNewTeamName('');
    setShowCreateForm(false);
    loadTeams();
    onTeamSelected(newTeam);
  };

  const handleJoinTeam = (code?: string) => {
    const codeToUse = code || joinCode.trim().toUpperCase();
    if (!codeToUse) return;

    const team = TeamCodeService.loadTeam(codeToUse);
    if (team) {
      setJoinCode('');
      setShowJoinForm(false);
      loadTeams();
      onTeamSelected(team);
    } else {
      alert(`❌ Squadra con codice "${codeToUse}" non trovata`);
    }
  };

  const handleSelectTeam = (team: TeamData) => {
    TeamCodeService.setCurrentTeam(team.code);
    onTeamSelected(team);
    setIsVisible(false);
  };

  const handleDeleteTeam = (code: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questa squadra? Tutti i dati verranno persi!')) {
      TeamCodeService.deleteTeam(code);
      loadTeams();
      
      // Se era la squadra corrente, resetta
      if (currentTeam?.code === code) {
        onTeamSelected(null);
      }
    }
  };

  const copyShareUrl = (code: string) => {
    const shareUrl = TeamCodeService.generateShareUrl(code);
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert(`📋 Link copiato! Condividi questo link per accedere alla squadra:\n${shareUrl}`);
    });
  };

  if (!isVisible && currentTeam) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Squadra:</span>
        <button
          onClick={() => setIsVisible(true)}
          className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium hover:bg-blue-200 transition-colors"
          title="Clicca per cambiare squadra o gestire team"
        >
          {currentTeam.name} ({currentTeam.code})
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">🏐 Gestione Squadre</h2>
            {currentTeam && (
              <button
                onClick={() => setIsVisible(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            )}
          </div>

          {/* Squadra Attuale */}
          {currentTeam && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Squadra Attiva</h3>
              <div className="text-sm text-blue-800">
                <div><strong>{currentTeam.name}</strong></div>
                <div>Codice: <span className="font-mono">{currentTeam.code}</span></div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => copyShareUrl(currentTeam.code)}
                    className="bg-blue-600 text-white px-2 py-1 text-xs rounded hover:bg-blue-700"
                  >
                    📋 Copia Link
                  </button>
                  <ShareTeam 
                    teamCode={currentTeam.code}
                    teamName={currentTeam.name}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Azioni Principali */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => {
                setShowCreateForm(true);
                setShowJoinForm(false);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              ➕ Crea Squadra
            </button>
            <button
              onClick={() => {
                setShowJoinForm(true);
                setShowCreateForm(false);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🔗 Unisciti
            </button>
          </div>

          {/* Form Crea Squadra */}
          {showCreateForm && (
            <form onSubmit={handleCreateTeam} className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2">Crea Nuova Squadra</h3>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Nome squadra (es. Volley Team Senior)"
                className="w-full p-2 border border-gray-300 rounded mb-3"
                maxLength={50}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newTeamName.trim()}
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  Crea
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                >
                  Annulla
                </button>
              </div>
            </form>
          )}

          {/* Form Unisciti a Squadra */}
          {showJoinForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2">Unisciti a Squadra</h3>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Inserisci codice squadra (es. VOLLEY2025)"
                className="w-full p-2 border border-gray-300 rounded mb-3 font-mono"
                maxLength={12}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleJoinTeam()}
                  disabled={!joinCode.trim()}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Unisciti
                </button>
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* Lista Squadre */}
          {teams.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Squadre Recenti</h3>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.code}
                    className={`border rounded-lg p-3 ${
                      currentTeam?.code === team.code
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{team.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{team.code}</div>
                        <div className="text-xs text-gray-400">
                          Ultimo uso: {new Date(team.lastUsed).toLocaleDateString('it-IT')}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {currentTeam?.code !== team.code && (
                          <button
                            onClick={() => handleSelectTeam(team)}
                            className="bg-blue-600 text-white px-2 py-1 text-xs rounded hover:bg-blue-700"
                          >
                            Seleziona
                          </button>
                        )}
                        <ShareTeam 
                          teamCode={team.code}
                          teamName={team.name}
                        />
                        <button
                          onClick={() => handleDeleteTeam(team.code)}
                          className="bg-red-500 text-white px-2 py-1 text-xs rounded hover:bg-red-600"
                          title="Elimina squadra"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messaggio se nessuna squadra */}
          {teams.length === 0 && !showCreateForm && !showJoinForm && (
            <div className="text-center text-gray-500 py-8">
              <div className="mb-4">🏐</div>
              <p>Nessuna squadra trovata.</p>
              <p className="text-sm">Crea una nuova squadra o unisciti a una esistente!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManager;