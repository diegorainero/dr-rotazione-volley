import { rotationsService } from '../db/database';
import {
  FirestoreService,
  FormationData,
  FormationDataInput,
} from './firestoreService';
import { CloudService } from './cloudService';

// Tipo unificato per le formazioni
export interface FormationPosition {
  zone: number;
  x: number;
  y: number;
  role: string;
  name?: string; // Nome personalizzato del giocatore
}

export interface UnifiedFormation {
  id?: string | number;
  name: string;
  teamName: string;
  description?: string;
  homePositions: FormationPosition[];
  awayPositions: FormationPosition[];
  createdAt: Date | string;
  updatedAt: Date | string;
  source: 'local' | 'cloud';
  cloudId?: string; // ID Firestore se salvata anche nel cloud
}

/**
 * Servizio ibrido per gestire formazioni sia localmente che nel cloud
 */
export class FormationService {
  /**
   * Salva una formazione sia localmente che nel cloud (se disponibile)
   */
  static async saveFormation(
    name: string,
    teamName: string,
    homePositions: FormationPosition[],
    awayPositions: FormationPosition[],
    description?: string
  ): Promise<UnifiedFormation> {
    const now = new Date();

    // 1. Salva sempre localmente (priorità offline-first)
    await rotationsService.save(
      name,
      teamName,
      homePositions,
      awayPositions,
      description
    );

    console.log(`💾 Formazione "${name}" salvata localmente`);

    // 2. Tenta di salvare nel cloud se disponibile
    let cloudFormation: FormationData | null = null;
    try {
      let syncStatus = CloudService.getSyncStatus();
      const userInfo = FirestoreService.getCurrentUserInfo();

      // Tenta auto-abilitazione se non è abilitato ma l'utente è autenticato
      if (!syncStatus.isEnabled && userInfo) {
        console.log('🔄 Auto-enable cloud per salvataggio...');
        await CloudService.autoEnableCloudSync();
        syncStatus = CloudService.getSyncStatus();
      }

      console.log('🔍 Debug salvataggio cloud:', {
        syncEnabled: syncStatus.isEnabled,
        isOnline: syncStatus.isOnline,
        userAuthenticated: !!userInfo,
        userInfo: userInfo,
        syncError: syncStatus.error,
      });

      if (syncStatus.isEnabled && userInfo) {
        const formationInput: FormationDataInput = {
          name,
          teamName,
          homePositions,
          awayPositions,
        };

        // Aggiungi description solo se non è undefined/null/empty
        if (description && description.trim() !== '') {
          formationInput.description = description.trim();
        }

        cloudFormation = await FirestoreService.saveFormation(formationInput);
        console.log(
          `☁️ Formazione "${name}" salvata nel cloud (ID: ${cloudFormation.id})`
        );
      } else {
        console.warn(
          `⚠️ Cloud non disponibile - Sync: ${
            syncStatus.isEnabled
          }, Auth: ${!!userInfo}`
        );
      }
    } catch (error) {
      console.warn(`⚠️ Impossibile salvare nel cloud:`, error);
      // Non bloccare l'operazione se il cloud fallisce
    }

    // 3. Ritorna la formazione unificata
    const unifiedFormation: UnifiedFormation = {
      name,
      teamName,
      description,
      homePositions,
      awayPositions,
      createdAt: now,
      updatedAt: now,
      source: cloudFormation ? 'cloud' : 'local',
      cloudId: cloudFormation?.id,
    };

    return unifiedFormation;
  }

