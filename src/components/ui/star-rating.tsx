import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@/theme';

import { AppText } from './app-text';

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
}

export function StarRating({ rating, count, size = 20, interactive = false, onChange }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  const renderStar = (value: number) => {
    const name =
      rating >= value ? 'star' : rating >= value - 0.5 ? 'star-half-full' : 'star-outline';
    const color = rating >= value - 0.5 ? colors.gold : colors.textMuted;

    if (interactive) {
      return (
        <Pressable
          key={value}
          accessibilityRole="button"
          accessibilityLabel={`${value} estrellas`}
          onPress={() => onChange?.(value)}
          hitSlop={6}
        >
          <MaterialCommunityIcons name={name} size={size} color={color} />
        </Pressable>
      );
    }

    return <MaterialCommunityIcons key={value} name={name} size={size} color={color} />;
  };

  return (
    <View style={styles.row}>
      <View style={styles.stars}>{stars.map(renderStar)}</View>
      <AppText variant="small" style={styles.score}>
        {rating.toFixed(1)}
      </AppText>
      {typeof count === 'number' ? (
        <AppText variant="caption">({count})</AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  score: {
    color: colors.text,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
