import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';

import { AppText, Avatar, Badge, Card, Chip, EmptyState, Loader, Screen, ScreenHeader } from '@/components/ui';
import { useConsulta } from '@/hooks/consulta';
import { aprobarBarbero, cambiarDisponibilidadBarbero, obtenerTodosBarberos } from '@/lib/api';
import { Barbero } from '@/lib/tipos';
import { colors, radius, spacing } from '@/theme';

type Filtro = 'todos' | 'pendientes';

export default function AdminBarberosScreen() {
  const { datos: barberos, cargando, error, recargar } = useConsulta(
    () => obtenerTodosBarberos(),
    ['barbers'],
  );
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [cambiando, setCambiando] = useState(false);

  const lista = (barberos ?? []).filter((b) => (filtro === 'pendientes' ? !b.aprobado : true));

  const cambiarAprobacion = async (barbero: Barbero, valor: boolean) => {
    setCambiando(true);
    try {
      await aprobarBarbero(barbero.id, valor);
      await recargar();
    } catch (e) {
      Alert.alert('No se pudo actualizar', e instanceof Error ? e.message : 'Intenta de nuevo');
    } finally {
      setCambiando(false);
    }
  };

  const cambiarDisponibilidad = async (barbero: Barbero, valor: boolean) => {
    setCambiando(true);
    try {
      await cambiarDisponibilidadBarbero(barbero.id, valor);
      await recargar();
    } catch (e) {
      Alert.alert('No se pudo actualizar', e instanceof Error ? e.message : 'Intenta de nuevo');
    } finally {
      setCambiando(false);
    }
  };

  return (
    <Screen header={<ScreenHeader title="Barberos" subtitle="Aprobación y disponibilidad" onBack={() => router.back()} />} scroll>
      <View style={styles.contenido}>
        <View style={styles.filtros}>
          <Chip label={`Todos (${(barberos ?? []).length})`} selected={filtro === 'todos'} onPress={() => setFiltro('todos')} />
          <Chip label={`Pendientes (${(barberos ?? []).filter((b) => !b.aprobado).length})`} selected={filtro === 'pendientes'} onPress={() => setFiltro('pendientes')} />
        </View>

        {error ? (
          <Card>
            <AppText variant="small" color={colors.danger}>
              {error}
            </AppText>
          </Card>
        ) : cargando && !barberos ? (
          <Loader label="Cargando barberos…" />
        ) : lista.length === 0 ? (
          <EmptyState
            icon="content-cut"
            title={filtro === 'pendientes' ? 'Sin solicitudes pendientes' : 'Aún no hay barberos'}
            message={filtro === 'pendientes' ? 'Los barberos registrados aparecerán aquí para aprobarlos.' : 'Crea barberos desde la app para empezar.'}
          />
        ) : (
          <View style={styles.lista}>
            {lista.map((barbero) => (
              <Card key={barbero.id} style={styles.barbero}>
                <View style={styles.top}>
                  <Avatar uri={barbero.foto} name={barbero.nombre} size={48} />
                  <View style={styles.info}>
                    <AppText variant="subtitle" numberOfLines={1}>
                      {barbero.nombre}
                    </AppText>
                    <AppText variant="small">
                      {barbero.especialidad?.trim() || 'Sin especialidad'}
                    </AppText>
                  </View>
                </View>

                <FilaEstado
                  icon="account-check-outline"
                  etiqueta="Aprobado"
                  valor={barbero.aprobado}
                  labelValor={barbero.aprobado ? 'Aprobado' : 'Pendiente'}
                  tone={barbero.aprobado ? 'success' : 'warning'}
                  disabled={cambiando}
                  onValueChange={(v) => void cambiarAprobacion(barbero, v)}
                />
                <FilaEstado
                  icon="crosshairs-gps"
                  etiqueta="Disponible"
                  valor={barbero.disponible}
                  labelValor={barbero.disponible ? 'Disponible' : 'Ocupado'}
                  tone={barbero.disponible ? 'success' : 'danger'}
                  disabled={cambiando}
                  onValueChange={(v) => void cambiarDisponibilidad(barbero, v)}
                />
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function FilaEstado({
  icon,
  etiqueta,
  valor,
  labelValor,
  tone,
  disabled,
  onValueChange,
}: {
  icon: 'account-check-outline' | 'crosshairs-gps';
  etiqueta: string;
  valor: boolean;
  labelValor: string;
  tone: 'success' | 'warning' | 'danger';
  disabled: boolean;
  onValueChange: (valor: boolean) => void;
}) {
  return (
    <View style={styles.filaEstado}>
      <View style={styles.filaTexto}>
        <MaterialCommunityIcons name={icon} size={18} color={colors.textSecondary} />
        <AppText variant="small">{etiqueta}</AppText>
        <Badge label={labelValor} tone={tone} />
      </View>
      <Switch
        value={valor}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={valor ? colors.white : colors.textMuted}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenido: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  filtros: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  lista: {
    gap: spacing.md,
  },
  barbero: {
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  filaTexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});