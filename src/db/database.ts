import Dexie, { Table } from 'dexie';

// Interfacce per i dati da salvare
export interface SavedReceivePosition {
  id?: number;
  rotationKey: string;
  positions: { x: number; y: number }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedRotation {
  id?: number;
  name: string;
  teamName: string; // Nome della squadra
  description?: string; // Descrizione opzionale
  homePositions: { zone: number; x: number; y: number; role: string }[];
  awayPositions: { zone: number; x: number; y: number; role: string }[];
  createdAt: Date;
  updatedAt: Date;
}

// Classe del database
export class VolleyballDB extends Dexie {
  // Tabelle
  receivePositions!: Table<SavedReceivePosition>;
  rotations!: Table<SavedRotation>;

  constructor() {
    super('VolleyballRotationsDB');

    // Schema del database - versione aggiornata
    this.version(1).stores({
      receivePositions: '++id, rotationKey, createdAt',
      rotations: '++id, name, teamName, createdAt',
    });

    // Versione 2: Aggiungi updatedAt agli indici
    this.version(2).stores({
      receivePositions: '++id, rotationKey, createdAt, updatedAt',
      rotations: '++id, name, teamName, createdAt, updatedAt',
    });
  }
}

// Istanza del database
export const db = new VolleyballDB();

// Funzione di utilità per resettare il database in caso di errori di schema
export const resetDatabase = async (): Promise<void> => {
  try {
    await db.delete();
    await db.open();
    console.log('🔄 Database resettato con successo');
  } catch (error) {
    console.error('❌ Errore nel reset del database:', error);
  }
};

// Funzioni helper per gestire le posizioni di ricezione
export const receivePositionsService = {
  // Salva posizioni di ricezione
  async save(
    rotationKey: string,
    positions: { x: number; y: number }[]
  ): Promise<void> {
    const now = new Date();

    // Controlla se esiste già una entry per questa rotazione
    const existing = await db.receivePositions
      .where('rotationKey')
      .equals(rotationKey)
      .first();

    if (existing) {
      // Aggiorna quella esistente
      await db.receivePositions.update(existing.id!, {
        positions,
        updatedAt: now,
      });
    } else {
      // Crea nuova entry
      await db.receivePositions.add({
        rotationKey,
        positions,
        createdAt: now,
        updatedAt: now,
      });
    }
  },

  // Carica posizioni di ricezione
  async load(rotationKey: string): Promise<{ x: number; y: number }[] | null> {
    const saved = await db.receivePositions
      .where('rotationKey')
      .equals(rotationKey)
      .first();
    return saved ? saved.positions : null;
  },

  // Ottieni tutte le posizioni salvate
  async getAll(): Promise<SavedReceivePosition[]> {
    return await db.receivePositions.orderBy('createdAt').reverse().toArray();
  },

  // Elimina posizioni per una rotazione
  async delete(rotationKey: string): Promise<void> {
    await db.receivePositions.where('rotationKey').equals(rotationKey).delete();
  },

  // Pulisci tutte le posizioni
  async clear(): Promise<void> {
    await db.receivePositions.clear();
  },
};

// Funzioni helper per gestire le rotazioni complete
export const rotationsService = {
  // Salva rotazione completa
  async save(
    name: string,
    teamName: string,
    homePositions: { zone: number; x: number; y: number; role: string }[],
    awayPositions: { zone: number; x: number; y: number; role: string }[],
    description?: string
  ): Promise<void> {
    const now = new Date();

    await db.rotations.add({
      name,
      teamName,
      description,
      homePositions,
      awayPositions,
      createdAt: now,
      updatedAt: now,
    });
  },

  // Carica rotazione
  async load(id: number): Promise<SavedRotation | undefined> {
    return await db.rotations.get(id);
  },

  // Ottieni tutte le rotazioni
  async getAll(): Promise<SavedRotation[]> {
    return await db.rotations.orderBy('createdAt').reverse().toArray();
  },

  // Ottieni rotazioni per squadra specifica
  async getByTeam(teamName: string): Promise<SavedRotation[]> {
    const rotations = await db.rotations
      .where('teamName')
      .equals(teamName)
      .toArray();
    return rotations.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  },

  // Ottieni tutti i nomi delle squadre
  async getAllTeamNames(): Promise<string[]> {
    const rotations = await db.rotations.toArray();
    const teamNamesSet = new Set<string>();
    rotations.forEach((r) => teamNamesSet.add(r.teamName));
    const teamNames = Array.from(teamNamesSet);
    return teamNames.sort();
  },

  // Elimina rotazione
  async delete(id: number): Promise<void> {
    await db.rotations.delete(id);
  },

  // Elimina tutte le rotazioni di una squadra
  async deleteByTeam(teamName: string): Promise<void> {
    await db.rotations.where('teamName').equals(teamName).delete();
  },

  // Pulisci tutte le rotazioni
  async clear(): Promise<void> {
    await db.rotations.clear();
  },
};
