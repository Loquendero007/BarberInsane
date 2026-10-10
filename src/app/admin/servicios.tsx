import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Loader, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import { alternarServicio, guardarServicio, obtenerTodosServicios } from '@/lib/api';
import { formatearMoneda } from '@/lib/fechas';
import { Servicio } from '@/lib/tipos';
import { colors, radius, spacing } from '@/theme';

interface ServicioForm {
  nombre: string;
  descripcion: string;
  precio: string;
  duracion: string;
  activo: boolean;
  requiere_prepago: boolean;
}

const FORM_VACIO: ServicioForm = {
  nombre: '',
  descripcion: '',
  precio: '',
  duracion: '',
  activo: true,
  requiere_prepago: false,
};

export default function AdminServiciosScreen() {
  const { datos: servicios, cargando, error, recargar } = useConsulta(
    () => obtenerTodosServicios(),
    ['services'],
  );

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<Servicio | null>(null);
  const [form, setForm] = useState<ServicioForm>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [alternando, setAlternando] = useState(false);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEditar = (servicio: Servicio) => {
    setEditando(servicio);
    setForm({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion ?? '',
      precio: String(servicio.precio),
      duracion: String(servicio.duracion),
      activo: servicio.activo,
      requiere_prepago: servicio.requiere_prepago,
    });
    setErrorForm(null);
    setModalAbierto(true);
  };

  const guardar = async () => {
    const precio = Number(form.precio);
    const duracion = Number(form.duracion);
    if (!form.nombre.trim()) {
      setErrorForm('Escribe el nombre del servicio');
      return;
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      setErrorForm('Precio inválido');
      return;
    }
    if (!Number.isInteger(duracion) || duracion <= 0) {
      setErrorForm('Duración en minutos inválida');
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      await guardarServicio({
        id: editando?.id,
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        precio,
        duracion,
        activo: form.activo,
        requiere_prepago: form.requiere_prepago,
        imagen: editando?.imagen ?? null,
      });
      setModalAbierto(false);
      await recargar();
    } catch (e) {
      setErrorForm(e instanceof Error ? e.message : 'No se pudo guardar el servicio');
    } finally {
      setGuardando(false);
    }
  };

  const alternar = async (servicio: Servicio, activo: boolean) => {
    setAlternando(true);
    try {
      await alternarServicio(servicio.id, activo);
      await recargar();
    } catch (e) {
      Alert.alert('No se pudo actualizar', e instanceof Error ? e.message : 'Intenta de nuevo');
    } finally {
      setAlternando(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title="Servicios" subtitle="Catálogo y precios" onBack={() => router.back()} />} scroll>
      <View style={styles.contenido}>
        <Button title="Nuevo servicio" icon="plus" onPress={abrirNuevo} />

        {error ? (
          <Card>
            <AppText variant="small" color={colors.danger}>
              {error}
            </AppText>
          </Card>
        ) : cargando && !servicios ? (
          <Loader label="Cargando servicios…" />
        ) : (servicios ?? []).length === 0 ? (
          <EmptyState
            icon="scissors-cutting"
            title="Sin servicios"
            message="Agrega tu primer servicio para que los clientes puedan reservar."
          />
        ) : (
          <View style={styles.lista}>
            {(servicios ?? []).map((servicio) => (
              <Pressable key={servicio.id} onPress={() => abrirEditar(servicio)}>
                {({ pressed }) => (
                  <Card style={[styles.servicio, pressed && styles.pulsado]}>
                    <View style={styles.servicioInfo}>
                      <AppText variant="subtitle">{servicio.nombre}</AppText>
                      {servicio.descripcion ? (
                        <AppText variant="caption" numberOfLines={2}>
                          {servicio.descripcion}
                        </AppText>
                      ) : null}
                      <View style={styles.servicioDetalles}>
                        <AppText variant="small" color={colors.accent}>
                          {formatearMoneda(servicio.precio)}
                        </AppText>
                        <AppText variant="caption">{servicio.duracion} min</AppText>
                        {servicio.requiere_prepago ? (
                          <AppText variant="caption" color={colors.warning}>
                            Requiere prepago
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.activoCol}>
                      <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.textMuted} />
                      <Switch
                        value={servicio.activo}
                        disabled={alternando}
                        onValueChange={(v) => void alternar(servicio, v)}
                        trackColor={{ false: colors.border, true: colors.accent }}
                        thumbColor={servicio.activo ? colors.white : colors.textMuted}
                        ios_backgroundColor={colors.border}
                      />
                    </View>
                  </Card>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Modal visible={modalAbierto} transparent animationType="fade" onRequestClose={() => setModalAbierto(false)}>
        <Pressable style={styles.fondo} onPress={() => setModalAbierto(false)}>
          <Pressable style={styles.contenedor} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modaIconoCaja}>
                <MaterialCommunityIcons name="scissors-cutting" size={26} color={colors.accent} />
              </View>
              <AppText variant="subtitle" center>
                {editando ? 'Editar servicio' : 'Nuevo servicio'}
              </AppText>

              <TextField
                label="Nombre"
                value={form.nombre}
                onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))}
                placeholder="Corte de cabello"
              />
              <TextField
                label="Descripción"
                value={form.descripcion}
                onChangeText={(v) => setForm((f) => ({ ...f, descripcion: v }))}
                placeholder="Opcional"
                multiline
                numberOfLines={2}
              />
              <TextField
                label="Precio (MXN)"
                value={form.precio}
                onChangeText={(v) => setForm((f) => ({ ...f, precio: v.replace(/[^0-9.]/g, '') }))}
                keyboardType="decimal-pad"
                placeholder="150"
              />
              <TextField
                label="Duración (minutos)"
                value={form.duracion}
                onChangeText={(v) => setForm((f) => ({ ...f, duracion: v.replace(/[^0-9]/g, '') }))}
                keyboardType="number-pad"
                placeholder="45"
              />

              <FilaSwitch
                icon="toggle-switch-outline"
                etiqueta="Activo"
                valor={form.activo}
                onValueChange={(v) => setForm((f) => ({ ...f, activo: v }))}
              />
              <FilaSwitch
                icon="credit-card-outline"
                etiqueta="Requiere prepago"
                valor={form.requiere_prepago}
                onValueChange={(v) => setForm((f) => ({ ...f, requiere_prepago: v }))}
              />

              {errorForm ? (
                <AppText variant="small" color={colors.danger}>
                  {errorForm}
                </AppText>
              ) : null}

              <View style={styles.botones}>
                <Button title={editando ? 'Guardar cambios' : 'Crear servicio'} icon="content-save" loading={guardando} onPress={() => void guardar()} />
                <Button title="Cancelar" variant="ghost" onPress={() => setModalAbierto(false)} />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function FilaSwitch({
  icon,
  etiqueta,
  valor,
  onValueChange,
}: {
  icon: 'toggle-switch-outline' | 'credit-card-outline';
  etiqueta: string;
  valor: boolean;
  onValueChange: (valor: boolean) => void;
}) {
  return (
    <View style={styles.filaSwitch}>
      <View style={styles.filaSwitchTexto}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.textSecondary} />
        <AppText variant="small">{etiqueta}</AppText>
      </View>
      <Switch
        value={valor}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={valor ? colors.white : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </View>
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
  servicio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pulsado: {
    opacity: 0.8,
  },
  servicioInfo: {
    flex: 1,
    gap: 4,
  },
  servicioDetalles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activoCol: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  fondo: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  contenedor: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '85%',
  },
  modaIconoCaja: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botones: {
    gap: spacing.sm,
    marginTop: spacing.md,
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