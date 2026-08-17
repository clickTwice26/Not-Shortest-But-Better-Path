/**
 * Material 3 tonal palettes.
 *
 * Source colour is a deep transit green (savings), with an amber-leaning
 * secondary and a blue tertiary for the metro line. Tones follow the M3 scale
 * (0 = black, 100 = white); colour roles are derived from them below using the
 * standard M3 light/dark mapping.
 */

export const tone = {
  primary: {
    0: '#000000',
    10: '#00201A',
    20: '#00382D',
    30: '#005140',
    40: '#006C55',
    50: '#00886B',
    60: '#00A582',
    70: '#22C29B',
    80: '#4EDEB5',
    90: '#6FFBD1',
    95: '#C4FFE9',
    99: '#F2FFF7',
    100: '#FFFFFF',
  },
  secondary: {
    0: '#000000',
    10: '#0A1F19',
    20: '#20352E',
    30: '#364B44',
    40: '#4D635B',
    50: '#657C73',
    60: '#7E968D',
    70: '#98B1A7',
    80: '#B3CDC2',
    90: '#CFE9DE',
    95: '#DDF8EC',
    99: '#F2FFF7',
    100: '#FFFFFF',
  },
  tertiary: {
    0: '#000000',
    10: '#001E2E',
    20: '#00344B',
    30: '#004B69',
    40: '#146389',
    50: '#387CA4',
    60: '#5596BF',
    70: '#71B1DB',
    80: '#8ECDF8',
    90: '#C7E7FF',
    95: '#E4F3FF',
    99: '#F7FBFF',
    100: '#FFFFFF',
  },
  /** Amber — used for the "estimated fare" signal. */
  warning: {
    10: '#2A1800',
    20: '#472A00',
    30: '#663E00',
    40: '#875200',
    50: '#A96900',
    60: '#CC8000',
    70: '#EF9A00',
    80: '#FFB951',
    90: '#FFDDB3',
    95: '#FFEEDC',
  },
  error: {
    0: '#000000',
    10: '#410002',
    20: '#690005',
    30: '#93000A',
    40: '#BA1A1A',
    50: '#DE3730',
    60: '#FF5449',
    70: '#FF897D',
    80: '#FFB4AB',
    90: '#FFDAD6',
    95: '#FFEDEA',
    99: '#FFFBFF',
    100: '#FFFFFF',
  },
  neutral: {
    0: '#000000',
    4: '#0B0F0D',
    6: '#101413',
    10: '#191C1B',
    12: '#1D211F',
    17: '#272B29',
    20: '#2E3130',
    22: '#323533',
    24: '#363A38',
    30: '#444746',
    40: '#5C5F5E',
    50: '#757877',
    60: '#8F9190',
    70: '#A9ACAB',
    80: '#C5C7C6',
    87: '#D8DAD9',
    90: '#E1E3E2',
    92: '#E9EBE9',
    94: '#EFF1EF',
    95: '#F0F1F0',
    96: '#F3F5F3',
    98: '#F9FBF9',
    99: '#FBFDFB',
    100: '#FFFFFF',
  },
  neutralVariant: {
    10: '#151D1A',
    20: '#2A322F',
    30: '#404945',
    40: '#58605C',
    50: '#707975',
    60: '#8A938E',
    70: '#A4AEA9',
    80: '#BFC9C4',
    90: '#DBE5E0',
    95: '#E9F3EE',
    99: '#F5FFF9',
  },
} as const;

export interface M3Scheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  warning: string;
  onWarning: string;
  warningContainer: string;
  onWarningContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  scrim: string;
}

