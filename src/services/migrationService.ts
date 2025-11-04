// src/services/migrationService.ts
import { TeamCodeService, TeamData as LocalTeamData } from './teamCodeService';
import { FirestoreService, TeamDataInput } from './firestoreService';
import { getCurrentUser } from '../config/firebase';

/**
 * Servizio per migrare dati dal database locale a Firestore
 */
export class MigrationService {
  /**
   * Migra tutte le squadre dal localStorage a Firestore
   */
  static async migrateAllTeamsToFirestore(): Promise<{
    migrated: number;
    failed: number;
    errors: string[];
  }> {
    const user = getCurrentUser();
    if (!user) {
      throw new Error(
        'Utente non autenticato - login richiesto per la migrazione'
      );
    }

    console.log('🔄 Inizio migrazione dati a Firestore...');

    let migrated = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Ottieni tutte le squadre locali
      const localTeams = TeamCodeService.getAllTeams();
      console.log(`📦 Trovate ${localTeams.length} squadre locali da migrare`);

      for (const localTeam of localTeams) {
        try {
          // Converti formato locale -> Firestore
          const firestoreTeam: TeamDataInput = {
            code: localTeam.code,
            name: localTeam.name,
            description: `Migrata da locale il ${new Date().toLocaleDateString(
              'it-IT'
            )}`,
            players: localTeam.players,
            createdAt: localTeam.createdAt,
            formations: localTeam.formations,
            receptions: localTeam.receptions,
            isPublic: false,
          };

          // Verifica se esiste già su Firestore
          const exists = await FirestoreService.teamExists(localTeam.code);
          if (exists) {
            console.log(
              `⚠️ Squadra ${localTeam.code} già presente su Firestore - salto`
            );
            continue;
          }

          // Salva su Firestore
          await FirestoreService.saveTeam(firestoreTeam);
          migrated++;
          console.log(`✅ Migrata: ${localTeam.name} (${localTeam.code})`);
        } catch (error: any) {
          failed++;
          const errorMsg = `Errore migrazione ${localTeam.name}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(
        `🎉 Migrazione completata: ${migrated} successo, ${failed} fallite`
      );
      return { migrated, failed, errors };
    } catch (error: any) {
      console.error('❌ Errore durante migrazione:', error);
      throw error;
    }
  }

  /**
   * Sincronizza una squadra specifica da locale a Firestore
   */
  static async syncTeamToFirestore(teamCode: string): Promise<boolean> {
    try {
      const user = getCurrentUser();
      if (!user) {
        throw new Error('Utente non autenticato');
      }

      // Carica squadra locale
      const result = await TeamCodeService.loadTeam(teamCode);
      if (!result.success || !result.team) {
        console.log(`⚠️ Squadra ${teamCode} non trovata nel localStorage: ${result.error}`);
        return false;
      }

      const localTeam = result.team;
      
      // Converti e salva su Firestore
      const firestoreTeam: TeamDataInput = {
        code: localTeam.code,
        name: localTeam.name,
        description: `Sincronizzata il ${new Date().toLocaleDateString(
          'it-IT'
        )}`,
        players: localTeam.players,
        createdAt: localTeam.createdAt,
        formations: localTeam.formations || 0,
        receptions: localTeam.receptions || 0,
        isPublic: false,
      };

      await FirestoreService.saveTeam(firestoreTeam);
      console.log(`✅ Sincronizzata squadra: ${localTeam.name}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Errore sincronizzazione squadra ${teamCode}:`, error);
      return false;
    }
  }

  /**
   * Esegue backup delle squadre Firestore nel localStorage
   */
  static async backupFirestoreToLocal(): Promise<{
    backed: number;
    failed: number;
    errors: string[];
  }> {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    console.log('💾 Inizio backup Firestore -> localStorage...');

    let backed = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      // Ottieni tutte le squadre da Firestore
      const firestoreTeams = await FirestoreService.getUserTeams();
      console.log(`☁️ Trovate ${firestoreTeams.length} squadre su Firestore`);

      for (const firestoreTeam of firestoreTeams) {
        try {
          // Converti formato Firestore -> Locale
          const localTeam: LocalTeamData = {
            code: firestoreTeam.code,
            name: firestoreTeam.name,
            players: firestoreTeam.players,
            createdAt:
              typeof firestoreTeam.createdAt === 'string'
                ? firestoreTeam.createdAt
                : new Date().toISOString(),
            lastUsed:
              typeof firestoreTeam.lastUsed === 'string'
                ? firestoreTeam.lastUsed
                : new Date().toISOString(),
            formations: firestoreTeam.formations,
            receptions: firestoreTeam.receptions,
          };

          // Salva nel localStorage (sovrascrivi se esiste)
          TeamCodeService.saveTeam(localTeam);
          backed++;
          console.log(
            `💾 Backup: ${firestoreTeam.name} (${firestoreTeam.code})`
          );
        } catch (error: any) {
          failed++;
          const errorMsg = `Errore backup ${firestoreTeam.name}: ${error.message}`;
          errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(
        `🎉 Backup completato: ${backed} successo, ${failed} fallite`
      );
      return { backed, failed, errors };
    } catch (error: any) {
      console.error('❌ Errore durante backup:', error);
      throw error;
    }
  }

  /**
   * Conta i dati disponibili in entrambi i sistemi
   */
  static getDataSummary(): {
    local: {
      teams: number;
      teamsData: LocalTeamData[];
    };
    firestore: {
      available: boolean;
      user: string | null;
    };
  } {
    const localTeams = TeamCodeService.getAllTeams();
    const user = getCurrentUser();

    return {
      local: {
        teams: localTeams.length,
        teamsData: localTeams,
      },
      firestore: {
        available: !!user,
        user: user?.email || user?.uid || null,
      },
    };
  }

  /**
   * Confronta i dati locali con quelli su Firestore
   */
  static async compareLocalWithFirestore(): Promise<{
    localOnly: string[];
    firestoreOnly: string[];
    both: string[];
    conflicts: string[];
  }> {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Utente non autenticato');
    }

    const localTeams = TeamCodeService.getAllTeams();
    const firestoreTeams = await FirestoreService.getUserTeams();

    const localCodes = new Set(localTeams.map((t) => t.code));
    const firestoreCodes = new Set(firestoreTeams.map((t) => t.code));

    const localOnly = localTeams
      .filter((t) => !firestoreCodes.has(t.code))
      .map((t) => t.code);
    const firestoreOnly = firestoreTeams
      .filter((t) => !localCodes.has(t.code))
      .map((t) => t.code);
    const both = localTeams
      .filter((t) => firestoreCodes.has(t.code))
      .map((t) => t.code);

    // Rileva conflitti (stessa squadra, dati diversi)
    const conflicts: string[] = [];
    for (const code of both) {
      const localTeam = localTeams.find((t) => t.code === code);
      const firestoreTeam = firestoreTeams.find((t) => t.code === code);

      if (localTeam && firestoreTeam) {
        // Confronta timestamp di ultima modifica
        const localTime = new Date(localTeam.lastUsed).getTime();
        const firestoreTime = new Date(
          typeof firestoreTeam.lastUsed === 'string'
            ? firestoreTeam.lastUsed
            : firestoreTeam.lastUsed.toDate().toISOString()
        ).getTime();

        // Se i timestamp sono significativamente diversi, potrebbe essere un conflitto
        if (Math.abs(localTime - firestoreTime) > 60000) {
          // 1 minuto di differenza
          conflicts.push(code);
        }
      }
    }

    return { localOnly, firestoreOnly, both, conflicts };
  }
}
