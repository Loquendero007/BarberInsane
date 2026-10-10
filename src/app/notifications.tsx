import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, EmptyState, Loader, Screen, ScreenHeader } from '@/components/ui';
import { useNotificaciones } from '@/hooks/notificaciones';
import { formatearFechaCorta, horaCorta } from '@/lib/fechas';
import { colors, fontWeight, radius, spacing } from '@/theme';

const ICONO_SEGUN_TITULO = (titulo: string) => {
  if (/aprob|rechaz/i.test(titulo)) return 'account-check-outline' as const;
  if (/pago/i.test(titulo)) return 'credit-card-check-outline' as const;
  if (/cita/i.test(titulo) || /reserva/i.test(titulo)) return 'calendar-check-outline' as const;
  if (/llegad/i.test(titulo)) return 'map-marker-check-outline' as const;
  if (/nueva|activa/i.test(titulo)) return 'bell-outline' as const;
  return 'information-outline' as const;
};

export default function NotificacionesScreen() {
  const { lista, cargando, error, noLeidas, recargar, marcarLeidas } = useNotificaciones();

  useEffect(() => {
    if (noLeidas > 0) void marcarLeidas();
  }, [noLeidas, marcarLeidas]);

  return (
    <Screen header={<ScreenHeader title="Notificaciones" onBack={() => router.back()} />}>
      {(() => {
        if (cargando && lista.length === 0) {
          return <Loader label="Cargando notificaciones…" />;
        }
        if (error && lista.length === 0) {
          return (
            <EmptyState
              icon="alert-circle-outline"
              title="No se pudieron cargar"
              message={error}
              actionLabel="Reintentar"
              onAction={() => void recargar()}
            />
          );
        }
        if (lista.length === 0) {
          return (
            <EmptyState
              icon="bell-sleep-outline"
              title="Sin notificaciones"
              message="Aquí verás los avisos importantes de tu cuenta, tus citas y la barbería."
            />
          );
        }
        return (
          <View style={styles.lista}>
            {lista.map((notificacion) => (
              <View key={notificacion.id} style={[styles.tarjeta, !notificacion.leida && styles.noLeida]}>
                <View style={styles.iconoCaja}>
                  <MaterialCommunityIcons
                    name={ICONO_SEGUN_TITULO(notificacion.titulo)}
                    size={22}
                    color={colors.accent}
                  />
                </View>
                <View style={styles.textoCaja}>
                  <View style={styles.tituloFila}>
                    <AppText variant="body" style={styles.titulo}>
                      {notificacion.titulo}
                    </AppText>
                    {!notificacion.leida ? <View style={styles.punto} /> : null}
                  </View>
                  <AppText variant="small" color={colors.textMuted}>
                    {notificacion.mensaje}
                  </AppText>
                  <AppText variant="caption" color={colors.textMuted}>
                    {formatearFechaCorta(notificacion.created_at)} · {horaCorta(notificacion.created_at)}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        );
      })()}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  tarjeta: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  noLeida: {
    borderColor: colors.accent,
  },
  iconoCaja: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCaja: {
    flex: 1,
    gap: spacing.xs,
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titulo: {
    flexShrink: 1,
    fontWeight: fontWeight.bold,
  },
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});