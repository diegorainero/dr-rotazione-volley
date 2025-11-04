// src/utils/authLogger.ts

/**
 * Logger specifico per debugging dell'autenticazione e race conditions
 */
export class AuthLogger {
  private static logs: string[] = [];

  static log(message: string, data?: any) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const logEntry = `[${timestamp}] ${message}`;

    console.log(`🔐 AUTH: ${logEntry}`, data || '');
    this.logs.push(logEntry);

    // Mantieni solo gli ultimi 50 log
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
  }

  static getLogs(): string[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
  }

  static exportLogs(): string {
    return this.logs.join('\n');
  }
}

// Registra il logger globalmente per debugging
if (typeof window !== 'undefined') {
  (window as any).authLogger = AuthLogger;
}
