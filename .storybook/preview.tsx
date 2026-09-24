import type { Preview } from '@storybook/react';
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import '../app/globals.css';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4fbf9b',
    },
    secondary: {
      main: '#fbbf24',
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#070f0d',
      paper: '#0e1a16',
    },
    primary: {
      main: '#4fbf9b',
    },
    secondary: {
      main: '#fbbf24',
    },
    text: {
      primary: '#ffffff',
    },
  },
});

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: undefined,
    },
  },
  decorators: [
    (Story, context) => {
      const [isDark, setIsDark] = React.useState(true);
      const theme = isDark ? darkTheme : lightTheme;

      React.useEffect(() => {
        const handleThemeToggle = (e: any) => {
          setIsDark(e.detail?.isDark ?? !isDark);
        };
        window.addEventListener('storybook-theme-toggle', handleThemeToggle);
        return () => window.removeEventListener('storybook-theme-toggle', handleThemeToggle);
      }, [isDark]);

      return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <div style={{ background: theme.palette.background.default, color: theme.palette.text.primary, padding: '20px', minHeight: '100vh' }}>
            <Story />
          </div>
        </ThemeProvider>
      );
    },
  ],
};

export default preview;
