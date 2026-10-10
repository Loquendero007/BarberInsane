import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, Card, Loader, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import {
  enviarAviso,
  guardarConfigTienda,
  obtenerConfigTienda,
  obtenerUsuarios,
} from '@/lib/api';
import { ConfigTienda, UsuarioAdmin } from '@/lib/tipos';
import { colors, radius, spacing } from '@/theme';

export default function AdminAvisosScreen() {
  const { datos: config, cargando } = useConsulta<ConfigTienda | null>(
    () => obtenerConfigTienda(),
    [],
  );
  const { datos: usuarios, cargando: cargandoUsuarios, recargar: recargarUsuarios } = useConsulta<UsuarioAdmin[]>(
    () => obtenerUsuarios(),
    [],
  );

  const [avisoTitulo, setAvisoTitulo] = useState('');
  const [avisoMensaje, setAvisoMensaje] = useState('');
  const [aTodos, setATodos] = useState(true);
  const [usuarioDestino, setUsuarioDestino] = useState<UsuarioAdmin | null>(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorAviso, setErrorAviso] = useState<string | null>(null);

  const enviar = async () => {
    if (!avisoTitulo.trim() || !avisoMensaje.trim()) {
      setErrorAviso('El título y el mensaje son obligatorios');
      return;
    }
    if (!aTodos && !usuarioDestino) {
      setErrorAviso('Selecciona un destinatario o envía a todos');
      return;
    }

    setEnviando(true);
    setErrorAviso(null);
    try {
      const total = await enviarAviso(
        avisoTitulo.trim(),
        avisoMensaje.trim(),
        aTodos ? undefined : usuarioDestino?.id,
      );
      setAvisoTitulo('');
      setAvisoMensaje('');
      Alert.alert('Aviso enviado', `Se notificó a ${total} ${total === 1 ? 'usuario' : 'usuarios'}.`);
    } catch (e) {
      setErrorAviso(e instanceof Error ? e.message : 'No se pudo enviar el aviso');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title="Avisos y configuración" onBack={() => router.back()} />} scroll>
      <View style={styles.contenido}>
        <Card style={styles.seccion}>
          <View style={styles.tituloFila}>
            <MaterialCommunityIcons name="bullhorn-outline" size={20} color={colors.accent} />
            <AppText variant="subtitle" style={styles.tituloFlex}>
              Enviar aviso
            </AppText>
          </View>

          <View style={styles.filaSwitch}>
            <View style={styles.filaSwitchTexto}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color={colors.textSecondary} />
              <AppText variant="small">Enviar a todos los usuarios</AppText>
            </View>
            <Switch
              value={aTodos}
              onValueChange={setATodos}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={aTodos ? colors.white : colors.textMuted}
              ios_backgroundColor={colors.border}
            />
          </View>

          {!aTodos ? (
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.selector, pressed && styles.pulsado]}
              onPress={() => {
                void recargarUsuarios();
                setSelectorAbierto(true);
              }}
            >
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.textSecondary} />
              <AppText variant="small">
                {usuarioDestino ? usuarioDestino.nombre : 'Elegir destinatario…'}
              </AppText>
              <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <TextField
            label="Título"
            value={avisoTitulo}
            onChangeText={setAvisoTitulo}
            placeholder="Promoción de la semana"
          />
          <TextField
            label="Mensaje"
            value={avisoMensaje}
            onChangeText={setAvisoMensaje}
            placeholder="20% de descuento en cortes…"
            multiline
            numberOfLines={3}
          />

          {errorAviso ? (
            <AppText variant="small" color={colors.danger}>
              {errorAviso}
            </AppText>
          ) : null}

          <Button title="Enviar aviso" icon="send" loading={enviando} onPress={() => void enviar()} />
        </Card>

        {cargando && !config ? (
          <Loader label="Cargando configuración…" />
        ) : config ? (
          <FormularioConfiguracion config={config} />
        ) : null}
      </View>

      <Modal visible={selectorAbierto} transparent animationType="fade" onRequestClose={() => setSelectorAbierto(false)}>
        <Pressable style={styles.fondo} onPress={() => setSelectorAbierto(false)}>
          <Pressable style={styles.contenedor} onPress={(e) => e.stopPropagation()}>
            <AppText variant="subtitle" center>
              Destinatario
            </AppText>
            {cargandoUsuarios && !usuarios ? (
              <Loader label="Cargando usuarios…" />
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.usuarios}>
                  {(usuarios ?? []).map((usuario) => (
                    <Pressable
                      key={usuario.id}
                      style={({ pressed }) => [
                        styles.usuarioFila,
                        usuarioDestino?.id === usuario.id && styles.usuarioSeleccionado,
                        pressed && styles.pulsado,
                      ]}
                      onPress={() => {
                        setUsuarioDestino(usuario);
                        setSelectorAbierto(false);
                      }}
                    >
                      <View style={styles.usuarioTexto}>
                        <AppText variant="body" numberOfLines={1}>
                          {usuario.nombre}
                        </AppText>
                        <AppText variant="caption" numberOfLines={1}>
                          {usuario.email}
                        </AppText>
                      </View>
                      {usuarioDestino?.id === usuario.id ? (
                        <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            )}
            <Button title="Cancelar" variant="ghost" onPress={() => setSelectorAbierto(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function FormularioConfiguracion({ config }: { config: ConfigTienda }) {
  const [form, setForm] = useState({
    nombre: config.nombre,
    direccion: config.direccion ?? '',
    radio_llegada: String(config.radio_llegada_m),
    politica_cancelacion: String(config.politica_cancelacion_horas),
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    const radio = Number(form.radio_llegada);
    const politica = Number(form.politica_cancelacion);
    if (!form.nombre.trim()) {
      setError('Escribe el nombre de la barbería');
      return;
    }
    if (!Number.isFinite(radio) || radio <= 0) {
      setError('Radio de llegada inválido');
      return;
    }
    if (!Number.isFinite(politica) || politica < 0) {
      setError('Política de cancelación inválida');
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await guardarConfigTienda({
        nombre: form.nombre.trim(),
        direccion: form.direccion.trim() || null,
        radio_llegada_m: Math.round(radio),
        politica_cancelacion_horas: Math.round(politica),
      });
      Alert.alert('Configuración guardada', 'Los cambios ya están activos para todos.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la configuración');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card style={styles.seccion}>
      <View style={styles.tituloFila}>
        <MaterialCommunityIcons name="store-settings-outline" size={20} color={colors.gold} />
        <AppText variant="subtitle" style={styles.tituloFlex}>
          Configuración de la barbería
        </AppText>
      </View>

      <TextField
        label="Nombre"
        value={form.nombre}
        onChangeText={(v) => setForm((f) => ({ ...f, nombre: v }))}
        placeholder="BarberInsane"
      />
      <TextField
        label="Dirección"
        value={form.direccion}
        onChangeText={(v) => setForm((f) => ({ ...f, direccion: v }))}
        placeholder="Av. Principal 123"
      />
      <View style={styles.filaDimensiones}>
        <TextField
          label="Radio de llegada (m)"
          value={form.radio_llegada}
          onChangeText={(v) => setForm((f) => ({ ...f, radio_llegada: v.replace(/[^0-9]/g, '') }))}
          keyboardType="number-pad"
          placeholder="200"
          style={styles.campoDimension}
        />
        <TextField
          label="Cancelación (horas)"
          value={form.politica_cancelacion}
          onChangeText={(v) => setForm((f) => ({ ...f, politica_cancelacion: v.replace(/[^0-9]/g, '') }))}
          keyboardType="number-pad"
          placeholder="2"
          style={styles.campoDimension}
        />
      </View>

      {error ? (
        <AppText variant="small" color={colors.danger}>
          {error}
        </AppText>
      ) : null}

      <Button title="Guardar configuración" icon="content-save" variant="secondary" loading={guardando} onPress={() => void guardar()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
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
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  pulsado: {
    opacity: 0.7,
  },
  filaDimensiones: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  campoDimension: {
    flex: 1,
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
    gap: spacing.md,
    maxHeight: '80%',
  },
  usuarios: {
    gap: spacing.sm,
  },
  usuarioFila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  usuarioSeleccionado: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  usuarioTexto: {
    flex: 1,
    gap: 2,
  },
});