import { StyleProp, Text, TextProps, TextStyle } from 'react-native';

import { colors, typography } from '@/theme';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  secondary?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

export function AppText({
  variant = 'body',
  color,
  secondary,
  center,
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[
        typography[variant],
        secondary && { color: colors.textSecondary },
        center && { textAlign: 'center' },
        color ? { color } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