export const lightScheme: M3Scheme = {
  primary: tone.primary[40],
  onPrimary: tone.primary[100],
  primaryContainer: tone.primary[90],
  onPrimaryContainer: tone.primary[10],
  secondary: tone.secondary[40],
  onSecondary: tone.secondary[100],
  secondaryContainer: tone.secondary[90],
  onSecondaryContainer: tone.secondary[10],
  tertiary: tone.tertiary[40],
  onTertiary: tone.tertiary[100],
  tertiaryContainer: tone.tertiary[90],
  onTertiaryContainer: tone.tertiary[10],
  warning: tone.warning[40],
  onWarning: '#FFFFFF',
  warningContainer: tone.warning[90],
  onWarningContainer: tone.warning[10],
  error: tone.error[40],
  onError: tone.error[100],
  errorContainer: tone.error[90],
  onErrorContainer: tone.error[10],
  background: tone.neutral[98],
  onBackground: tone.neutral[10],
  surface: tone.neutral[98],
  onSurface: tone.neutral[10],
  surfaceVariant: tone.neutralVariant[90],
  onSurfaceVariant: tone.neutralVariant[30],
  surfaceContainerLowest: tone.neutral[100],
  surfaceContainerLow: tone.neutral[96],
  surfaceContainer: tone.neutral[94],
  surfaceContainerHigh: tone.neutral[92],
  surfaceContainerHighest: tone.neutral[90],
  outline: tone.neutralVariant[50],
  outlineVariant: tone.neutralVariant[80],
  inverseSurface: tone.neutral[20],
  inverseOnSurface: tone.neutral[95],
  inversePrimary: tone.primary[80],
  scrim: tone.neutral[0],
};

export const darkScheme: M3Scheme = {
  primary: tone.primary[80],
  onPrimary: tone.primary[20],
  primaryContainer: tone.primary[30],
  onPrimaryContainer: tone.primary[90],
  secondary: tone.secondary[80],
  onSecondary: tone.secondary[20],
  secondaryContainer: tone.secondary[30],
  onSecondaryContainer: tone.secondary[90],
  tertiary: tone.tertiary[80],
  onTertiary: tone.tertiary[20],
  tertiaryContainer: tone.tertiary[30],
  onTertiaryContainer: tone.tertiary[90],
  warning: tone.warning[80],
  onWarning: tone.warning[20],
  warningContainer: tone.warning[30],
  onWarningContainer: tone.warning[90],
  error: tone.error[80],
  onError: tone.error[20],
  errorContainer: tone.error[30],
  onErrorContainer: tone.error[90],
  background: tone.neutral[6],
  onBackground: tone.neutral[90],
  surface: tone.neutral[6],
  onSurface: tone.neutral[90],
  surfaceVariant: tone.neutralVariant[30],
  onSurfaceVariant: tone.neutralVariant[80],
  surfaceContainerLowest: tone.neutral[4],
  surfaceContainerLow: tone.neutral[10],
  surfaceContainer: tone.neutral[12],
  surfaceContainerHigh: tone.neutral[17],
  surfaceContainerHighest: tone.neutral[22],
  outline: tone.neutralVariant[60],
  outlineVariant: tone.neutralVariant[30],
  inverseSurface: tone.neutral[90],
  inverseOnSurface: tone.neutral[20],
  inversePrimary: tone.primary[40],
  scrim: tone.neutral[0],
};

/** Per-mode colour, drawn from the tonal palettes so the set stays coherent. */
export const modeTone: Record<string, { light: string; dark: string }> = {
  walk: { light: tone.neutralVariant[40], dark: tone.neutralVariant[80] },
  bicycle: { light: tone.secondary[40], dark: tone.secondary[80] },
  bike_own: { light: tone.warning[40], dark: tone.warning[80] },
  bike_hail: { light: tone.warning[50], dark: tone.warning[80] },
  rickshaw: { light: tone.error[50], dark: tone.error[80] },
  cng: { light: tone.primary[50], dark: tone.primary[70] },
  car_own: { light: tone.secondary[30], dark: tone.secondary[70] },
  car_hail: { light: tone.secondary[40], dark: tone.secondary[80] },
  bus: { light: tone.tertiary[50], dark: tone.tertiary[70] },
  metro: { light: tone.tertiary[40], dark: tone.tertiary[80] },
};
