-- ============================================================
-- 018_parents.sql
-- نظام "ولي الأمر" + فتح الكورس الاحترافي لكل الصفوف
--
--  1) دور جديد: role='parent' في البروفايلات + handle_new_user يقرأه من metadata
--  2) جدول student_parents — ربط ولي الأمر بالطالب (برقم موبايل الطالب)
--  3) دوال ولي الأمر: أولاده + درجات + حالة الامتحانات + حالة الواجبات + حالة الكورسات
--  4) شات ولي الأمر: بيستخدم نفس get_or_create_conversation (conversations.student_id = id ولي الأمر)
--  5) الكورس الاحترافي بيظهر لكل الصفوف (get_student_courses) + حجز مؤكد على الكورس يفتحه
-- ============================================================

-- ============================================================
-- 1) دور "ولي الأمر"
-- ============================================================
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'admin', 'parent'));

create or replace function public.is_parent()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'parent'
  );
$$;

grant execute on function public.is_parent() to authenticated;

-- إنشاء البروفايل: يقرأ role (ولي أمر / طالب) من بيانات التسجيل
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, parent_phone, grade, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'parent_phone', ''),
    coalesce(nullif(new.raw_user_meta_data->>'grade', ''), 'first_secondary'),
    new.email,
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student')
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

-- ============================================================
-- 2) جدول ربط ولي الأمر بالطالب
-- ============================================================
create table if not exists public.student_parents (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

create index if not exists student_parents_parent_idx on public.student_parents (parent_id);
create index if not exists student_parents_student_idx on public.student_parents (student_id);

alter table public.student_parents enable row level security;

grant select, insert, delete on public.student_parents to authenticated;

-- ولي الأمر يشوف أولاده (أو الأدمن يشوف الكل)
create policy "student_parents: read own or admin"
  on public.student_parents for select to authenticated
  using (parent_id = auth.uid() or public.is_admin());

create policy "student_parents: parent insert own"
  on public.student_parents for insert to authenticated
  with check (parent_id = auth.uid() and public.is_parent());

create policy "student_parents: parent delete own or admin"
  on public.student_parents for delete to authenticated
  using (parent_id = auth.uid() or public.is_admin());

-- ============================================================
-- 3) دوال ولي الأمر
-- ============================================================

-- هل ولي الأمر الحالي مرتبط بالطالب ده؟
create or replace function public.is_linked_parent(p_student_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.student_parents sp
    where sp.parent_id = auth.uid() and sp.student_id = p_student_id
  );
$$;

grant execute on function public.is_linked_parent(uuid) to authenticated;

