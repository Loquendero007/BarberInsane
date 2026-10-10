import { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BadgeTone } from '@/components/ui';
import { EstadoCita } from '@/lib/tipos';

export interface InfoEstado {
  label: string;
  tone: BadgeTone;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
}

export const INFO_ESTADO: Record<EstadoCita, InfoEstado> = {
  pendiente_pago: { label: 'Pendiente de pago', tone: 'warning', icon: 'credit-card-clock-outline' },
  confirmada: { label: 'Confirmada', tone: 'info', icon: 'calendar-check-outline' },
  cliente_llego: { label: 'Llegaste a la barbería', tone: 'accent', icon: 'map-marker-check-outline' },
  en_espera: { label: 'En espera', tone: 'warning', icon: 'clock-outline' },
  en_atencion: { label: 'En atención', tone: 'success', icon: 'content-cut' },
  terminada: { label: 'Terminada', tone: 'success', icon: 'check-circle-outline' },
  cancelada: { label: 'Cancelada', tone: 'danger', icon: 'close-circle-outline' },
};

export const TRANSICIONES_BARBERO: Partial<Record<EstadoCita, EstadoCita[]>> = {
  cliente_llego: ['en_espera', 'en_atencion', 'cancelada'],
  en_espera: ['en_atencion', 'cancelada'],
  en_atencion: ['terminada'],
};

export const CITAS_ACTIVAS: EstadoCita[] = [
  'pendiente_pago',
  'confirmada',
  'cliente_llego',
  'en_espera',
  'en_atencion',
];

export function esCitaActiva(estado: EstadoCita): boolean {
  return CITAS_ACTIVAS.includes(estado);
}
