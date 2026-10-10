-- BarberInsane — 0003: RLS (Row Level Security)

begin;

alter table public.users enable row level security;
alter table public.barbers enable row level security;
alter table public.services enable row level security;
alter table public.schedules enable row level security;
alter table public.appointments enable row level security;
alter table public.payments enable row level security;
alter table public.payment_methods enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.locations enable row level security;
alter table public.push_tokens enable row level security;
alter table public.shop_config enable row level security;

revoke all on all tables in schema public from anon;
revoke usage on all sequences in schema public from anon;

-- ───────────────────────── users ─────────────────────────
-- Cada quien ve su propio perfil; el admin ve todo;
-- el barbero ve los datos de los clientes de sus citas.

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
        from public.appointments a
        join public.barbers b on b.id = a.barbero_id
       where b.user_id = auth.uid()
         and a.cliente_id = users.id
    )
  );

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ───────────────────────── barbers ─────────────────────────
-- Perfil público de barbero (sin datos sensibles); edición propia o del admin.
-- aprobado/disponible los protege el trigger protect_barber_row.

drop policy if exists barbers_select on public.barbers;
create policy barbers_select on public.barbers
  for select to authenticated
  using (true);

drop policy if exists barbers_update on public.barbers;
create policy barbers_update on public.barbers
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- ───────────────────────── services ─────────────────────────

drop policy if exists services_select on public.services;
create policy services_select on public.services
  for select to authenticated
  using (true);

drop policy if exists services_insert on public.services;
create policy services_insert on public.services
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists services_update on public.services;
create policy services_update on public.services
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists services_delete on public.services;
create policy services_delete on public.services
  for delete to authenticated
  using (public.is_admin());

-- ───────────────────────── schedules ─────────────────────────

drop policy if exists schedules_select on public.schedules;
create policy schedules_select on public.schedules
  for select to authenticated
  using (true);

drop policy if exists schedules_insert on public.schedules;
create policy schedules_insert on public.schedules
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists schedules_update on public.schedules;
create policy schedules_update on public.schedules
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists schedules_delete on public.schedules;
create policy schedules_delete on public.schedules
  for delete to authenticated
  using (public.is_admin());

-- ───────────────────────── appointments ─────────────────────────
-- Lectura abierta a usuarios autenticados (solo expone uuids/turnos;
-- es lo que permite la sincronización en tiempo real de disponibilidad).
-- Escrituras SOLO vía RPCs SECURITY DEFINER.

drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments
  for select to authenticated
  using (true);

-- ───────────────────────── payments ─────────────────────────

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (
    cliente_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1
        from public.appointments a
        join public.barbers b on b.id = a.barbero_id
       where b.user_id = auth.uid()
         and a.id = payments.appointment_id
    )
  );

-- ───────────────────────── payment_methods (solo display) ─────────────────────────

drop policy if exists payment_methods_all on public.payment_methods;
create policy payment_methods_all on public.payment_methods
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ───────────────────────── reviews ─────────────────────────

drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select to authenticated
  using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    cliente_id = auth.uid()
    and exists (
      select 1 from public.appointments a
       where a.id = appointment_id
         and a.cliente_id = auth.uid()
         and a.estado = 'terminada'
    )
    and not exists (
      select 1 from public.reviews r
       where r.appointment_id = reviews.appointment_id
    )
  );

-- ───────────────────────── notifications ─────────────────────────

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ───────────────────────── locations ─────────────────────────

drop policy if exists locations_select on public.locations;
create policy locations_select on public.locations
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ───────────────────────── push_tokens ─────────────────────────

drop policy if exists push_tokens_all on public.push_tokens;
create policy push_tokens_all on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ───────────────────────── shop_config ─────────────────────────

drop policy if exists shop_config_select on public.shop_config;
create policy shop_config_select on public.shop_config
  for select to authenticated
  using (true);

drop policy if exists shop_config_update on public.shop_config;
create policy shop_config_update on public.shop_config
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
