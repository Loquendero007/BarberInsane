import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Screen, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { colors, radius, spacing } from '@/theme';

export default function PendingScreen() {
  const { profile, barber, refreshProfile, signOut } = useAuth();
  const [revisando, setRevisando] = useState(false);
  const [salir, setSalir] = useState(false);

  const revisarEstado = async () => {
    setRevisando(true);
    try {
      await refreshProfile();
    } finally {
      setRevisando(false);
    }
  };

  const cerrarSesion = async () => {
    setSalir(true);
    try {
      await signOut();
      router.replace('/welcome');
    } finally {
      setSalir(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title="Solicitud de barbero" />}>
      <View style={styles.content}>
        <View style={styles.icono}>
          <MaterialCommunityIcons name="clock-alert-outline" size={44} color={colors.gold} />
        </View>

        <AppText variant="heading" center>
          {barber?.aprobado ? '¡Aprobado!' : 'Pendiente de aprobación'}
        </AppText>

        <AppText variant="small" center>
          {barber?.aprobado
            ? `Ya eres barbero activo, ${profile?.nombre ?? ''}. Tu agenda está lista.`
            : `Hola ${profile?.nombre ?? ''}, tu solicitud fue enviada al administrador de la barbería. Te habilitaremos la agenda cuando seas aprobado.`}
        </AppText>

        <Card style={styles.card}>
          <View style={styles.fila}>
            <AppText variant="small">Especialidad</AppText>
            <AppText variant="body">
              {barber?.especialidad?.trim() || '—'}
            </AppText>
          </View>
          <View style={styles.fila}>
            <AppText variant="small">Experiencia</AppText>
            <AppText variant="body">
              {barber?.experiencia != null ? `${barber.experiencia} años` : '—'}
            </AppText>
          </View>
          <View style={styles.fila}>
            <AppText variant="small">Estado</AppText>
            <AppText variant="body" color={barber?.aprobado ? colors.success : colors.warning}>
              {barber?.aprobado ? 'Aprobado' : 'En revisión'}
            </AppText>
          </View>
        </Card>

        <Button
          title="Ya me aprobaron"
          icon="refresh"
          loading={revisando}
          onPress={revisarEstado}
        />
        <Button title="Cerrar sesión" variant="danger" loading={salir} onPress={cerrarSesion} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
  icono: {
    alignSelf: 'center',
    width: 84,
    height: 84,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    gap: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
});
