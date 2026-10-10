import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState, ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button, Card, Chip, EmptyState, Screen, ScreenHeader, StarRating } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import {
  obtenerBarberosCalificados,
  obtenerServicios,
  obtenerSlots,
  reservarCita,
  suscribirse,
} from '@/lib/api';
import { DIAS_CORTOS, diasSiguientes, esHoy, formatearFechaLarga, formatearMoneda, horaCorta } from '@/lib/fechas';
import { colors, radius, spacing } from '@/theme';

export default function ReservarScreen() {
  const params = useLocalSearchParams<{ servicio?: string }>();
  const { datos: servicios, cargando: cargandoServicios } = useConsulta(() => obtenerServicios());
  const { datos: barberos } = useConsulta(() => obtenerBarberosCalificados());

  const [servicioId, setServicioId] = useState<string | null>(params.servicio ?? null);
  const [barberoId, setBarberoId] = useState<string | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const servicio = servicios?.find((item) => item.id === servicioId) ?? null;
  const barbero = barberos?.find((item) => item.id === barberoId) ?? null;
  const dias = diasSiguientes(14);

  const recargarSlots = useCallback(async () => {
    if (!barberoId || !fecha || !servicio) {
      setSlots([]);
      return;
    }
    setCargandoSlots(true);
    try {
      setSlots(await obtenerSlots(barberoId, fecha, servicio.duracion));
    } catch (e) {
      setSlots([]);
      setError(e instanceof Error ? e.message : 'No pudimos cargar los horarios');
    } finally {
      setCargandoSlots(false);
    }
  }, [barberoId, fecha, servicio]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga de slots al cambiar selección
    void recargarSlots();
  }, [recargarSlots]);

  const haySeleccion = !!(barberoId && fecha && servicio);

  useEffect(() => {
    if (!haySeleccion) return;
    return suscribirse(['appointments'], () => {
      void recargarSlots();
    });
  }, [haySeleccion, recargarSlots]);

  const elegirServicio = (id: string) => {
    setServicioId(id);
    setHora(null);
    setError(null);
  };

  const elegirBarbero = (id: string) => {
    setBarberoId(id);
    setHora(null);
    setError(null);
  };

  const elegirFecha = (iso: string) => {
    setFecha(iso);
    setHora(null);
    setError(null);
  };

  const confirmar = async () => {
    if (!servicio || !barberoId || !fecha || !hora) return;
    setConfirmando(true);
    setError(null);
    try {
      const cita = await reservarCita(servicio.id, barberoId, fecha, hora);
      const requierePago = servicio.requiere_prepago;
      Alert.alert(
        '¡Cita reservada!',
        requierePago
          ? 'Tu cita está reservada. Completa el pago para confirmarla.'
          : 'Tu cita está confirmada. ¡Nos vemos pronto!',
        [
          {
            text: 'Continuar',
            onPress: () => {
              if (requierePago) {
                router.replace({ pathname: '/client/pago', params: { id: String(cita.id) } });
              } else {
                router.replace('/client/citas');
              }
            },
          },
        ],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reservar la cita');
      void recargarSlots();
    } finally {
      setConfirmando(false);
    }
  };

  const completo = !!(servicio && barbero && fecha && hora);

  return (
    <Screen header={<ScreenHeader title="Reservar cita" onBack={() => router.back()} />} scroll>
      <View style={styles.pasos}>
        <Paso numero={1} titulo="Elige tu servicio">
          {cargandoServicios ? (
            <AppText variant="small">Cargando servicios…</AppText>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filaScroll}>
              {(servicios ?? []).map((item) => {
                const activo = item.id === servicioId;
                return (
                  <Pressable
                    key={item.id}
                    style={[styles.tarjetaServicio, activo && styles.seleccionada]}
                    onPress={() => elegirServicio(item.id)}
                  >
                    <View style={styles.servicioTitulo}>
                      <AppText variant="subtitle" style={styles.servicioNombre} numberOfLines={1}>
                        {item.nombre}
                      </AppText>
                      {activo ? (
                        <MaterialCommunityIcons name="check-circle" size={18} color={colors.accent} />
                      ) : null}
                    </View>
                    <AppText variant="small" numberOfLines={2}>
                      {item.descripcion ?? ''}
                    </AppText>
                    <View style={styles.servicioPie}>
                      <AppText variant="subtitle" color={colors.accent}>
                        {formatearMoneda(item.precio)}
                      </AppText>
                      <AppText variant="caption">{item.duracion} min</AppText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Paso>

        <Paso numero={2} titulo="Elige tu barbero">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filaScroll}>
            {(barberos ?? []).map((item) => {
              const activo = item.id === barberoId;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.tarjetaBarbero, activo && styles.seleccionada]}
                  onPress={() => elegirBarbero(item.id)}
                >
                  <Avatar uri={item.foto} name={item.nombre} size={52} />
                  <AppText variant="subtitle" numberOfLines={1}>
                    {item.nombre}
                  </AppText>
                  <AppText variant="caption" center numberOfLines={1}>
                    {item.especialidad?.trim() || 'Barbero'}
                  </AppText>
                  {item.totalResenas > 0 ? (
                    <StarRating rating={item.promedio} count={item.totalResenas} size={14} />
                  ) : (
                    <AppText variant="caption">Sin reseñas aún</AppText>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </Paso>

        <Paso numero={3} titulo="Elige el día">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filaScroll}>
            {dias.map((dia) => {
              const activo = dia.iso === fecha;
              return (
                <Pressable
                  key={dia.iso}
                  style={[styles.tarjetaDia, activo && styles.seleccionada]}
                  onPress={() => elegirFecha(dia.iso)}
                >
                  <AppText variant="caption" center>
                    {esHoy(dia.iso) ? 'HOY' : DIAS_CORTOS[dia.dia]}
                  </AppText>
                  <AppText variant="subtitle" center>
                    {dia.numero}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Paso>

        <Paso numero={4} titulo="Elige la hora">
          {!servicio || !barbero || !fecha ? (
            <AppText variant="small">Primero completa los pasos anteriores.</AppText>
          ) : cargandoSlots ? (
            <AppText variant="small">Buscando horarios disponibles…</AppText>
          ) : slots.length === 0 ? (
            <EmptyState
              icon="clock-outline"
              title="Sin horarios disponibles"
              message={`No hay espacios libres el ${formatearFechaLarga(fecha)}. Prueba con otro día o barbero.`}
            />
          ) : (
            <View style={styles.horas}>
              {slots.map((slot) => (
                <Chip
                  key={slot}
                  label={horaCorta(slot)}
                  selected={slot === hora}
                  onPress={() => setHora(slot)}
                />
              ))}
            </View>
          )}
        </Paso>

        <Card style={styles.resumen}>
          <AppText variant="subtitle">Resumen</AppText>
          <FilaResumen etiqueta="Servicio" valor={servicio?.nombre ?? '—'} />
          <FilaResumen etiqueta="Barbero" valor={barbero?.nombre ?? '—'} />
          <FilaResumen etiqueta="Fecha" valor={fecha ? formatearFechaLarga(fecha) : '—'} />
          <FilaResumen etiqueta="Hora" valor={hora ? horaCorta(hora) : '—'} />
          <FilaResumen etiqueta="Duración" valor={servicio ? `${servicio.duracion} min` : '—'} />
          <View style={styles.total}>
            <AppText variant="subtitle">Total</AppText>
            <AppText variant="heading" color={colors.accent}>
              {servicio ? formatearMoneda(servicio.precio) : '—'}
            </AppText>
          </View>

          {error ? (
            <View style={styles.error}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
              <AppText variant="small" color={colors.danger} style={styles.errorTexto}>
                {error}
              </AppText>
            </View>
          ) : null}

          <Button
            title={servicio?.requiere_prepago ? 'Reservar y pagar' : 'Confirmar reserva'}
            icon="check"
            disabled={!completo}
            loading={confirmando}
            onPress={confirmar}
          />
        </Card>
      </View>
    </Screen>
  );
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <View style={styles.paso}>
      <View style={styles.pasoTitulo}>
        <View style={styles.pasoNumero}>
          <AppText style={styles.pasoNumeroTexto}>{numero}</AppText>
        </View>
        <AppText variant="subtitle">{titulo}</AppText>
      </View>
      {children}
    </View>
  );
}

function FilaResumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.filaResumen}>
      <AppText variant="small">{etiqueta}</AppText>
      <AppText variant="body" style={styles.valorResumen} numberOfLines={1}>
        {valor}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pasos: {
    gap: spacing.xl,
    paddingTop: spacing.sm,
  },
  paso: {
    gap: spacing.md,
  },
  pasoTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pasoNumero: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoNumeroTexto: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  filaScroll: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  tarjetaServicio: {
    width: 230,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  tarjetaBarbero: {
    width: 180,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  tarjetaDia: {
    width: 64,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  seleccionada: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  servicioTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  servicioNombre: {
    flex: 1,
  },
  servicioPie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  horas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  resumen: {
    gap: spacing.sm,
  },
  filaResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  valorResumen: {
    flexShrink: 1,
    textAlign: 'right',
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorTexto: {
    flex: 1,
  },
});
