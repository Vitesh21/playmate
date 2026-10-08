import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppState() {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => subscription.remove();
  }, []);

  return {
    appState,
    isForeground: appState === 'active',
    isBackground: appState === 'background',
    isInactive: appState === 'inactive',
  };
}
