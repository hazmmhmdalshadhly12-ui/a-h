-- ============================================================
-- 027_admin_settings.sql
-- إعدادات الأدمن: إيميل الإشعارات، إعدادات عامة
-- ============================================================

create table if not exists public.admin_settings (
  id int primary key default 1, -- صف واحد فقط
  notification_email text, -- إيميل المستر لاستقبال إشعارات الحجز
  updated_at timestamptz not null default now()
);

alter table public.admin_settings enable row level security;

grant select on public.admin_settings to authenticated;
grant insert, update on public.admin_settings to authenticated;

-- الأدمن فقط يقدر يقرأ ويكتب الإعدادات
drop policy if exists "admin_settings: admin read" on public.admin_settings;
create policy "admin_settings: admin read"
  on public.admin_settings for select to authenticated
  using (public.is_admin());

drop policy if exists "admin_settings: admin write" on public.admin_settings;
create policy "admin_settings: admin write"
  on public.admin_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- trigger لتحديث updated_at
drop trigger if exists admin_settings_touch on public.admin_settings;
create or replace function public.admin_settings_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger admin_settings_touch
  before update on public.admin_settings
  for each row execute procedure public.admin_settings_touch();

-- إدخال صف افتراضي
insert into public.admin_settings (id, notification_email)
values (1, null)
on conflict (id) do nothing;