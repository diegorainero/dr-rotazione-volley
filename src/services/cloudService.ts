// src/services/cloudService.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  enableNetwork,
  disableNetwork,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { TeamData } from './teamCodeService';

export interface CloudTeamData extends TeamData {
  userId: string;
  cloudId: string;
  lastSync: string;
  isPublic: boolean;
}

export interface CloudSyncStatus {
  isOnline: boolean;
  isEnabled: boolean;
  lastSync: Date | null;
  error: string | null;
}

export class CloudService {
  private static syncEnabled = false;
  private static isFirebaseConfigured = false;
  private static listeners: Set<() => void> = new Set();
  private static configError: string | null = null;

  /**
   * Verifica se Firebase è configurato correttamente
   */
  private static async checkFirebaseConfig(): Promise<boolean> {
    try {
      // Verifica se la configurazione è quella demo
      if (db.app.options.projectId === 'demo-project-id') {
        this.configError =
          'Firebase non configurato - usando configurazione demo';
        console.warn(
          '⚠️ Firebase: Configurazione demo attiva. Cloud sync disabilitato.'
        );
        return false;
      }

      // Verifica se c'è già un utente autenticato
      const { getCurrentUser } = await import('../config/firebase');
      if (getCurrentUser()) {
        this.isFirebaseConfigured = true;
        this.configError = null;
        return true;
      }

      // Se non c'è utente, il sync sarà disponibile ma richiederà autenticazione
      this.isFirebaseConfigured = true;
      this.configError = null;
      return true;
    } catch (error: any) {
      this.configError = `Errore Firebase: ${error.message}`;
      console.error('❌ Firebase non configurato:', error.message);
      return false;
    }
  }

  /**
   * Verifica e abilita automaticamente il cloud sync se possibile
   */
  static async autoEnableCloudSync(): Promise<boolean> {
    // Se già abilitato, non fare nulla
    if (this.syncEnabled && this.isFirebaseConfigured) {
      return true;
    }

    console.log('🔍 Auto-enable cloud sync check...');
    return this.enableCloudSync();
  }

  /**
   * Attiva il sync cloud per l'utente
   */
  static async enableCloudSync(): Promise<boolean> {
    // Prima verifica la configurazione Firebase
    const isConfigured = await this.checkFirebaseConfig();
    if (!isConfigured) {
      console.warn('☁️ Cloud sync non disponibile - Firebase non configurato');
      this.notifyListeners();
      return false;
    }

    try {
      // Verifica che ci sia un utente autenticato
      const { getCurrentUser } = await import('../config/firebase');
      const user = getCurrentUser();

      if (!user) {
        this.configError = 'Autenticazione richiesta per il cloud sync';
        console.warn('☁️ Cloud sync richiede autenticazione');
        this.notifyListeners();
        return false;
      }

      await enableNetwork(db);
      this.syncEnabled = true;
      this.configError = null;
      console.log(
        '☁️ Cloud sync attivato per:',
        user.displayName || user.email || 'utente anonimo'
      );
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('❌ Errore attivazione cloud sync:', error);
      this.configError = `Errore attivazione: ${(error as Error).message}`;
      return false;
    }
  }

  /**
   * Disattiva il sync cloud
   */
  static async disableCloudSync(): Promise<void> {
    try {
      await disableNetwork(db);
      this.syncEnabled = false;
      console.log('📱 Cloud sync disattivato - modalità offline');
      this.notifyListeners();
    } catch (error) {
      console.error('⚠️ Errore disattivazione cloud sync:', error);
    }
  }

  /**
   * Salva una squadra nel cloud
   */
  static async saveTeamToCloud(teamData: TeamData): Promise<string | null> {
    if (!this.syncEnabled || !this.isFirebaseConfigured) return null;

    try {
      const { getCurrentUser } = await import('../config/firebase');
      const user = getCurrentUser();

      if (!user) {
        console.error('❌ Utente non autenticato per il salvataggio cloud');
        return null;
      }

      const userId = user.uid;
      const cloudId = `${teamData.code}_${userId}`;

      const cloudTeam: CloudTeamData = {
        ...teamData,
        userId,
        cloudId,
        lastSync: new Date().toISOString(),
        isPublic: false, // Per ora manteniamo privato
      };

      await setDoc(doc(db, 'teams', cloudId), {
        ...cloudTeam,
        updatedAt: serverTimestamp(),
      });

      console.log(`☁️ Team salvato nel cloud: ${teamData.name} (${cloudId})`);
      return cloudId;
    } catch (error) {
      console.error('❌ Errore salvataggio cloud:', error);
      return null;
    }
  }

  /**
   * Carica una squadra dal cloud tramite codice
   */
  static async loadTeamFromCloud(
    teamCode: string
  ): Promise<CloudTeamData | null> {
    if (!this.isFirebaseConfigured) return null;

    try {
      const { getCurrentUser } = await import('../config/firebase');
      const user = getCurrentUser();

      if (!user) {
        console.error('❌ Utente non autenticato per il caricamento cloud');
        return null;
      }

      const userId = user.uid;
      const cloudId = `${teamCode}_${userId}`;

      const docRef = doc(db, 'teams', cloudId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as CloudTeamData;
        console.log(`☁️ Team caricato dal cloud: ${data.name}`);
        return data;
      } else {
        console.log(`ℹ️ Team ${teamCode} non trovato nel cloud`);
        return null;
      }
    } catch (error) {
      console.error('❌ Errore caricamento cloud:', error);
      return null;
    }
  }

