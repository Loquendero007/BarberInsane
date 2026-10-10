import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { PosteGiratorio } from '@/components/poste-giratorio';
import { AppText, Avatar, Badge, Button, Card, Logo, Screen } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import { useProximidadTienda } from '@/hooks/llegada';
import { useNoLeidas } from '@/hooks/notificaciones';
import { usePasosHoy, useRotacionZ, useSacudida } from '@/hooks/sensores';
import { useAuth } from '@/context/auth-context';
import { obtenerCitasCliente, obtenerConfigTienda } from '@/lib/api';
import { esCitaActiva } from '@/lib/estados';
import {
  esHoy,
  formatearFechaCorta,
  formatearMoneda,
  formatearNumero,
  horaCorta,
  textoDistancia,
} from '@/lib/fechas';
import { Cita } from '@/lib/tipos';
import { colors, fontWeight, radius, spacing } from '@/theme';

const META_PASOS = 6000;

export default function ClientHomeScreen() {
  const { profile, signOut } = useAuth();
  const { datos: citas, recargar: recargarCitas } = useConsulta(
    () => obtenerCitasCliente(),
    ['appointments'],
  );
  const { noLeidas, recargar: recargarNotificaciones } = useNoLeidas();
  const { datos: config } = useConsulta(() => obtenerConfigTienda(), ['shop_config']);
  const { pasos, disponible: pedometerDisponible } = usePasosHoy();
  const { angulo } = useRotacionZ();
  const proximidad = useProximidadTienda();

  const [refrescando, setRefrescando] = useState(false);
  const [salir, setSalir] = useState(false);

  const proximaCita = useMemo(() => {
    if (!citas) return null;
    const activas = citas.filter((cita) => esCitaActiva(cita.estado));
    activas.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    return activas[0] ?? null;
  }, [citas]);

  const refrescarTodo = useCallback(async () => {
    setRefrescando(true);
    try {
      await Promise.all([recargarCitas(), recargarNotificaciones()]);
    } finally {
      setTimeout(() => setRefrescando(false), 700);
    }
  }, [recargarCitas, recargarNotificaciones]);

  useSacudida(refrescarTodo);

  const cerrarSesion = async () => {
    setSalir(true);
    try {
      await signOut();
      router.replace('/welcome');
    } finally {
      setSalir(false);
    }
  };

  const grados = Math.round((angulo * 180) / Math.PI);
  const progresoPasos = Math.min(1, pasos / META_PASOS);

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
          onPress={() => router.push('/client/perfil')}
        >
          <Avatar uri={profile?.foto} name={profile?.nombre} size={38} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <PosteGiratorio size={76} />
        <View style={styles.heroTexto}>
          <AppText variant="heading">¡Hola, {profile?.nombre ?? 'cliente'}!</AppText>
          <AppText variant="small">
            Reserva tu cita en BarberInsane {refrescando ? '· Actualizando…' : ''}
          </AppText>
          <AppText variant="caption" style={styles.pista}>
            Gira el móvil para girar el poste · Sacude para refrescar
          </AppText>
        </View>
      </View>

      <Card style={styles.seccion}>
        <View style={styles.filaTitulo}>
          <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.accent} />
          <AppText variant="subtitle" style={styles.tituloSeccion}>
            Tu próxima cita
          </AppText>
        </View>

        {proximaCita ? (
          <ProximaCita cita={proximaCita} distancia={proximidad.distancia} />
        ) : (
          <View style={styles.vacio}>
            <AppText variant="small">No tienes citas programadas.</AppText>
            <Button
              title="Reservar mi primera cita"
              icon="content-cut"
              size="md"
              onPress={() => router.push('/client/reservar')}
            />
          </View>
        )}
      </Card>

      <Card style={styles.seccion}>
        <View style={styles.filaTitulo}>
          <MaterialCommunityIcons name="map-marker-check-outline" size={20} color={colors.success} />
          <AppText variant="subtitle" style={styles.tituloSeccion}>
            Dónde estamos
          </AppText>
        </View>

        {config?.latitude != null && config.longitude != null ? (
          <>
            <MapView
              style={styles.mapa}
              initialRegion={{
                latitude: config.latitude,
                longitude: config.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{ latitude: config.latitude, longitude: config.longitude }}
                title={config.nombre}
                description={config.direccion ?? undefined}
              />
            </MapView>
            {config.direccion ? (
              <View style={styles.direccion}>
                <MaterialCommunityIcons name="map-marker" size={16} color={colors.textSecondary} />
                <AppText variant="caption">{config.direccion}</AppText>
              </View>
            ) : null}
            <Button
              title="Cómo llegar"
              icon="navigation-variant-outline"
              size="md"
              onPress={() => {
                void Linking.openURL(
                  `https://www.google.com/maps/dir/?api=1&destination=${config.latitude},${config.longitude}`,
                );
              }}
            />
          </>
        ) : (
          <AppText variant="small">La barbería aún no configura su ubicación.</AppText>
        )}
      </Card>

      <View style={styles.sensores}>
        <Card style={styles.sensorCard}>
          <View style={styles.filaTitulo}>
            <MaterialCommunityIcons name="walk" size={18} color={colors.gold} />
            <AppText variant="caption" style={styles.sensorTitulo}>
              Pasos de hoy
            </AppText>
          </View>
          {pedometerDisponible ? (
            <>
              <AppText variant="heading">{formatearNumero(pasos)}</AppText>
              <View style={styles.barraProgreso}>
                <View style={[styles.barraRelleno, { width: `${progresoPasos * 100}%` }]} />
              </View>
              <AppText variant="caption">Meta: {formatearNumero(META_PASOS)} pasos</AppText>
            </>
          ) : (
            <AppText variant="caption">No disponible en este dispositivo</AppText>
          )}
        </Card>

        <Card style={styles.sensorCard}>
          <View style={styles.filaTitulo}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={colors.info} />
            <AppText variant="caption" style={styles.sensorTitulo}>
              Llegada por GPS
            </AppText>
          </View>
          {proximidad.permiso === 'concedido' ? (
            <>
              <AppText variant="heading">
                {proximidad.distancia != null ? textoDistancia(proximidad.distancia) : '…'}
              </AppText>
              <AppText variant="caption">
                {proximidad.dentro
                  ? '¡Estás en la barbería! Tu llegada se registra sola.'
                  : 'Te registramos la llegada al entrar al radio.'}
              </AppText>
            </>
          ) : (
            <Button
              title="Activar llegada"
              variant="secondary"
              size="md"
              icon="crosshairs-gps"
              loading={proximidad.cargandoPermiso}
              onPress={() => proximidad.solicitarPermiso()}
            />
          )}
        </Card>

        <Card style={styles.sensorCard}>
          <View style={styles.filaTitulo}>
            <MaterialCommunityIcons name="rotate-right" size={18} color={colors.success} />
            <AppText variant="caption" style={styles.sensorTitulo}>
              Giroscopio
            </AppText>
          </View>
          <AppText variant="heading">{grados}°</AppText>
          <AppText variant="caption">Gira tu móvil para mover el poste.</AppText>
        </Card>
      </View>

      <View style={styles.acciones}>
        <AccionRapida
          icon="calendar-plus"
          titulo="Reservar cita"
          onPress={() => router.push('/client/reservar')}
        />
        <AccionRapida
          icon="clipboard-list-outline"
          titulo="Mis citas"
          onPress={() => router.push('/client/citas')}
        />
        <AccionRapida
          icon="bell-outline"
          titulo="Notificaciones"
          contador={noLeidas}
          onPress={() => router.push('/notifications')}
        />
        <AccionRapida
          icon="account-outline"
          titulo="Mi perfil"
          onPress={() => router.push('/client/perfil')}
        />
      </View>

      <Button
        title="Cerrar sesión"
        variant="secondary"
        icon="logout"
        loading={salir}
        onPress={cerrarSesion}
      />
    </Screen>
  );
}

