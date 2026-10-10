import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { TarjetaCita } from '@/components/tarjeta-cita';
import { AppText, Avatar, Button, Card, EmptyState, Loader, Logo, Screen } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { useConsulta } from '@/hooks/consulta';
import { useNoLeidas } from '@/hooks/notificaciones';
import { useSacudida } from '@/hooks/sensores';
import { cambiarEstadoCita, obtenerCitasBarbero } from '@/lib/api';
import { TRANSICIONES_BARBERO } from '@/lib/estados';
import { DIAS_CORTOS, diasSiguientes, esHoy, isoDeHoy } from '@/lib/fechas';
import { Cita, EstadoCita } from '@/lib/tipos';
import { colors, fontWeight, radius, spacing } from '@/theme';

interface DiaAgenda {
  iso: string;
  dia: number;
  numero: number;
}

const DIAS = diasSiguientes(7);

const LABEL_TRANSICION: Partial<Record<EstadoCita, { titulo: string; icon: 'clock-outline' | 'content-cut' | 'check-circle-outline' | 'close-circle-outline' }>> = {
  en_espera: { titulo: 'Pasar a espera', icon: 'clock-outline' },
  en_atencion: { titulo: 'Iniciar atención', icon: 'content-cut' },
  terminada: { titulo: 'Terminar servicio', icon: 'check-circle-outline' },
  cancelada: { titulo: 'Cancelar cita', icon: 'close-circle-outline' },
};

