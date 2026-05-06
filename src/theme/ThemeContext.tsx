import React, {createContext, useContext, useState, useEffect, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AppTheme, ThemePreset, THEME_PRESETS, DEFAULT_THEME_ID} from './themes';

const STORAGE_KEY = 'mimo-tts-theme';

interface ThemeContextValue {
  theme: AppTheme;
  themeId: string;
  setThemeId: (id: string) => void;
  presets: ThemePreset[];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: THEME_PRESETS[0].theme,
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
  presets: THEME_PRESETS,
});

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [themeId, setThemeIdState] = useState(DEFAULT_THEME_ID);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved && THEME_PRESETS.some(p => p.id === saved)) {
        setThemeIdState(saved);
      }
    });
  }, []);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id);
  }, []);

  const preset = THEME_PRESETS.find(p => p.id === themeId) || THEME_PRESETS[0];

  return (
    <ThemeContext.Provider value={{theme: preset.theme, themeId, setThemeId, presets: THEME_PRESETS}}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext).theme;
}

export function useThemeManager() {
  return useContext(ThemeContext);
}
