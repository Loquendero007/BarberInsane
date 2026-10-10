import { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, fontSize, fontWeight, radius, spacing } from '@/theme';

import { AppText } from './app-text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const palette = getPalette(variant);
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.large : styles.medium,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={20} color={palette.text} /> : null}
          <AppText style={[styles.text, { color: palette.text }]}>{title}</AppText>
        </>
      )}
    </Pressable>
  );
}

function getPalette(variant: Variant) {
  switch (variant) {
    case 'primary':
      return { bg: colors.accent, border: colors.accent, text: colors.white };
    case 'secondary':
      return { bg: colors.surfaceAlt, border: colors.border, text: colors.text };
    case 'ghost':
      return { bg: 'transparent', border: 'transparent', text: colors.accent };
    case 'danger':
      return { bg: colors.dangerSoft, border: colors.danger, text: colors.danger };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  large: {
    minHeight: 54,
    paddingHorizontal: spacing.xxl,
  },
  medium: {
    minHeight: 46,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
