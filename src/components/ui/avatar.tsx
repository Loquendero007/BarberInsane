import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, fontWeight } from '@/theme';

import { AppText } from './app-text';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join('');
}

export function Avatar({ uri, name, size = 48 }: AvatarProps) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimension} contentFit="cover" transition={150} />;
  }

  return (
    <View style={[styles.fallback, dimension]}>
      <AppText
        style={{ fontSize: size * 0.36, fontWeight: fontWeight.semibold, color: colors.text }}
      >
        {getInitials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