-- ربط ولي الأمر بالطالب برقم موبايل الطالب
create or replace function public.link_student_to_parent(p_student_phone text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_parent() then
    raise exception 'غير مصرح';
  end if;

  if nullif(trim(p_student_phone), '') is null then
    raise exception 'اكتب رقم الطالب';
  end if;

  select id into v_student
  from public.profiles
  where role = 'student' and phone = trim(p_student_phone)
  limit 1;

  if v_student is null then
    raise exception 'ما لقيناش طالب مسجل برقم الموبايل ده';
  end if;

  insert into public.student_parents (parent_id, student_id)
  values (auth.uid(), v_student)
  on conflict (parent_id, student_id) do nothing;

  return v_student;
end;
$$;

grant execute on function public.link_student_to_parent(text) to authenticated;

-- فك ربط طالب
create or replace function public.unlink_student(p_student_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_parent() then
    raise exception 'غير مصرح';
  end if;

  delete from public.student_parents
  where parent_id = auth.uid() and student_id = p_student_id;
end;
$$;

grant execute on function public.unlink_student(uuid) to authenticated;

-- أولاد ولي الأمر (بيانات الطلاب المرتبطين)
create or replace function public.get_parent_students()
returns table (
  student_id uuid,
  full_name text,
  phone text,
  grade text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_parent() then
    raise exception 'غير مصرح';
  end if;

  return query
    select p.id, p.full_name, p.phone, p.grade, sp.created_at
    from public.student_parents sp
    join public.profiles p on p.id = sp.student_id
    where sp.parent_id = auth.uid()
    order by sp.created_at asc;
end;
$$;

grant execute on function public.get_parent_students() to authenticated;

-- درجات الطالب (تظهر بس لما المستر ينشر النتيجة)
create or replace function public.get_student_grades_for_parent(p_student_id uuid)
returns table (
  exam_id uuid,
  exam_title text,
  submitted_at timestamptz,
  grade_released boolean,
  score numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not (public.is_admin() or public.is_linked_parent(p_student_id)) then
    raise exception 'غير مصرح';
  end if;

  return query
    select s.exam_id, e.title, s.submitted_at, s.grade_released,
           case when s.grade_released then s.score else null end as score
    from public.exam_submissions s
    join public.exams e on e.id = s.exam_id
    where s.student_id = p_student_id
    order by s.submitted_at desc;
end;
$$;

grant execute on function public.get_student_grades_for_parent(uuid) to authenticated;

-- حالة امتحانات صف الطالب: هل في امتحانات؟ سلم ولا لأ؟
create or replace function public.get_student_exam_status(p_student_id uuid)
returns table (
  exam_id uuid,
  title text,
  grade text,
  is_published boolean,
  submitted boolean,
  submitted_at timestamptz,
  grade_released boolean,
  score numeric
)
language plpgsql security definer set search_path = public
as $$
declare
  v_grade text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not (public.is_admin() or public.is_linked_parent(p_student_id)) then
    raise exception 'غير مصرح';
  end if;

  select grade into v_grade from public.profiles where id = p_student_id;
  if v_grade is null then
    raise exception 'الطالب غير موجود';
  end if;

  return query
    select
      e.id,
      e.title,
      e.grade,
      e.is_published,
      (s.id is not null) as submitted,
      s.submitted_at,
      s.grade_released,
      case when s.grade_released then s.score else null end as score
    from public.exams e
    left join public.exam_submissions s
      on s.exam_id = e.id and s.student_id = p_student_id
    where e.is_published = true and e.grade = v_grade
    order by e.start_at asc nulls last;
end;
$$;

grant execute on function public.get_student_exam_status(uuid) to authenticated;

-- حالة واجبات الطالب: هل في واجبات؟ سلم ولا لأ؟
create or replace function public.get_student_homework_status(p_student_id uuid)
returns table (
  homework_id uuid,
  title text,
  course_title text,
  submitted boolean,
  auto_score numeric,
  total_points numeric,
  submitted_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not (public.is_admin() or public.is_linked_parent(p_student_id)) then
    raise exception 'غير مصرح';
  end if;

  return query
    select
      h.id,
      h.title,
      c.title,
      (hs.id is not null) as submitted,
      hs.auto_score,
      hs.total_points,
      hs.submitted_at
    from public.homeworks h
    join public.courses c on c.id = h.course_id
    left join public.homework_submissions hs
      on hs.homework_id = h.id and hs.student_id = p_student_id
    order by h.created_at desc;
end;
$$;

grant execute on function public.get_student_homework_status(uuid) to authenticated;

-- هل الكورس متاح لطالب محدد (بدون الاعتماد على auth.uid كطالب)
create or replace function public.can_access_course_for_student(p_course_id uuid, p_student_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_month text;
  v_grade text;
  v_months text[];
  v_first text;
  v_last text;
begin
  if p_course_id is null or p_student_id is null then
    return false;
  end if;

  select c.grade, to_char(c.created_at, 'YYYY-MM') into v_grade, v_course_month
  from public.courses c where c.id = p_course_id;
  if v_grade is null then
    return false;
  end if;

  -- الكورس الاحترافي: حجز مؤكد على نفس الكورس
  if v_grade = 'professional' then
    return exists (
      select 1 from public.bookings b
      where b.student_id = p_student_id
        and b.status = 'confirmed'
        and b.course_id = p_course_id
    );
  end if;

  if v_course_month is null then
    return false;
  end if;

  select coalesce(array_agg(m order by m), '{}') into v_months from (
    select b.month as m
    from public.bookings b
    where b.student_id = p_student_id and b.status = 'confirmed' and b.month is not null
    union
    select g.month as m
    from public.student_month_grants g
    where g.student_id = p_student_id
  ) months;

  if array_length(v_months, 1) is null then
    return false;
  end if;

  v_first := v_months[1];
  v_last := v_months[array_length(v_months, 1)];
  return v_course_month >= v_first and v_course_month <= v_last;
end;
$$;

grant execute on function public.can_access_course_for_student(uuid, uuid) to authenticated;

-- حالة كورسات الطالب (لكورسات صفه + الاحترافي) — لولي الأمر/الأدمن
create or replace function public.get_student_course_access(p_student_id uuid)
returns table (
  course_id uuid,
  title text,
  grade text,
  price numeric,
  accessible boolean,
  order_index int,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
declare
  v_grade text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not (public.is_admin() or public.is_linked_parent(p_student_id)) then
    raise exception 'غير مصرح';
  end if;

  select grade into v_grade from public.profiles where id = p_student_id;
  if v_grade is null then
    raise exception 'الطالب غير موجود';
  end if;

  return query
    select
      c.id,
      c.title,
      c.grade,
      c.price,
      public.can_access_course_for_student(c.id, p_student_id) as accessible,
      c.order_index,
      c.created_at
    from public.courses c
    where c.grade = v_grade or c.grade = 'professional'
    order by c.order_index asc;
end;
$$;

grant execute on function public.get_student_course_access(uuid) to authenticated;

-- تفاصيل وصول الطالب (الأشهر المؤكدة + الكورسات الاحترافية) — الأدمن أو ولي الأمر المرتبط
create or replace function public.get_student_access(p_student_id uuid)
returns table (
  kind text,
  month text,
  course_title text,
  created_at timestamptz,
  ref_id uuid
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not (public.is_admin() or public.is_linked_parent(p_student_id)) then
    raise exception 'غير مصرح';
  end if;

  if p_student_id is null then
    raise exception 'حدد الطالب';
  end if;

  return query
    select 'booking', b.month, null::text, b.created_at, b.id
    from public.bookings b
    where b.student_id = p_student_id and b.status = 'confirmed' and b.month is not null
    union all
    select 'grant', g.month, null::text, g.created_at, g.id
    from public.student_month_grants g
    where g.student_id = p_student_id
    union all
    select 'course', null, c.title, b.created_at, b.id
    from public.bookings b
    join public.courses c on c.id = b.course_id
    where b.student_id = p_student_id and b.status = 'confirmed' and b.course_id is not null
    order by created_at desc;
end;
$$;

grant execute on function public.get_student_access(uuid) to authenticated;

-- ============================================================
-- 4) الكورس الاحترافي يظهر لكل الصفوف
-- ------------------------------------------------------------
-- get_student_courses يرجع كورسات صف الطالب + الكورسات الاحترافية
-- (طلاب أولى/تانية يشوفوا الاحترافي ولو عايزين يشتركوا — الحجز المؤكد على الكورس يفتحه)
-- ============================================================

-- ---- إصلاح أمان مهم ----
-- الاشتراك المؤكد لازم يكون "لصف الطالب نفسه" مش أي حجز:
-- طالب أولى/تانية اشترك في الاحترافي بس (grade='professional') ميحصلش
-- وصول لامتحانات وواجبات صفه العادي — الحجز الاحترافي بيخص الكورس بس.
create or replace function public.has_confirmed_booking()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.student_id = auth.uid() and b.status = 'confirmed'
      and b.grade = (select grade from public.profiles where id = auth.uid())
  );
$$;

grant execute on function public.has_confirmed_booking() to authenticated;

drop function if exists public.get_student_courses(text);
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
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  return query
    select
      c.id,
      c.title,
      c.description,
      c.grade,
      c.video_url,
      c.image_url,
      c.price,
      c.section_id,
      s.title,
      c.order_index,
      c.created_at,
      public.can_access_course(c.id) as accessible
    from public.courses c
    left join public.course_sections s on s.id = c.section_id
    where c.grade = p_grade or c.grade = 'professional'
    order by c.order_index asc;
end;
$$;

grant execute on function public.get_student_courses(text) to authenticated;
