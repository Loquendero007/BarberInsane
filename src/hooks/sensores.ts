import { Accelerometer, Gyroscope, Pedometer } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';

interface SuscripcionSensor {
  remove: () => void;
}

/** Pasos del día de hoy (podómetro del dispositivo). */
export function usePasosHoy(): { pasos: number; disponible: boolean } {
  const [pasos, setPasos] = useState(0);
  const [disponible, setDisponible] = useState(false);

  useEffect(() => {
    let vivo = true;
    let suscripcion: SuscripcionSensor | null = null;
    let base = 0;

    (async () => {
      try {
        const hayPedometer = await Pedometer.isAvailableAsync();
        if (!vivo) return;
        setDisponible(hayPedometer);
        if (!hayPedometer) return;

        await Pedometer.requestPermissionsAsync().catch(() => null);
        if (!vivo) return;

        const inicioDeHoy = new Date();
        inicioDeHoy.setHours(0, 0, 0, 0);
        try {
          const historico = await Pedometer.getStepCountAsync(inicioDeHoy, new Date());
          if (historico) base = historico.steps;
        } catch {
          // En Android getStepCountAsync no está disponible; se usan solo los pasos en vivo.
        }
        if (!vivo) return;

        setPasos(base);
        suscripcion = Pedometer.watchStepCount((resultado) => {
          if (vivo) setPasos(base + resultado.steps);
        });
      } catch {
        if (vivo) setDisponible(false);
      }
    })();

    return () => {
      vivo = false;
      suscripcion?.remove();
    };
  }, []);

  return { pasos, disponible };
}

/**
 * Detecta una sacudida del móvil (acelerómetro).
 * Dispara `onSacudir` como máximo una vez cada 2 segundos.
 */
export function useSacudida(onSacudir: () => void, activo = true): void {
  const callback = useRef(onSacudir);

  useEffect(() => {
    callback.current = onSacudir;
  }, [onSacudir]);

  useEffect(() => {
    if (!activo) return;

    let vivo = true;
    let suscripcion: SuscripcionSensor | null = null;
    let rachas = 0;
    let hasta = 0;

    (async () => {
      try {
        const hayAcelerometro = await Accelerometer.isAvailableAsync();
        if (!vivo || !hayAcelerometro) return;

        Accelerometer.setUpdateInterval(70);
        suscripcion = Accelerometer.addListener(({ x, y, z }) => {
          const ahora = Date.now();
          if (ahora < hasta) return;

          const magnitud = Math.sqrt(x * x + y * y + z * z);
          if (Math.abs(magnitud - 1) > 0.45) {
            rachas += 1;
            if (rachas >= 3) {
              rachas = 0;
              hasta = ahora + 2000;
              callback.current();
            }
          } else {
            rachas = 0;
          }
        });
      } catch {
        // Sensor no disponible; la app sigue funcionando sin sacudida.
      }
    })();

    return () => {
      vivo = false;
      suscripcion?.remove();
    };
  }, [activo]);
}

/**
 * Lee el giroscopio: devuelve la rotación acumulada (en radianes) del dispositivo
 * alrededor del eje Z, ideal para hacer girar elementos visuales.
 */
export function useRotacionZ(activo = true): { angulo: number; disponible: boolean } {
  const [angulo, setAngulo] = useState(0);
  const [disponible, setDisponible] = useState(false);
  const anguloRef = useRef(0);

  useEffect(() => {
    if (!activo) return;

    let vivo = true;
    let suscripcion: SuscripcionSensor | null = null;
    let ultimo = Date.now();
    let ultimoEstado = 0;

    (async () => {
      try {
        const hayGiroscopio = await Gyroscope.isAvailableAsync();
        if (!vivo) return;
        setDisponible(hayGiroscopio);
        if (!hayGiroscopio) return;

        Gyroscope.setUpdateInterval(50);
        suscripcion = Gyroscope.addListener(({ z }) => {
          const ahora = Date.now();
          const dt = Math.min((ahora - ultimo) / 1000, 0.25);
          ultimo = ahora;

          if (Math.abs(z) > 0.04) {
            anguloRef.current += z * dt;
            if (anguloRef.current > Math.PI) anguloRef.current -= 2 * Math.PI;
            if (anguloRef.current < -Math.PI) anguloRef.current += 2 * Math.PI;
            if (vivo && ahora - ultimoEstado > 300) {
              ultimoEstado = ahora;
              setAngulo(anguloRef.current);
            }
          }
        });
      } catch {
        if (vivo) setDisponible(false);
      }
    })();

    return () => {
      vivo = false;
      suscripcion?.remove();
    };
  }, [activo]);

  return { angulo, disponible };
}
