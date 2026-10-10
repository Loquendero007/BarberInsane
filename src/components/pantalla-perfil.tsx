import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Avatar, Button, Card, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { actualizarPerfil, guardarFotoPerfil } from '@/lib/api';
import { validarNombre, validarTelefono, soloDigitos } from '@/lib/validation';
import { colors, spacing } from '@/theme';

const ETIQUETA_ROL: Record<string, string> = {
  client: 'Cliente',
  barber: 'Barbero',
  admin: 'Administrador',
};

export function PantallaPerfil() {
  const { profile, refreshProfile, signOut } = useAuth();

  const [nombre, setNombre] = useState(profile?.nombre ?? '');
  const [telefono, setTelefono] = useState(profile?.telefono ?? '');
  const [foto, setFoto] = useState(profile?.foto ?? null);
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorTelefono, setErrorTelefono] = useState<string | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [salir, setSalir] = useState(false);

  const cambiarFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para actualizar tu avatar.');
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (resultado.canceled || !resultado.assets[0]) return;

    setSubiendoFoto(true);
    setErrorServidor(null);
    try {
      const url = await guardarFotoPerfil(resultado.assets[0].uri);
      setFoto(url);
      await refreshProfile();
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo subir la foto');
    } finally {
      setSubiendoFoto(false);
    }
  };

  const guardar = async () => {
    const eNombre = validarNombre(nombre);
    const digitos = soloDigitos(telefono);
    const eTelefono = telefono.trim() ? validarTelefono(telefono) : null;
    setErrorNombre(eNombre);
    setErrorTelefono(eTelefono);
    if (eNombre || eTelefono) return;

    setGuardando(true);
    setErrorServidor(null);
    try {
      await actualizarPerfil({ nombre: nombre.trim(), telefono: digitos || null });
      await refreshProfile();
      Alert.alert('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = () => {
    Alert.alert('Cerrar sesión', '¿Quieres salir de BarberInsane?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          setSalir(true);
          try {
            await signOut();
            router.replace('/welcome');
          } finally {
            setSalir(false);
          }
        },
      },
    ]);
  };

  return (
    <Screen header={<ScreenHeader title="Mi perfil" onBack={() => router.back()} />} scroll>
      <View style={styles.contenido}>
        <View style={styles.avatarCaja}>
          <Avatar uri={foto} name={nombre || profile?.nombre} size={110} />
          <Button
            title={foto ? 'Cambiar foto' : 'Agregar foto'}
            icon="camera"
            variant="secondary"
            size="md"
            loading={subiendoFoto}
            onPress={() => void cambiarFoto()}
          />
          <View style={styles.rolFila}>
            <MaterialCommunityIcons name="badge-account-outline" size={16} color={colors.gold} />
            <AppText variant="caption">{ETIQUETA_ROL[profile?.rol ?? 'client']}</AppText>
          </View>
        </View>

        <Card style={styles.formulario}>
          <TextField
            label="Nombre"
            value={nombre}
            onChangeText={(v) => {
              setNombre(v);
              if (errorNombre) setErrorNombre(null);
            }}
            error={errorNombre}
            autoCapitalize="words"
            placeholder="Tu nombre"
          />
          <TextField
            label="Correo electrónico"
            value={profile?.email ?? ''}
            editable={false}
            placeholder="tu@correo.com"
          />
          <TextField
            label="Teléfono"
            value={telefono}
            onChangeText={(v) => {
              setTelefono(soloDigitos(v));
              if (errorTelefono) setErrorTelefono(null);
            }}
            keyboardType="phone-pad"
            error={errorTelefono}
            placeholder="10 dígitos"
          />

          {errorServidor ? (
            <AppText variant="small" color={colors.danger}>
              {errorServidor}
            </AppText>
          ) : null}

          <Button
            title="Guardar cambios"
            icon="content-save"
            loading={guardando}
            onPress={() => void guardar()}
          />
        </Card>

        <Button title="Cerrar sesión" variant="danger" icon="logout" loading={salir} onPress={cerrarSesion} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  avatarCaja: {
    alignItems: 'center',
    gap: spacing.md,
  },
  rolFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  formulario: {
    gap: spacing.md,
  },
});