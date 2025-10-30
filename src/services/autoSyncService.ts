// src/services/autoSyncService.ts
import { MigrationService } from './migrationService';
import { getCurrentUser } from '../config/firebase';

interface AutoSyncConfig {
  intervalMinutes: number;
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  onlyWhenOnline: boolean;
}

interface AutoSyncState {
  lastSync: Date | null;
  nextSync: Date | null;
  isRunning: boolean;
  attempts: number;
  errors: string[];
  successfulSyncs: number;
}

export class AutoSyncService {
  private static instance: AutoSyncService | null = null;
  private config: AutoSyncConfig;
  private state: AutoSyncState;
  private intervalId: NodeJS.Timeout | null = null;
  private onStateChange?: (state: AutoSyncState) => void;

  private constructor() {
    // Configurazione predefinita
    this.config = {
      intervalMinutes: 5, // Sync ogni 5 minuti
      enabled: false,
      maxRetries: 3,
      retryDelayMs: 30000, // 30 secondi tra retry
      onlyWhenOnline: true,
    };

    this.state = {
      lastSync: null,
      nextSync: null,
      isRunning: false,
      attempts: 0,
      errors: [],
      successfulSyncs: 0,
    };

    // Carica configurazione salvata
    this.loadConfig();

    // Listener per connettività
    this.setupConnectivityListeners();
  }

