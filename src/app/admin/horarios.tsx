import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, Card, Chip, EmptyState, Loader, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import { agregarHorario, eliminarHorario, obtenerHorarios, obtenerTodosBarberos } from '@/lib/api';
import { DIAS_CORTOS, DIAS_LARGOS, horaCorta } from '@/lib/fechas';
import { colors, radius, spacing } from '@/theme';

export default function AdminHorariosScreen() {
  const { datos: barberos, cargando } = useConsulta(
    () => obtenerTodosBarberos(),
    ['barbers'],
  );
  const [barberoId, setBarberoId] = useState<string | null>(null);

  const barberoEfectivo = barberoId ?? barberos?.[0]?.id ?? null;

  const { datos: horarios, cargando: cargandoHorarios, recargar: recargarHorarios } = useConsulta(
    () => (barberoEfectivo ? obtenerHorarios(barberoEfectivo) : Promise.resolve([])),
    ['schedules'],
  );

  const [diaNuevo, setDiaNuevo] = useState(1);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('18:00');
  const [disponible, setDisponible] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);

  const barberoActual = (barberos ?? []).find((b) => b.id === barberoEfectivo) ?? null;

  const guardar = async () => {
    if (!barberoEfectivo) return;
    if (!/^\d{2}:\d{2}$/.test(horaInicio) || !/^\d{2}:\d{2}$/.test(horaFin)) {
      setErrorForm('Usa formato de 24 h: HH:MM');
      return;
    }
    if (horaFin <= horaInicio) {
      setErrorForm('La hora de fin debe ser después del inicio');
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      await agregarHorario({ barbero_id: barberoEfectivo, dia: diaNuevo, hora_inicio: horaInicio, hora_fin: horaFin });
      await recargarHorarios();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo agregar el horario');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = (id: string) => {
    Alert.alert('Eliminar horario', '¿Seguro que quieres quitar este turno?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setEliminando(id);
          try {
            await eliminarHorario(id);
            await recargarHorarios();
          } catch (e) {
            Alert.alert('No se pudo eliminar', e instanceof Error ? e.message : 'Intenta de nuevo');
          } finally {
            setEliminando(null);
          }
        },
      },
    ]);
  };

  const porDia = (horarios ?? []).reduce<Record<number, typeof horarios>>((grupos, h) => {
    (grupos[h.dia] ??= []).push(h);
    return grupos;
  }, {});

  if (cargando && !barberos) {
    return (
      <Screen header={<ScreenHeader title="Horarios" onBack={() => router.back()} />}>
        <Loader label="Cargando…" />
      </Screen>
    );
  }

  return (
    <Screen header={<ScreenHeader title="Horarios" subtitle="Turnos por barbero" onBack={() => router.back()} />} scroll>
      <View style={styles.contenido}>
        {(barberos ?? []).length === 0 ? (
          <EmptyState
            icon="content-cut"
            title="Sin barberos"
            message="Primero registra un barbero para asignarle horarios."
          />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
              {(barberos ?? []).map((barbero) => (
                <Chip
                  key={barbero.id}
                  label={barbero.nombre}
                  selected={barbero.id === barberoEfectivo}
                  onPress={() => setBarberoId(barbero.id)}
                />
              ))}
            </ScrollView>

            {barberoActual ? (
              <Card style={styles.seccion}>
                <View style={styles.tituloFila}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={colors.gold} />
                  <AppText variant="subtitle" style={styles.tituloFlex}>
                    Turnos de {barberoActual.nombre}
                  </AppText>
                </View>

                {cargandoHorarios && !horarios ? (
                  <Loader label="Cargando horarios…" />
                ) : (horarios ?? []).length === 0 ? (
                  <AppText variant="small" color={colors.textMuted}>
                    No tiene horarios publicados todavía.
                  </AppText>
                ) : (
                  <View style={styles.lista}>
                    {DIAS_LARGOS.map((dia, index) => {
                      const turnos = porDia[index] ?? [];
                      if (turnos.length === 0) return null;
                      return (
                        <View key={dia} style={styles.diaGrupo}>
                          <AppText variant="caption" color={colors.textSecondary} style={styles.diaLabel}>
                            {dia}
                          </AppText>
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
                              <View style={styles.flexEspaciador} />
                              <Pressable
                                accessibilityRole="button"
                                disabled={eliminando === horario.id}
                                style={({ pressed }) => [styles.botonEliminar, pressed && styles.pulsado]}
                                onPress={() => eliminar(horario.id)}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            ) : null}

            <Card style={styles.seccion}>
              <View style={styles.tituloFila}>
                <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.accent} />
                <AppText variant="subtitle" style={styles.tituloFlex}>
                  Agregar turno
                </AppText>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {DIAS_CORTOS.map((dia, index) => (
                  <Chip key={dia} label={dia} selected={diaNuevo === index} onPress={() => setDiaNuevo(index)} />
                ))}
              </ScrollView>

              <View style={styles.filaHoras}>
                <TextField
                  label="Inicio"
                  value={horaInicio}
                  onChangeText={setHoraInicio}
                  keyboardType="numbers-and-punctuation"
                  placeholder="09:00"
                  style={styles.campoHora}
                />
                <TextField
                  label="Fin"
                  value={horaFin}
                  onChangeText={setHoraFin}
                  keyboardType="numbers-and-punctuation"
                  placeholder="18:00"
                  style={styles.campoHora}
                />
              </View>

              <View style={styles.filaSwitch}>
                <View style={styles.filaSwitchTexto}>
                  <MaterialCommunityIcons name="toggle-switch-outline" size={18} color={colors.textSecondary} />
                  <AppText variant="small">Disponible</AppText>
                </View>
                <Switch
                  value={disponible}
                  onValueChange={setDisponible}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={disponible ? colors.white : colors.textMuted}
                  ios_backgroundColor={colors.border}
                />
              </View>

              {errorForm ? (
                <AppText variant="small" color={colors.danger}>
                  {errorForm}
                </AppText>
              ) : null}

              <Button title="Guardar turno" icon="content-save" loading={guardando} onPress={() => void guardar()} />
            </Card>
          </>
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
  chipsScroll: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  seccion: {
    gap: spacing.md,
  },
  tituloFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tituloFlex: {
    flex: 1,
  },
  lista: {
    gap: spacing.md,
  },
  diaGrupo: {
    gap: spacing.sm,
  },
  diaLabel: {
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  turno: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  flexEspaciador: {
    flex: 1,
  },
  botonEliminar: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsado: {
    opacity: 0.7,
  },
  filaHoras: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  campoHora: {
    flex: 1,
  },
  filaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  filaSwitchTexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});