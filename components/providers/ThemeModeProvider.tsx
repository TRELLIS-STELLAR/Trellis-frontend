'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { alpha, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import i18n, { isRtlLanguage } from '@/lib/i18n';

export type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const STORAGE_KEY = 'trellis-theme-mode';

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function readInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedMode = window.localStorage.getItem(STORAGE_KEY);
  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode;
  }

  const themeAttribute = document.documentElement.dataset.theme;
  if (themeAttribute === 'light' || themeAttribute === 'dark') {
    return themeAttribute;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function syncThemeAttribute(mode: ThemeMode) {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
}

function buildTheme(mode: ThemeMode, direction: 'ltr' | 'rtl') {
  const isDark = mode === 'dark';

  return createTheme({
    direction,
    palette: {
      mode,
      primary: {
        main: isDark ? '#4FBF9B' : '#1C6B55',
        // Dark-mode vine is a light green: ink text on it, not white (white is 2.3:1).
        contrastText: isDark ? '#14201C' : '#FFFFFF',
      },
      secondary: {
        main: isDark ? '#F0B460' : '#E39A3C',
        contrastText: '#14201C',
      },
      background: {
        default: isDark ? '#0E1A16' : '#F7F5F0',
        paper: isDark ? '#13221D' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F7F5F0' : '#14201C',
        secondary: isDark ? '#B2C5BD' : '#5B6E66',
      },
      divider: isDark ? 'rgba(79, 191, 155, 0.2)' : 'rgba(28, 107, 85, 0.2)',
    },
    shape: {
      borderRadius: 16,
    },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      button: {
        textTransform: 'none',
        fontWeight: 700,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            height: '100%',
            transition: 'background-color 240ms ease, color 240ms ease',
          },
          body: {
            minHeight: '100%',
            backgroundColor: isDark ? '#0E1A16' : '#F7F5F0',
            color: isDark ? '#F7F5F0' : '#14201C',
            transition:
              'background-color 240ms ease, color 240ms ease, border-color 240ms ease',
          },
          '*': {
            transitionProperty: 'background-color, border-color, color, fill, stroke, box-shadow',
            transitionDuration: '240ms',
            transitionTimingFunction: 'ease',
          },
          '::selection': {
            backgroundColor: alpha(isDark ? '#4FBF9B' : '#1C6B55', 0.22),
            color: isDark ? '#FFFFFF' : '#14201C',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 9999,
            border: isDark ? '1px solid rgba(79, 191, 155, 0.25)' : '1px solid rgba(28, 107, 85, 0.18)',
            backgroundColor: isDark ? 'rgba(19, 34, 29, 0.72)' : 'rgba(255, 255, 255, 0.92)',
            boxShadow: isDark ? '0 0 0 1px rgba(79, 191, 155, 0.08)' : 'none',
          },
        },
      },
    },
  });
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(() =>
    isRtlLanguage(i18n.language) ? 'rtl' : 'ltr'
  );

  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setDirection(isRtlLanguage(lng) ? 'rtl' : 'ltr');
    };
    i18n.on('languageChanged', handleLanguageChange);
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  // Emotion cache that flips MUI's physical CSS (margins, paddings, borders)
  // when the layout is right-to-left. Created once; only used for RTL.
  const rtlCache = useMemo(
    () => createCache({ key: 'muirtl', stylisPlugins: [rtlPlugin] }),
    []
  );

  useEffect(() => {
    syncThemeAttribute(mode);

    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage failures so the theme still works.
    }
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark'));
  }, []);

  const theme = useMemo(() => buildTheme(mode, direction), [mode, direction]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
    }),
    [mode, toggleMode]
  );

  const content = (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {direction === 'rtl' ? (
        <CacheProvider value={rtlCache}>{content}</CacheProvider>
      ) : (
        content
      )}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeProvider');
  }

  return context;
}