export default function BarberHomeScreen() {
  const { profile, barber } = useAuth();
  const { noLeidas, recargar: recargarNotificaciones } = useNoLeidas();

  const [fecha, setFecha] = useState<DiaAgenda>({ iso: isoDeHoy(), dia: new Date().getDay(), numero: new Date().getDate() });
  const [transicionando, setTransicionando] = useState<number | null>(null);

  const barberoId = barber?.id;

  const { datos: citas, cargando, error, recargar } = useConsulta(
    () => {
      if (!barberoId) return Promise.resolve([] as Cita[]);
      return obtenerCitasBarbero(barberoId, fecha.iso);
    },
    ['appointments'],
  );

  useEffect(() => {
    void recargar();
  }, [fecha.iso, recargar]);

  useSacudida(() => {
    void Promise.all([recargar(), recargarNotificaciones()]);
  });

  if (!profile || !barber) {
    return <Loader label="Cargando tu agenda…" />;
  }

  const cambiarEstado = (cita: Cita, destino: EstadoCita) => {
    const hacer = async () => {
      setTransicionando(cita.id);
      try {
        await cambiarEstadoCita(cita.id, destino);
        await recargar();
      } catch (e) {
        Alert.alert('No se pudo actualizar', e instanceof Error ? e.message : 'Intenta de nuevo');
      } finally {
        setTransicionando(null);
      }
    };

    if (destino === 'cancelada') {
      Alert.alert('Cancelar cita', '¿Seguro que quieres cancelar esta cita?', [
        { text: 'No, mantener', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => void hacer() },
      ]);
    } else {
      void hacer();
    }
  };

  const agrupadas = (citas ?? []).reduce<Record<string, Cita[]>>((grupos, cita) => {
    const hora = cita.hora.slice(0, 5);
    (grupos[hora] ??= []).push(cita);
    return grupos;
  }, {});

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
          onPress={() => router.push('/barber/perfil')}
        >
          <Avatar uri={profile.foto} name={profile.nombre} size={38} />
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroIcono}>
          <MaterialCommunityIcons name="content-cut" size={28} color={colors.accent} />
        </View>
        <View style={styles.heroTexto}>
          <AppText variant="heading">Hola, {profile.nombre}</AppText>
          <AppText variant="small">
            {barber.especialidad?.trim() || 'Barbero'} · Tu agenda en tiempo real
          </AppText>
          <AppText variant="caption" style={styles.pista}>
            Sacude el móvil para actualizar
          </AppText>
        </View>
      </View>

      <View style={styles.fechaTitulo}>
        <MaterialCommunityIcons name="calendar-month-outline" size={20} color={colors.gold} />
        <AppText variant="subtitle">Agenda</AppText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScroll}
      >
        {DIAS.map((dia) => {
          const seleccionado = dia.iso === fecha.iso;
          return (
            <Pressable
              key={dia.iso}
              accessibilityRole="button"
              onPress={() => setFecha(dia)}
              style={({ pressed }) => [
                styles.chipDia,
                seleccionado && styles.chipDiaSeleccionado,
                pressed && styles.pulsado,
              ]}
            >
              <AppText
                variant="caption"
                color={seleccionado ? colors.accent : colors.textSecondary}
                style={styles.chipDiaLabel}
              >
                {esHoy(dia.iso) ? 'Hoy' : DIAS_CORTOS[dia.dia]}
              </AppText>
              <AppText
                variant="subtitle"
                color={seleccionado ? colors.accent : colors.text}
                style={styles.chipDiaNumero}
              >
                {dia.numero}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {cargando && !citas ? (
        <Loader label="Cargando citas…" />
      ) : error ? (
        <Card>
          <AppText variant="small" color={colors.danger}>
            {error}
          </AppText>
          <Button title="Reintentar" variant="secondary" size="md" onPress={() => void recargar()} />
        </Card>
      ) : (citas ?? []).length === 0 ? (
        <EmptyState
          icon="calendar-blank-outline"
          title={esHoy(fecha.iso) ? 'Sin citas hoy' : 'Sin citas este día'}
          message="Cuando un cliente reserve, su cita aparecerá aquí al instante."
        />
      ) : (
        <View style={styles.agenda}>
          {Object.entries(agrupadas).map(([hora, grupo]) => (
            <View key={hora} style={styles.grupoHora}>
              <View style={styles.horaFila}>
                <AppText variant="caption" color={colors.gold} style={styles.horaTexto}>
                  {hora}
                </AppText>
                <View style={styles.lineaHora} />
              </View>
              {grupo.map((cita) => (
                <TarjetaCita key={cita.id} cita={cita} mostrarCliente>
                  <AccionesBarbero
                    cita={cita}
                    ocupado={transicionando === cita.id}
                    onChange={(destino) => cambiarEstado(cita, destino)}
                  />
                </TarjetaCita>
              ))}
            </View>
          ))}
        </View>
      )}

      <View style={styles.acciones}>
        <AccionRapida
          icon="calendar-clock"
          titulo="Mi agenda"
          onPress={() => setFecha({ iso: isoDeHoy(), dia: new Date().getDay(), numero: new Date().getDate() })}
        />
        <AccionRapida icon="clock-outline" titulo="Horarios" onPress={() => router.push('/barber/horarios')} />
        <AccionRapida icon="bell-outline" titulo="Notificaciones" contador={noLeidas} onPress={() => router.push('/notifications')} />
        <AccionRapida icon="account-outline" titulo="Mi perfil" onPress={() => router.push('/barber/perfil')} />
      </View>
    </Screen>
  );
}

function AccionesBarbero({
  cita,
  ocupado,
  onChange,
}: {
  cita: Cita;
  ocupado: boolean;
  onChange: (destino: EstadoCita) => void;
}) {
  const transiciones = TRANSICIONES_BARBERO[cita.estado] ?? [];
  if (transiciones.length === 0) return null;

  return (
    <View style={styles.filaAcciones}>
      {transiciones.map((destino) => {
        const config = LABEL_TRANSICION[destino];
        if (!config) return null;
        return (
          <Button
            key={destino}
            title={config.titulo}
            size="md"
            icon={config.icon}
            variant={destino === 'cancelada' ? 'danger' : 'secondary'}
            loading={ocupado}
            onPress={() => onChange(destino)}
            style={styles.botonAccion}
          />
        );
      })}
    </View>
  );
}

function AccionRapida({
  icon,
  titulo,
  contador,
  onPress,
}: {
  icon: 'calendar-clock' | 'clock-outline' | 'bell-outline' | 'account-outline';
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
  fechaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  chipsScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  chipDia: {
    minWidth: 62,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  chipDiaSeleccionado: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  chipDiaLabel: {
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
  },
  chipDiaNumero: {
    fontWeight: fontWeight.bold,
  },
  agenda: {
    gap: spacing.lg,
  },
  grupoHora: {
    gap: spacing.sm,
  },
  horaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  horaTexto: {
    fontWeight: fontWeight.bold,
  },
  lineaHora: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  filaAcciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  botonAccion: {
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