import { supabase } from '@/lib/supabase';
import {
  Barbero,
  BarberoCalificado,
  Cita,
  ConfigTienda,
  EstadisticasAdmin,
  EstadoCita,
  Horario,
  Notificacion,
  Resena,
  Servicio,
  TarjetaGuardada,
  UsuarioAdmin,
} from '@/lib/tipos';

async function ejecutar<T>(
  consulta: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data as T;
}

export async function usuarioActual(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error('Sesión no encontrada');
  return id;
}

// ───────────────────────── Catálogo ─────────────────────────

export async function obtenerServicios(): Promise<Servicio[]> {
  return ejecutar(supabase.from('services').select('*').eq('activo', true).order('precio'));
}

export async function obtenerTodosServicios(): Promise<Servicio[]> {
  return ejecutar(supabase.from('services').select('*').order('precio'));
}

export async function obtenerBarberosDisponibles(): Promise<Barbero[]> {
  return ejecutar(
    supabase.from('barbers').select('*').eq('aprobado', true).eq('disponible', true).order('nombre'),
  );
}

export async function obtenerTodosBarberos(): Promise<Barbero[]> {
  return ejecutar(supabase.from('barbers').select('*').order('created_at'));
}

export async function obtenerResenas(): Promise<Resena[]> {
  return ejecutar(supabase.from('reviews').select('id, barbero_id, rating'));
}

export async function calificarBarberos(resenas: Resena[]): Promise<Map<string, { promedio: number; total: number }>> {
  const mapa = new Map<string, { promedio: number; total: number }>();
  for (const resena of resenas) {
    const actual = mapa.get(resena.barbero_id);
    if (actual) {
      actual.total += 1;
      actual.promedio = (actual.promedio * (actual.total - 1) + resena.rating) / actual.total;
    } else {
      mapa.set(resena.barbero_id, { promedio: resena.rating, total: 1 });
    }
  }
  return mapa;
}

export async function obtenerBarberosCalificados(): Promise<BarberoCalificado[]> {
  const [barberos, resenas] = await Promise.all([obtenerBarberosDisponibles(), obtenerResenas()]);
  const calificaciones = await calificarBarberos(resenas);
  return barberos.map((barbero) => {
    const dato = calificaciones.get(barbero.id);
    return {
      ...barbero,
      promedio: dato?.promedio ?? 0,
      totalResenas: dato?.total ?? 0,
    };
  });
}

// ───────────────────────── Configuración ─────────────────────────

export async function obtenerConfigTienda(): Promise<ConfigTienda | null> {
  return ejecutar(supabase.from('shop_config').select('*').eq('id', 1).maybeSingle());
}

export async function guardarConfigTienda(parcial: Partial<ConfigTienda>): Promise<void> {
  await ejecutar(supabase.from('shop_config').update(parcial).eq('id', 1).select());
}

// ───────────────────────── Citas ─────────────────────────

const CITAS_SELECT =
  '*, servicio:services(nombre, duracion, precio), barbero:barbers(nombre, especialidad, user_id), cliente:users(nombre, telefono)';

export async function obtenerSlots(barberoId: string, fecha: string, duracion: number): Promise<string[]> {
  const filas = await ejecutar<{ slot: string }[]>(
    supabase.rpc('get_available_slots', {
      p_barbero_id: barberoId,
      p_fecha: fecha,
      p_duracion: duracion,
    }),
  );
  return filas.map((fila) => fila.slot);
}

export async function reservarCita(
  servicioId: string,
  barberoId: string,
  fecha: string,
  hora: string,
): Promise<Cita> {
  return ejecutar(
    supabase.rpc('book_appointment', {
      p_servicio_id: servicioId,
      p_barbero_id: barberoId,
      p_fecha: fecha,
      p_hora: hora,
    }),
  );
}

