import { useCallback, useEffect, useRef, useState } from 'react';

import { suscribirse } from '@/lib/api';

interface Consulta<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => Promise<void>;
}

export function useConsulta<T>(obtener: () => Promise<T>, tablas: string[] = []): Consulta<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const obtenerRef = useRef(obtener);

  useEffect(() => {
    obtenerRef.current = obtener;
  }, [obtener]);

  const recargar = useCallback(async () => {
    try {
      setError(null);
      const resultado = await obtenerRef.current();
      setDatos(resultado);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial asíncrona de datos
    void recargar();
  }, [recargar]);

  const llaves = tablas.join(',');

  useEffect(() => {
    if (!llaves) return;
    const tablasRealtime = llaves.split(',').filter(Boolean);
    if (!tablasRealtime.length) return;
    return suscribirse(tablasRealtime, () => {
      void recargar();
    });
  }, [llaves, recargar]);

  return { datos, cargando, error, recargar };
}