  /**
   * Carica tutte le formazioni (locali + cloud)
   */
  static async getAllFormations(): Promise<UnifiedFormation[]> {
    const allFormations: UnifiedFormation[] = [];

    // 1. Carica formazioni locali
    try {
      const localFormations = await rotationsService.getAll();

      for (const local of localFormations) {
        allFormations.push({
          id: local.id,
          name: local.name,
          teamName: local.teamName,
          description: local.description,
          homePositions: local.homePositions,
          awayPositions: local.awayPositions,
          createdAt: local.createdAt,
          updatedAt: local.updatedAt,
          source: 'local',
        });
      }

      console.log(`📱 Caricate ${localFormations.length} formazioni locali`);
    } catch (error) {
      console.error('❌ Errore caricamento formazioni locali:', error);
    }

    // 2. Carica formazioni cloud se disponibile
    try {
      if (CloudService.getSyncStatus().isEnabled) {
        const cloudFormations = await FirestoreService.getUserFormations();

        for (const cloud of cloudFormations) {
          // Evita duplicati se già presente una versione locale
          const existsLocally = allFormations.some(
            (f) => f.name === cloud.name && f.teamName === cloud.teamName
          );

          if (!existsLocally) {
            allFormations.push({
              id: cloud.id,
              name: cloud.name,
              teamName: cloud.teamName,
              description: cloud.description,
              homePositions: cloud.homePositions,
              awayPositions: cloud.awayPositions,
              createdAt:
                typeof cloud.createdAt === 'string'
                  ? cloud.createdAt
                  : new Date(),
              updatedAt:
                typeof cloud.updatedAt === 'string'
                  ? cloud.updatedAt
                  : new Date(),
              source: 'cloud',
              cloudId: cloud.id,
            });
          }
        }

        console.log(`☁️ Caricate ${cloudFormations.length} formazioni cloud`);
      }
    } catch (error) {
      console.warn('⚠️ Impossibile caricare formazioni cloud:', error);
    }

    // 3. Ordina per data di aggiornamento più recente
    allFormations.sort((a, b) => {
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`📋 Totale formazioni caricate: ${allFormations.length}`);
    return allFormations;
  }

  /**
   * Carica formazioni per una squadra specifica
   */
  static async getFormationsByTeam(
    teamName: string
  ): Promise<UnifiedFormation[]> {
    const allFormations = await this.getAllFormations();
    return allFormations.filter((f) => f.teamName === teamName);
  }

  /**
   * Carica una formazione specifica
   */
  static async loadFormation(
    id: string | number,
    source: 'local' | 'cloud'
  ): Promise<UnifiedFormation | null> {
    try {
      if (source === 'local' && typeof id === 'number') {
        const localFormation = await rotationsService.load(id);
        if (localFormation) {
          return {
            id: localFormation.id,
            name: localFormation.name,
            teamName: localFormation.teamName,
            description: localFormation.description,
            homePositions: localFormation.homePositions,
            awayPositions: localFormation.awayPositions,
            createdAt: localFormation.createdAt,
            updatedAt: localFormation.updatedAt,
            source: 'local',
          };
        }
      } else if (source === 'cloud' && typeof id === 'string') {
        // Per ora restituiamo null, implementeremo il caricamento specifico cloud se necessario
        console.warn(
          'Caricamento formazione cloud specifica non ancora implementato'
        );
        return null;
      }

      return null;
    } catch (error) {
      console.error(`❌ Errore caricamento formazione ${id}:`, error);
      return null;
    }
  }

  /**
   * Elimina una formazione
   */
  static async deleteFormation(
    id: string | number,
    source: 'local' | 'cloud'
  ): Promise<boolean> {
    try {
      if (source === 'local' && typeof id === 'number') {
        await rotationsService.delete(id);
        console.log(`🗑️ Formazione locale ${id} eliminata`);
        return true;
      } else if (source === 'cloud' && typeof id === 'string') {
        if (CloudService.getSyncStatus().isEnabled) {
          await FirestoreService.deleteFormation(id);
          console.log(`🗑️ Formazione cloud ${id} eliminata`);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`❌ Errore eliminazione formazione ${id}:`, error);
      return false;
    }
  }

  /**
   * Ottiene tutti i nomi delle squadre dalle formazioni
   */
  static async getAllTeamNames(): Promise<string[]> {
    const formations = await this.getAllFormations();
    const teamNamesSet = new Set<string>();

    formations.forEach((f) => teamNamesSet.add(f.teamName));

    const teamNames = Array.from(teamNamesSet);
    return teamNames.sort();
  }

  /**
   * Sincronizza formazioni locali con il cloud
   */
  static async syncToCloud(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const result = { synced: 0, failed: 0, errors: [] as string[] };

    // Debug dello stato cloud
    let syncStatus = CloudService.getSyncStatus();
    console.log('🔍 Debug Sync Status (prima):', syncStatus);

    // Tenta auto-abilitazione se non è abilitato
    if (!syncStatus.isEnabled) {
      console.log('🔄 Tentativo auto-abilitazione cloud sync...');
      const autoEnabled = await CloudService.autoEnableCloudSync();
      syncStatus = CloudService.getSyncStatus();
      console.log('🔍 Debug Sync Status (dopo auto-enable):', {
        autoEnabled,
        syncStatus,
      });
    }

    if (!syncStatus.isEnabled) {
      const errorMsg = `Cloud sync non disponibile. Online: ${syncStatus.isOnline}, Enabled: ${syncStatus.isEnabled}, Error: ${syncStatus.error}`;
      result.errors.push(errorMsg);
      console.warn('⚠️', errorMsg);
      return result;
    }

    // Verifica autenticazione Firebase
    const userInfo = FirestoreService.getCurrentUserInfo();
    if (!userInfo) {
      result.errors.push('Utente non autenticato su Firebase');
      console.warn('⚠️ Utente non autenticato');
      return result;
    }

    console.log('✅ Utente autenticato:', userInfo);

    try {
      const localFormations = await rotationsService.getAll();

      for (const local of localFormations) {
        try {
          const formationInput: FormationDataInput = {
            name: local.name,
            teamName: local.teamName,
            homePositions: local.homePositions,
            awayPositions: local.awayPositions,
          };

          // Aggiungi description solo se presente
          if (local.description && local.description.trim() !== '') {
            formationInput.description = local.description.trim();
          }

          await FirestoreService.saveFormation(formationInput);
          result.synced++;
          console.log(`☁️ Sincronizzata: ${local.name}`);
        } catch (error: any) {
          result.failed++;
          result.errors.push(`${local.name}: ${error.message}`);
        }
      }

      console.log(
        `✅ Sync completata: ${result.synced} successi, ${result.failed} errori`
      );
    } catch (error: any) {
      result.failed++;
      result.errors.push(`Errore generale: ${error.message}`);
    }

    return result;
  }

  /**
   * Ripulisce tutte le formazioni (locale + cloud)
   */
  static async clearAllFormations(): Promise<void> {
    // Pulisci locale
    await rotationsService.clear();
    console.log('🗑️ Formazioni locali eliminate');

    // Pulisci cloud se disponibile
    try {
      if (CloudService.getSyncStatus().isEnabled) {
        const cloudFormations = await FirestoreService.getUserFormations();

        for (const formation of cloudFormations) {
          if (formation.id) {
            await FirestoreService.deleteFormation(formation.id);
          }
        }

        console.log(`🗑️ ${cloudFormations.length} formazioni cloud eliminate`);
      }
    } catch (error) {
      console.warn('⚠️ Errore durante la pulizia cloud:', error);
    }
  }
}
