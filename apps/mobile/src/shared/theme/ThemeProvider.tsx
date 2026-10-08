import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { lightColors } from './light';
import { darkColors } from './dark';
import { spacing, radius } from './tokens';
import { typography } from './typography';
import type { Theme, Colors } from './types';
import { storage } from '@shared/services/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  theme: Theme;
  colors: Colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggle: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme_mode';

function buildTheme(mode: 'light' | 'dark'): Theme {
  const colors = mode === 'light' ? lightColors : darkColors;
  return {
    colors,
    spacing,
    radius,
    typography,
  };
}

export const ThemeProvider: React.FC<{ children: React.ReactNode; initialMode?: ThemeMode }> = ({
  children,
  initialMode = 'system',
}) => {
  const system = useColorScheme() ?? 'light';
  const [mode, setModeState] = React.useState<ThemeMode>(initialMode);

  useEffect(() => {
    storage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
  }, []);

  const resolvedMode: 'light' | 'dark' = mode === 'system' ? system : mode;

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await storage.setItem(THEME_STORAGE_KEY, next);
  }, []);

  const toggle = useCallback(async () => {
    const current: 'light' | 'dark' = mode === 'system' ? system : mode;
    const next: ThemeMode = current === 'light' ? 'dark' : 'light';
    await setMode(next);
  }, [mode, system, setMode]);

  const theme = useMemo(() => buildTheme(resolvedMode), [resolvedMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      theme,
      colors: theme.colors,
      spacing,
      radius,
      typography,
      setMode,
      toggle,
    }),
    [mode, resolvedMode, theme, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}

export default ThemeProvider;
