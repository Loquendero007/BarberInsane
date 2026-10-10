-- BarberInsane — 0004: Realtime + Storage

begin;

-- ───────────────────────── Realtime ─────────────────────────
-- Cambios en citas/disponibilidad/estados se propagan en tiempo real.

do $$
begin
  alter publication supabase_realtime add table public.appointments;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.users;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.barbers;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.services;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.schedules;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.payments;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.reviews;
exception when others then null;
end $$;

-- ───────────────────────── Storage ─────────────────────────
-- avatars/<user_id>/...  y  service-images/...

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('service-images', 'service-images', true)
on conflict (id) do nothing;

drop policy if exists "storage_read_public" on storage.objects;
create policy "storage_read_public" on storage.objects
  for select
  using (bucket_id in ('avatars', 'service-images'));

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "service_images_admin" on storage.objects;
create policy "service_images_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'service-images' and public.is_admin());

drop policy if exists "service_images_admin_update" on storage.objects;
create policy "service_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'service-images' and public.is_admin());

commit;
