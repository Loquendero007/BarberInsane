import { Gyroscope } from 'expo-sensors';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';

import { colors } from '@/theme';

interface PosteGiratorioProps {
  size?: number;
  style?: ViewStyle;
}

/**
 * Poste de barbero animado.
 * - Las rayas giran continuamente (animación nativa).
 * - Al girar el móvil, todo el poste rota con el giroscopio.
 */
export function PosteGiratorio({ size = 88, style }: PosteGiratorioProps) {
  const alto = Math.round(size * 1.6);
  const raya = Math.max(12, Math.round(size * 0.26));
  const [rotacionExterna] = useState(() => new Animated.Value(0));
  const [desplazamiento] = useState(() => new Animated.Value(0));

  const giro = useMemo(
    () =>
      rotacionExterna.interpolate({
        inputRange: [-Math.PI, Math.PI],
        outputRange: ['-180deg', '180deg'],
      }),
    [rotacionExterna],
  );

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.timing(desplazamiento, {
        toValue: raya * 2,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animacion.start();
    return () => animacion.stop();
  }, [desplazamiento, raya]);

  useEffect(() => {
    let suscripcion: { remove: () => void } | null = null;
    let ultimo = Date.now();
    let acumulado = 0;

    (async () => {
      try {
        const disponible = await Gyroscope.isAvailableAsync();
        if (!disponible) return;
        Gyroscope.setUpdateInterval(50);
        suscripcion = Gyroscope.addListener(({ z }) => {
          const ahora = Date.now();
          const dt = Math.min((ahora - ultimo) / 1000, 0.25);
          ultimo = ahora;
          if (Math.abs(z) > 0.04) {
            acumulado += z * dt;
            if (acumulado > Math.PI) acumulado -= 2 * Math.PI;
            if (acumulado < -Math.PI) acumulado += 2 * Math.PI;
            rotacionExterna.setValue(acumulado);
          }
        });
      } catch {
        // Sin giroscopio el poste solo muestra su animación base.
      }
    })();

    return () => {
      suscripcion?.remove();
    };
  }, [rotacionExterna]);

  const cantidadRayas = Math.ceil((alto + size * 2 + raya * 4) / raya) + 2;

  return (
    <Animated.View
      style={[{ transform: [{ rotate: giro }] }, style]}
      accessibilityLabel="Poste de barbero"
    >
      <View style={[styles.tubo, { width: size, height: alto, borderRadius: size / 2 }]}>
        <View
          style={{
            position: 'absolute',
            top: -size,
            left: -size,
            width: size * 3,
            height: alto + size * 2,
            overflow: 'hidden',
            transform: [{ rotate: '-32deg' }],
          }}
        >
          <Animated.View
            style={{
              width: '100%',
              marginTop: -raya * 2,
              transform: [{ translateY: desplazamiento }],
            }}
          >
            {Array.from({ length: cantidadRayas }).map((_, i) => (
              <View
                key={i}
                style={{
                  height: raya,
                  backgroundColor: i % 2 === 0 ? colors.accent : colors.white,
                }}
              />
            ))}
          </Animated.View>
        </View>
        <View style={[styles.borde, { borderRadius: size / 2 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tubo: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
  },
  borde: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.35)',
  },
});
