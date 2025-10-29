import { useState, useEffect } from 'react';

interface CanvasSize {
  width: number;
  height: number;
  scale: number;
}

interface UseResponsiveCanvasOptions {
  baseWidth: number;
  baseHeight: number;
  maxWidth?: number;
  minScale?: number;
  maxScale?: number;
}

/**
 * Hook personalizzato per gestire canvas responsive con react-konva
 * Mantiene le proporzioni del campo di volley e si adatta a tutti i device
 */
export const useResponsiveCanvas = ({
  baseWidth,
  baseHeight,
  maxWidth = Infinity,
  minScale = 0.3,
  maxScale = 1.2,
}: UseResponsiveCanvasOptions): CanvasSize => {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: baseWidth,
    height: baseHeight,
    scale: 1,
  });

  useEffect(() => {
    const calculateSize = () => {
      // Ottieni dimensioni viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Riserva spazio per header e controlli (circa 200px)
      const availableHeight = viewportHeight - 200;
      const availableWidth = Math.min(viewportWidth - 40, maxWidth); // 40px per padding laterale

      // Calcola scale in base a larghezza e altezza disponibili
      const scaleByWidth = availableWidth / baseWidth;
      const scaleByHeight = availableHeight / baseHeight;

      // Usa la scala più restrittiva per mantenere proporzioni
      let scale = Math.min(scaleByWidth, scaleByHeight);

      // Applica limiti di scala
      scale = Math.max(minScale, Math.min(maxScale, scale));

      // Per react-konva è meglio usare le dimensioni scalate direttamente
      const finalWidth = Math.round(baseWidth * scale);
      const finalHeight = Math.round(baseHeight * scale);

      console.log('📱 Resize calcolato:', {
        viewport: { width: viewportWidth, height: viewportHeight },
        available: { width: availableWidth, height: availableHeight },
        scale: scale.toFixed(2),
        final: { width: finalWidth, height: finalHeight },
      });

      setCanvasSize({
        width: finalWidth,
        height: finalHeight,
        scale,
      });
    };

    // Calcola inizialmente
    calculateSize();

    // Listener per resize
    window.addEventListener('resize', calculateSize);

    // Listener per orientamento mobile
    window.addEventListener('orientationchange', () => {
      // Piccolo delay per aspettare che l'orientamento si stabilizzi
      setTimeout(calculateSize, 100);
    });

    return () => {
      window.removeEventListener('resize', calculateSize);
      window.removeEventListener('orientationchange', calculateSize);
    };
  }, [baseWidth, baseHeight, maxWidth, minScale, maxScale]);

  return canvasSize;
};

/**
 * Hook per rilevare se siamo su mobile
 */
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor;
      const mobileRegex =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isTouchDevice = 'ontouchstart' in window;
      const isSmallScreen = window.innerWidth <= 768;

      setIsMobile(
        mobileRegex.test(userAgent) || (isTouchDevice && isSmallScreen)
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};