  static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService();
    }
    return AutoSyncService.instance;
  }

  /**
   * Configura il servizio di auto-sync
   */
  configure(config: Partial<AutoSyncConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();

    if (this.config.enabled) {
      this.start();
    } else {
      this.stop();
    }

    console.log('🔄 AutoSync configurato:', this.config);
  }

  /**
   * Avvia il servizio di auto-sync
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('⏸️ AutoSync disabilitato');
      return;
    }

    if (this.intervalId) {
      this.stop();
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;

    console.log(
      `🚀 AutoSync avviato - intervallo: ${this.config.intervalMinutes} minuti`
    );

    // Prima esecuzione immediata (se possibile)
    this.performSync();

    // Programmazione periodica
    this.intervalId = setInterval(() => {
      this.performSync();
    }, intervalMs);

    this.updateNextSyncTime();
  }

  /**
   * Ferma il servizio di auto-sync
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ AutoSync fermato');
    }

    this.state.nextSync = null;
    this.notifyStateChange();
  }

  /**
   * Esegue la sincronizzazione con gestione errori e retry
   */
  private async performSync(): Promise<void> {
    // Verifica prerequisiti
    if (!this.canSync()) {
      console.log('🚫 AutoSync saltato - prerequisiti non soddisfatti');
      return;
    }

    this.state.isRunning = true;
    this.state.attempts++;
    this.notifyStateChange();

    let retryCount = 0;

    while (retryCount <= this.config.maxRetries) {
      try {
        console.log(
          `🔄 AutoSync tentativo ${retryCount + 1}/${
            this.config.maxRetries + 1
          }`
        );

        // Esegui migrazione
        const result = await MigrationService.migrateAllTeamsToFirestore();

        if (result.migrated > 0 || result.failed === 0) {
          // Successo
          this.state.lastSync = new Date();
          this.state.successfulSyncs++;
          this.state.errors = []; // Reset errori

          console.log(
            `✅ AutoSync completato: ${result.migrated} migrate, ${result.failed} fallite`
          );
          break;
        } else if (result.failed > 0) {
          throw new Error(`Migrazione fallita: ${result.errors.join(', ')}`);
        }
      } catch (error: any) {
        retryCount++;
        const errorMsg = `Tentativo ${retryCount}: ${error.message}`;
        console.error(`❌ AutoSync errore:`, errorMsg);

        // Aggiungi errore alla lista
        this.state.errors.push(errorMsg);
        if (this.state.errors.length > 10) {
          this.state.errors = this.state.errors.slice(-10); // Mantieni solo gli ultimi 10
        }

        // Se non è l'ultimo tentativo, aspetta prima del retry
        if (retryCount <= this.config.maxRetries) {
          console.log(
            `⏳ AutoSync retry in ${this.config.retryDelayMs / 1000} secondi...`
          );
          await this.delay(this.config.retryDelayMs);
        }
      }
    }

    this.state.isRunning = false;
    this.updateNextSyncTime();
    this.notifyStateChange();
  }

  /**
   * Verifica se la sincronizzazione può essere eseguita
   */
  private canSync(): boolean {
    // Verifica autenticazione
    const user = getCurrentUser();
    if (!user) {
      console.log('🚫 AutoSync: utente non autenticato');
      return false;
    }

    // Verifica connettività (se richiesta)
    if (this.config.onlyWhenOnline && !navigator.onLine) {
      console.log('🚫 AutoSync: device offline');
      return false;
    }

    // Verifica se già in esecuzione
    if (this.state.isRunning) {
      console.log('🚫 AutoSync: già in esecuzione');
      return false;
    }

    return true;
  }

  /**
   * Aggiorna il tempo della prossima sincronizzazione
   */
  private updateNextSyncTime(): void {
    if (this.config.enabled && this.intervalId) {
      const nextTime = new Date();
      nextTime.setTime(
        nextTime.getTime() + this.config.intervalMinutes * 60 * 1000
      );
      this.state.nextSync = nextTime;
    } else {
      this.state.nextSync = null;
    }
  }

  /**
   * Setup listener per connettività
   */
  private setupConnectivityListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Connessione ripristinata - AutoSync riprende');
      if (this.config.enabled && this.config.onlyWhenOnline) {
        // Sync immediato quando torna online
        setTimeout(() => this.performSync(), 2000);
      }
    });

    window.addEventListener('offline', () => {
      console.log('📴 Connessione persa - AutoSync in pausa');
    });
  }

  /**
   * Utility per delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Salva configurazione nel localStorage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('autosync_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('⚠️ Errore salvataggio config AutoSync:', error);
    }
  }

  /**
   * Carica configurazione dal localStorage
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('autosync_config');
      if (saved) {
        const parsedConfig = JSON.parse(saved);
        this.config = { ...this.config, ...parsedConfig };
        console.log('📥 Configurazione AutoSync caricata:', this.config);
      }
    } catch (error) {
      console.warn('⚠️ Errore caricamento config AutoSync:', error);
    }
  }

  /**
   * Callback per notificare cambi di stato
   */
  setStateChangeListener(callback: (state: AutoSyncState) => void): void {
    this.onStateChange = callback;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.state });
    }
  }

  /**
   * Getter per stato e configurazione
   */
  getState(): AutoSyncState {
    return { ...this.state };
  }

  getConfig(): AutoSyncConfig {
    return { ...this.config };
  }

  /**
   * Sync manuale (sovrascrive scheduler)
   */
  async syncNow(): Promise<boolean> {
    try {
      await this.performSync();
      return this.state.errors.length === 0;
    } catch (error) {
      console.error('❌ Sync manuale fallito:', error);
      return false;
    }
  }

  /**
   * Reset statistiche e errori
   */
  reset(): void {
    this.state = {
      lastSync: null,
      nextSync: null,
      isRunning: false,
      attempts: 0,
      errors: [],
      successfulSyncs: 0,
    };
    this.updateNextSyncTime();
    this.notifyStateChange();
    console.log('🔄 AutoSync reset completato');
  }

  /**
   * Statistiche per debugging
   */
  getStats(): {
    config: AutoSyncConfig;
    state: AutoSyncState;
    status: 'running' | 'stopped' | 'error';
    nextSyncIn?: string;
  } {
    let status: 'running' | 'stopped' | 'error' = 'stopped';

    if (this.state.isRunning) {
      status = 'running';
    } else if (this.config.enabled) {
      status = this.state.errors.length > 0 ? 'error' : 'running';
    }

    let nextSyncIn: string | undefined;
    if (this.state.nextSync) {
      const diffMs = this.state.nextSync.getTime() - Date.now();
      const diffMin = Math.round(diffMs / 60000);
      nextSyncIn = diffMin > 0 ? `${diffMin} minuti` : 'imminente';
    }

    return {
      config: this.getConfig(),
      state: this.getState(),
      status,
      nextSyncIn,
    };
  }
}
