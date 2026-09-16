-- ============================================================
-- 039_lesson_progress.sql
-- تتبع مشاهدة الدروس: من فتح الكورس/الدرس وكم دقيقة شاهد
-- ============================================================

-- جدول تتبع تقدم كل طالب في كل درس
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched_seconds int not null default 0,          -- مجموع الثواني المشاهدة فعلياً
  last_position int not null default 0,            -- آخر نقطة توقف بالثواني
  view_count int not null default 0,               -- عدد مرات فتح الدرس
  first_opened_at timestamptz not null default now(),
  last_opened_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create index if not exists lesson_progress_student_idx on public.lesson_progress (student_id);
create index if not exists lesson_progress_course_idx on public.lesson_progress (course_id);
create index if not exists lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

alter table public.lesson_progress enable row level security;

grant select, insert, update on public.lesson_progress to authenticated;

-- الطالب: يقرأ/يكتب سجلاته هو فقط
drop policy if exists "lesson_progress: student own" on public.lesson_progress;
create policy "lesson_progress: student own"
  on public.lesson_progress for all to authenticated
  using (student_id = auth.uid() or public.is_admin())
  with check (student_id = auth.uid() or public.is_admin());

-- updated_at تلقائياً
create or replace function public.lesson_progress_touch()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.last_opened_at := now();
  return new;
end;
$$;

drop trigger if exists lesson_progress_touch on public.lesson_progress;
create trigger lesson_progress_touch
  before update on public.lesson_progress
  for each row execute procedure public.lesson_progress_touch();

-- دالة تسجيل/تحديث التقدم (آمنة: الطالب يحدث سجله فقط)
create or replace function public.record_lesson_progress(
  p_lesson_id uuid,
  p_watched_seconds int,
  p_last_position int
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_course uuid;
  v_existing int;
begin
  if v_student is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select course_id into v_course from public.lessons where id = p_lesson_id;
  if v_course is null then
    raise exception 'الدرس غير موجود';
  end if;

  -- تأكد أن الطالب له حق مشاهدة الكورس (أو الدرس مجاني)
  -- نسمح بالتسجيل حتى لو مقفول (للتتبع)، لكن last_position غير مطلوب

  select count(*) into v_existing from public.lesson_progress
  where student_id = v_student and lesson_id = p_lesson_id;

  if v_existing = 0 then
    insert into public.lesson_progress (student_id, course_id, lesson_id, watched_seconds, last_position, view_count)
    values (v_student, v_course, p_lesson_id, greatest(p_watched_seconds, 0), greatest(p_last_position, 0), 1);
  else
    update public.lesson_progress
    set
      -- نجمع الثواني (نمنع النقصان)
      watched_seconds = greatest(watched_seconds, p_watched_seconds, last_position + 1),
      last_position = greatest(last_position, p_last_position),
      view_count = view_count + 1
    where student_id = v_student and lesson_id = p_lesson_id;
  end if;
end;
$$;

grant execute on function public.record_lesson_progress(uuid, int, int) to authenticated;

-- دالة مباشرة: تسجيل فتح الدرس (view_count +1)
create or replace function public.record_lesson_open(p_lesson_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_course uuid;
begin
  if v_student is null then return; end if;
  select course_id into v_course from public.lessons where id = p_lesson_id;
  if v_course is null then return; end if;

  insert into public.lesson_progress (student_id, course_id, lesson_id, view_count)
  values (v_student, v_course, p_lesson_id, 1)
  on conflict (student_id, lesson_id)
  do update set
    view_count = lesson_progress.view_count + 1,
    last_opened_at = now(),
    updated_at = now();
end;
$$;

grant execute on function public.record_lesson_open(uuid) to authenticated;

-- دالة للأدمن: تقرير متابعة الكورس
create or replace function public.get_course_progress(p_course_id uuid)
returns table (
  student_id uuid,
  full_name text,
  grade text,
  lessons_opened bigint,
  total_minutes numeric,
  last_opened timestamptz,
  is_enrolled boolean
)
language plpgsql security definer set search_path = public
as $$
declare
  v_course_grade text;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح';
  end if;

  select grade into v_course_grade from public.courses where id = p_course_id;
  if v_course_grade is null then
    raise exception 'الكورس غير موجود';
  end if;

  return query
    with enrolled as (
      -- الطلاب الذين لهم حجز مؤكد للكورس/الصف
      select distinct pr.id, pr.full_name, pr.grade
      from public.profiles pr
      where pr.role = 'student'
        and (
          pr.grade = v_course_grade
          or exists (
            select 1 from public.bookings b
            where b.student_id = pr.id
              and b.status = 'confirmed'
              and (b.grade = v_course_grade or b.course_id = p_course_id)
          )
        )
    ),
    prog as (
      select
        lp.student_id,
        count(*) as opened,
        sum(lp.watched_seconds)::numeric / 60 as minutes,
        max(lp.last_opened_at) as last_opened
      from public.lesson_progress lp
      where lp.course_id = p_course_id
      group by lp.student_id
    )
    select
      e.id as student_id,
      e.full_name,
      e.grade,
      coalesce(p.opened, 0) as lessons_opened,
      coalesce(round(p.minutes, 1), 0) as total_minutes,
      p.last_opened,
      (p.opened is not null) as is_enrolled
    from enrolled e
    left join prog p on p.student_id = e.id
    order by p.minutes desc nulls last, e.full_name asc;
end;
$$;

grant execute on function public.get_course_progress(uuid) to authenticated;

-- دالة للأدمن: تفاصيل تقدم طالب في كل دروس الكورس
create or replace function public.get_student_lesson_progress(p_course_id uuid, p_student_id uuid)
returns table (
  lesson_id uuid,
  title text,
  order_index int,
  is_free boolean,
  watched_seconds int,
  last_position int,
  view_count int,
  last_opened_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'غير مصرح';
  end if;

  return query
    select
      l.id,
      l.title,
      l.order_index,
      l.is_free,
      coalesce(lp.watched_seconds, 0),
      coalesce(lp.last_position, 0),
      coalesce(lp.view_count, 0),
      lp.last_opened_at
    from public.lessons l
    left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = p_student_id
    where l.course_id = p_course_id
    order by l.order_index asc;
end;
$$;

grant execute on function public.get_student_lesson_progress(uuid, uuid) to authenticated;