  /**
   * Ottiene tutte le squadre dell'utente dal cloud
   */
  static async getAllUserTeams(): Promise<CloudTeamData[]> {
    if (!this.syncEnabled) return [];

    try {
      const { getCurrentUser } = await import('../config/firebase');
      const user = getCurrentUser();

      if (!user) {
        console.error('❌ Utente non autenticato per il caricamento squadre');
        return [];
      }

      const userId = user.uid;
      const q = query(
        collection(db, 'teams'),
        where('userId', '==', userId),
        orderBy('lastUsed', 'desc'),
        limit(50)
      );

      const querySnapshot = await getDocs(q);
      const teams: CloudTeamData[] = [];

      querySnapshot.forEach((doc) => {
        teams.push(doc.data() as CloudTeamData);
      });

      console.log(`☁️ Caricate ${teams.length} squadre dal cloud`);
      return teams;
    } catch (error) {
      console.error('❌ Errore caricamento squadre cloud:', error);
      return [];
    }
  }

  /**
   * Cerca squadre pubbliche per codice (condivisione universale)
   */
  static async findPublicTeam(teamCode: string): Promise<CloudTeamData | null> {
    console.log(
      '🆔 CloudService.findPublicTeam v2.0 - Cache refresh verificato'
    );
    try {
      // Verifica che l'utente sia autenticato prima di fare query
      const { getCurrentUser } = await import('../config/firebase');
      const user = getCurrentUser();

      if (!user) {
        console.log('ℹ️ Utente non autenticato - skip ricerca team pubblici');
        return null;
      }

      const q = query(
        collection(db, 'teams'),
        where('code', '==', teamCode),
        where('isPublic', '==', true),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const data = querySnapshot.docs[0].data() as CloudTeamData;
        console.log(`🌐 Team pubblico trovato: ${data.name}`);
        return data;
      }

      return null;
    } catch (error: any) {
      // Gestione silenziosa degli errori di permessi - è normale durante l'inizializzazione
      if (error?.code === 'permission-denied') {
        console.log('ℹ️ Ricerca team pubblici non disponibile (permessi)');
      } else {
        console.warn(
          '⚠️ Errore ricerca team pubblico:',
          error?.message || error
        );
      }
      return null;
    }
  }

  /**
   * Rende una squadra pubblica per la condivisione universale
   */
  static async makeTeamPublic(teamCode: string): Promise<boolean> {
    try {
      const { getCurrentUser } = await import('../config/firebase');
      const user = getCurrentUser();

      if (!user) {
        console.error('❌ Utente non autenticato per rendere team pubblico');
        return false;
      }

      const userId = user.uid;
      const cloudId = `${teamCode}_${userId}`;

      await setDoc(
        doc(db, 'teams', cloudId),
        {
          isPublic: true,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`🌐 Team ${teamCode} reso pubblico`);
      return true;
    } catch (error) {
      console.error('❌ Errore pubblicazione team:', error);
      return false;
    }
  }

  /**
   * Sincronizza squadra: carica dal cloud se più recente, salva se locale più recente
   */
  static async syncTeam(localTeam: TeamData): Promise<TeamData> {
    if (!this.syncEnabled) return localTeam;

    try {
      const cloudTeam = await this.loadTeamFromCloud(localTeam.code);

      if (!cloudTeam) {
        // Non esiste nel cloud, salvalo
        await this.saveTeamToCloud(localTeam);
        return localTeam;
      }

      // Confronta timestamp per decidere quale versione è più recente
      const localTime = new Date(localTeam.lastUsed).getTime();
      const cloudTime = new Date(cloudTeam.lastUsed).getTime();

      if (cloudTime > localTime) {
        console.log(
          `⬇️ Usando versione cloud più recente per ${localTeam.name}`
        );
        return cloudTeam;
      } else {
        console.log(
          `⬆️ Aggiornando cloud con versione locale per ${localTeam.name}`
        );
        await this.saveTeamToCloud(localTeam);
        return localTeam;
      }
    } catch (error) {
      console.error('❌ Errore sincronizzazione:', error);
      return localTeam; // Fallback alla versione locale
    }
  }

  /**
   * Ottiene lo status del sync cloud
   */
  static getSyncStatus(): CloudSyncStatus {
    return {
      isEnabled: this.syncEnabled && this.isFirebaseConfigured,
      isOnline: navigator.onLine,
      lastSync: this.syncEnabled ? new Date() : null,
      error: this.configError,
    };
  }

  /**
   * Listener per cambi di status
   */
  static addSyncStatusListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private static notifyListeners = (() => {
    const { debounce } = require('../utils/performance');
    return debounce(() => {
      this.listeners.forEach((listener) => listener());
    }, 100); // Debounce notifications per 100ms
  })();

  /**
   * Backup completo di tutte le squadre locali nel cloud
   */
  static async backupAllTeams(teams: TeamData[]): Promise<number> {
    if (!this.syncEnabled) return 0;

    let backedUp = 0;
    for (const team of teams) {
      const success = await this.saveTeamToCloud(team);
      if (success) backedUp++;
    }

    console.log(`☁️ Backup completato: ${backedUp}/${teams.length} squadre`);
    return backedUp;
  }
}
