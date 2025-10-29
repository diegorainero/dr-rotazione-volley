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
import { db, ensureAuth } from '../config/firebase';
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
  private static listeners: Array<() => void> = [];
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

      // Tenta una connessione di test
      await ensureAuth();
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
      await enableNetwork(db);
      this.syncEnabled = true;
      console.log('☁️ Cloud sync attivato');
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
      const userId = await ensureAuth();
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
      const userId = await ensureAuth();
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
      const userId = await ensureAuth();
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
    try {
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
    } catch (error) {
      console.error('❌ Errore ricerca team pubblico:', error);
      return null;
    }
  }

  /**
   * Rende una squadra pubblica per la condivisione universale
   */
  static async makeTeamPublic(teamCode: string): Promise<boolean> {
    try {
      const userId = await ensureAuth();
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
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private static notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

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
