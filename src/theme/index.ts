import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  background: '#0B0B0F',
  surface: '#15151A',
  surfaceAlt: '#1D1D24',
  border: '#2A2A31',
  text: '#FFFFFF',
  textSecondary: '#9A9AA3',
  textMuted: '#6B6B75',
  accent: '#E23744',
  accentDark: '#B31F2C',
  accentSoft: 'rgba(226, 55, 68, 0.14)',
  gold: '#F5C542',
  success: '#2ECC71',
  successSoft: 'rgba(46, 204, 113, 0.15)',
  warning: '#F39C12',
  warningSoft: 'rgba(243, 156, 18, 0.15)',
  danger: '#E74C3C',
  dangerSoft: 'rgba(231, 76, 60, 0.15)',
  info: '#3FA9F5',
  infoSoft: 'rgba(63, 169, 245, 0.15)',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.65)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const shadow: ViewStyle = Platform.select<ViewStyle>({
  android: { elevation: 4 },
  default: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});

export const typography: Record<string, TextStyle> = {
  title: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text, letterSpacing: 1 },
  heading: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text },
  body: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text },
  small: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.textSecondary },
  caption: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.textMuted },
};
