import { createContext, useContext, useState, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from './colors';
import { getSetting, setSetting } from '../database/services';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextValue {
  colors: ThemeColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  themeMode: 'system',
  setThemeMode: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    () => getSetting('theme_mode', 'system') as ThemeMode
  );

  const isDark =
    themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? darkColors : lightColors;

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    setSetting('theme_mode', mode);
  };

  return (
    <ThemeContext.Provider value={{ colors, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeColors {
  return useContext(ThemeContext).colors;
}

export function useThemeControl(): ThemeContextValue {
  return useContext(ThemeContext);
}
