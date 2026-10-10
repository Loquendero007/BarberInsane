import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { AppText, Button, Screen, ScreenHeader, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import {
  borrarCredencialesBiometricas,
  biometriaHabilitada,
  guardarCredencialesBiometricas,
  leerCredencialesBiometricas,
} from '@/lib/biometrics';
import { colors, spacing } from '@/theme';
import { validarEmail, validarPassword } from '@/lib/validation';

export default function LoginScreen() {
  const { signIn, signingIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [errorPassword, setErrorPassword] = useState<string | null>(null);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [recordarBiometria, setRecordarBiometria] = useState(false);
  const [bioDisponible, setBioDisponible] = useState(false);
  const [bioCargando, setBioCargando] = useState(false);

  useEffect(() => {
    biometriaHabilitada().then((disponible) => {
      setBioDisponible(disponible);
      setRecordarBiometria(disponible);
    });
  }, []);

  const intentarLogin = async (
    emailIngresado: string,
    passwordIngresado: string,
    opciones?: { guardarBiometria?: boolean },
  ) => {
    setErrorServidor(null);
    const eEmail = validarEmail(emailIngresado);
    const ePassword = validarPassword(passwordIngresado);
    setErrorEmail(eEmail);
    setErrorPassword(ePassword);
    if (eEmail || ePassword) return;

    try {
      await signIn(emailIngresado, passwordIngresado);
      if (opciones?.guardarBiometria) {
        await guardarCredencialesBiometricas(emailIngresado, passwordIngresado);
      }
    } catch (e) {
      setErrorServidor(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    }
  };

  const entrarConBiometria = async () => {
    setBioCargando(true);
    setErrorServidor(null);
    const credenciales = await leerCredencialesBiometricas();
    setBioCargando(false);
    if (!credenciales) return;

    try {
      await signIn(credenciales.email, credenciales.password);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : 'No se pudo iniciar sesión';
      setErrorServidor(mensaje);
      if (mensaje.includes('incorrectos')) {
        await borrarCredencialesBiometricas();
        setBioDisponible(false);
      }
    }
  };

  return (
    <Screen header={<ScreenHeader title="Iniciar sesión" onBack={() => router.back()} />} scroll>
      <View style={styles.form}>
        <AppText variant="small">
          Entra con tu cuenta para reservar tu próximo corte.
        </AppText>

        <TextField
          label="Correo electrónico"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            if (errorEmail) setErrorEmail(null);
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          placeholder="tu@correo.com"
          error={errorEmail}
        />

        <TextField
          label="Contraseña"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errorPassword) setErrorPassword(null);
          }}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          error={errorPassword}
        />

        {errorServidor ? (
          <AppText variant="small" color={colors.danger} style={styles.errorServidor}>
            {errorServidor}
          </AppText>
        ) : null}

        <Button
          title="Entrar"
          icon="login"
          loading={signingIn}
          onPress={() => intentarLogin(email, password, { guardarBiometria: recordarBiometria })}
        />

        {bioDisponible ? (
          <Button
            title="Entrar con huella o rostro"
            icon="fingerprint"
            variant="secondary"
            loading={bioCargando}
            onPress={entrarConBiometria}
          />
        ) : null}

        <View style={styles.switchRow}>
          <AppText variant="small" style={styles.switchLabel}>
            Recordarme con huella o rostro
          </AppText>
          <Switch
            value={recordarBiometria}
            onValueChange={(valor) => {
              setRecordarBiometria(valor);
              if (!valor && bioDisponible) {
                borrarCredencialesBiometricas().then(() => setBioDisponible(false));
              }
            }}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>

        <Button
          title="Crear cuenta"
          variant="ghost"
          onPress={() => router.push('/register-role')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  errorServidor: {
    color: colors.danger,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    flex: 1,
  },
});
