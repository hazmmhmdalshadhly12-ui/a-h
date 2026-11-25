-- ============================================================
-- testdb/schema.sql — بيئة محاكاة لحالة الإنتاج قبل 047
-- (نسخة أمينة من تعريفات migrations 001-046 ذات الصلة بالامتحانات فقط،
--  مع stub لـ auth.uid بدل نظام مصادقة Supabase)
-- ============================================================

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);

-- أدوار Supabase (بدل الأدوار الأصلية) — يجب أن تُنشأ قبل أي GRANT
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;

create or replace function auth.uid() returns uuid
language sql stable as
$$ select nullif(current_setting('app.current_uid', true), '')::uuid $$;

-- ----- 002_profiles -----
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

-- ----- 003_courses (لـ FK الحجز على كورس) -----
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade text not null check (grade in ('first_secondary', 'second_secondary')),
  video_url text,
  order_index int not null default 1,
  created_at timestamptz not null default now()
);

-- ----- 004_exams -----
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade text not null check (grade in ('first_secondary', 'second_secondary')),
  duration_minutes int,
  start_at timestamptz,
  end_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text not null,
  type text not null check (type in ('mcq', 'true_false', 'short_answer')),
  options jsonb,
  correct_answer text,
  points int not null default 1,
  order_index int not null default 1
);

create index exam_questions_exam_idx on public.exam_questions (exam_id, order_index);

-- ----- 005_submissions -----
create table public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  auto_score numeric default 0,
  manual_score numeric default 0,
  score numeric,
  grade_released boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create index exam_submissions_exam_idx on public.exam_submissions (exam_id);
create index exam_submissions_student_idx on public.exam_submissions (student_id);

-- ----- 006 + 013 + 017 bookings -----
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  requested_datetime timestamptz,
  subject text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  full_name text not null default '',
  phone text not null default '',
  parent_phone text,
  grade text not null default 'first_secondary'
    check (grade in ('first_secondary', 'second_secondary')),
  month text,
  course_id uuid references public.courses(id) on delete set null
);

-- ----- 008_notifications -----
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ----- 007/039 الواجبات (الحد الأدنى المطلوب لدالة لوحة التفوق 038) -----
create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  auto_score numeric default 0,
  created_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

-- ----- 043 has_confirmed_booking (النسخة الحالية في الإنتاج) -----
create or replace function public.has_confirmed_booking()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.student_id = auth.uid() and b.status = 'confirmed'
      and (
        b.course_id is not null
        or (b.grade = (select grade from public.profiles where id = auth.uid()) and b.month is not null)
        or (b.grade = 'professional' and b.course_id is not null)
      )
  );
$$;
grant execute on function public.has_confirmed_booking() to authenticated;

-- ----- 016 can_access_exam (النسخة القديمة — ليتضح استبدالها في 047) -----
create or replace function public.can_access_exam(p_exam_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.has_confirmed_booking()
    and exists (
      select 1 from public.exams e
      where e.id = p_exam_id
        and e.is_published = true
        and e.grade = (select grade from public.profiles where id = auth.uid())
    );
$$;
grant execute on function public.can_access_exam(uuid) to authenticated;

-- ----- RLS (010) -----
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.bookings enable row level security;
alter table public.notifications enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to authenticated;

grant select on public.profiles to authenticated;
grant select on public.courses to authenticated;
grant select on public.exams to authenticated;
grant select on public.exam_questions to authenticated;
grant select on public.exam_submissions to authenticated;
grant select on public.bookings to authenticated;
grant select on public.notifications to authenticated;

grant insert, update, delete on public.exams to authenticated;
grant insert, update, delete on public.exam_questions to authenticated;
grant insert, update, delete on public.exam_submissions to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_student() to authenticated;

create policy "profiles: select own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "courses: authenticated users read"
  on public.courses for select to authenticated
  using (true);

-- سياسة 016 القديمة (قبل 047): can_access_exam
create policy "exams: students read accessible"
  on public.exams for select to authenticated
  using (public.is_admin() or public.can_access_exam(id));

create policy "exams: admin write"
  on public.exams for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "exam_questions: admin only (no student access)"
  on public.exam_questions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "exam_submissions: admin only direct access"
  on public.exam_submissions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
