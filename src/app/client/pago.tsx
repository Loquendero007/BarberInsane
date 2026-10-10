import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Badge, Button, Card, Loader, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import { confirmarPagoDemo, obtenerCitaPorId, obtenerTarjetas } from '@/lib/api';
import { formatearFechaLarga, formatearMoneda, horaCorta } from '@/lib/fechas';
import { colors, radius, spacing } from '@/theme';

function detectarMarca(numero: string): string {
  const limpio = numero.replace(/\D/g, '');
  if (limpio.startsWith('4')) return 'VISA';
  if (limpio.startsWith('5') || limpio.startsWith('2')) return 'MASTERCARD';
  if (limpio.startsWith('3')) return 'AMEX';
  return 'TARJETA';
}

export default function PagoScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const citaId = Number(params.id);

  const { datos: cita, cargando, error: errorCita, recargar } = useConsulta(
    () => obtenerCitaPorId(citaId),
    ['appointments'],
  );
  const { datos: tarjetas } = useConsulta(() => obtenerTarjetas(), ['payment_methods']);

  const [metodo, setMetodo] = useState<string | null>(null);
  const [numero, setNumero] = useState('');
  const [vence, setVence] = useState('');
  const [cvv, setCvv] = useState('');
  const [titular, setTitular] = useState('');
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [pagando, setPagando] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);

  const tarjetasDisponibles = tarjetas ?? [];
  const usandoTarjetaGuardada = metodo !== 'nueva' && metodo !== null;
  const seleccionCompleta = usandoTarjetaGuardada || (metodo === 'nueva' && !!numero);

  const total = useMemo(() => Number(cita?.precio ?? 0), [cita]);

  const validarTarjetaNueva = (): boolean => {
    const nuevosErrores: Record<string, string> = {};
    const digitos = numero.replace(/\D/g, '');
    if (digitos.length !== 16) nuevosErrores.numero = 'Debe tener 16 dígitos';
    const partes = vence.split('/');
    const mes = Number(partes[0]);
    const anio = Number(partes[1]);
    if (partes.length !== 2 || !(mes >= 1 && mes <= 12) || !(anio >= 24 && anio <= 40)) {
      nuevosErrores.vence = 'Usa el formato MM/AA';
    }
    if (!/^\d{3,4}$/.test(cvv)) nuevosErrores.cvv = 'CVV de 3 o 4 dígitos';
    if (titular.trim().length < 3) nuevosErrores.titular = 'Nombre del titular';
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const pagar = async () => {
    if (!cita) return;
    if (metodo === 'nueva' || !usandoTarjetaGuardada) {
      if (!validarTarjetaNueva()) return;
    } else if (!metodo) {
      setErrores({ metodo: 'Selecciona un método de pago' });
      return;
    }

    setPagando(true);
    setErrorPago(null);
    try {
      const digitos = numero.replace(/\D/g, '');
      const esNueva = metodo === 'nueva';
      const tarjetaGuardada = tarjetasDisponibles.find((t) => t.id === metodo);
      await confirmarPagoDemo(
        cita.id,
        esNueva ? detectarMarca(numero) : (tarjetaGuardada?.brand ?? 'DEMO'),
        esNueva ? digitos.slice(-4) : (tarjetaGuardada?.last4 ?? '0000'),
      );
      Alert.alert('Pago aprobado', 'Tu pago fue procesado y tu cita está confirmada.', [
        { text: 'Ver mis citas', onPress: () => router.replace('/client/citas') },
      ]);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo procesar el pago';
      if (mensaje.includes('demo_pay') || mensaje.includes('does not exist')) {
        setErrorPago(
          'El pago demo aún no está habilitado en la base de datos. Ejecuta la migración 0005 (scripts/apply-migrations.mjs) e inténtalo de nuevo.',
        );
      } else {
        setErrorPago(mensaje);
      }
      void recargar();
    } finally {
      setPagando(false);
    }
  };

  if (cargando && !cita) {
    return <Loader label="Cargando tu cita…" />;
  }

  if (errorCita && !cita) {
    return (
      <Screen header={<ScreenHeader title="Pagar cita" onBack={() => router.back()} />}>
        <Card>
          <AppText variant="small" color={colors.danger}>
            {errorCita}
          </AppText>
          <Button title="Reintentar" size="md" variant="secondary" onPress={() => void recargar()} />
        </Card>
      </Screen>
    );
  }

  if (!cita) {
    return (
      <Screen header={<ScreenHeader title="Pagar cita" onBack={() => router.back()} />}>
        <Card>
          <AppText variant="small">No encontramos la cita solicitada.</AppText>
          <Button title="Volver" size="md" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  const pagada = cita.estado !== 'pendiente_pago';

  return (
    <Screen
      header={<ScreenHeader title="Pagar cita" subtitle="Entorno de prueba" onBack={() => router.back()} />}
      scroll
    >
      <View style={styles.contenido}>
        <Card style={styles.resumen}>
          <View style={styles.filaTitulo}>
            <MaterialCommunityIcons name="content-cut" size={20} color={colors.accent} />
            <AppText variant="subtitle" style={styles.tituloFlex}>
              {cita.servicio?.nombre ?? 'Servicio'}
            </AppText>
            {pagada ? <Badge label="Pagada" tone="success" /> : null}
          </View>
          <Fila etiqueta="Barbero" valor={cita.barbero?.nombre ?? '—'} />
          <Fila etiqueta="Fecha" valor={`${formatearFechaLarga(cita.fecha)} · ${horaCorta(cita.hora)}`} />
          <View style={styles.total}>
            <AppText variant="subtitle">Total a pagar</AppText>
            <AppText variant="heading" color={colors.accent}>
              {formatearMoneda(total)}
            </AppText>
          </View>
        </Card>

        {pagada ? (
          <Card>
            <AppText variant="small">
              Esta cita {cita.estado === 'confirmada' ? 'ya está confirmada' : 'no requiere pago'}.
            </AppText>
            <Button title="Ver mis citas" size="md" onPress={() => router.replace('/client/citas')} />
          </Card>
        ) : (
          <>
            <View style={styles.seccion}>
              <AppText variant="subtitle">Método de pago</AppText>

              {tarjetasDisponibles.map((tarjeta) => {
                const activo = metodo === tarjeta.id;
                return (
                  <Card
                    key={tarjeta.id}
                    onPress={() => setMetodo(tarjeta.id)}
                    style={[styles.tarjeta, activo && styles.tarjetaActiva]}
                  >
                    <View style={styles.filaTitulo}>
                      <MaterialCommunityIcons name="credit-card-outline" size={22} color={colors.text} />
                      <View style={styles.tituloFlex}>
                        <AppText variant="body">{tarjeta.brand.toUpperCase()} ···· {tarjeta.last4}</AppText>
                        {tarjeta.es_default ? (
                          <AppText variant="caption">Predeterminada</AppText>
                        ) : null}
                      </View>
                      <MaterialCommunityIcons
                        name={activo ? 'radiobox-marked' : 'radiobox-blank'}
                        size={22}
                        color={activo ? colors.accent : colors.textMuted}
                      />
                    </View>
                  </Card>
                );
              })}

              <Card
                onPress={() => setMetodo('nueva')}
                style={[styles.tarjeta, metodo === 'nueva' && styles.tarjetaActiva]}
              >
                <View style={styles.filaTitulo}>
                  <MaterialCommunityIcons name="credit-card-plus-outline" size={22} color={colors.text} />
                  <AppText variant="body" style={styles.tituloFlex}>
                    Usar otra tarjeta
                  </AppText>
                  <MaterialCommunityIcons
                    name={metodo === 'nueva' ? 'radiobox-marked' : 'radiobox-blank'}
                    size={22}
                    color={metodo === 'nueva' ? colors.accent : colors.textMuted}
                  />
                </View>
              </Card>

              {metodo === 'nueva' ? (
                <Card style={styles.formulario}>
                  <TextField
                    label="Número de tarjeta"
                    value={numero}
                    onChangeText={(v) => {
                      const digitos = v.replace(/\D/g, '').slice(0, 16);
                      setNumero(digitos.replace(/(\d{4})(?=\d)/g, '$1 '));
                      setErrores((e) => ({ ...e, numero: '' }));
                    }}
                    keyboardType="numeric"
                    placeholder="4242 4242 4242 4242"
                    error={errores.numero || null}
                  />
                  <View style={styles.filaCampos}>
                    <TextField
                      label="Vence"
                      value={vence}
                      onChangeText={(v) => {
                        const digitos = v.replace(/\D/g, '').slice(0, 4);
                        setVence(digitos.length > 2 ? `${digitos.slice(0, 2)}/${digitos.slice(2)}` : digitos);
                        setErrores((e) => ({ ...e, vence: '' }));
                      }}
                      keyboardType="numeric"
                      placeholder="MM/AA"
                      style={styles.campoMitad}
                      error={errores.vence || null}
                    />
                    <TextField
                      label="CVV"
                      value={cvv}
                      onChangeText={(v) => {
                        setCvv(v.replace(/\D/g, '').slice(0, 4));
                        setErrores((e) => ({ ...e, cvv: '' }));
                      }}
                      keyboardType="numeric"
                      placeholder="123"
                      secureTextEntry
                      style={styles.campoMitad}
                      error={errores.cvv || null}
                    />
                  </View>
                  <TextField
                    label="Titular"
                    value={titular}
                    onChangeText={(v) => {
                      setTitular(v);
                      setErrores((e) => ({ ...e, titular: '' }));
                    }}
                    placeholder="Como dice en la tarjeta"
                    autoCapitalize="words"
                    error={errores.titular || null}
                  />
                </Card>
              ) : null}

              {errorPago ? (
                <View style={styles.error}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.danger} />
                  <AppText variant="caption" color={colors.danger} style={styles.errorTexto}>
                    {errorPago}
                  </AppText>
                </View>
              ) : null}

              <AppText variant="caption" center>
                Prueba segura: no se realiza ningún cargo real.
              </AppText>

              <Button
                title={`Pagar ${formatearMoneda(total)}`}
                icon="shield-check"
                loading={pagando}
                disabled={!seleccionCompleta && metodo !== 'nueva'}
                onPress={() => void pagar()}
              />
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.fila}>
      <AppText variant="small">{etiqueta}</AppText>
      <AppText variant="body" style={styles.valor} numberOfLines={1}>
        {valor}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  resumen: {
    gap: spacing.sm,
  },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tituloFlex: {
    flex: 1,
  },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  valor: {
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
  seccion: {
    gap: spacing.md,
  },
  tarjeta: {
    gap: spacing.sm,
  },
  tarjetaActiva: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  formulario: {
    gap: spacing.md,
  },
  filaCampos: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  campoMitad: {
    flex: 1,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorTexto: {
    flex: 1,
  },
});
