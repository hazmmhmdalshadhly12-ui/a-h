-- ============================================================
-- 026_user_preferences.sql
-- تفضيلات الطالب:
--   * accent — لون لوحة الطالب (التمة)
--   * dashboard_layout — ترتيب وإظهار/إخفاء أقسام لوحة الطالب
-- كل طالب ليه صف واحد بس في الجدول (student_id هو المفتاح).
-- ============================================================

create table if not exists public.user_preferences (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  accent text not null default 'amber'
    check (accent in ('amber', 'violet', 'emerald', 'sky', 'rose', 'teal')),
  dashboard_layout jsonb not null default '["announcements","stats","exams","bookings"]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

grant select, insert, update on public.user_preferences to authenticated;

-- الطالب يقرا ويكتب تفضيلاته هو بس — الأدمن كل حاجة
create policy "user_preferences: read own or admin"
  on public.user_preferences for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy "user_preferences: insert own"
  on public.user_preferences for insert to authenticated
  with check (student_id = auth.uid());

create policy "user_preferences: update own"
  on public.user_preferences for update to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

-- تحديث updated_at تلقائياً
create or replace function public.user_preferences_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_preferences_touch on public.user_preferences;
create trigger user_preferences_touch
  before update on public.user_preferences
  for each row execute procedure public.user_preferences_touch();