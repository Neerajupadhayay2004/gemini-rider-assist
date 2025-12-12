import { useCallback } from 'react';

export const useVibration = () => {
  const isSupported = 'vibrate' in navigator;

  const vibrate = useCallback((pattern: number | number[]) => {
    if (isSupported) {
      navigator.vibrate(pattern);
    }
  }, [isSupported]);

  // Predefined patterns
  const patterns = {
    // Short tap for notifications
    tap: () => vibrate(50),
    
    // Double tap for success
    success: () => vibrate([50, 50, 50]),
    
    // Warning pattern - medium intensity
    warning: () => vibrate([200, 100, 200]),
    
    // Danger/Emergency - strong continuous
    danger: () => vibrate([500, 100, 500, 100, 500]),
    
    // Collision alert - urgent pattern
    collision: () => vibrate([1000, 200, 1000, 200, 1000]),
    
    // SOS pattern (... --- ...)
    sos: () => vibrate([
      100, 50, 100, 50, 100, // S
      200, // pause
      300, 50, 300, 50, 300, // O
      200, // pause
      100, 50, 100, 50, 100  // S
    ]),
    
    // Speed warning
    speedWarning: () => vibrate([300, 100, 300]),
    
    // Sharp turn warning
    turnWarning: () => vibrate([150, 50, 150, 50, 150]),
    
    // Hard braking detected
    hardBrake: () => vibrate([400, 100, 400]),
  };

  const stop = useCallback(() => {
    if (isSupported) {
      navigator.vibrate(0);
    }
  }, [isSupported]);

  return {
    isSupported,
    vibrate,
    patterns,
    stop,
  };
};
