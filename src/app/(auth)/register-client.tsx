import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { colors, spacing } from '@/theme';
import {
  mensajeErrorAuth,
  soloDigitos,
  validarEmail,
  validarNombre,
  validarPasswordConfirmacion,
  validarTelefono,
} from '@/lib/validation';
import { supabase } from '@/lib/supabase';

export default function RegisterClientScreen() {
  const { signUp } = useAuth();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<Record<string, string | null>>({});
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmacionEnviada, setConfirmacionEnviada] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const registrar = async () => {
    setErrorServidor(null);
    const nuevosErrores = {
      nombre: validarNombre(nombre),
      telefono: validarTelefono(telefono),
      email: validarEmail(email),
      password: validarPasswordConfirmacion(password, confirmacion),
    };
    setErrores(nuevosErrores);
    if (Object.values(nuevosErrores).some(Boolean)) return;

    setEnviando(true);
    try {
      const { needsConfirmation } = await signUp({
        email,
        password,
        nombre,
        telefono: soloDigitos(telefono),
        rol: 'client',
      });
      if (needsConfirmation) setConfirmacionEnviada(true);
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo crear la cuenta');
    } finally {
      setEnviando(false);
    }
  };

  const reenviarCorreo = async () => {
    setReenviando(true);
    setErrorServidor(null);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
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
      <Screen header={<ScreenHeader title="Crear cuenta" onBack={() => router.back()} />}>
        <View style={styles.exito}>
          <AppText variant="heading" center>
            Revisa tu correo
          </AppText>
          <AppText variant="small" center>
            Te enviamos un enlace de confirmación a{'\n'}
            <AppText variant="small" color={colors.text}>
              {email}
            </AppText>
            {'\n\n'}Una vez confirmado, inicia sesión para continuar.
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
    <Screen header={<ScreenHeader title="Crear cuenta de cliente" onBack={() => router.back()} />} scroll>
      <View style={styles.form}>
        <TextField
          label="Nombre completo"
          value={nombre}
          onChangeText={(v) => setNombre(v)}
          placeholder="Juan Pérez"
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
          onChangeText={(v) => setEmail(v)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={errores.email}
        />
        <TextField
          label="Contraseña"
          value={password}
          onChangeText={(v) => setPassword(v)}
          secureTextEntry
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          error={errores.password}
        />
        <TextField
          label="Confirmar contraseña"
          value={confirmacion}
          onChangeText={(v) => setConfirmacion(v)}
          secureTextEntry
          placeholder="Repite tu contraseña"
          error={confirmacion ? errores.password : null}
        />

        {errorServidor ? (
          <AppText variant="small" color={colors.danger}>
            {errorServidor}
          </AppText>
        ) : null}

        <Button title="Crear cuenta" icon="account-plus" loading={enviando} onPress={registrar} />
        <Button
          title="Ya tengo cuenta"
          variant="ghost"
          onPress={() => router.replace('/login')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  exito: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
});
