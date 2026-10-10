-- BarberInsane — 0001: esquema inicial
-- Tipos, tablas, índices, semillas y triggers de auth.

begin;

-- ───────────────────────── Tipos ─────────────────────────

create type public.user_role as enum ('client', 'barber', 'admin');
create type public.appointment_status as enum (
  'pendiente_pago',
  'confirmada',
  'cliente_llego',
  'en_espera',
  'en_atencion',
  'terminada',
  'cancelada'
);
create type public.payment_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'refunded');

-- ───────────────────────── Tablas ─────────────────────────

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (length(nombre) between 2 and 120),
  email text not null,
  telefono text,
  foto text,
  rol public.user_role not null default 'client',
  estado text not null default 'activo',
  created_at timestamptz not null default now()
);

create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users (id) on delete cascade,
  nombre text not null default '',
  foto text,
  especialidad text,
  experiencia int check (experiencia >= 0),
  descripcion text,
  aprobado boolean not null default false,
  disponible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio numeric(10, 2) not null check (precio >= 0),
  duracion int not null check (duracion > 0),
  imagen text,
  activo boolean not null default true,
  requiere_prepago boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  barbero_id uuid not null references public.barbers (id) on delete cascade,
  dia int not null check (dia between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  disponible boolean not null default true,
  constraint schedules_rango check (hora_fin > hora_inicio),
  unique (barbero_id, dia, hora_inicio)
);

create table public.appointments (
  id bigint generated always as identity primary key,
  cliente_id uuid not null references public.users (id) on delete cascade,
  barbero_id uuid not null references public.barbers (id) on delete restrict,
  servicio_id uuid not null references public.services (id) on delete restrict,
  fecha date not null,
  hora time not null,
  duracion int not null check (duracion > 0),
  estado public.appointment_status not null default 'pendiente_pago',
  precio numeric(10, 2) not null,
  created_at timestamptz not null default now()
);

create index appointments_barbero_fecha_idx on public.appointments (barbero_id, fecha);
create index appointments_cliente_idx on public.appointments (cliente_id, fecha desc);
create index appointments_estado_idx on public.appointments (estado);

create table public.payments (
  id bigint generated always as identity primary key,
  appointment_id bigint not null references public.appointments (id) on delete cascade,
  cliente_id uuid not null references public.users (id) on delete cascade,
  monto numeric(10, 2) not null check (monto >= 0),
  estado public.payment_status not null default 'pending',
  payment_reference text unique,
  brand text,
  last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_cliente_idx on public.payments (cliente_id, created_at desc);
create index payments_fecha_idx on public.payments (created_at desc);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  brand text not null,
  last4 text not null check (length(last4) = 4),
  mp_method_id text,
  es_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, brand, last4)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  appointment_id bigint not null unique references public.appointments (id) on delete cascade,
  cliente_id uuid not null references public.users (id) on delete cascade,
  barbero_id uuid not null references public.barbers (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comentario text,
  created_at timestamptz not null default now()
);

create index reviews_barbero_idx on public.reviews (barbero_id);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  titulo text not null,
  mensaje text not null,
  leida boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, leida, created_at desc);

create table public.locations (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  appointment_id bigint references public.appointments (id) on delete set null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  timestamp timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  platform text,
  updated_at timestamptz not null default now()
);

create table public.shop_config (
  id int primary key default 1 check (id = 1),
  nombre text not null default 'BarberInsane',
  direccion text,
  latitude double precision,
  longitude double precision,
  radio_llegada_m int not null default 150,
  politica_cancelacion_horas int not null default 3,
  timezone text not null default 'America/Mexico_City',
  push_webhook_url text,
  push_webhook_secret text,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Semilla ─────────────────────────

insert into public.shop_config (id, nombre, direccion, latitude, longitude, push_webhook_url, push_webhook_secret)
values (
  1,
  'BarberInsane',
  'Av. Ejemplo 123, Ciudad de México',
  19.4326,
  -99.1332,
  'https://sslvdgskznteuecdpeml.supabase.co/functions/v1/send-push',
  md5(random()::text || clock_timestamp()::text)
)
on conflict (id) do nothing;

insert into public.services (nombre, descripcion, precio, duracion, requiere_prepago) values
  ('Corte clásico', 'Corte tradicional con tijera y máquina, lavado y peinado.', 150.00, 30, true),
  ('Corte + barba', 'Corte completo con diseño de barba y acabado.', 220.00, 50, true),
  ('Corte premium', 'Corte premium con navaja, tratamiento capilar y peinado.', 300.00, 60, true),
  ('Barba', 'Perfilado, recorte y acabado de barba con toalla caliente.', 100.00, 20, true);

-- ───────────────────────── Trigger: nueva cuenta ─────────────────────────
-- Primer usuario registrado en la app => administrador.
-- Si el registro indica rol "barber", se crea la fila de barbero pendiente.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_es_primero boolean;
  v_rol_metadata text;
  v_experiencia int;
  v_nombre text;
begin
  select not exists (select 1 from public.users) into v_es_primero;
  v_rol_metadata := coalesce(new.raw_user_meta_data ->> 'rol', 'client');

  v_nombre := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Cliente'
  );
  if length(v_nombre) < 2 then
    v_nombre := 'Cliente';
  end if;

  insert into public.users (id, nombre, email, telefono, rol)
  values (
    new.id,
    v_nombre,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'telefono', '')), ''),
    case when v_es_primero then 'admin' else v_rol_metadata::public.user_role end
  );

  if v_rol_metadata = 'barber' then
    v_experiencia := coalesce(nullif(new.raw_user_meta_data ->> 'experiencia', '')::int, 0);
    insert into public.barbers (user_id, nombre, especialidad, experiencia, descripcion, aprobado)
    values (
      new.id,
      coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''), ''),
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'especialidad', '')), ''),
      v_experiencia,
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'descripcion', '')), ''),
      false
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Protección de columnas sensibles ─────────────────────────

create or replace function public.protect_user_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.rol is distinct from old.rol or new.estado is distinct from old.estado or new.email is distinct from old.email)
     and not public.is_admin() then
    raise exception 'No puedes modificar datos protegidos de la cuenta';
  end if;
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el identificador';
  end if;
  return new;
end;
$$;

create trigger protect_user_row
  before update on public.users
  for each row execute function public.protect_user_row();

create or replace function public.protect_barber_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.approbado is distinct from old.approbado or new.disponible is distinct from old.disponible or new.user_id is distinct from old.user_id)
     and not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar aprobación o disponibilidad';
  end if;
  return new;
end;
$$;

create trigger protect_barber_row
  before update on public.barbers
  for each row execute function public.protect_barber_row();

commit;
