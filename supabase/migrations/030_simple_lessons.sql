-- ============================================================
-- 030_simple_lessons.sql
-- هيكل مبسط: كورس → دروس (من غير أقسام)
-- ============================================================

-- ============================================================
-- 1) جدول الدروس - مرتبط بالكورس مباشرة
-- ============================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  video_provider text,          -- 'youtube' | 'direct' | 'vimeo'
  duration_minutes int,
  order_index int not null default 0,
  is_free boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists lessons_course_idx on public.lessons (course_id, order_index);

alter table public.lessons enable row level security;
grant select on public.lessons to authenticated;

-- الطالب يشوف دروس الكورسات لصفه أو الاحترافي
drop policy if exists "lessons: student read own grade or professional" on public.lessons;
create policy "lessons: student read own grade or professional"
  on public.lessons for select to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
        and (c.grade = (select grade from public.profiles where id = auth.uid()) or c.grade = 'professional')
    )
  );

drop policy if exists "lessons: admin all" on public.lessons;
create policy "lessons: admin all"
  on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 2) دالة: هل الطالب يقدر يدخل الدرس؟
-- ============================================================
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_id uuid;
  v_lesson_is_free boolean;
  v_course_grade text;
  v_course_month text;
  v_months text[];
begin
  if p_lesson_id is null then return false; end if;

  select l.course_id, l.is_free
  into v_course_id, v_lesson_is_free
  from public.lessons where id = p_lesson_id;
  if not found then return false; end if;

  -- درس مجاني → مفتوح للجميع
  if (select is_free from public.lessons where id = p_lesson_id) then return true; end if;

  select grade, to_char(created_at, 'YYYY-MM')
  into v_course_grade, v_course_month
  from public.courses where id = v_course_id;
  if v_course_grade is null then return false; end if;

  -- كورس احترافي: لازم حجز مؤكد على نفس الكورس
  if v_course_grade = 'professional' then
    return exists (
      select 1 from public.bookings b
      where b.student_id = auth.uid() and b.status = 'confirmed' and b.course_id = v_course_id
    );
  end if;

  -- كورس عادي: النطاق الشهري
  if v_course_month is null then return false; end if;
  select public.get_confirmed_months() into v_months;
  if array_length(v_months, 1) is null then return false; end if;
  return v_course_month >= v_months[1] and v_course_month <= v_months[array_length(v_months, 1)];
end;
$$;
grant execute on function public.can_access_lesson(uuid) to authenticated;

-- ============================================================
-- 3) جلب دروس الكورس للطالب
-- ============================================================
create or replace function public.get_course_lessons(p_course_id uuid)
returns table (
  lesson_id uuid,
  title text,
  description text,
  video_url text,
  video_provider text,
  duration_minutes int,
  order_index int,
  is_free boolean,
  accessible boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if not exists (
    select 1 from public.courses c
    where c.id = p_course_id and (c.grade = (select grade from public.profiles where id = auth.uid()) or c.grade = 'professional')
  ) then raise exception 'هذا الكورس ليس لصفك'; end if;

  return query
    select l.id, l.title, l.description, l.video_url, l.video_provider,
           l.duration_minutes, l.order_index, l.is_free,
           public.can_access_lesson(l.id) as accessible
    from public.lessons l
    where l.course_id = p_course_id
    order by l.order_index asc;
end;
$$;
grant execute on function public.get_course_lessons(uuid) to authenticated;

-- ============================================================
-- 4) تحديث can_access_course
-- ============================================================
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare v_accessible boolean;
begin
  if p_course_id is null then return false; end if;
  select exists (select 1 from public.lessons l where l.course_id = p_course_id and public.can_access_lesson(l.id))
  into v_accessible;
  return v_accessible;
end;
$$;
grant execute on function public.can_access_course(uuid) to authenticated;

-- ============================================================
-- 5) منح الصلاحيات
-- ============================================================
grant select on public.lessons to authenticated;
grant execute on function public.can_access_lesson(uuid) to authenticated;
grant execute on function public.get_course_lessons(uuid) to authenticated;
grant execute on function public.can_access_course(uuid) to authenticated;