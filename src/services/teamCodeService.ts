/**
 * Sistema di Codici Squadra per sicurezza e condivisione
 * Ogni squadra ha un codice univoco per accedere alle proprie formazioni
 */

import { CloudService } from './cloudService';

export interface PlayerData {
  role: string;
  x: number;
  y: number;
  color?: string;
}

export interface TeamData {
  code: string;
  name: string;
  players: PlayerData[];
  createdAt: string;
  lastUsed: string;
  formations?: number;
  receptions?: number;
}

export class TeamCodeService {
  private static readonly STORAGE_PREFIX = 'team_';
  private static readonly TEAMS_LIST_KEY = 'volleyball_teams_list';
  private static readonly CURRENT_TEAM_KEY = 'current_team_code';

  /**
   * Genera un codice squadra univoco basato sul nome
   */
  static generateTeamCode(teamName: string): string {
    const timestamp = Date.now().toString();
    const nameHash = btoa(teamName.toLowerCase().replace(/\s+/g, '')).slice(
      0,
      4
    );
    const timeHash = btoa(timestamp).slice(-4);
    return (nameHash + timeHash).toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Crea una nuova squadra con codice univoco
   */
  static createTeam(teamName: string): TeamData {
    const code = this.generateTeamCode(teamName);
    const now = new Date().toISOString();
    const teamData: TeamData = {
      code,
      name: teamName,
      players: [],
      createdAt: now,
      lastUsed: now,
      formations: 0,
      receptions: 0,
    };

    // Salva i dati della squadra localmente
    localStorage.setItem(
      `${this.STORAGE_PREFIX}${code}`,
      JSON.stringify(teamData)
    );

    // Aggiorna la lista delle squadre
    this.addToTeamsList(teamData);

    // Imposta come squadra corrente
    this.setCurrentTeam(code);

    // Prova a salvare nel cloud se abilitato
    CloudService.saveTeamToCloud(teamData).catch((err) =>
      console.log('ℹ️ Cloud sync non disponibile:', err.message)
    );

    console.log(`✅ Squadra "${teamName}" creata con codice: ${code}`);
    return teamData;
  }

  /**
   * Carica i dati di una squadra tramite codice (con sync cloud opzionale)
   */
  static async loadTeam(code: string): Promise<TeamData | null> {
    // Prima prova a caricare dal locale
    const localData = localStorage.getItem(`${this.STORAGE_PREFIX}${code}`);
    let teamData: TeamData | null = null;

    if (localData) {
      try {
        teamData = JSON.parse(localData);
      } catch (error) {
        console.error('❌ Errore parsing dati locali:', error);
      }
    }

    // Prova a sincronizzare con il cloud
    try {
      const cloudTeam = await CloudService.loadTeamFromCloud(code);
      if (cloudTeam) {
        // Se abbiamo sia locale che cloud, usa il più recente
        if (teamData) {
          const localTime = new Date(teamData.lastUsed).getTime();
          const cloudTime = new Date(cloudTeam.lastUsed).getTime();
          teamData = cloudTime > localTime ? cloudTeam : teamData;
        } else {
          teamData = cloudTeam;
        }
      } else {
        // Se non c'è nel cloud, prova a cercare team pubblici
        const publicTeam = await CloudService.findPublicTeam(code);
        if (publicTeam) {
          teamData = publicTeam;
        }
      }
    } catch (error) {
      console.log('ℹ️ Cloud sync non disponibile, uso dati locali');
    }

    if (!teamData) return null;

    // Aggiorna ultimo utilizzo e salva
    teamData.lastUsed = new Date().toISOString();
    this.saveTeam(teamData);
    this.setCurrentTeam(code);

    return teamData;
  }

  /**
   * Salva/aggiorna i dati di una squadra
   */
  static saveTeam(teamData: TeamData): void {
    localStorage.setItem(
      `${this.STORAGE_PREFIX}${teamData.code}`,
      JSON.stringify(teamData)
    );
    this.addToTeamsList(teamData);
  }

  /**
   * Ottiene la squadra corrente
   */
  static async getCurrentTeam(): Promise<TeamData | null> {
    const currentCode = localStorage.getItem(this.CURRENT_TEAM_KEY);
    if (!currentCode) return null;

    return this.loadTeam(currentCode);
  }

  /**
   * Imposta la squadra corrente
   */
  static setCurrentTeam(code: string): void {
    localStorage.setItem(this.CURRENT_TEAM_KEY, code);
  }

  /**
   * Ottiene la lista di tutte le squadre
   */
  static getAllTeams(): TeamData[] {
    const teamsListData = localStorage.getItem(this.TEAMS_LIST_KEY);
    if (!teamsListData) return [];

    try {
      return JSON.parse(teamsListData);
    } catch {
      return [];
    }
  }

  /**
   * Aggiunge squadra alla lista (o la aggiorna)
   */
  private static addToTeamsList(teamData: TeamData): void {
    const teams = this.getAllTeams();
    const existingIndex = teams.findIndex((t) => t.code === teamData.code);

    if (existingIndex >= 0) {
      teams[existingIndex] = teamData;
    } else {
      teams.push(teamData);
    }

    // Ordina per ultimo utilizzo (più recenti prima)
    teams.sort(
      (a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    );

    localStorage.setItem(this.TEAMS_LIST_KEY, JSON.stringify(teams));
  }

  /**
   * Elimina una squadra e tutti i suoi dati
   */
  static deleteTeam(code: string): boolean {
    try {
      // Rimuovi dati squadra
      localStorage.removeItem(`${this.STORAGE_PREFIX}${code}`);

      // Rimuovi dalla lista
      const teams = this.getAllTeams().filter((t) => t.code !== code);
      localStorage.setItem(this.TEAMS_LIST_KEY, JSON.stringify(teams));

      // Se era la squadra corrente, resetta
      if (localStorage.getItem(this.CURRENT_TEAM_KEY) === code) {
        localStorage.removeItem(this.CURRENT_TEAM_KEY);
      }

      console.log(`✅ Squadra ${code} eliminata`);
      return true;
    } catch (error) {
      console.error("❌ Errore nell'eliminazione squadra:", error);
      return false;
    }
  }

  /**
   * Genera URL di condivisione per una squadra (con dati embedded)
   */
  static generateShareUrl(code: string): string {
    const teamData = this.loadTeam(code);
    if (!teamData) return window.location.origin + window.location.pathname;

    // Crea oggetto con dati essenziali per la condivisione
    const shareData = {
      team: teamData,
      timestamp: Date.now(),
    };

    // Comprimi e codifica i dati
    const compressed = btoa(JSON.stringify(shareData));
    const baseUrl = window.location.origin + window.location.pathname;

    return `${baseUrl}?teamdata=${compressed}`;
  }

  /**
   * Estrae codice squadra dall'URL se presente (backward compatibility)
   */
  static getTeamCodeFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('team');
  }

  /**
   * Estrae e importa dati squadra dall'URL se presenti
   */
  static getTeamDataFromUrl(): TeamData | null {
    const params = new URLSearchParams(window.location.search);
    const teamDataParam = params.get('teamdata');

    if (!teamDataParam) return null;

    try {
      // Decodifica i dati compressi
      const decoded = atob(teamDataParam);
      const shareData = JSON.parse(decoded);

      if (!shareData.team || !shareData.team.code) {
        throw new Error('Dati squadra non validi');
      }

      const teamData: TeamData = shareData.team;

      // Salva la squadra automaticamente quando viene importata da URL
      this.saveTeam(teamData);

      console.log(
        `✅ Squadra importata da URL: ${teamData.name} (${teamData.code})`
      );
      return teamData;
    } catch (error) {
      console.error('❌ Errore nel parsing dati squadra da URL:', error);
      return null;
    }
  }

  /**
   * Aggiorna conteggi formazioni/ricezioni per una squadra
   */
  static async updateTeamStats(
    code: string,
    formations?: number,
    receptions?: number
  ): Promise<void> {
    const team = await this.loadTeam(code);
    if (!team) return;

    if (formations !== undefined) team.formations = formations;
    if (receptions !== undefined) team.receptions = receptions;

    this.saveTeam(team);
  }

  /**
   * Esporta tutti i dati di una squadra
   */
  static exportTeamData(code: string): string | null {
    const team = this.loadTeam(code);
    if (!team) return null;

    // Raccogli tutti i dati correlati alla squadra
    const exportData = {
      team,
      formations: [], // TODO: integrare con rotationsService
      receptions: [], // TODO: integrare con receivePositionsService
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importa dati squadra da backup
   */
  static importTeamData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (!data.team || !data.team.code) {
        throw new Error('Formato backup non valido');
      }

      // Importa squadra
      this.saveTeam(data.team);

      // TODO: Importa formazioni e ricezioni

      console.log(`✅ Backup importato per squadra ${data.team.name}`);
      return true;
    } catch (error) {
      console.error("❌ Errore nell'import backup:", error);
      return false;
    }
  }
}
