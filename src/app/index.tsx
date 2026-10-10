import { Redirect } from 'expo-router';

import { Loader } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import { rutaHomeSegunRol } from '@/lib/routes';

export default function Index() {
  const { loading, session, profile, barber } = useAuth();

  if (loading || (session && !profile)) {
    return <Loader label="Cargando…" />;
  }

  if (!session || !profile) {
    return <Redirect href="/welcome" />;
  }

  return <Redirect href={rutaHomeSegunRol(profile.rol, barber?.aprobado ?? false)} />;
}