function ProximaCita({ cita, distancia }: { cita: Cita; distancia: number | null }) {
  const fechaTexto = esHoy(cita.fecha) ? 'Hoy' : formatearFechaCorta(cita.fecha);

  return (
    <View style={styles.cita}>
      <View style={styles.citaInfo}>
        <AppText variant="subtitle">{cita.servicio?.nombre ?? 'Servicio'}</AppText>
        <AppText variant="small">
          {cita.barbero?.nombre ?? 'Barbero'} · {fechaTexto} {horaCorta(cita.hora)}
        </AppText>
        <View style={styles.citaBadges}>
          {cita.estado === 'pendiente_pago' ? (
            <Badge label={`Paga ${formatearMoneda(cita.precio)}`} tone="warning" />
          ) : null}
          {cita.estado === 'confirmada' && esHoy(cita.fecha) && distancia != null ? (
            <Badge label={`A ${textoDistancia(distancia)}`} tone="info" />
          ) : null}
          {cita.estado === 'confirmada' && esHoy(cita.fecha) && distancia == null ? (
            <Badge label="Activa tu GPS" tone="neutral" />
          ) : null}
        </View>
      </View>
      <View style={styles.citaBotones}>
        {cita.estado === 'pendiente_pago' ? (
          <Button
            title="Pagar"
            size="md"
            icon="credit-card"
            onPress={() => router.push({ pathname: '/client/pago', params: { id: String(cita.id) } })}
          />
        ) : null}
        <Button
          title="Ver mis citas"
          size="md"
          variant={cita.estado === 'pendiente_pago' ? 'secondary' : 'primary'}
          onPress={() => router.push('/client/citas')}
        />
      </View>
    </View>
  );
}

function AccionRapida({
  icon,
  titulo,
  contador,
  onPress,
}: {
  icon: 'calendar-plus' | 'clipboard-list-outline' | 'bell-outline' | 'account-outline';
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
  heroTexto: {
    flex: 1,
    gap: spacing.xs,
  },
  pista: {
    marginTop: spacing.xs,
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
  vacio: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  cita: {
    gap: spacing.md,
  },
  citaInfo: {
    gap: spacing.xs,
  },
  citaBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  citaBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mapa: {
    height: 180,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  direccion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sensores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  sensorCard: {
    flexGrow: 1,
    flexBasis: '45%',
    gap: spacing.sm,
  },
  sensorTitulo: {
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  barraProgreso: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  barraRelleno: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
  },
  acciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
