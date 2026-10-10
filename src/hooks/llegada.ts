import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { marcarLlegada, obtenerConfigTienda } from '@/lib/api';
import { distanciaMetros, esHoy } from '@/lib/fechas';
import { Cita, ConfigTienda } from '@/lib/tipos';

export type PermisoUbicacion = 'desconocido' | 'concedido' | 'denegado';
export type EstadoLlegada = 'inactiva' | 'enviando' | 'hecha' | 'error';

interface Proximidad {
  config: ConfigTienda | null;
  posicion: Location.LocationObjectCoords | null;
  permiso: PermisoUbicacion;
  cargandoPermiso: boolean;
  distancia: number | null;
  dentro: boolean;
  solicitarPermiso: () => Promise<boolean>;
  obtenerPosicion: () => Promise<Location.LocationObjectCoords | null>;
}

export function useProximidadTienda(): Proximidad {
  const [config, setConfig] = useState<ConfigTienda | null>(null);
  const [posicion, setPosicion] = useState<Location.LocationObjectCoords | null>(null);
  const [permiso, setPermiso] = useState<PermisoUbicacion>('desconocido');
  const [cargandoPermiso, setCargandoPermiso] = useState(false);
  const suscripcionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    obtenerConfigTienda()
      .then(setConfig)
      .catch(() => null);

    return () => {
      suscripcionRef.current?.remove();
      suscripcionRef.current = null;
    };
  }, []);

  const vigilar = useCallback(async () => {
    if (suscripcionRef.current) return;
    suscripcionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 20000, distanceInterval: 50 },
      (ubicacion) => setPosicion(ubicacion.coords),
    ).catch(() => null);
  }, []);

  const obtenerPosicion = useCallback(async (): Promise<Location.LocationObjectCoords | null> => {
    try {
      const ubicacion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPosicion(ubicacion.coords);
      return ubicacion.coords;
    } catch {
      return null;
    }
  }, []);

  const solicitarPermiso = useCallback(async (): Promise<boolean> => {
    setCargandoPermiso(true);
    try {
      const respuesta = await Location.requestForegroundPermissionsAsync();
      const concedido = respuesta.granted;
      setPermiso(concedido ? 'concedido' : 'denegado');
      if (concedido) {
        await vigilar();
        await obtenerPosicion();
      }
      return concedido;
    } finally {
      setCargandoPermiso(false);
    }
  }, [vigilar, obtenerPosicion]);

  useEffect(() => {
    (async () => {
      try {
        const respuesta = await Location.getForegroundPermissionsAsync();
        if (respuesta.granted) {
          setPermiso('concedido');
          await vigilar();
          await obtenerPosicion();
        } else if (respuesta.status === 'denied') {
          setPermiso('denegado');
        }
      } catch {
        setPermiso('desconocido');
      }
    })();
  }, [vigilar, obtenerPosicion]);

  const distancia =
    config && config.latitude != null && config.longitude != null && posicion
      ? distanciaMetros(posicion.latitude, posicion.longitude, config.latitude, config.longitude)
      : null;

  const radio = config?.radio_llegada_m ?? 150;

  return {
    config,
    posicion,
    permiso,
    cargandoPermiso,
    distancia,
    dentro: distancia != null && distancia <= radio,
    solicitarPermiso,
    obtenerPosicion,
  };
}

/**
 * Vigila la ubicación del cliente y registra su llegada automáticamente
 * cuando está dentro del radio de la barbería el día de su cita confirmada.
 */
export function useLlegadaAutomatica(
  cita: Cita | null,
  alLlegar?: () => void,
): {
  proximidad: Proximidad;
  llegada: EstadoLlegada;
  mensaje: string | null;
  registrarManual: () => Promise<void>;
} {
  const proximidad = useProximidadTienda();
  const [llegada, setLlegada] = useState<EstadoLlegada>('inactiva');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const intentadaRef = useRef<number | null>(null);
  const alLlegarRef = useRef(alLlegar);

  useEffect(() => {
    alLlegarRef.current = alLlegar;
  }, [alLlegar]);

  const ejecutar = useCallback(
    async (latitude: number, longitude: number, citaId: number) => {
      setLlegada('enviando');
      setMensaje(null);
      try {
        await marcarLlegada(citaId, latitude, longitude);
        setLlegada('hecha');
        alLlegarRef.current?.();
      } catch (e) {
        setLlegada('error');
        setMensaje(e instanceof Error ? e.message : 'No se pudo registrar tu llegada');
      }
    },
    [],
  );

  useEffect(() => {
    if (!cita || cita.estado !== 'confirmada' || !esHoy(cita.fecha)) return;
    if (intentadaRef.current === cita.id) return;
    if (!proximidad.dentro || !proximidad.posicion) return;

    intentadaRef.current = cita.id;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- solo se dispara al entrar al radio de la tienda
    void ejecutar(proximidad.posicion.latitude, proximidad.posicion.longitude, cita.id);
  }, [cita, proximidad.dentro, proximidad.posicion, ejecutar]);

  const registrarManual = useCallback(async () => {
    if (!cita) return;
    const posicion = proximidad.posicion ?? (await proximidad.obtenerPosicion());
    if (!posicion) {
      setLlegada('error');
      setMensaje('No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.');
      return;
    }
    intentadaRef.current = cita.id;
    await ejecutar(posicion.latitude, posicion.longitude, cita.id);
  }, [cita, proximidad, ejecutar]);

  return { proximidad, llegada, mensaje, registrarManual };
}
