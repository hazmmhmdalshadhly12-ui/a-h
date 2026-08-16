-- ============================================================
-- 002_profiles.sql
-- جدول البروفايلات + إنشاء البروفايل تلقائياً عند تسجيل مستخدم جديد
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  parent_phone text,
  grade text not null default 'first_secondary'
    check (grade in ('first_secondary', 'second_secondary')),
  role text not null default 'student'
    check (role in ('student', 'admin')),
  email text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'بيانات الطلاب والأدمن — بترتبط بجدول المستخدمين في auth';

-- مساعدات الصلاحيات (security definer عشان تقرا من غير مشاكل RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_student()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student'
  );
$$;

-- إنشاء البروفايل تلقائياً عند تسجيل أي مستخدم جديد
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, parent_phone, grade, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'parent_phone', ''),
    coalesce(new.raw_user_meta_data->>'grade', 'first_secondary'),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- حماية الصلاحية/الصف: الطالب ميقدرش يغير role أو grade من الواجهة
create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin()
     and (new.role is distinct from old.role
          or new.grade is distinct from old.grade) then
    raise exception 'غير مسموح بتغيير الصلاحية أو الصف الدراسي';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute procedure public.prevent_profile_escalation();