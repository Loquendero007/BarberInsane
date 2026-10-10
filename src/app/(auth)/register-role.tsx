import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, Screen, ScreenHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export default function RegisterRoleScreen() {
  return (
    <Screen header={<ScreenHeader title="Crear cuenta" onBack={() => router.back()} />} scroll>
      <View style={styles.content}>
        <AppText variant="small">Elige el tipo de cuenta que necesitas.</AppText>

        <Card onPress={() => router.push('/register-client')}>
          <View style={styles.cardRow}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="account" size={28} color={colors.accent} />
            </View>
            <View style={styles.cardText}>
              <AppText variant="subtitle">Soy cliente</AppText>
              <AppText variant="small">
                Reserva cita, paga en línea y califica a tu barbero.
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </View>
        </Card>

        <Card onPress={() => router.push('/register-barber')}>
          <View style={styles.cardRow}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="content-cut" size={28} color={colors.gold} />
            </View>
            <View style={styles.cardText}>
              <AppText variant="subtitle">Soy barbero</AppText>
              <AppText variant="small">
                Gestiona tu agenda y tus clientes. Requiere aprobación.
              </AppText>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
          </View>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
});
