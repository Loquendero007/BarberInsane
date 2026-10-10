import { Session } from '@supabase/supabase-js';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import { mensajeErrorAuth } from '@/lib/validation';

export type UserRole = 'client' | 'barber' | 'admin';

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  foto: string | null;
  rol: UserRole;
  estado: string;
  created_at: string;
}

export interface BarberProfile {
  id: string;
  user_id: string;
  nombre: string;
  especialidad: string | null;
  experiencia: number | null;
  descripcion: string | null;
  aprobado: boolean;
  disponible: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  nombre: string;
  telefono: string;
  rol: UserRole;
  especialidad?: string;
  experiencia?: number;
  descripcion?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  barber: BarberProfile | null;
  loading: boolean;
  signingIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: SignUpData) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extraerErrorAuth(error: { code?: string | null; message: string }): string {
  return mensajeErrorAuth(error.code ?? undefined, error.message);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [barber, setBarber] = useState<BarberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  const cargarPerfil = useCallback(async (userId: string) => {
    const [{ data: userData, error: userError }, { data: barberData, error: barberError }] =
      await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase
          .from('barbers')
          .select('id, user_id, nombre, especialidad, experiencia, descripcion, aprobado, disponible')
          .eq('user_id', userId)
          .maybeSingle(),
      ]);

    if (userError) {
      throw new Error(extraerErrorAuth(userError));
    }

    setProfile((userData as Profile) ?? null);
    setBarber(barberError ? null : ((barberData as BarberProfile) ?? null));
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      await cargarPerfil(data.session.user.id);
    }
  }, [cargarPerfil]);

  useEffect(() => {
    let cancelado = false;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (cancelado) return;
        setSession(data.session);
        if (data.session?.user) {
          try {
            await cargarPerfil(data.session.user.id);
          } catch {
            if (!cancelado) {
              setProfile(null);
              await supabase.auth.signOut();
            }
          }
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(async (evento, nuevaSesion) => {
      if (cancelado) return;
      setSession(nuevaSesion);
      if (nuevaSesion?.user) {
        try {
          await cargarPerfil(nuevaSesion.user.id);
        } catch {
          if (!cancelado) {
            setProfile(null);
            await supabase.auth.signOut();
          }
        }
      } else {
        setProfile(null);
        setBarber(null);
      }
      if (evento === 'SIGNED_OUT') {
        setLoading(false);
      }
    });

    return () => {
      cancelado = true;
      sub.subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  const signIn = useCallback(async (email: string, password: string) => {
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(extraerErrorAuth(error));
    } finally {
      setSigningIn(false);
    }
  }, []);

  const signUp = useCallback(
    async (data: SignUpData): Promise<{ needsConfirmation: boolean }> => {
      const metadata: Record<string, string | number> = {
        nombre: data.nombre.trim(),
        telefono: data.telefono.trim(),
        rol: data.rol,
      };
      if (data.rol === 'barber') {
        metadata.especialidad = data.especialidad?.trim() ?? '';
        metadata.experiencia = data.experiencia ?? 0;
        metadata.descripcion = data.descripcion?.trim() ?? '';
      }

      const { data: resultado, error } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: { data: metadata },
      });
      if (error) throw new Error(extraerErrorAuth(error));

      return { needsConfirmation: !resultado.session };
    },
    [],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setBarber(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      barber,
      loading,
      signingIn,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, barber, loading, signingIn, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
