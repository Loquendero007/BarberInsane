import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Logo, Screen } from '@/components/ui';
import { spacing } from '@/theme';

export default function WelcomeScreen() {
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <Logo size={104} variant="stack" />
        <View style={styles.tagline}>
          <AppText variant="subtitle" center secondary>
            ¿Listo para tu próximo corte?
          </AppText>
          <AppText variant="caption" center>
            Reserva, paga y disfruta sin filas
          </AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Iniciar sesión" icon="login" onPress={() => router.push('/login')} />
        <Button
          title="Crear cuenta"
          variant="secondary"
          icon="account-plus"
          onPress={() => router.push('/register-role')}
        />
        <AppText variant="caption" center style={styles.footer}>
          BarberInsane · Tu barbería de siempre
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    justifyContent: 'space-between',
    paddingVertical: spacing.xxxl,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  tagline: {
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  footer: {
    marginTop: spacing.md,
  },
});
