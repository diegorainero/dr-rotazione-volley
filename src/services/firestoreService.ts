// src/services/firestoreService.ts
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  getDocsFromServer,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { getCurrentUser } from '../config/firebase';

// Tipi di dati
export interface PlayerData {
  role: string;
  x: number;
  y: number;
  color?: string;
}

export interface TeamData {
  id?: string;
  code: string;
  name: string;
  description?: string;
  players: PlayerData[];
  createdAt: string | Timestamp;
  lastUsed: string | Timestamp;
  updatedAt?: string | Timestamp;
  formations?: number;
  receptions?: number;
  userId: string;
  isPublic: boolean;
}

// Tipo per input (quando si creano documenti)
export interface TeamDataInput {
  code: string;
  name: string;
  description?: string;
  players: PlayerData[];
  createdAt?: string | Timestamp;
  formations?: number;
  receptions?: number;
  isPublic?: boolean;
}

export interface ReceptionData {
  id?: string;
  teamCode: string;
  mode: 'senior' | 'under13';
  players: PlayerData[];
  createdAt: string | Timestamp;
  lastUsed: string | Timestamp;
  userId: string;
}

// Tipo per input ricezioni
export interface ReceptionDataInput {
  teamCode: string;
  mode: 'senior' | 'under13';
  players: PlayerData[];
  createdAt?: string | Timestamp;
}

// Tipo per posizione giocatore nelle formazioni
export interface FormationPlayerPosition {
  zone: number;
  x: number;
  y: number;
  role: string;
  name?: string; // Nome personalizzato del giocatore
}

// Tipo per formazioni su Firestore
export interface FormationData {
  id?: string;
  name: string;
  teamName: string;
  description?: string;
  homePositions: FormationPlayerPosition[];
  awayPositions: FormationPlayerPosition[];
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
  userId: string;
}

// Tipo per input formazioni
export interface FormationDataInput {
  name: string;
  teamName: string;
  description?: string;
  homePositions: FormationPlayerPosition[];
  awayPositions: FormationPlayerPosition[];
}

/**
 * Servizio per gestire i dati su Firestore
 */
export class FirestoreService {
  private static readonly COLLECTIONS = {
    TEAMS: 'teams',
    RECEPTIONS: 'receptions',
    FORMATIONS: 'formations',
    USERS: 'users',
  } as const;

