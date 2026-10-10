import { useCallback, useEffect, useState } from 'react';

import { useConsulta } from '@/hooks/consulta';
import {
  contarNotificacionesNoLeidas,
  marcarNotificacionesLeidas,
  obtenerNotificaciones,
  suscribirse,
} from '@/lib/api';
import { Notificacion } from '@/lib/tipos';

export function useNotificaciones(): {
  lista: Notificacion[];
  cargando: boolean;
  error: string | null;
  noLeidas: number;
  recargar: () => Promise<void>;
  marcarLeidas: () => Promise<void>;
} {
  const { datos, cargando, error, recargar } = useConsulta(
    () => obtenerNotificaciones(),
    ['notifications'],
  );

  const marcarLeidas = useCallback(async () => {
    await marcarNotificacionesLeidas();
    await recargar();
  }, [recargar]);

  const lista = datos ?? [];
  const noLeidas = lista.filter((notificacion) => !notificacion.leida).length;

  return { lista, cargando, error, noLeidas, recargar, marcarLeidas };
}

/** Contador de notificaciones sin leer para los encabezados de las homes. */
export function useNoLeidas(): { noLeidas: number; recargar: () => Promise<void> } {
  const [noLeidas, setNoLeidas] = useState(0);

  const recargar = useCallback(async () => {
    try {
      setNoLeidas(await contarNotificacionesNoLeidas());
    } catch {
      // sin conexión: se conserva el último conteo
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recuento inicial asíncrono
    void recargar();
    return suscribirse(['notifications'], () => {
      void recargar();
    });
  }, [recargar]);

  return { noLeidas, recargar };
}
