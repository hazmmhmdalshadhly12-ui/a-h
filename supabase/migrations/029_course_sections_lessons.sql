-- ============================================================
-- 029_course_sections_lessons.sql
-- هيكل الكورسات: كورس → أقسام → دروس
-- وصول الطالب: الاشتراك المؤكد يفتح الدروس
-- ============================================================

-- ============================================================
-- 1) جدول الأقسام (Sections) — تابع للكورس
-- ============================================================
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- إضافة الأعمدة لو الجدول موجود من غير الأعمدة دي
alter table public.course_sections
  add column if not exists course_id uuid references public.courses(id) on delete cascade;

create index if not exists course_sections_course_idx on public.course_sections (course_id, order_index);

alter table public.course_sections enable row level security;

grant select on public.course_sections to authenticated;

drop policy if exists "course_sections: student read own grade or professional" on public.course_sections;
create policy "course_sections: student read own grade or professional"
  on public.course_sections for select to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_sections.course_id
        and (c.grade = (select grade from public.profiles where id = auth.uid()) or c.grade = 'professional')
    )
  );

drop policy if exists "course_sections: admin all" on public.course_sections;
create policy "course_sections: admin all"
  on public.course_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 2) جدول الدروس (Lessons) — تابع للقسم
-- ============================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  video_provider text,
  duration_minutes int,
  order_index int not null default 0,
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);

-- إضافة الأعمدة لو الجدول موجود من غير الأعمدة دي
alter table public.lessons
  add column if not exists section_id uuid references public.course_sections(id) on delete cascade;

create index if not exists lessons_section_idx on public.lessons (section_id, order_index);

alter table public.lessons enable row level security;

grant select on public.lessons to authenticated;

drop policy if exists "lessons: student read own grade or professional" on public.lessons;
create policy "lessons: student read own grade or professional"
  on public.lessons for select to authenticated
  using (
    exists (
      select 1 from public.course_sections cs
      join public.courses c on c.id = cs.course_id
      where cs.id = lessons.section_id
        and (c.grade = (select grade from public.profiles where id = auth.uid()) or c.grade = 'professional')
    )
  );

drop policy if exists "lessons: admin all" on public.lessons;
create policy "lessons: admin all"
  on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 3) دالة: هل الطالب يقدر يدخل الدرس؟
-- ============================================================
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_lesson_id uuid;
  v_section_id uuid;
  v_course_id uuid;
  v_lesson_is_free boolean;
  v_course_grade text;
  v_course_month text;
  v_months text[];
  v_first text;
  v_last text;
begin
  if p_lesson_id is null then
    return false;
  end if;

  select l.id, l.section_id, l.is_free, cs.course_id
  into v_lesson_id, v_section_id, v_lesson_is_free, v_course_id
  from public.lessons l
  join public.course_sections cs on cs.id = l.section_id
  where l.id = p_lesson_id;

  if not found then
    return false;
  end if;

  if v_lesson_is_free then
    return true;
  end if;

  select grade, to_char(created_at, 'YYYY-MM')
  into v_course_grade, v_course_month
  from public.courses
  where id = v_course_id;

  if v_course_grade is null then
    return false;
  end if;

  if v_course_grade = 'professional' then
    return exists (
      select 1 from public.bookings b
      where b.student_id = auth.uid()
        and b.status = 'confirmed'
        and b.course_id = v_course_id
    );
  end if;

  if v_course_month is null then
    return false;
  end if;

  select public.get_confirmed_months() into v_months;
  if array_length(v_months, 1) is null then
    return false;
  end if;

  v_first := v_months[1];
  v_last := v_months[array_length(v_months, 1)];
  return v_course_month >= v_first and v_course_month <= v_last;
end;
$$;
grant execute on function public.can_access_lesson(uuid) to authenticated;

-- ============================================================
-- 4) دالة: جلب أقسام الكورس مع الدروس (للطالب)
-- ============================================================
create or replace function public.get_course_sections_with_lessons(p_course_id uuid)
returns table (
  section_id uuid,
  section_title text,
  section_description text,
  section_order int,
  lesson_id uuid,
  lesson_title text,
  lesson_description text,
  lesson_video_url text,
  lesson_video_provider text,
  lesson_duration int,
  lesson_order int,
  lesson_is_free boolean,
  lesson_accessible boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (c.grade = (select grade from public.profiles where id = auth.uid()) or c.grade = 'professional')
  ) then
    raise exception 'هذا الكورس ليس لصفك';
  end if;

  return query
    select
      cs.id,
      cs.title,
      cs.description,
      cs.order_index,
      l.id,
      l.title,
      l.description,
      l.video_url,
      l.video_provider,
      l.duration_minutes,
      l.order_index,
      l.is_free,
      public.can_access_lesson(l.id) as lesson_accessible
    from public.course_sections cs
    left join public.lessons l on l.section_id = cs.id
    where cs.course_id = p_course_id
    order by cs.order_index asc, l.order_index asc;
end;
$$;
grant execute on function public.get_course_sections_with_lessons(uuid) to authenticated;

-- ============================================================
-- 5) تحديث can_access_course
-- ============================================================
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_accessible boolean;
begin
  if p_course_id is null then
    return false;
  end if;

  select exists (
    select 1 from public.lessons l
    join public.course_sections cs on cs.id = l.section_id
    where cs.course_id = p_course_id
      and public.can_access_lesson(l.id)
  ) into v_accessible;

  return v_accessible;
end;
$$;
grant execute on function public.can_access_course(uuid) to authenticated;

-- ============================================================
-- 6) تحديث get_student_courses
-- ============================================================
create or replace function public.get_student_courses(p_grade text)
returns table (
  course_id uuid,
  title text,
  description text,
  grade text,
  video_url text,
  image_url text,
  price numeric,
  section_id uuid,
  section_title text,
  order_index int,
  created_at timestamptz,
  accessible boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_grade text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select grade into v_grade from public.profiles where id = auth.uid();
  if v_grade is null then
    raise exception 'البروفايل غير موجود';
  end if;

  return query
    select
      c.id,
      c.title,
      c.description,
      c.grade,
      case when public.can_access_course(c.id) then c.video_url else null end as video_url,
      c.image_url,
      c.price,
      c.section_id,
      s.title,
      c.order_index,
      c.created_at,
      public.can_access_course(c.id) as accessible
    from public.courses c
    left join public.course_sections s on s.id = c.section_id
    where c.grade = v_grade or c.grade = 'professional'
    order by c.order_index asc;
end;
$$;
grant execute on function public.get_student_courses(text) to authenticated;

-- ============================================================
-- 7) منح الصلاحيات
-- ============================================================
grant select on public.course_sections to authenticated;
grant select on public.lessons to authenticated;
grant execute on function public.can_access_lesson(uuid) to authenticated;
grant execute on function public.get_course_sections_with_lessons(uuid) to authenticated;
grant execute on function public.can_access_course(uuid) to authenticated;
grant execute on function public.get_student_courses(text) to authenticated;