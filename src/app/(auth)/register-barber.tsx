import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing } from '@/theme';
import {
  mensajeErrorAuth,
  soloDigitos,
  validarEmail,
  validarNombre,
  validarPasswordConfirmacion,
  validarTelefono,
} from '@/lib/validation';

export default function RegisterBarberScreen() {
  const { signUp } = useAuth();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [experiencia, setExperiencia] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmacionEnviada, setConfirmacionEnviada] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const registrar = async () => {
    setErrorServidor(null);
    const nuevosErrores: Record<string, string | null> = {
      nombre: validarNombre(nombre),
      telefono: validarTelefono(telefono),
      email: validarEmail(email),
      password: validarPasswordConfirmacion(password, confirmacion),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    const anios = experiencia.trim() ? Number(experiencia) : 0;
    if (!Number.isInteger(anios) || anios < 0 || anios > 50) {
      setErrores({ experiencia: 'De 0 a 50 años' });
      return;
    }

    setEnviando(true);
    try {
      const { needsConfirmation } = await signUp({
        email,
        password,
        nombre,
        telefono: soloDigitos(telefono),
        rol: 'barber',
        especialidad: especialidad.trim(),
        experiencia: anios,
        descripcion: descripcion.trim(),
      });
      if (needsConfirmation) setConfirmacionEnviada(true);
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  const reenviarCorreo = async () => {
    setReenviando(true);
    setErrorServidor(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
      });
      if (error) {
        setErrorServidor(mensajeErrorAuth(error.code, error.message));
      }
    } catch {
      setErrorServidor('No se pudo reenviar el correo');
    } finally {
      setReenviando(false);
    }
  };

  if (confirmacionEnviada) {
    return (
      <Screen header={<ScreenHeader title="Solicitud de barbero" onBack={() => router.back()} />}>
        <View style={styles.exito}>
          <AppText variant="heading" center>
            Revisa tu correo
          </AppText>
          <AppText variant="small" center>
            Confirma tu cuenta en{'\n'}
            <AppText variant="small" color={colors.text}>
              {email}
            </AppText>
            {'\n\n'}Al iniciar sesión verás el estado de tu solicitud de barbero.
          </AppText>
          <Button title="Ya confirmé, iniciar sesión" onPress={() => router.replace('/login')} />
          <Button
            title="Reenviar correo"
            variant="ghost"
            loading={reenviando}
            onPress={reenviarCorreo}
          />
          {errorServidor ? (
            <AppText variant="small" color={colors.danger} center>
              {errorServidor}
            </AppText>
          ) : null}
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={<ScreenHeader title="Solicitud de barbero" onBack={() => router.back()} />}
      scroll
    >
      <View style={styles.form}>
        <AppText variant="small">
          Tu cuenta quedará pendiente de aprobación por el administrador.
        </AppText>

        <TextField
          label="Nombre completo"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Carlos Ramírez"
          autoCapitalize="words"
          error={errores.nombre}
        />
        <TextField
          label="Teléfono"
          value={telefono}
          onChangeText={(v) => setTelefono(soloDigitos(v))}
          keyboardType="phone-pad"
          placeholder="5512345678"
          maxLength={10}
          error={errores.telefono}
        />
        <TextField
          label="Correo electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={errores.email}
        />
        <TextField
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={errores.password}
        />
        <TextField
          label="Confirmar contraseña"
          value={confirmacion}
          onChangeText={setConfirmacion}
          secureTextEntry
          placeholder="Repite tu contraseña"
          error={confirmacion ? errores.password : null}
        />
        <TextField
          label="Especialidad"
          value={especialidad}
          onChangeText={setEspecialidad}
          placeholder="Fade, barba clásica, diseño…"
          error={errores.especialidad}
        />
        <TextField
          label="Años de experiencia"
          value={experiencia}
          onChangeText={(v) => setExperiencia(v.replace(/\D/g, '').slice(0, 2))}
          keyboardType="number-pad"
          placeholder="5"
          error={errores.experiencia}
        />
        <TextField
          label="Descripción (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Cuéntale a los clientes tu estilo"
          multiline
          numberOfLines={3}
          style={styles.textarea}
          error={errores.descripcion}
        />

        {errorServidor ? (
          <AppText variant="small" color={colors.danger}>
            {errorServidor}
          </AppText>
        ) : null}

        <Button title="Enviar solicitud" icon="send" loading={enviando} onPress={registrar} />
        <Button title="Ya tengo cuenta" variant="ghost" onPress={() => router.replace('/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  textarea: {
    minHeight: 96,
    alignItems: 'flex-start',
  },
  exito: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
});
