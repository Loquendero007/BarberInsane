import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ModalResena } from '@/components/modal-resena';
import { TarjetaCita } from '@/components/tarjeta-cita';
import { AppText, Button, Card, Chip, EmptyState, Loader, Screen, ScreenHeader } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import { useLlegadaAutomatica } from '@/hooks/llegada';
import { cancelarCita, insertarResena, obtenerCitasCliente, obtenerResenasDelCliente } from '@/lib/api';
import { esCitaActiva } from '@/lib/estados';
import { esHoy, textoDistancia } from '@/lib/fechas';
import { Cita } from '@/lib/tipos';
import { useAuth } from '@/context/auth-context';
import { colors, radius, spacing } from '@/theme';

type Filtro = 'proximas' | 'historial';

export default function MisCitasScreen() {
  const { profile } = useAuth();
  const { datos: citas, cargando, error, recargar } = useConsulta(
    () => obtenerCitasCliente(),
    ['appointments'],
  );
  const { datos: misResenas, recargar: recargarResenas } = useConsulta(
    () => obtenerResenasDelCliente(),
    ['reviews'],
  );

  const [filtro, setFiltro] = useState<Filtro>('proximas');
  const [citaAResenar, setCitaAResenar] = useState<Cita | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);

  const proximas = useMemo(() => {
    const activas = (citas ?? []).filter((cita) => esCitaActiva(cita.estado));
    activas.sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
    return activas;
  }, [citas]);

  const historial = useMemo(() => {
    const pasadas = (citas ?? []).filter(
      (cita) => cita.estado === 'terminada' || cita.estado === 'cancelada',
    );
    pasadas.sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
    return pasadas;
  }, [citas]);

  const citaDeHoy = useMemo(
    () =>
      proximas.find((cita) => cita.estado === 'confirmada' && esHoy(cita.fecha)) ?? null,
    [proximas],
  );

  const { proximidad, llegada, mensaje, registrarManual } = useLlegadaAutomatica(
    citaDeHoy,
    () => {
      void recargar();
    },
  );

  const resenasEchas = new Set((misResenas ?? []).map((resena) => resena.appointment_id));

  const cancelar = (cita: Cita) => {
    Alert.alert(
      'Cancelar cita',
      `¿Seguro que quieres cancelar tu cita de ${cita.servicio?.nombre ?? 'servicio'}?`,
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setCancelando(cita.id);
            try {
              await cancelarCita(cita.id);
              await recargar();
            } catch (e) {
              Alert.alert('No se pudo cancelar', e instanceof Error ? e.message : 'Intenta de nuevo');
            } finally {
              setCancelando(null);
            }
          },
        },
      ],
    );
  };

  const lista = filtro === 'proximas' ? proximas : historial;

  if (cargando && !citas) {
    return <Loader label="Cargando tus citas…" />;
  }

  return (
    <Screen
      header={<ScreenHeader title="Mis citas" subtitle="Reservas, llegadas y reseñas" onBack={() => router.back()} />}
      scroll
    >
      <View style={styles.contenido}>
        {citaDeHoy ? (
          <Card style={styles.llegadaCard}>
            <View style={styles.filaTitulo}>
              <MaterialCommunityIcons name="map-marker-check-outline" size={22} color={colors.accent} />
              <AppText variant="subtitle" style={styles.tituloLlegada}>
                Tu cita de hoy
              </AppText>
            </View>
            <AppText variant="small">
              {citaDeHoy.servicio?.nombre} con {citaDeHoy.barbero?.nombre} a las{' '}
              {citaDeHoy.hora.slice(0, 5)}.
            </AppText>

            {proximidad.permiso !== 'concedido' ? (
              <Button
                title="Activar llegada automática"
                icon="crosshairs-gps"
                variant="secondary"
                size="md"
                loading={proximidad.cargandoPermiso}
                onPress={() => proximidad.solicitarPermiso()}
              />
            ) : llegada === 'hecha' ? (
              <View style={styles.llego}>
                <MaterialCommunityIcons name="check-decagram" size={20} color={colors.success} />
                <AppText variant="small" color={colors.success}>
                  Llegada registrada. Tu barbero ya te está esperando.
                </AppText>
              </View>
            ) : (
              <>
                <View style={styles.distanciaFila}>
                  <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={colors.info} />
                  <AppText variant="caption">
                    {proximidad.distancia != null
                      ? `Estás a ${textoDistancia(proximidad.distancia)} de la barbería${proximidad.dentro ? ' — ¡ya estás dentro!' : ''}`
                      : 'Obteniendo tu ubicación…'}
                  </AppText>
                </View>
                <Button
                  title={llegada === 'enviando' ? 'Registrando…' : 'Ya estoy aquí'}
                  icon="map-marker-check"
                  size="md"
                  loading={llegada === 'enviando'}
                  onPress={() => void registrarManual()}
                />
              </>
            )}

            {mensaje ? (
              <AppText variant="caption" color={colors.danger}>
                {mensaje}
              </AppText>
            ) : null}
          </Card>
        ) : null}

        <View style={styles.filtros}>
          <Chip label={`Próximas (${proximas.length})`} selected={filtro === 'proximas'} onPress={() => setFiltro('proximas')} />
          <Chip label={`Historial (${historial.length})`} selected={filtro === 'historial'} onPress={() => setFiltro('historial')} />
        </View>

        {error ? (
          <Card>
            <AppText variant="small" color={colors.danger}>
              {error}
            </AppText>
            <Button title="Reintentar" variant="secondary" size="md" onPress={() => void recargar()} />
          </Card>
        ) : null}

        {lista.length === 0 ? (
          <EmptyState
            icon="calendar-blank-outline"
            title={filtro === 'proximas' ? 'No tienes citas próximas' : 'Aún no hay historial'}
            message={
              filtro === 'proximas'
                ? 'Reserva un servicio y elige a tu barbero favorito.'
                : 'Aquí verás tus citas terminadas y canceladas.'
            }
            actionLabel={filtro === 'proximas' ? 'Reservar cita' : undefined}
            onAction={filtro === 'proximas' ? () => router.push('/client/reservar') : undefined}
          />
        ) : (
          <View style={styles.lista}>
            {lista.map((cita) => (
              <TarjetaCita key={cita.id} cita={cita}>
                <AccionesCita
                  cita={cita}
                  resenaHecha={resenasEchas.has(cita.id)}
                  cancelando={cancelando === cita.id}
                  llegada={llegada}
                  onPagar={() =>
                    router.push({ pathname: '/client/pago', params: { id: String(cita.id) } })
                  }
                  onCancelar={() => cancelar(cita)}
                  onResenar={() => setCitaAResenar(cita)}
                />
              </TarjetaCita>
            ))}
          </View>
        )}
      </View>

      <ModalResena
        visible={citaAResenar !== null}
        titulo={citaAResenar?.barbero?.nombre ? `Reseñar a ${citaAResenar.barbero.nombre}` : 'Reseñar servicio'}
        cerrar={() => setCitaAResenar(null)}
        guardar={async (rating, comentario) => {
          if (!citaAResenar || !profile) return;
          await insertarResena({
            appointment_id: citaAResenar.id,
            cliente_id: profile.id,
            barbero_id: citaAResenar.barbero_id,
            rating,
            comentario,
          });
          await Promise.all([recargar(), recargarResenas()]);
        }}
      />
    </Screen>
  );
}

