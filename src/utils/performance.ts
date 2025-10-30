// src/utils/performance.ts

/**
 * Debounce function per limitare la frequenza di chiamate
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  }) as T;
};

/**
 * Throttle function per limitare le esecuzioni
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
};

/**
 * Cleanup per listener e timer
 */
export class CleanupManager {
  private cleanupFunctions: Array<() => void> = [];

  add(cleanup: () => void): void {
    this.cleanupFunctions.push(cleanup);
  }

  cleanup(): void {
    this.cleanupFunctions.forEach((fn) => {
      try {
        fn();
      } catch (error) {
        console.warn('Errore durante cleanup:', error);
      }
    });
    this.cleanupFunctions = [];
  }
}

/**
 * Memory monitoring (solo per debug)
 */
export const logMemoryUsage = () => {
  if (
    typeof window !== 'undefined' &&
    'performance' in window &&
    'memory' in performance
  ) {
    const memory = (performance as any).memory;
    console.log('🧠 Memory:', {
      used: `${Math.round(memory.usedJSHeapSize / 1048576)} MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1048576)} MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)} MB`,
    });
  }
};
