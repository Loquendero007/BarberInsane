import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Loader } from '@/components/ui';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { rutaHomeSegunRol } from '@/lib/routes';
import { colors } from '@/theme';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    primary: colors.accent,
    text: colors.text,
    border: colors.border,
  },
};

function NavegacionProtegida() {
  const { loading, session, profile, barber } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const enAuth = segments[0] === '(auth)';
  const enPending = segments[segments.length - 1] === 'pending';

  useEffect(() => {
    if (loading) return;

    if (!session) {
      if (!enAuth) router.replace('/welcome');
      return;
    }

    if (!profile) return;

    const home = rutaHomeSegunRol(profile.rol, barber?.aprobado ?? false);

    if (enAuth) {
      const esPendienteValido = profile.rol === 'barber' && !barber?.aprobado && enPending;
      if (!esPendienteValido) router.replace(home);
      return;
    }

    const grupo = segments[0];
    const esBarberoAprobado = profile.rol === 'barber' && (barber?.aprobado ?? false);
    const permitido =
      (profile.rol === 'admin' && grupo === 'admin') ||
      (profile.rol === 'barber' && grupo === 'barber' && esBarberoAprobado) ||
      (profile.rol === 'client' && grupo === 'client') ||
      (grupo === 'notifications' && (profile.rol === 'admin' || profile.rol === 'client' || esBarberoAprobado));

    if (!permitido) router.replace(home);
  }, [loading, session, profile, barber, segments, enAuth, enPending, router]);

  if (loading || (session && !profile)) {
    return <Loader label={loading ? 'Cargando…' : 'Cargando tu perfil…'} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style="light" />
        <NavegacionProtegida />
      </ThemeProvider>
    </AuthProvider>
  );
}
