-- BarberInsane — 0002: funciones y RPCs
-- Toda la lógica de escritura pasa por funciones SECURITY DEFINER.

begin;

-- pg_net: permite que la BD dispare el envío de push al Edge Function.
do $$
begin
  create extension if not exists pg_net with schema extensions;
exception when others then null;
end $$;

-- ───────────────────────── Helpers ─────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and rol = 'admin'
  );
$$;

create or replace function public.shop_tz()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select timezone from public.shop_config where id = 1), 'America/Mexico_City');
$$;

create or replace function public.shop_now()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone public.shop_tz());
$$;

create or replace function public.notify(p_user_id uuid, p_titulo text, p_mensaje text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, titulo, mensaje)
  values (p_user_id, p_titulo, p_mensaje);
$$;

create or replace function public.notify_admins(p_titulo text, p_mensaje text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, titulo, mensaje)
  select id, p_titulo, p_mensaje from public.users where rol = 'admin';
$$;

create or replace function public.notify_barbero(p_barbero_id uuid, p_titulo text, p_mensaje text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid;
begin
  select user_id into v_user from public.barbers where id = p_barbero_id;
  if v_user is not null then
    perform public.notify(v_user, p_titulo, p_mensaje);
  end if;
end;
$$;

-- ───────────────────────── Reserva de cita ─────────────────────────
-- Reglas: horario de trabajo, sin solapamiento (con bloqueo), sin duplicados,
-- holds de pago vencidos liberados a los 15 minutos.

create or replace function public.book_appointment(
  p_servicio_id uuid,
  p_barbero_id uuid,
  p_fecha date,
  p_hora time
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_svc public.services%rowtype;
  v_app public.appointments%rowtype;
  v_conflict bigint;
begin
  if v_uid is null then
    raise exception 'Sesión no encontrada';
  end if;

  select * into v_svc from public.services where id = p_servicio_id and activo;
  if not found then
    raise exception 'Servicio no disponible';
  end if;

  if not exists (select 1 from public.barbers where id = p_barbero_id and aprobado and disponible) then
    raise exception 'Barbero no disponible';
  end if;

  if p_fecha < (public.shop_now())::date then
    raise exception 'Fecha no válida';
  end if;

  if not exists (
    select 1 from public.schedules sc
    where sc.barbero_id = p_barbero_id
      and sc.dia = extract(dow from p_fecha)::int
      and sc.disponible
      and p_hora >= sc.hora_inicio
      and p_hora + (v_svc.duracion * interval '1 minute') <= sc.hora_fin
  ) then
    raise exception 'El barbero no atiende a esa hora';
  end if;

  perform pg_advisory_xact_lock(hashtext('book:' || p_barbero_id::text || ':' || p_fecha::text));

  update public.appointments
     set estado = 'cancelada'
   where barbero_id = p_barbero_id
     and fecha = p_fecha
     and estado = 'pendiente_pago'
     and created_at < now() - interval '15 minutes';

  select id into v_conflict
    from public.appointments
   where barbero_id = p_barbero_id
     and fecha = p_fecha
     and estado <> 'cancelada'
     and p_hora < hora + (duracion * interval '1 minute')
     and (p_hora + (v_svc.duracion * interval '1 minute')) > hora
   limit 1;

  if v_conflict is not null then
    raise exception 'Ese horario ya está ocupado';
  end if;

  insert into public.appointments (cliente_id, barbero_id, servicio_id, fecha, hora, duracion, estado, precio)
  values (
    v_uid,
    p_barbero_id,
    p_servicio_id,
    p_fecha,
    p_hora,
    v_svc.duracion,
    case when v_svc.requiere_prepago then 'pendiente_pago'::public.appointment_status
         else 'confirmada'::public.appointment_status end,
    v_svc.precio
  )
  returning * into v_app;

  if v_app.estado = 'confirmada' then
    perform public.notify(v_app.cliente_id, '✂️ Tu cita está confirmada',
      v_svc.nombre || ' — ' || to_char(v_app.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(v_app.hora, 'HH24:MI') || '.');
    perform public.notify_barbero(v_app.barbero_id, '📅 Tienes una nueva cita',
      v_svc.nombre || ' — ' || to_char(v_app.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(v_app.hora, 'HH24:MI') || '.');
    perform public.notify_admins('📅 Se registró una nueva reserva',
      v_svc.nombre || ' — ' || to_char(v_app.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(v_app.hora, 'HH24:MI') || '.');
  end if;

  return v_app;
end;
$$;

-- ───────────────────────── Slots disponibles ─────────────────────────

create or replace function public.get_available_slots(
  p_barbero_id uuid,
  p_fecha date,
  p_duracion int
)
returns table (slot time)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_fecha_hoy date := (public.shop_now())::date;
  v_hora_ahora time := (public.shop_now())::time;
begin
  if p_fecha < v_fecha_hoy then
    return;
  end if;

  update public.appointments
     set estado = 'cancelada'
   where barbero_id = p_barbero_id
     and fecha = p_fecha
     and estado = 'pendiente_pago'
     and created_at < now() - interval '15 minutes';

  for r in
    select sc.hora_inicio, sc.hora_fin
      from public.schedules sc
     where sc.barbero_id = p_barbero_id
       and sc.dia = extract(dow from p_fecha)::int
       and sc.disponible
     order by sc.hora_inicio
  loop
    return query
    select t::time
      from generate_series(
        r.hora_inicio::timestamp,
        r.hora_fin::timestamp - (p_duracion * interval '1 minute'),
        interval '30 minutes'
      ) as t
     where not exists (
        select 1
          from public.appointments a
         where a.barbero_id = p_barbero_id
           and a.fecha = p_fecha
           and a.estado <> 'cancelada'
           and t::time < a.hora + (a.duracion * interval '1 minute')
           and (t::time + (p_duracion * interval '1 minute')) > a.hora
       )
       and (
         p_fecha > v_fecha_hoy
         or (t::time + interval '30 minutes') > v_hora_ahora
       )
     order by 1;
  end loop;

  return;
end;
$$;

-- ───────────────────────── Estados de cita ─────────────────────────

create or replace function public.set_appointment_status(
  p_appointment_id bigint,
  p_nuevo public.appointment_status
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.appointments%rowtype;
  v_es_barbero boolean;
  v_es_admin boolean := public.is_admin();
  v_es_cliente boolean;
  v_cancel_horas int;
begin
  if v_uid is null then
    raise exception 'Sesión no encontrada';
  end if;

  select * into v_app from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Cita no encontrada';
  end if;

  v_es_cliente := v_app.cliente_id = v_uid;
  v_es_barbero := exists (
    select 1 from public.barbers b where b.id = v_app.barbero_id and b.user_id = v_uid
  );

  if not (v_es_admin or v_es_cliente or v_es_barbero) then
    raise exception 'No tienes permiso sobre esta cita';
  end if;

  if v_app.estado = p_nuevo then
    return v_app;
  end if;

  if v_app.estado in ('terminada', 'cancelada') then
    raise exception 'La cita ya está finalizada';
  end if;

  if not v_es_admin then
    if v_es_barbero then
      if not (
        (v_app.estado = 'cliente_llego' and p_nuevo in ('en_espera', 'en_atencion', 'cancelada'))
        or (v_app.estado = 'en_espera' and p_nuevo in ('en_atencion', 'cancelada'))
        or (v_app.estado = 'en_atencion' and p_nuevo = 'terminada')
        or (v_app.estado in ('confirmada', 'cliente_llego') and p_nuevo = 'cancelada')
      ) then
        raise exception 'Transición de estado no permitida';
      end if;
    else
      if not (
        v_app.estado in ('pendiente_pago', 'confirmada') and p_nuevo = 'cancelada'
      ) then
        raise exception 'Transición de estado no permitida';
      end if;

      if v_app.estado = 'confirmada' then
        select politica_cancelacion_horas into v_cancel_horas from public.shop_config where id = 1;
        if public.shop_now() > (v_app.fecha + v_app.hora) - (coalesce(v_cancel_horas, 3) * interval '1 hour') then
          raise exception 'Ya no es posible cancelar (política de la barbería)';
        end if;
      end if;
    end if;
  end if;

  update public.appointments set estado = p_nuevo where id = v_app.id
  returning * into v_app;

  case p_nuevo
    when 'cliente_llego' then
      perform public.notify_barbero(v_app.barbero_id, '📍 El cliente ha llegado.', 'Un cliente está en la barbería.');
      perform public.notify_admins('📍 El cliente está en la barbería.', 'Llegada registrada para la cita #' || v_app.id || '.');
    when 'en_espera' then
      perform public.notify(v_app.cliente_id, '⏳ Estás en espera', 'Tu barbero te atenderá enseguida.');
    when 'en_atencion' then
      perform public.notify(v_app.cliente_id, '💈 Tu barbero ya está listo para atenderte.', 'Tu cita está en atención.');
      perform public.notify_admins('💈 Cita en atención', 'Cita #' || v_app.id || ' en atención.');
    when 'terminada' then
      perform public.notify(v_app.cliente_id, '✅ Cita terminada', '¿Qué te pareció? Califica a tu barbero.');
      perform public.notify_admins('✅ Cita terminada', 'Cita #' || v_app.id || ' finalizada.');
    when 'cancelada' then
      perform public.notify(v_app.cliente_id, '❌ Cita cancelada', 'Tu cita fue cancelada.');
      if not v_es_barbero then
        perform public.notify_barbero(v_app.barbero_id, '❌ Una cita fue cancelada', 'Se canceló la cita #' || v_app.id || '.');
      end if;
      perform public.notify_admins('❌ Cita cancelada', 'Se canceló la cita #' || v_app.id || '.');
    else null;
  end case;

  return v_app;
end;
$$;

-- ───────────────────────── Cancelación (cliente / admin / barbero) ─────────────────────────

create or replace function public.cancel_appointment(p_appointment_id bigint)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.appointments%rowtype;
  v_es_barbero boolean;
begin
  if v_uid is null then
    raise exception 'Sesión no encontrada';
  end if;

  select * into v_app from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Cita no encontrada';
  end if;

  v_es_barbero := exists (
    select 1 from public.barbers b where b.id = v_app.barbero_id and b.user_id = v_uid
  );

  if not (public.is_admin() or v_app.cliente_id = v_uid or v_es_barbero) then
    raise exception 'No tienes permiso sobre esta cita';
  end if;

  if v_app.estado in ('terminada', 'cancelada') then
    raise exception 'La cita ya está finalizada';
  end if;

  return public.set_appointment_status(p_appointment_id, 'cancelada');
end;
$$;

-- ───────────────────────── "Ya llegué" ─────────────────────────

create or replace function public.mark_arrival(
  p_appointment_id bigint,
  p_latitude double precision,
  p_longitude double precision
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.appointments%rowtype;
begin
  if v_uid is null then
    raise exception 'Sesión no encontrada';
  end if;

  select * into v_app from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Cita no encontrada';
  end if;

  if v_app.cliente_id <> v_uid then
    raise exception 'No tienes permiso sobre esta cita';
  end if;

  if v_app.fecha <> (public.shop_now())::date then
    raise exception 'Solo puedes registrar tu llegada el día de tu cita';
  end if;

  if v_app.estado = 'cliente_llego' then
    return v_app;
  end if;

  if v_app.estado <> 'confirmada' then
    raise exception 'Tu cita no está confirmada';
  end if;

  insert into public.locations (user_id, appointment_id, latitude, longitude)
  values (v_uid, p_appointment_id, p_latitude, p_longitude);

  return public.set_appointment_status(p_appointment_id, 'cliente_llego');
end;
$$;

-- ───────────────────────── Confirmación de pago (Mercado Pago) ─────────────────────────

create or replace function public.confirm_mp_payment(
  p_appointment_id bigint,
  p_mp_id text,
  p_estado text,
  p_monto numeric,
  p_brand text,
  p_last4 text
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.appointments%rowtype;
  v_pay public.payments%rowtype;
  v_estado public.payment_status;
begin
  if p_mp_id is null or p_mp_id = '' then
    raise exception 'Falta la referencia del pago';
  end if;

  select * into v_pay from public.payments where payment_reference = p_mp_id;
  if found then
    return v_pay;
  end if;

  select * into v_app from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Cita no encontrada';
  end if;

  v_estado := case
    when p_estado in ('approved', 'authorized') then 'approved'::public.payment_status
    when p_estado in ('pending', 'in_process', 'in_mediation') then 'pending'::public.payment_status
    when p_estado in ('cancelled', 'expired') then 'cancelled'::public.payment_status
    when p_estado in ('rejected', 'charged_back') then 'rejected'::public.payment_status
    when p_estado = 'refunded' then 'refunded'::public.payment_status
    else 'pending'::public.payment_status
  end;

  if v_estado = 'approved' and p_monto < v_app.precio then
    raise exception 'El monto del pago no coincide con el precio de la cita';
  end if;

  insert into public.payments (appointment_id, cliente_id, monto, estado, payment_reference, brand, last4)
  values (v_app.id, v_app.cliente_id, p_monto, v_estado, p_mp_id, p_brand, p_last4)
  returning * into v_pay;

  if v_estado = 'approved' and p_brand is not null and p_last4 is not null then
    insert into public.payment_methods (user_id, brand, last4, mp_method_id, es_default)
    values (v_app.cliente_id, p_brand, p_last4, p_mp_id, true)
    on conflict (user_id, brand, last4) do nothing;
  end if;

  if v_estado = 'approved' and v_app.estado = 'pendiente_pago' then
    update public.appointments set estado = 'confirmada' where id = v_app.id
    returning * into v_app;

    perform public.notify(v_app.cliente_id, '💳 Tu pago fue procesado correctamente.',
      'Monto: $' || p_monto::text || ' MXN.');
    perform public.notify(v_app.cliente_id, '✂️ Tu cita está confirmada',
      to_char(v_app.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(v_app.hora, 'HH24:MI') || '.');
    perform public.notify_barbero(v_app.barbero_id, '📅 Tienes una nueva cita',
      to_char(v_app.fecha, 'DD/MM/YYYY') || ' a las ' || to_char(v_app.hora, 'HH24:MI') || '.');
    perform public.notify_admins('📅 Se registró una nueva reserva',
      'Cita #' || v_app.id || ' pagada.');
  elsif v_estado = 'rejected' then
    perform public.notify(v_app.cliente_id, '💳 Tu pago fue rechazado.',
      'Intenta con otro método de pago para confirmar tu cita.');
  end if;

  return v_pay;
end;
$$;

-- ───────────────────────── Administración ─────────────────────────

create or replace function public.admin_set_barber_approval(
  p_barbero_id uuid,
  p_aprobado boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_barber public.barbers%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede aprobar barberos';
  end if;

  update public.barbers set aprobado = p_aprobado where id = p_barbero_id
  returning * into v_barber;

  if not found then
    raise exception 'Barbero no encontrado';
  end if;

  if p_aprobado then
    perform public.notify(v_barber.user_id, '🎉 Tu cuenta fue aprobada',
      'Ya puedes iniciar sesión y usar todas las funciones de BarberInsane.');
    perform public.notify_admins('💈 Barbero aprobado', v_barber.nombre || ' ya está activo.');
  else
    perform public.notify(v_barber.user_id, '❌ Tu solicitud fue rechazada',
      'Contacta a la barbería para más información.');
  end if;
end;
$$;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoy date := (public.shop_now())::date;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede ver estadísticas';
  end if;

  return jsonb_build_object(
    'citas_hoy', (
      select count(*) from public.appointments
      where fecha = v_hoy and estado not in ('pendiente_pago', 'cancelada')
    ),
    'ingresos_hoy', coalesce((
      select sum(monto) from public.payments
      where estado = 'approved' and (created_at at time zone public.shop_tz())::date = v_hoy
    ), 0),
    'clientes_atendidos', (
      select count(distinct cliente_id) from public.appointments
      where fecha = v_hoy and estado = 'terminada'
    ),
    'barberos_activos', (
      select count(*) from public.barbers where aprobado and disponible
    )
  );
end;
$$;

create or replace function public.send_notification(
  p_titulo text,
  p_mensaje text,
  p_usuario uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Solo el administrador puede enviar notificaciones';
  end if;

  if p_usuario is not null then
    insert into public.notifications (user_id, titulo, mensaje)
    values (p_usuario, p_titulo, p_mensaje);
    return 1;
  end if;

  insert into public.notifications (user_id, titulo, mensaje)
  select id, p_titulo, p_mensaje from public.users;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ───────────────────────── Trigger: nueva calificación ─────────────────────────

create or replace function public.on_review_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
begin
  select nombre into v_nombre from public.users where id = new.cliente_id;
  perform public.notify_barbero(
    new.barbero_id,
    '⭐ Nueva calificación: ' || new.rating || ' estrellas',
    coalesce(new.comentario, 'Sin comentario') || ' — ' || coalesce(v_nombre, 'Cliente')
  );
  return new;
end;
$$;

drop trigger if exists on_review_created on public.reviews;
create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.on_review_created();

-- ───────────────────────── Trigger: push vía pg_net ─────────────────────────

create or replace function public.on_notification_created()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cfg public.shop_config%rowtype;
begin
  select * into v_cfg from public.shop_config where id = 1;

  if v_cfg.push_webhook_url is null or v_cfg.push_webhook_secret is null then
    return new;
  end if;

  perform extensions.net.http_post(
    url := v_cfg.push_webhook_url,
    body := jsonb_build_object(
      'notification_id', new.id,
      'secret', v_cfg.push_webhook_secret
    ),
    headers := jsonb_build_object('content-type', 'application/json'),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists on_notification_created on public.notifications;
create trigger on_notification_created
  after insert on public.notifications
  for each row execute function public.on_notification_created();

-- ───────────────────────── Permisos de ejecución ─────────────────────────

revoke execute on all functions in schema public from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.shop_tz() to authenticated;
grant execute on function public.shop_now() to authenticated;
grant execute on function public.book_appointment(uuid, uuid, date, time) to authenticated;
grant execute on function public.get_available_slots(uuid, date, int) to authenticated;
grant execute on function public.set_appointment_status(bigint, public.appointment_status) to authenticated;
grant execute on function public.cancel_appointment(bigint) to authenticated;
grant execute on function public.mark_arrival(bigint, double precision, double precision) to authenticated;
grant execute on function public.admin_set_barber_approval(uuid, boolean) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.send_notification(text, text, uuid) to authenticated;

grant execute on function public.confirm_mp_payment(bigint, text, text, numeric, text, text) to service_role;

commit;
