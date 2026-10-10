import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

import { AppText } from './app-text';

interface LogoProps {
  size?: number;
  variant?: 'row' | 'stack';
}

export function Logo({ size = 56, variant = 'row' }: LogoProps) {
  const iconBox = (
    <View style={[styles.box, { width: size, height: size, borderRadius: radius.md }]}>
      <MaterialCommunityIcons name="content-cut" size={size * 0.55} color={colors.white} />
    </View>
  );

  const wordmark = (
    <AppText style={styles.wordmark} numberOfLines={1} adjustsFontSizeToFit>
      BARBERINSANE
    </AppText>
  );

  if (variant === 'stack') {
    return (
      <View style={styles.stack}>
        {iconBox}
        {wordmark}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {iconBox}
      {wordmark}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stack: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  wordmark: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    letterSpacing: 3,
  },
});