export async function obtenerCitasCliente(limite = 60): Promise<Cita[]> {
  const uid = await usuarioActual();
  return ejecutar(
    supabase
      .from('appointments')
      .select(CITAS_SELECT)
      .eq('cliente_id', uid)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: true })
      .limit(limite),
  );
}

export async function obtenerCitaPorId(id: number): Promise<Cita | null> {
  return ejecutar(supabase.from('appointments').select(CITAS_SELECT).eq('id', id).maybeSingle());
}

export async function obtenerCitasBarbero(barberoId: string, fecha?: string): Promise<Cita[]> {
  let consulta = supabase
    .from('appointments')
    .select(CITAS_SELECT)
    .eq('barbero_id', barberoId)
    .order('hora', { ascending: true });
  if (fecha) consulta = consulta.eq('fecha', fecha);
  return ejecutar(consulta);
}

export async function cambiarEstadoCita(id: number, estado: EstadoCita): Promise<Cita> {
  return ejecutar(
    supabase.rpc('set_appointment_status', { p_appointment_id: id, p_nuevo: estado }),
  );
}

export async function cancelarCita(id: number): Promise<Cita> {
  return ejecutar(supabase.rpc('cancel_appointment', { p_appointment_id: id }));
}

export async function marcarLlegada(id: number, latitude: number, longitude: number): Promise<Cita> {
  return ejecutar(
    supabase.rpc('mark_arrival', {
      p_appointment_id: id,
      p_latitude: latitude,
      p_longitude: longitude,
    }),
  );
}

// ───────────────────────── Pagos ─────────────────────────

export async function obtenerTarjetas(): Promise<TarjetaGuardada[]> {
  return ejecutar(supabase.from('payment_methods').select('*').order('es_default', { ascending: false }));
}

export async function confirmarPagoDemo(
  appointmentId: number,
  brand?: string,
  last4?: string,
): Promise<{ estado: string }> {
  return ejecutar(
    supabase.rpc('demo_pay', {
      p_appointment_id: appointmentId,
      p_brand: brand ?? null,
      p_last4: last4 ?? null,
    }),
  );
}

// ───────────────────────── Reseñas ─────────────────────────

export async function obtenerResenaDeCita(appointmentId: number): Promise<Resena | null> {
  return ejecutar(supabase.from('reviews').select('*').eq('appointment_id', appointmentId).maybeSingle());
}

export async function obtenerResenasDelCliente(): Promise<{ appointment_id: number }[]> {
  const uid = await usuarioActual();
  return ejecutar(supabase.from('reviews').select('appointment_id').eq('cliente_id', uid));
}

export async function insertarResena(datos: {
  appointment_id: number;
  cliente_id: string;
  barbero_id: string;
  rating: number;
  comentario: string | null;
}): Promise<Resena> {
  const filas = await ejecutar<Resena[]>(
    supabase.from('reviews').insert(datos).select('*').limit(1),
  );
  const creada = filas[0];
  if (!creada) throw new Error('No se pudo guardar la reseña');
  return creada;
}

// ───────────────────────── Notificaciones ─────────────────────────

export async function obtenerNotificaciones(limite = 100): Promise<Notificacion[]> {
  return ejecutar(
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limite),
  );
}

