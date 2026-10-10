import { StyleSheet, View } from 'react-native';

import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

import { AppText } from './app-text';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'neutral';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

const tones: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  info: { bg: colors.infoSoft, fg: colors.info },
  accent: { bg: colors.accentSoft, fg: colors.accent },
  neutral: { bg: colors.surfaceAlt, fg: colors.textSecondary },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const palette = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <AppText style={[styles.label, { color: palette.fg }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
