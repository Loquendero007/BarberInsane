import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Badge, Button, Card, Loader, Logo, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useConsulta } from '@/hooks/consulta';
import { useNoLeidas } from '@/hooks/notificaciones';
import { useSacudida } from '@/hooks/sensores';
import { aprobarBarbero, estadisticasAdmin, obtenerTodosBarberos } from '@/lib/api';
import { formatearMoneda, formatearNumero } from '@/lib/fechas';
import { Barbero, EstadisticasAdmin } from '@/lib/tipos';
import { colors, fontWeight, radius, spacing } from '@/theme';

export default function AdminHomeScreen() {
  const { profile } = useAuth();
  const { noLeidas, recargar: recargarNotificaciones } = useNoLeidas();

  const { datos: stats, cargando, recargar: recargarStats } = useConsulta<EstadisticasAdmin | null>(
    () => estadisticasAdmin(),
    ['appointments', 'payments', 'barbers'],
  );
  const { datos: barberos, recargar: recargarBarberos } = useConsulta<Barbero[]>(
    () => obtenerTodosBarberos(),
    ['barbers'],
  );

  const [aprobando, setAprobando] = useState<string | null>(null);

  useSacudida(() => {
    void Promise.all([recargarStats(), recargarBarberos(), recargarNotificaciones()]);
  });

  const pendientes = (barberos ?? []).filter((b) => !b.aprobado);

  const aprobar = (barbero: Barbero, valor: boolean) => {
    Alert.alert(
      valor ? 'Aprobar barbero' : 'Rechazar barbero',
      `${barbero.nombre} — ¿confirmas esta acción?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setAprobando(barbero.id);
            try {
              await aprobarBarbero(barbero.id, valor);
              await Promise.all([recargarBarberos(), recargarStats()]);
            } catch (e) {
              Alert.alert('No se pudo actualizar', e instanceof Error ? e.message : 'Intenta de nuevo');
            } finally {
              setAprobando(null);
            }
          },
        },
      ],
    );
  };

  if (!profile) {
    return <Loader label="Cargando panel…" />;
  }

  return (
    <Screen scroll contentStyle={styles.contenido}>
      <View style={styles.barraSuperior}>
        <Logo size={36} variant="stack" />
        <View style={styles.espaciador} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
          style={({ pressed }) => [styles.botonIcono, pressed && styles.pulsado]}
          onPress={() => router.push('/notifications')}
        >
          <MaterialCommunityIcons name="bell-outline" size={22} color={colors.text} />
          {noLeidas > 0 ? (
            <View style={styles.contador}>
              <AppText style={styles.contadorTexto}>{noLeidas > 9 ? '9+' : noLeidas}</AppText>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mi perfil"
          style={({ pressed }) => [pressed && styles.pulsado]}
          onPress={() => router.push('/admin/perfil')}
        >
          <Avatar uri={profile.foto} name={profile.nombre} size={38} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcono}>
          <MaterialCommunityIcons name="shield-account-outline" size={28} color={colors.accent} />
        </View>
        <View style={styles.heroTexto}>
          <AppText variant="heading">Panel de administrador</AppText>
          <AppText variant="small">{profile.nombre} · BarberInsane</AppText>
          <AppText variant="caption" style={styles.pista}>
            Sacude el móvil para actualizar
          </AppText>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard icon="calendar-check-outline" etiqueta="Citas hoy" valor={cargando && !stats ? '…' : formatearNumero(stats?.citas_hoy ?? 0)} color={colors.accent} />
        <StatCard icon="cash-fast" etiqueta="Ingresos hoy" valor={cargando && !stats ? '…' : formatearMoneda(stats?.ingresos_hoy ?? 0)} color={colors.success} />
        <StatCard icon="account-group-outline" etiqueta="Clientes atendidos" valor={cargando && !stats ? '…' : formatearNumero(stats?.clientes_atendidos ?? 0)} color={colors.info} />
        <StatCard icon="content-cut" etiqueta="Barberos activos" valor={cargando && !stats ? '…' : formatearNumero(stats?.barberos_activos ?? 0)} color={colors.gold} />
      </View>

      <Card style={styles.seccion}>
        <View style={styles.filaTitulo}>
          <MaterialCommunityIcons name="account-check" size={20} color={colors.gold} />
          <AppText variant="subtitle" style={styles.tituloSeccion}>
            Solicitudes de barbero
          </AppText>
          <Badge label={String(pendientes.length)} tone={pendientes.length > 0 ? 'warning' : 'success'} />
        </View>

        {pendientes.length === 0 ? (
          <AppText variant="small" color={colors.textMuted}>
            No hay barberos por aprobar.
          </AppText>
        ) : (
          <View style={styles.pendientes}>
            {pendientes.map((barbero) => (
              <View key={barbero.id} style={styles.pendiente}>
                <View style={styles.pendienteInfo}>
                  <Avatar uri={barbero.foto} name={barbero.nombre} size={40} />
                  <View style={styles.pendienteTexto}>
                    <AppText variant="body">{barbero.nombre}</AppText>
                    <AppText variant="caption">{barbero.especialidad?.trim() || 'Sin especialidad'}</AppText>
                  </View>
                </View>
                <View style={styles.filaBotones}>
                  <Button
                    title="Rechazar"
                    variant="danger"
                    size="md"
                    loading={aprobando === barbero.id}
                    onPress={() => aprobar(barbero, false)}
                    style={styles.botonPendiente}
                  />
                  <Button
                    title="Aprobar"
                    size="md"
                    loading={aprobando === barbero.id}
                    onPress={() => aprobar(barbero, true)}
                    style={styles.botonPendiente}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      <View style={styles.acciones}>
        <AccionRapida icon="content-cut" titulo="Barberos" onPress={() => router.push('/admin/barberos')} />
        <AccionRapida icon="scissors-cutting" titulo="Servicios" onPress={() => router.push('/admin/servicios')} />
        <AccionRapida icon="calendar-clock-outline" titulo="Horarios" onPress={() => router.push('/admin/horarios')} />
        <AccionRapida icon="bullhorn-outline" titulo="Avisos" onPress={() => router.push('/admin/avisos')} />
        <AccionRapida icon="bell-outline" titulo="Notificaciones" contador={noLeidas} onPress={() => router.push('/notifications')} />
        <AccionRapida icon="account-outline" titulo="Mi perfil" onPress={() => router.push('/admin/perfil')} />
      </View>
    </Screen>
  );
}

function StatCard({
  icon,
  etiqueta,
  valor,
  color,
}: {
  icon: 'calendar-check-outline' | 'cash-fast' | 'account-group-outline' | 'content-cut';
  etiqueta: string;
  valor: string;
  color: string;
}) {
  return (
    <Card style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <AppText variant="heading" style={styles.statValor} numberOfLines={1}>
        {valor}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {etiqueta}
      </AppText>
    </Card>
  );
}

function AccionRapida({
  icon,
  titulo,
  contador,
  onPress,
}: {
  icon: 'content-cut' | 'scissors-cutting' | 'calendar-clock-outline' | 'bullhorn-outline' | 'bell-outline' | 'account-outline';
  titulo: string;
  contador?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.accion, pressed && styles.pulsado]}
      onPress={onPress}
    >
      <View style={styles.accionIcono}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.accent} />
        {contador && contador > 0 ? (
          <View style={styles.contador}>
            <AppText style={styles.contadorTexto}>{contador > 9 ? '9+' : contador}</AppText>
          </View>
        ) : null}
      </View>
      <AppText variant="small" center style={styles.accionTexto}>
        {titulo}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  espaciador: {
    flex: 1,
  },
  botonIcono: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: {
    opacity: 0.7,
  },
  contador: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  contadorTexto: {
    color: colors.white,
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  heroIcono: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTexto: {
    flex: 1,
    gap: spacing.xs,
  },
  pista: {
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: spacing.xs,
  },
  statValor: {
    fontWeight: fontWeight.bold,
  },
  seccion: {
    gap: spacing.md,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tituloSeccion: {
    flex: 1,
  },
  pendientes: {
    gap: spacing.md,
  },
  pendiente: {
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  pendienteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pendienteTexto: {
    flex: 1,
    gap: 2,
  },
  filaBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonPendiente: {
    flexGrow: 1,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  accion: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  accionIcono: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionTexto: {
    fontWeight: fontWeight.semibold,
  },
});