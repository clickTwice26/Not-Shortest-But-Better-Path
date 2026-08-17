'use client';

import { createTheme, alpha } from '@mui/material/styles';
import { darkScheme, lightScheme, type M3Scheme } from './tokens';

declare module '@mui/material/styles' {
  interface Palette {
    m3: M3Scheme;
  }
  interface PaletteOptions {
    m3?: M3Scheme;
  }
  interface TypeBackground {
    surfaceContainer: string;
    surfaceContainerHigh: string;
    surfaceContainerLow: string;
  }
}

function paletteFor(scheme: M3Scheme, mode: 'light' | 'dark') {
  return {
    mode,
    m3: scheme,
    primary: {
      main: scheme.primary,
      contrastText: scheme.onPrimary,
      light: scheme.primaryContainer,
      dark: scheme.onPrimaryContainer,
    },
    secondary: {
      main: scheme.secondary,
      contrastText: scheme.onSecondary,
      light: scheme.secondaryContainer,
      dark: scheme.onSecondaryContainer,
    },
    info: { main: scheme.tertiary, contrastText: scheme.onTertiary },
    warning: { main: scheme.warning, contrastText: scheme.onWarning },
    error: { main: scheme.error, contrastText: scheme.onError },
    success: { main: scheme.primary, contrastText: scheme.onPrimary },
    background: {
      default: scheme.background,
      paper: scheme.surfaceContainerLow,
      surfaceContainer: scheme.surfaceContainer,
      surfaceContainerHigh: scheme.surfaceContainerHigh,
      surfaceContainerLow: scheme.surfaceContainerLow,
    },
    text: {
      primary: scheme.onSurface,
      secondary: scheme.onSurfaceVariant,
      disabled: alpha(scheme.onSurface, 0.38),
    },
    divider: scheme.outlineVariant,
  };
}

// M3 shape scale.
const SHAPE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 28 };

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: { palette: paletteFor(lightScheme, 'light') as never },
    dark: { palette: paletteFor(darkScheme, 'dark') as never },
  },
  shape: { borderRadius: SHAPE.md },
  typography: {
    fontFamily: 'var(--font-sans), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    // M3 type scale, trimmed to the roles this app uses.
    h1: { fontSize: '2.75rem', lineHeight: 1.15, fontWeight: 400, letterSpacing: '-0.015em' },
    h2: { fontSize: '2rem', lineHeight: 1.2, fontWeight: 500, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.5rem', lineHeight: 1.27, fontWeight: 500 },
    h4: { fontSize: '1.375rem', lineHeight: 1.3, fontWeight: 500 },
    h5: { fontSize: '1.125rem', lineHeight: 1.4, fontWeight: 500 },
    h6: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 500, letterSpacing: '0.009em' },
    subtitle1: { fontSize: '1rem', lineHeight: 1.5, fontWeight: 500, letterSpacing: '0.009em' },
    subtitle2: { fontSize: '0.875rem', lineHeight: 1.43, fontWeight: 500, letterSpacing: '0.007em' },
    body1: { fontSize: '1rem', lineHeight: 1.5, letterSpacing: '0.031em' },
    body2: { fontSize: '0.875rem', lineHeight: 1.43, letterSpacing: '0.018em' },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.007em' },
    caption: { fontSize: '0.75rem', lineHeight: 1.33, letterSpacing: '0.033em' },
    overline: { fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: 'var(--mui-palette-background-default)' },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--mui-palette-divider)',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: 'none', borderRadius: SHAPE.lg },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          borderRadius: SHAPE.xl,
          border: '1px solid var(--mui-palette-divider)',
          backgroundColor: 'var(--mui-palette-background-surfaceContainerLow)',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 999, paddingInline: 20, minHeight: 40 },
        sizeLarge: { minHeight: 48, paddingInline: 24, fontSize: '0.9375rem' },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          borderColor: 'var(--mui-palette-divider)',
          '&.Mui-selected': {
            backgroundColor: 'var(--mui-palette-secondary-light)',
            color: 'var(--mui-palette-secondary-dark)',
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        grouped: { borderRadius: '999px !important', marginInlineEnd: 8, border: '1px solid' },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: SHAPE.sm, fontWeight: 500 },
        sizeSmall: { height: 24 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: SHAPE.md,
          backgroundColor: 'var(--mui-palette-background-surfaceContainerLow)',
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: { height: 6 },
        rail: { opacity: 1, backgroundColor: 'var(--mui-palette-divider)' },
        thumb: {
          width: 6,
          height: 28,
          borderRadius: 3,
          '&::after': { width: 28, height: 40 },
        },
        track: { border: 'none' },
        mark: { display: 'none' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: SHAPE.xs,
          backgroundColor: 'var(--mui-palette-m3-inverseSurface)',
          color: 'var(--mui-palette-m3-inverseOnSurface)',
          fontSize: '0.75rem',
        },
      },
    },
    MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, height: 4 } } },
  },
});

export default theme;
