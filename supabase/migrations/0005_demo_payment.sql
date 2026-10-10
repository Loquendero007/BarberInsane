-- 0005_demo_payment.sql
-- 1) Corrige el typo en protect_barber_row: 'approbado' -> 'aprobado'
--    (sin esta corrección, cualquier UPDATE sobre barbers falla por
--    "column barbers.approbado does not exist").
create or replace function public.protect_barber_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.aprobado is distinct from old.aprobado
    or new.disponible is distinct from old.disponible
    or new.user_id is distinct from old.user_id)
    and not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar aprobación o disponibilidad';
  end if;
  return new;
end;
$$;

-- 2) Pago de demostración: permite al cliente aprobar el pago de su cita
--    pendiente sin pasar por Mercado Pago (útil para demos y pruebas).
--    Devuelve jsonb en vez de text para que supabase-js lo parsee a objeto.
create or replace function public.demo_pay(
  p_appointment_id bigint,
  p_brand text default null,
  p_last4 text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_app public.appointments%rowtype;
  v_pay public.payments;
  v_ref text := 'DEMO-' || p_appointment_id || '-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if v_uid is null then
    raise exception 'Debes iniciar sesión';
  end if;

  select * into v_app from public.appointments where id = p_appointment_id;
  if not found then
    raise exception 'Cita no encontrada';
  end if;

  if v_app.cliente_id <> v_uid then
    raise exception 'No tienes permiso sobre esta cita';
  end if;

  if v_app.estado <> 'pendiente_pago' then
    raise exception 'Esta cita no está pendiente de pago';
  end if;

  v_pay := public.confirm_mp_payment(p_appointment_id, v_ref, 'approved', v_app.precio, p_brand, p_last4);

  return jsonb_build_object(
    'estado', 'approved',
    'payment_reference', v_ref,
    'monto', v_pay.monto,
    'brand', v_pay.brand,
    'last4', v_pay.last4
  );
end;
$$;

grant execute on function public.demo_pay(bigint, text, text) to authenticated;

commit;