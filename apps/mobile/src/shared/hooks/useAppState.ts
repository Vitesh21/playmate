git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-yJcnvxyc' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-6bddNc9Q' (errno=Operation not permitted)
import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useAppState() {
  const [appState, setAppState] = useState<AppStateStatus>(
    (AppState.currentState ?? 'active') as AppStateStatus,
  );

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