  /**
   * Ottiene l'ID dell'utente corrente
   */
  private static getCurrentUserId(): string {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Utente non autenticato');
    }
    return user.uid;
  }

  /**
   * Verifica se l'utente è autenticato
   */
  static isUserAuthenticated(): boolean {
    try {
      const user = getCurrentUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ottiene informazioni sull'utente corrente (pubblico)
   */
  static getCurrentUserInfo(): { uid: string; email: string | null } | null {
    try {
      const user = getCurrentUser();
      return user ? { uid: user.uid, email: user.email } : null;
    } catch (error) {
      return null;
    }
  }

  // === GESTIONE SQUADRE ===

  /**
   * Salva una squadra su Firestore
   */
  static async saveTeam(teamData: TeamDataInput): Promise<TeamData> {
    try {
      const userId = this.getCurrentUserId();
      const now = new Date().toISOString();

      console.log(`💾 Salvando squadra ${teamData.code} per utente ${userId}`);

      // Prepara i dati con timestamp corretti
      const teamForFirestore = {
        ...teamData,
        userId,
        updatedAt: serverTimestamp(),
        createdAt: teamData.createdAt || serverTimestamp(),
        lastUsed: serverTimestamp(),
        isPublic: teamData.isPublic || false,
      };

      const docRef = doc(db, this.COLLECTIONS.TEAMS, teamData.code);
      await setDoc(docRef, teamForFirestore, { merge: true });

      console.log(`✅ Squadra ${teamData.code} salvata con successo`);

      // Ritorna con timestamp ISO per compatibilità
      const resultTeam: TeamData = {
        ...teamData,
        userId,
        updatedAt: now,
        createdAt:
          typeof teamData.createdAt === 'string' ? teamData.createdAt : now,
        lastUsed: now,
        isPublic: teamData.isPublic || false,
        id: teamData.code,
      };

      console.log(`✅ Squadra salvata: ${teamData.name} (${teamData.code})`);
      return resultTeam;
    } catch (error: any) {
      console.error('❌ Errore salvataggio squadra:', error);

      // Gestione errori specifici
      if (error.code === 'permission-denied') {
        throw new Error(
          `Accesso negato: verifica le regole Firestore per la squadra ${teamData.code}`
        );
      }

      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        throw new Error(
          'Database temporaneamente non disponibile - riprova tra poco'
        );
      }

      if (error.code === 'unauthenticated') {
        throw new Error("Sessione scaduta - effettua nuovamente l'accesso");
      }

      throw new Error(`Errore salvataggio squadra: ${error.message}`);
    }
  }

  /**
   * Carica una squadra per codice
   */
  static async loadTeam(teamCode: string): Promise<TeamData | null> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTIONS.TEAMS, teamCode);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.log(`ℹ️ Squadra ${teamCode} non trovata`);
        return null;
      }

      const data = docSnap.data() as TeamData;

      // Verifica che l'utente abbia accesso
      if (data.userId !== userId && !data.isPublic) {
        console.log(`🔒 Accesso negato alla squadra ${teamCode}`);
        return null;
      }

      // Aggiorna ultimo utilizzo
      await updateDoc(docRef, { lastUsed: serverTimestamp() });

      console.log(`✅ Squadra caricata: ${data.name}`);
      return { ...data, id: docSnap.id };
    } catch (error) {
      console.error('❌ Errore caricamento squadra:', error);
      throw error;
    }
  }

  /**
   * Ottiene tutte le squadre dell'utente
   */
  static async getUserTeams(): Promise<TeamData[]> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, this.COLLECTIONS.TEAMS),
        where('userId', '==', userId),
        orderBy('lastUsed', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const teams: TeamData[] = [];

      querySnapshot.forEach((doc) => {
        teams.push({ ...(doc.data() as TeamData), id: doc.id });
      });

      console.log(`✅ Caricate ${teams.length} squadre dell'utente`);
      return teams;
    } catch (error) {
      console.error('❌ Errore caricamento squadre utente:', error);
      throw error;
    }
  }

  /**
   * Elimina una squadra
   */
  static async deleteTeam(teamCode: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      const docRef = doc(db, this.COLLECTIONS.TEAMS, teamCode);

      // Verifica proprietà
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Squadra non trovata');
      }

      const data = docSnap.data() as TeamData;
      if (data.userId !== userId) {
        throw new Error('Non hai i permessi per eliminare questa squadra');
      }

      await deleteDoc(docRef);
      console.log(`✅ Squadra eliminata: ${teamCode}`);
    } catch (error) {
      console.error('❌ Errore eliminazione squadra:', error);
      throw error;
    }
  }

  // === GESTIONE RICEZIONI ===

  /**
   * Salva una ricezione
   */
  static async saveReception(
    receptionData: ReceptionDataInput
  ): Promise<ReceptionData> {
    try {
      const userId = this.getCurrentUserId();
      const now = new Date().toISOString();

      const receptionForFirestore = {
        ...receptionData,
        userId,
        createdAt: receptionData.createdAt || serverTimestamp(),
        lastUsed: serverTimestamp(),
      };

      const docRef = doc(collection(db, this.COLLECTIONS.RECEPTIONS));
      await setDoc(docRef, receptionForFirestore);

      const resultReception: ReceptionData = {
        ...receptionData,
        userId,
        createdAt:
          typeof receptionData.createdAt === 'string'
            ? receptionData.createdAt
            : now,
        lastUsed: now,
        id: docRef.id,
      };

      console.log(
        `✅ Ricezione salvata: ${receptionData.teamCode} (${receptionData.mode})`
      );
      return resultReception;
    } catch (error) {
      console.error('❌ Errore salvataggio ricezione:', error);
      throw error;
    }
  }

  /**
   * Carica ricezione per squadra e modalità
   */
  static async loadReception(
    teamCode: string,
    mode: 'senior' | 'under13'
  ): Promise<ReceptionData | null> {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, this.COLLECTIONS.RECEPTIONS),
        where('teamCode', '==', teamCode),
        where('mode', '==', mode),
        where('userId', '==', userId),
        orderBy('lastUsed', 'desc'),
        limit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const doc = querySnapshot.docs[0];
      const data = doc.data() as ReceptionData;

      console.log(`✅ Ricezione caricata: ${teamCode} (${mode})`);
      return { ...data, id: doc.id };
    } catch (error) {
      console.error('❌ Errore caricamento ricezione:', error);
      throw error;
    }
  }

  // === GESTIONE FORMAZIONI ===

  /**
   * Salva una formazione completa
   */
  static async saveFormation(
    formationData: FormationDataInput
  ): Promise<FormationData> {
    try {
      const userId = this.getCurrentUserId();
      const now = new Date().toISOString();

      // Funzione helper per pulire le posizioni
      const cleanPositions = (positions: FormationPlayerPosition[]) => {
        return positions.map((pos) => {
          const cleanPos: any = {
            zone: pos.zone,
            x: pos.x,
            y: pos.y,
            role: pos.role,
          };

          // Aggiungi name solo se è presente e non vuoto
          if (pos.name && pos.name.trim() !== '') {
            cleanPos.name = pos.name.trim();
          }

          return cleanPos;
        });
      };

      // Rimuovi campi undefined che Firestore non accetta
      const cleanData: any = {
        name: formationData.name,
        teamName: formationData.teamName,
        homePositions: cleanPositions(formationData.homePositions),
        awayPositions: cleanPositions(formationData.awayPositions),
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Salva sempre description (anche se vuota)
      cleanData.description = (formationData.description || '').trim();

      const docRef = doc(collection(db, this.COLLECTIONS.FORMATIONS));
      await setDoc(docRef, cleanData);

      const resultFormation: FormationData = {
        name: formationData.name,
        teamName: formationData.teamName,
        homePositions: cleanData.homePositions,
        awayPositions: cleanData.awayPositions,
        userId,
        createdAt: now,
        updatedAt: now,
        id: docRef.id,
      };

      // Aggiungi sempre description
      resultFormation.description = cleanData.description;

      console.log(`✅ Formazione salvata: ${formationData.name}`);
      return resultFormation;
    } catch (error) {
      console.error('❌ Errore salvataggio formazione:', error);
      throw error;
    }
  }

  /**
   * Ottiene tutte le formazioni dell'utente
   *
   * NOTA: Per performance ottimali in produzione, creare l'indice composto:
   * Collection: formations
   * Fields: userId (Ascending), createdAt (Descending)
   * URL: https://console.firebase.google.com/project/dr-rotazioni-volley/firestore/indexes
   */
  static async getUserFormations(
    forceRefresh: boolean = false
  ): Promise<FormationData[]> {
    try {
      const userId = this.getCurrentUserId();
      // Rimuovo l'orderBy per evitare il problema dell'indice composto
      // L'ordinamento verrà fatto in memoria
      const q = query(
        collection(db, this.COLLECTIONS.FORMATIONS),
        where('userId', '==', userId)
      );

      // Usa getDocsFromServer per forzare refresh dal server se richiesto
      const querySnapshot = forceRefresh
        ? await getDocsFromServer(q)
        : await getDocs(q);

      const formations: FormationData[] = [];

      querySnapshot.forEach((doc) => {
        formations.push({ ...(doc.data() as FormationData), id: doc.id });
      });

      if (forceRefresh) {
        console.log(
          `🔄 Formazioni caricate dal SERVER (cache bypassed): ${formations.length}`
        );
      } else {
        console.log(`📋 Formazioni caricate (con cache): ${formations.length}`);
      }

      // Ordina in memoria per data di creazione discendente
      formations.sort((a, b) => {
        const dateA = new Date(
          typeof a.createdAt === 'string'
            ? a.createdAt
            : a.createdAt.toDate?.() || new Date()
        );
        const dateB = new Date(
          typeof b.createdAt === 'string'
            ? b.createdAt
            : b.createdAt.toDate?.() || new Date()
        );
        return dateB.getTime() - dateA.getTime();
      });

      return formations;
    } catch (error) {
      console.error('❌ Errore caricamento formazioni utente:', error);
      throw error;
    }
  }

  /**
   * Elimina una formazione
   */
  static async deleteFormation(formationId: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      console.log(
        `🔍 Debug delete: userId=${userId}, formationId=${formationId}`
      );

      const docRef = doc(db, this.COLLECTIONS.FORMATIONS, formationId);

      // Verifica proprietà
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        console.error(`❌ Formazione ${formationId} non trovata`);
        throw new Error('Formazione non trovata');
      }

      const data = docSnap.data() as FormationData;
      console.log(
        `🔍 Debug: data.userId=${data.userId}, current.userId=${userId}`
      );

      if (data.userId !== userId) {
        console.error(
          `❌ Permessi negati: formazione appartiene a ${data.userId}, utente corrente: ${userId}`
        );
        throw new Error('Non hai i permessi per eliminare questa formazione');
      }

      console.log(`🗑️ Eliminando documento ${formationId}...`);
      await deleteDoc(docRef);
      console.log(`✅ Formazione eliminata: ${formationId}`);
    } catch (error) {
      console.error('❌ Errore eliminazione formazione:', error);
      throw error;
    }
  }

  /**
   * Aggiorna una formazione esistente
   */
  static async updateFormation(
    formationId: string,
    formationData: FormationDataInput
  ): Promise<FormationData> {
    try {
      const userId = this.getCurrentUserId();
      const now = new Date().toISOString();

      // Funzione helper per pulire le posizioni (come in saveFormation)
      const cleanPositions = (positions: FormationPlayerPosition[]) => {
        return positions.map((pos) => {
          const cleanPos: any = {
            zone: pos.zone,
            x: pos.x,
            y: pos.y,
            role: pos.role,
          };

          // Aggiungi name solo se è presente e non vuoto
          if (pos.name && pos.name.trim() !== '') {
            cleanPos.name = pos.name.trim();
          }

          return cleanPos;
        });
      };

      // Verifica che la formazione esista e appartenga all'utente
      const docRef = doc(db, this.COLLECTIONS.FORMATIONS, formationId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('Formazione non trovata');
      }

      const existingData = docSnap.data() as FormationData;
      if (existingData.userId !== userId) {
        throw new Error('Non hai i permessi per aggiornare questa formazione');
      }

      // Prepara i dati puliti per l'aggiornamento
      const updateData: any = {
        name: formationData.name,
        teamName: formationData.teamName,
        homePositions: cleanPositions(formationData.homePositions),
        awayPositions: cleanPositions(formationData.awayPositions),
        updatedAt: serverTimestamp(),
      };

      // Salva sempre description (anche se vuota)
      updateData.description = (formationData.description || '').trim();

      await updateDoc(docRef, updateData);

      const resultFormation: FormationData = {
        ...existingData,
        name: formationData.name,
        teamName: formationData.teamName,
        homePositions: updateData.homePositions,
        awayPositions: updateData.awayPositions,
        description: updateData.description,
        updatedAt: now,
        id: formationId,
      };

      console.log(`✅ Formazione aggiornata: ${formationData.name}`);
      return resultFormation;
    } catch (error) {
      console.error('❌ Errore aggiornamento formazione:', error);
      throw error;
    }
  }

  // === LISTENER REAL-TIME ===

  /**
   * Ascolta cambiamenti alle squadre dell'utente in tempo reale
   */
  static subscribeToUserTeams(
    callback: (teams: TeamData[]) => void
  ): () => void {
    try {
      const userId = this.getCurrentUserId();
      const q = query(
        collection(db, this.COLLECTIONS.TEAMS),
        where('userId', '==', userId),
        orderBy('lastUsed', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const teams: TeamData[] = [];
        snapshot.forEach((doc) => {
          teams.push({ ...(doc.data() as TeamData), id: doc.id });
        });
        callback(teams);
      });
    } catch (error) {
      console.error('❌ Errore sottoscrizione squadre:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // === UTILITY ===

  /**
   * Genera un codice squadra univoco
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
   * Verifica se una squadra esiste
   */
  static async teamExists(teamCode: string): Promise<boolean> {
    try {
      const user = getCurrentUser();
      if (!user) {
        console.warn('⚠️ teamExists: utente non autenticato');
        return false;
      }

      const docRef = doc(db, this.COLLECTIONS.TEAMS, teamCode);
      const docSnap = await getDoc(docRef);

      // Verifica che sia la squadra dell'utente corrente
      if (docSnap.exists()) {
        const data = docSnap.data() as TeamData;
        return data.userId === user.uid;
      }

      return false;
    } catch (error: any) {
      console.error('❌ Errore verifica esistenza squadra:', error);

      // Se è un errore di offline, restituiamo false
      if (error.code === 'unavailable' || error.message?.includes('offline')) {
        console.log('📴 Database offline - teamExists ritorna false');
        return false;
      }

      return false;
    }
  }

  /**
   * Conta le squadre dell'utente
   */
  static async getUserTeamsCount(): Promise<number> {
    try {
      const teams = await this.getUserTeams();
      return teams.length;
    } catch (error) {
      console.error('❌ Errore conteggio squadre:', error);
      return 0;
    }
  }
}