function AccionesCita({
  cita,
  resenaHecha,
  cancelando,
  llegada,
  onPagar,
  onCancelar,
  onResenar,
}: {
  cita: Cita;
  resenaHecha: boolean;
  cancelando: boolean;
  llegada: string;
  onPagar: () => void;
  onCancelar: () => void;
  onResenar: () => void;
}) {
  if (cita.estado === 'pendiente_pago') {
    return (
      <View style={styles.filaAcciones}>
        <Button title="Pagar ahora" size="md" icon="credit-card" onPress={onPagar} />
        <Button title="Cancelar" size="md" variant="danger" loading={cancelando} onPress={onCancelar} />
      </View>
    );
  }

  if (cita.estado === 'confirmada') {
    const hoy = esHoy(cita.fecha);
    return (
      <View style={styles.filaAcciones}>
        {hoy && llegada !== 'hecha' ? (
          <AppText variant="caption" color={colors.textMuted}>
            Activa tu GPS para registrar la llegada desde la parte superior.
          </AppText>
        ) : null}
        <Button title="Cancelar cita" size="md" variant="danger" loading={cancelando} onPress={onCancelar} />
      </View>
    );
  }

  if (cita.estado === 'cliente_llego' || cita.estado === 'en_espera') {
    return (
      <AppText variant="caption" color={colors.textMuted}>
        {cita.estado === 'cliente_llego'
          ? 'Llegada registrada. En cuanto tu barbero te llame, pasas a atención.'
          : 'Estás en espera. Tu barbero te atenderá enseguida.'}
      </AppText>
    );
  }

  if (cita.estado === 'en_atencion') {
    return (
      <AppText variant="caption" color={colors.success}>
        ¡En pleno corte! Gracias por esperar.
      </AppText>
    );
  }

  if (cita.estado === 'terminada') {
    if (resenaHecha) {
      return (
        <View style={styles.filaAcciones}>
          <MaterialCommunityIcons name="star" size={16} color={colors.gold} />
          <AppText variant="caption">Gracias por tu reseña</AppText>
        </View>
      );
    }
    return (
      <View style={styles.filaAcciones}>
        <Button title="Calificar servicio" size="md" variant="secondary" icon="star" onPress={onResenar} />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  contenido: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  llegadaCard: {
    gap: spacing.md,
    borderColor: colors.accent,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tituloLlegada: {
    flex: 1,
  },
  distanciaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  llego: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  filtros: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lista: {
    gap: spacing.md,
  },
  filaAcciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
