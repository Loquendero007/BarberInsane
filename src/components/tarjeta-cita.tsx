import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppText, Badge, Card } from '@/components/ui';
import { esHoy, formatearFechaCorta, formatearMoneda, horaCorta } from '@/lib/fechas';
import { Cita } from '@/lib/tipos';
import { colors, radius, spacing } from '@/theme';
import { INFO_ESTADO } from '@/lib/estados';

interface TarjetaCitaProps {
  cita: Cita;
  children?: ReactNode;
  mostrarCliente?: boolean;
}

export function TarjetaCita({ cita, children, mostrarCliente = false }: TarjetaCitaProps) {
  const info = INFO_ESTADO[cita.estado];
  const fechaTexto = esHoy(cita.fecha) ? 'Hoy' : formatearFechaCorta(cita.fecha);

  return (
    <Card style={styles.tarjeta}>
      <View style={styles.superior}>
        <View style={styles.icono}>
          <MaterialCommunityIcons name={info.icon} size={22} color={colors.accent} />
        </View>
        <View style={styles.titulo}>
          <AppText variant="subtitle" numberOfLines={1}>
            {cita.servicio?.nombre ?? 'Servicio'}
          </AppText>
          <AppText variant="small" numberOfLines={1}>
            {mostrarCliente
              ? (cita.cliente?.nombre ?? 'Cliente')
              : (cita.barbero?.nombre ?? 'Barbero')}
            {cita.barbero?.especialidad && !mostrarCliente
              ? ` · ${cita.barbero.especialidad}`
              : ''}
          </AppText>
        </View>
        <Badge label={info.label} tone={info.tone} />
      </View>

      <View style={styles.detalles}>
        <ChipDetalle icon="calendar-clock" texto={`${fechaTexto} · ${horaCorta(cita.hora)}`} />
        <ChipDetalle icon="timer-outline" texto={`${cita.duracion} min`} />
        <ChipDetalle icon="cash" texto={formatearMoneda(cita.precio)} />
      </View>

      {children ? <View style={styles.acciones}>{children}</View> : null}
    </Card>
  );
}

function ChipDetalle({ icon, texto }: { icon: 'calendar-clock' | 'timer-outline' | 'cash'; texto: string }) {
  return (
    <View style={styles.chip}>
      <MaterialCommunityIcons name={icon} size={14} color={colors.textSecondary} />
      <AppText variant="caption" style={styles.chipTexto}>
        {texto}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    gap: spacing.md,
  },
  superior: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    flex: 1,
    gap: 2,
  },
  detalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  chipTexto: {
    color: colors.textSecondary,
  },
  acciones: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
