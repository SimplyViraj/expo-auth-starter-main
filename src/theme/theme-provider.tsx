import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

import { appStorage } from '@/lib/storage/app-storage';
import { colors } from '@/theme/colors';
import { motion } from '@/theme/motion';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const themePreferenceKey = 'theme-mode';
const themeModes: ThemeMode[] = ['system', 'light', 'dark'];

type AppThemeContextValue = {
  colors: (typeof colors)[ResolvedTheme];
  isReady: boolean;
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  motion: typeof motion;
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setStoredMode] = useState<ThemeMode>('system');
  const [isReady, setIsReady] = useState(false);
  const resolvedTheme: ResolvedTheme = mode === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : mode;

  useEffect(() => {
    let cancelled = false;

    appStorage
      .get<ThemeMode>(themePreferenceKey, 'system')
      .then((storedMode) => {
        if (!cancelled && themeModes.includes(storedMode)) setStoredMode(storedMode);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function setMode(nextMode: ThemeMode) {
    setStoredMode(nextMode);
    void appStorage.set(themePreferenceKey, nextMode).catch(() => {
      // The selected mode remains active for this session and can be saved again later.
    });
  }

  const value = useMemo(
    () => ({
      colors: colors[resolvedTheme],
      isReady,
      mode,
      resolvedTheme,
      setMode,
      motion,
      radius,
      spacing,
      typography,
    }),
    [isReady, mode, resolvedTheme],
  );

  const navigationTheme = {
    ...(resolvedTheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(resolvedTheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: value.colors.background,
      border: value.colors.border,
      card: value.colors.background,
      notification: value.colors.primary,
      primary: value.colors.primary,
      text: value.colors.text,
    },
  };

  return (
    <AppThemeContext.Provider value={value}>
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);

  if (!value) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }

  return value;
}
