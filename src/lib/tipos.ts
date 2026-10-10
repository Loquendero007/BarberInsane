export type RolUsuario = 'client' | 'barber' | 'admin';

export type EstadoCita =
  | 'pendiente_pago'
  | 'confirmada'
  | 'cliente_llego'
  | 'en_espera'
  | 'en_atencion'
  | 'terminada'
  | 'cancelada';

export interface Servicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion: number;
  imagen: string | null;
  activo: boolean;
  requiere_prepago: boolean;
}

export interface Barbero {
  id: string;
  user_id: string;
  nombre: string;
  foto: string | null;
  especialidad: string | null;
  experiencia: number | null;
  descripcion: string | null;
  aprobado: boolean;
  disponible: boolean;
}

export interface BarberoCalificado extends Barbero {
  promedio: number;
  totalResenas: number;
}

export interface Cita {
  id: number;
  cliente_id: string;
  barbero_id: string;
  servicio_id: string;
  fecha: string;
  hora: string;
  duracion: number;
  estado: EstadoCita;
  precio: number;
  created_at: string;
  servicio?: { nombre: string; duracion: number; precio: number } | null;
  barbero?: { nombre: string; especialidad: string | null; user_id: string } | null;
  cliente?: { nombre: string; telefono: string | null } | null;
}

export interface Horario {
  id: string;
  barbero_id: string;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
  disponible: boolean;
}

export interface Notificacion {
  id: number;
  user_id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export interface Resena {
  id: string;
  appointment_id: number;
  cliente_id: string;
  barbero_id: string;
  rating: number;
  comentario: string | null;
  created_at: string;
}

export interface ConfigTienda {
  id: number;
  nombre: string;
  direccion: string | null;
  latitude: number | null;
  longitude: number | null;
  radio_llegada_m: number;
  politica_cancelacion_horas: number;
  timezone: string;
}

export interface TarjetaGuardada {
  id: string;
  brand: string;
  last4: string;
  es_default: boolean;
}

export interface EstadisticasAdmin {
  citas_hoy: number;
  ingresos_hoy: number;
  clientes_atendidos: number;
  barberos_activos: number;
}

export interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
}
