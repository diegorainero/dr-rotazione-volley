import { rotationsService } from '../db/database';
import {
  FirestoreService,
  FormationData,
  FormationDataInput,
} from './firestoreService';
import { CloudService } from './cloudService';
import { logFirebaseError, handleFirebaseError } from '../utils/firebaseErrorHandler';

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

// Tipo per formazioni raggruppate con informazioni su locale/cloud
export interface GroupedFormation extends Omit<UnifiedFormation, 'source'> {
  sources: ('local' | 'cloud')[];
  hasLocal: boolean;
  hasCloud: boolean;
  localId?: string | number;
  cloudId?: string;
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
          description: description || '', // Salva sempre la descrizione, anche se vuota
        };

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
      description: description || '', // Garantisce sempre una stringa
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
   * Carica formazioni raggruppate includendo sempre il cloud per la gestione
   */
  static async getGroupedFormationsWithAutoCloud(forceRefresh: boolean = false): Promise<GroupedFormation[]> {
    const allFormations = await this.getAllFormationsWithAutoCloud(forceRefresh);
    const groupedMap = new Map<string, GroupedFormation>();

    allFormations.forEach(formation => {
      // Chiave per raggruppare: nome + teamName + description
      const key = `${formation.name}|${formation.teamName}|${formation.description || ''}`;
      
      if (groupedMap.has(key)) {
        // Aggiorna formazione esistente
        const existing = groupedMap.get(key)!;
        existing.sources.push(formation.source);
        
        if (formation.source === 'local') {
          existing.hasLocal = true;
          existing.localId = formation.id;
          // Usa sempre i dati locali come primari (più aggiornati)
          existing.homePositions = formation.homePositions;
          existing.awayPositions = formation.awayPositions;
          existing.updatedAt = formation.updatedAt;
        } else {
          existing.hasCloud = true;
          existing.cloudId = formation.cloudId || (formation.id as string);
        }
      } else {
        // Crea nuova formazione raggruppata
        groupedMap.set(key, {
          id: formation.id,
          name: formation.name,
          teamName: formation.teamName,
          description: formation.description,
          homePositions: formation.homePositions,
          awayPositions: formation.awayPositions,
          createdAt: formation.createdAt,
          updatedAt: formation.updatedAt,
          sources: [formation.source],
          hasLocal: formation.source === 'local',
          hasCloud: formation.source === 'cloud',
          localId: formation.source === 'local' ? formation.id : undefined,
          cloudId: formation.source === 'cloud' ? (formation.cloudId || formation.id as string) : undefined,
        });
      }
    });

    // Converti Map in Array e ordina
    const result = Array.from(groupedMap.values());
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`📋 Formazioni raggruppate (con cloud auto): ${result.length} (da ${allFormations.length} totali)`);
    return result;
  }

  /**
   * Carica formazioni raggruppate (stesso nome/team/description = una riga con icone multiple)
   */
  static async getGroupedFormations(forceRefresh: boolean = false): Promise<GroupedFormation[]> {
    const allFormations = await this.getAllFormations(forceRefresh);
    const groupedMap = new Map<string, GroupedFormation>();

    allFormations.forEach(formation => {
      // Chiave per raggruppare: nome + teamName + description
      const key = `${formation.name}|${formation.teamName}|${formation.description || ''}`;
      
      if (groupedMap.has(key)) {
        // Aggiorna formazione esistente
        const existing = groupedMap.get(key)!;
        existing.sources.push(formation.source);
        
        if (formation.source === 'local') {
          existing.hasLocal = true;
          existing.localId = formation.id;
          // Usa sempre i dati locali come primari (più aggiornati)
          existing.homePositions = formation.homePositions;
          existing.awayPositions = formation.awayPositions;
          existing.updatedAt = formation.updatedAt;
        } else {
          existing.hasCloud = true;
          existing.cloudId = formation.cloudId || (formation.id as string);
        }
      } else {
        // Crea nuova formazione raggruppata
        groupedMap.set(key, {
          id: formation.id,
          name: formation.name,
          teamName: formation.teamName,
          description: formation.description,
          homePositions: formation.homePositions,
          awayPositions: formation.awayPositions,
          createdAt: formation.createdAt,
          updatedAt: formation.updatedAt,
          sources: [formation.source],
          hasLocal: formation.source === 'local',
          hasCloud: formation.source === 'cloud',
          localId: formation.source === 'local' ? formation.id : undefined,
          cloudId: formation.source === 'cloud' ? (formation.cloudId || formation.id as string) : undefined,
        });
      }
    });

    // Converti Map in Array e ordina
    const result = Array.from(groupedMap.values());
    result.sort((a, b) => {
      const dateA = new Date(a.updatedAt);
      const dateB = new Date(b.updatedAt);
      return dateB.getTime() - dateA.getTime();
    });

    console.log(`📋 Formazioni raggruppate: ${result.length} (da ${allFormations.length} totali)`);
    return result;
  }

  /**
   * Carica tutte le formazioni includendo sempre il cloud per la gestione formazioni
   */
  static async getAllFormationsWithAutoCloud(forceRefresh: boolean = false): Promise<UnifiedFormation[]> {
    console.log('🆔 FormationService.getAllFormationsWithAutoCloud v2.0 - Cache refresh verificato');
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

    // 2. Tenta caricamento cloud con gestione errori permessi
    let user: any = null;
    try {
      const { AuthWaiter } = await import('../utils/authWaiter');
      user = await AuthWaiter.waitForAuth(15); // Max 1.5 secondi per formazioni
      const isGoogleAuth = user && !user.isAnonymous;

      if (isGoogleAuth) {
        console.log('☁️ Caricamento formazioni cloud (utente Google autenticato)...');
        const cloudFormations = await FirestoreService.getUserFormations(forceRefresh);

        for (const cloud of cloudFormations) {
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

        console.log(`☁️ Caricate ${cloudFormations.length} formazioni cloud`);
      } else {
        console.log('ℹ️ Utente non autenticato con Google - skip caricamento cloud formazioni');
        console.log('   Per vedere le formazioni cloud, effettua il login Google dalla barra in alto');
      }
    } catch (error: any) {
      // Gestione strutturata errori Firebase
      logFirebaseError('getAllFormationsWithAutoCloud', error, {
        forceRefresh,
        userAuthenticated: !!user,
        isAnonymous: user?.isAnonymous
      });
      
      const errorInfo = handleFirebaseError(error);
      console.log(`ℹ️ ${errorInfo.userMessage}`);
      
      // Non fermare l'esecuzione, continua solo con quelle locali
    }

    return allFormations;
  }

  /**
   * Carica tutte le formazioni (locali + cloud solo se sync abilitato)
   */
  static async getAllFormations(forceRefresh: boolean = false): Promise<UnifiedFormation[]> {
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
        const cloudFormations = await FirestoreService.getUserFormations(forceRefresh);

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
        const syncStatus = CloudService.getSyncStatus();
        console.log('🔍 Debug delete cloud - Sync Status:', syncStatus);
        
        if (!syncStatus.isEnabled) {
          console.warn('⚠️ Tentativo auto-abilitazione cloud per delete...');
          const autoEnabled = await CloudService.autoEnableCloudSync();
          console.log('🔄 Auto-enable result:', autoEnabled);
        }

        const currentStatus = CloudService.getSyncStatus();
        if (currentStatus.isEnabled) {
          console.log(`🗑️ Eliminando formazione cloud ${id}...`);
          await FirestoreService.deleteFormation(id);
          console.log(`✅ Formazione cloud ${id} eliminata con successo`);
          
          return true;
        } else {
          console.error('❌ Cloud sync non disponibile per delete:', currentStatus);
          return false;
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
   * Sincronizza TUTTE le formazioni locali con il cloud (sincronizzazione forzata)
   * Questo crea sempre nuove copie sul cloud di tutte le formazioni locali
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
      const cloudFormations = await FirestoreService.getUserFormations();
      
      console.log(`🚀 SYNC INTELLIGENTE: Elaboro ${localFormations.length} formazioni locali`);

      for (const local of localFormations) {
        try {
          // Trova formazione esistente per nome, teamName e description
          const existingCloud = cloudFormations.find(cloud => 
            cloud.name === local.name && 
            cloud.teamName === local.teamName &&
            (cloud.description || '') === (local.description || '')
          );

          const formationInput: FormationDataInput = {
            name: local.name,
            teamName: local.teamName,
            homePositions: local.homePositions,
            awayPositions: local.awayPositions,
            description: local.description || '',
          };

          if (existingCloud && existingCloud.id) {
            // UPDATE: Aggiorna formazione esistente
            await FirestoreService.updateFormation(existingCloud.id, formationInput);
            result.synced++;
            console.log(`🔄 AGGIORNATA: ${local.name}`);
          } else {
            // CREATE: Crea nuova formazione
            await FirestoreService.saveFormation(formationInput);
            result.synced++;
            console.log(`✨ CREATA: ${local.name}`);
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push(`${local.name}: ${error.message}`);
        }
      }

      console.log(
        `✅ SINCRONIZZAZIONE FORZATA completata: ${result.synced} formazioni inviate al cloud, ${result.failed} errori`
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

  /**
   * Sincronizzazione bidirezionale completa (locale ↔ cloud)
   */
  static async syncBidirectional(): Promise<{
    localToCloud: { synced: number; failed: number; errors: string[] };
    cloudToLocal: { synced: number; failed: number; errors: string[] };
  }> {
    const result = {
      localToCloud: { synced: 0, failed: 0, errors: [] as string[] },
      cloudToLocal: { synced: 0, failed: 0, errors: [] as string[] }
    };

    // Debug stato cloud
    let syncStatus = CloudService.getSyncStatus();
    console.log('🔍 Sincronizzazione bidirezionale - Stato cloud:', syncStatus);

    // Auto-abilita cloud se necessario
    if (!syncStatus.isEnabled) {
      console.log('🔄 Auto-abilitazione cloud per sync bidirezionale...');
      const autoEnabled = await CloudService.autoEnableCloudSync();
      if (!autoEnabled) {
        const error = 'Impossibile abilitare il cloud sync';
        result.localToCloud.errors.push(error);
        result.cloudToLocal.errors.push(error);
        return result;
      }
      syncStatus = CloudService.getSyncStatus();
    }

    try {
      // 1. SYNC LOCALE → CLOUD (formazioni locali mancanti sul cloud)
      console.log('📤 Fase 1: Sincronizzazione locale → cloud');
      const localFormations = await rotationsService.getAll();
      const cloudFormations = await FirestoreService.getUserFormations(true);

      for (const localFormation of localFormations) {
        try {
          // Cerca se esiste già sul cloud (stesso nome, team, descrizione)
          const existsOnCloud = cloudFormations.find(
            cloud => cloud.name === localFormation.name && 
                    cloud.teamName === localFormation.teamName &&
                    (cloud.description || '') === (localFormation.description || '')
          );

          if (!existsOnCloud) {
            // Non esiste sul cloud, caricala
            console.log(`📤 Caricamento sul cloud: ${localFormation.name} (${localFormation.teamName})`);
            
            const formationInput: FormationDataInput = {
              name: localFormation.name,
              teamName: localFormation.teamName,
              description: localFormation.description || '',
              homePositions: localFormation.homePositions,
              awayPositions: localFormation.awayPositions,
            };

            await FirestoreService.saveFormation(formationInput);
            result.localToCloud.synced++;
          }
        } catch (error) {
          console.error(`❌ Errore sync locale→cloud per "${localFormation.name}":`, error);
          result.localToCloud.failed++;
          result.localToCloud.errors.push(`${localFormation.name}: ${error}`);
        }
      }

      // 2. SYNC CLOUD → LOCALE (formazioni cloud mancanti localmente)
      console.log('📥 Fase 2: Sincronizzazione cloud → locale');
      // Ricarica le formazioni cloud per includere quelle appena caricate
      const updatedCloudFormations = await FirestoreService.getUserFormations(true);

      for (const cloudFormation of updatedCloudFormations) {
        try {
          // Cerca se esiste già localmente (stesso nome, team, descrizione)  
          const existsLocally = localFormations.find(
            local => local.name === cloudFormation.name && 
                    local.teamName === cloudFormation.teamName &&
                    (local.description || '') === (cloudFormation.description || '')
          );

          if (!existsLocally) {
            // Non esiste localmente, scaricala
            console.log(`📥 Download dal cloud: ${cloudFormation.name} (${cloudFormation.teamName})`);
            
            await rotationsService.save(
              cloudFormation.name,
              cloudFormation.teamName,
              cloudFormation.homePositions,
              cloudFormation.awayPositions,
              cloudFormation.description || ''
            );
            
            result.cloudToLocal.synced++;
          }
        } catch (error) {
          console.error(`❌ Errore sync cloud→locale per "${cloudFormation.name}":`, error);
          result.cloudToLocal.failed++;
          result.cloudToLocal.errors.push(`${cloudFormation.name}: ${error}`);
        }
      }

      console.log('✅ Sincronizzazione bidirezionale completata:');
      console.log(`  📤 Locale→Cloud: ${result.localToCloud.synced} sincronizzate, ${result.localToCloud.failed} errori`);
      console.log(`  📥 Cloud→Locale: ${result.cloudToLocal.synced} sincronizzate, ${result.cloudToLocal.failed} errori`);

    } catch (error) {
      console.error('❌ Errore durante sincronizzazione bidirezionale:', error);
      const errorMsg = `Errore generale: ${error}`;
      result.localToCloud.errors.push(errorMsg);
      result.cloudToLocal.errors.push(errorMsg);
    }

    return result;
  }
}