export async function contarNotificacionesNoLeidas(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('leida', false);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function marcarNotificacionesLeidas(): Promise<void> {
  const uid = await usuarioActual();
  await ejecutar(
    supabase.from('notifications').update({ leida: true }).eq('user_id', uid).eq('leida', false).select('id'),
  );
}

// ───────────────────────── Horarios ─────────────────────────

export async function obtenerHorarios(barberoId?: string): Promise<Horario[]> {
  let consulta = supabase
    .from('schedules')
    .select('*')
    .order('dia', { ascending: true })
    .order('hora_inicio', { ascending: true });
  if (barberoId) consulta = consulta.eq('barbero_id', barberoId);
  return ejecutar(consulta);
}

export async function agregarHorario(datos: {
  barbero_id: string;
  dia: number;
  hora_inicio: string;
  hora_fin: string;
}): Promise<Horario> {
  const filas = await ejecutar<Horario[]>(
    supabase.from('schedules').insert(datos).select('*').limit(1),
  );
  const creado = filas[0];
  if (!creado) throw new Error('No se pudo crear el horario');
  return creado;
}

export async function eliminarHorario(id: string): Promise<void> {
  await ejecutar(supabase.from('schedules').delete().eq('id', id).select('id'));
}

// ───────────────────────── Servicios (admin) ─────────────────────────

export async function guardarServicio(
  datos: Omit<Servicio, 'id'> & { id?: string },
): Promise<Servicio> {
  const { id, ...resto } = datos;
  let filas: Servicio[];
  if (id) {
    filas = await ejecutar<Servicio[]>(
      supabase.from('services').update(resto).eq('id', id).select('*').limit(1),
    );
  } else {
    filas = await ejecutar<Servicio[]>(
      supabase.from('services').insert(resto).select('*').limit(1),
    );
  }
  if (!filas[0]) throw new Error('No se pudo guardar el servicio');
  return filas[0];
}

export async function alternarServicio(id: string, activo: boolean): Promise<void> {
  await ejecutar(supabase.from('services').update({ activo }).eq('id', id).select('id'));
}

// ───────────────────────── Administración ─────────────────────────

export async function estadisticasAdmin(): Promise<EstadisticasAdmin> {
  return ejecutar(supabase.rpc('admin_stats'));
}

export async function aprobarBarbero(barberoId: string, aprobado: boolean): Promise<void> {
  await ejecutar(
    supabase.rpc('admin_set_barber_approval', { p_barbero_id: barberoId, p_aprobado: aprobado }),
  );
}

export async function cambiarDisponibilidadBarbero(barberoId: string, disponible: boolean): Promise<void> {
  await ejecutar(
    supabase.from('barbers').update({ disponible }).eq('id', barberoId).select('id'),
  );
}

export async function obtenerUsuarios(): Promise<UsuarioAdmin[]> {
  return ejecutar(supabase.from('users').select('id, nombre, email, rol').order('nombre'));
}

export async function enviarAviso(titulo: string, mensaje: string, usuario?: string): Promise<number> {
  return ejecutar(
    supabase.rpc('send_notification', {
      p_titulo: titulo,
      p_mensaje: mensaje,
      ...(usuario ? { p_usuario: usuario } : {}),
    }),
  );
}

// ───────────────────────── Perfil ─────────────────────────

export async function actualizarPerfil(parcial: { nombre?: string; telefono?: string | null }): Promise<void> {
  const uid = await usuarioActual();
  await ejecutar(supabase.from('users').update(parcial).eq('id', uid).select('id'));
}

export async function subirAvatar(rutaUri: string): Promise<string> {
  const uid = await usuarioActual();
  const respuesta = await fetch(rutaUri);
  const blob = await respuesta.blob();
  const nombre = `avatar-${Date.now()}.jpg`;
  await ejecutar(
    supabase.storage.from('avatars').upload(`${uid}/${nombre}`, blob, { contentType: 'image/jpeg' }),
  );
  const { data } = supabase.storage.from('avatars').getPublicUrl(`${uid}/${nombre}`);
  return data.publicUrl;
}

export async function guardarFotoPerfil(rutaUri: string): Promise<string> {
  const uid = await usuarioActual();
  const foto = await subirAvatar(rutaUri);
  await ejecutar(supabase.from('users').update({ foto }).eq('id', uid).select('id'));
  return foto;
}

// ───────────────────────── Realtime ─────────────────────────

export function suscribirse(tablas: string[], alCambiar: () => void): () => void {
  const canal = supabase.channel(`cambios-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  for (const tabla of tablas) {
    canal.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: tabla },
      () => alCambiar(),
    );
  }
  canal.subscribe();
  return () => {
    void supabase.removeChannel(canal);
  };
}
