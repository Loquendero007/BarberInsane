import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Card, EmptyState, Loader, Screen, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useConsulta } from '@/hooks/consulta';
import { obtenerHorarios } from '@/lib/api';
import { DIAS_LARGOS, horaCorta } from '@/lib/fechas';
import { colors, radius, spacing } from '@/theme';

export default function BarberHorariosScreen() {
  const { barber } = useAuth();
  const { datos: horarios, cargando, error } = useConsulta(
    () => (barber ? obtenerHorarios(barber.id) : Promise.resolve([])),
    ['schedules'],
  );

  if (cargando && !horarios) {
    return (
      <Screen header={<ScreenHeader title="Mis horarios" onBack={() => router.back()} />}>
        <Loader label="Cargando horarios…" />
      </Screen>
    );
  }

  const porDia = (horarios ?? []).reduce<Record<number, typeof horarios>>((grupos, h) => {
    (grupos[h.dia] ??= []).push(h);
    return grupos;
  }, {});

  return (
    <Screen header={<ScreenHeader title="Mis horarios" onBack={() => router.back()} />} scroll>
      <View style={styles.contenido}>
        <AppText variant="small" color={colors.textMuted}>
          Tus horarios los administra la barbería. Si necesitas un cambio, pídelo al administrador.
        </AppText>

        {error ? (
          <Card>
            <AppText variant="small" color={colors.danger}>
              {error}
            </AppText>
          </Card>
        ) : (horarios ?? []).length === 0 ? (
          <EmptyState
            icon="calendar-clock-outline"
            title="Sin horarios publicados"
            message="El administrador aún no configura tus horarios de atención."
          />
        ) : (
          <View style={styles.lista}>
            {DIAS_LARGOS.map((dia, index) => {
              const turnos = porDia[index] ?? [];
              if (turnos.length === 0) return null;
              return (
                <Card key={dia} style={styles.grupo}>
                  <AppText variant="subtitle">{dia}</AppText>
                  <View style={styles.turnos}>
                    {turnos.map((horario) => (
                      <View key={horario.id} style={styles.turno}>
                        <MaterialCommunityIcons
                          name={horario.disponible ? 'check-circle-outline' : 'minus-circle-outline'}
                          size={16}
                          color={horario.disponible ? colors.success : colors.textMuted}
                        />
                        <AppText variant="small">
                          {horaCorta(horario.hora_inicio)} – {horaCorta(horario.hora_fin)}
                        </AppText>
                        <AppText variant="caption" color={colors.textMuted}>
                          {horario.disponible ? 'Disponible' : 'Ocupado'}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  lista: {
    gap: spacing.md,
  },
  grupo: {
    gap: spacing.sm,
  },
  turnos: {
    gap: spacing.sm,
  },
  turno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});