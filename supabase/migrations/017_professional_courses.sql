-- ============================================================
-- 017_professional_courses.sql
-- تطوير شامل:
--   1) الكورس الاحترافي: grade='professional' + سعر (price)
--      نظامه "مستويات" مش صفوف — الأدمن يختار "الكورس الاحترافي"
--   2) نص المحاضرة (lessons.content)
--   3) تعليقات جوه الكورس (course_comments) — مسح/تثبيت من الأدمن
--   4) ملفات جوه الكورس (course_files) pdf/zip — الأدمن والطلاب يرفعوا، الكل ينزّل
--   5) فتح الشهور يدوياً للطالب (student_month_grants) — حتى لو شهر قديم
--   6) الحجز: دعم course_id للاحترافي + رقم التحويل
--   7) RLS + دوال الوصول المحسّنة
-- ============================================================

-- ============================================================
-- 1) توسيع القيود لتدعم "professional" (الكورس الاحترافي)
-- ============================================================
alter table public.profiles drop constraint if exists profiles_grade_check;
alter table public.profiles
  add constraint profiles_grade_check
  check (grade in ('first_secondary', 'second_secondary', 'professional'));

alter table public.courses drop constraint if exists courses_grade_check;
alter table public.courses
  add constraint courses_grade_check
  check (grade in ('first_secondary', 'second_secondary', 'professional'));

alter table public.course_sections drop constraint if exists course_sections_grade_check;
alter table public.course_sections
  add constraint course_sections_grade_check
  check (grade in ('first_secondary', 'second_secondary', 'professional'));

alter table public.bookings drop constraint if exists bookings_grade_check;
alter table public.bookings
  add constraint bookings_grade_check
  check (grade in ('first_secondary', 'second_secondary', 'professional'));

alter table public.exams drop constraint if exists exams_grade_check;
alter table public.exams
  add constraint exams_grade_check
  check (grade in ('first_secondary', 'second_secondary', 'professional'));

-- ============================================================
-- 2) الكورس الاحترافي: سعر + نص المحاضرة
-- ============================================================
alter table public.courses
  add column if not exists price numeric;

-- الـ view العام للزوار — يضيف السعر (للكورس الاحترافي) مع الحفاظ على الصيغة الحالية
drop view if exists public.courses_public;
create view public.courses_public as
select id, title, description, grade, order_index, price
from public.courses;
grant select on public.courses_public to anon, authenticated;

alter table public.lessons
  add column if not exists content text;

-- ============================================================
-- 3) الحجز: الكورس المحدد (للكورس الاحترافي) — شهره null
-- ============================================================
alter table public.bookings
  add column if not exists course_id uuid references public.courses(id) on delete set null;

-- ============================================================
-- 4) تعليقات جوه الكورس
-- ============================================================
create table if not exists public.course_comments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists course_comments_course_idx on public.course_comments (course_id, created_at);

-- ============================================================
-- 5) ملفات جوه الكورس (pdf/zip) — رفع من الأدمن أو الطلاب
-- ============================================================
create table if not exists public.course_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  file_url text not null,
  file_type text not null default 'file'
    check (file_type in ('pdf', 'zip', 'file')),
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists course_files_course_idx on public.course_files (course_id, created_at);

-- ============================================================
-- 6) فتح الشهور يدوياً (منح الأدمن) — حتى الشهور القديمة
-- ============================================================
create table if not exists public.student_month_grants (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  granted_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, month)
);

create index if not exists student_month_grants_student_idx on public.student_month_grants (student_id);

-- ============================================================
-- 7) RLS للجداول الجديدة
-- ============================================================
alter table public.course_comments enable row level security;
alter table public.course_files enable row level security;
alter table public.student_month_grants enable row level security;

-- التعليقات: يقرأها كل المسجلين، يكتبها الطالب لنفسه، يديرها الأدمن
create policy "course_comments: read authenticated"
  on public.course_comments for select to authenticated using (true);
create policy "course_comments: admin write"
  on public.course_comments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "course_comments: student insert own"
  on public.course_comments for insert to authenticated
  with check (student_id = auth.uid());
create policy "course_comments: student delete own"
  on public.course_comments for delete to authenticated
  using (student_id = auth.uid());

-- الملفات: يقرأها كل المسجلين، يرفعها الأدمن والطلاب
create policy "course_files: read authenticated"
  on public.course_files for select to authenticated using (true);
create policy "course_files: admin write"
  on public.course_files for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "course_files: student insert own"
  on public.course_files for insert to authenticated
  with check (uploaded_by = auth.uid());
create policy "course_files: student delete own"
  on public.course_files for delete to authenticated
  using (uploaded_by = auth.uid());

-- منح الشهور: الأدمن فقط (يقرأ ويكتب)
create policy "student_month_grants: admin all"
  on public.student_month_grants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select, insert on public.course_comments to authenticated;
grant update, delete on public.course_comments to authenticated;
grant select, insert on public.course_files to authenticated;
grant update, delete on public.course_files to authenticated;
grant select, insert, delete on public.student_month_grants to authenticated;

-- ============================================================
-- 8) الوصول الاحترافي
-- ------------------------------------------------------------
-- القاعدة:
--  - الكورسات العادية (أولى/تانية): النطاق الشهري [أول..آخر شهر مؤكد]
--    ويشمل المنح اليدوية من الأدمن (student_month_grants)
--  - الكورس الاحترافي: الطالب محتاج حجز مؤكد على نفس الكورس
--    (course_id في الحجز + grade='professional' + status='confirmed')
-- ============================================================
create or replace function public.get_confirmed_months()
returns text[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(m order by m), '{}') from (
    select b.month as m
    from public.bookings b
    where b.student_id = auth.uid() and b.status = 'confirmed' and b.month is not null
    union
    select g.month as m
    from public.student_month_grants g
    where g.student_id = auth.uid()
  ) months;
$$;

create or replace function public.has_confirmed_booking()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.student_id = auth.uid() and b.status = 'confirmed'
  );
$$;

-- هل الكورس متاح للطالب الحالي؟
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_month text;
  v_grade text;
  v_months text[] := public.get_confirmed_months();
  v_first text;
  v_last text;
begin
  if p_course_id is null then
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
      where b.student_id = auth.uid()
        and b.status = 'confirmed'
        and b.course_id = p_course_id
    );
  end if;

  -- الكورسات العادية: النطاق الشهري (يشمل المنح اليدوية)
  if v_course_month is null then
    return false;
  end if;
  if array_length(v_months, 1) is null then
    return false;
  end if;

  v_first := v_months[1];
  v_last := v_months[array_length(v_months, 1)];
  return v_course_month >= v_first and v_course_month <= v_last;
end;
$$;

-- هل الامتحان متاح؟ (الاحترافي: حجز مؤكد — نفس منطق العادي)
create or replace function public.can_access_exam(p_exam_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.has_confirmed_booking()
    and exists (
      select 1 from public.exams e
      where e.id = p_exam_id and e.is_published = true
        and e.grade = (select grade from public.profiles where id = auth.uid())
    );
$$;

-- كورسات الطالب كاملة (مع العلم accessible) — يظهر السعر للاحترافي
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
    where c.grade = p_grade
    order by c.order_index asc;
end;
$$;

grant execute on function public.get_student_courses(text) to authenticated;

-- ============================================================
-- 8b) محاضرات الكورس — مع نص المحاضرة (lessons.content)
-- ============================================================
drop function if exists public.get_course_lessons(uuid);
create or replace function public.get_course_lessons(p_course_id uuid)
returns table (
  lesson_id uuid,
  course_id uuid,
  title text,
  video_url text,
  content text,
  order_index int
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() and not public.can_access_course(p_course_id) then
    raise exception 'هذا الكورس غير متاح لاشتراكك الحالي';
  end if;

  return query
    select l.id, l.course_id, l.title, l.video_url, l.content, l.order_index
    from public.lessons l
    where l.course_id = p_course_id
    order by l.order_index asc;
end;
$$;

grant execute on function public.get_course_lessons(uuid) to authenticated;

-- ============================================================
-- 9) دوال التعليقات
-- ============================================================
create or replace function public.get_course_comments(p_course_id uuid)
returns table (
  comment_id uuid,
  body text,
  is_pinned boolean,
  created_at timestamptz,
  student_id uuid,
  student_name text
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  return query
    select
      cc.id,
      cc.body,
      cc.is_pinned,
      cc.created_at,
      cc.student_id,
      p.full_name
    from public.course_comments cc
    join public.profiles p on p.id = cc.student_id
    where cc.course_id = p_course_id
    order by cc.is_pinned desc, cc.created_at asc;
end;
$$;

grant execute on function public.get_course_comments(uuid) to authenticated;

create or replace function public.add_course_comment(p_course_id uuid, p_body text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if p_course_id is null or nullif(trim(p_body), '') is null then
    raise exception 'اكتب تعليقك الأول';
  end if;

  insert into public.course_comments (course_id, student_id, body)
  values (p_course_id, auth.uid(), trim(p_body))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_course_comment(uuid, text) to authenticated;

-- حذف تعليق — صاحبه أو الأدمن
create or replace function public.delete_course_comment(p_comment_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  delete from public.course_comments cc
  where cc.id = p_comment_id
    and (cc.student_id = auth.uid() or public.is_admin());

  if not found then
    raise exception 'غير مصرح بحذف هذا التعليق';
  end if;
end;
$$;

grant execute on function public.delete_course_comment(uuid) to authenticated;

-- تثبيت/فك تثبيت تعليق — الأدمن فقط
create or replace function public.toggle_pin_comment(p_comment_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() then
    raise exception 'غير مصرح';
  end if;

  update public.course_comments
  set is_pinned = not is_pinned
  where id = p_comment_id;
end;
$$;

grant execute on function public.toggle_pin_comment(uuid) to authenticated;

-- ============================================================
-- 10) دوال الملفات
-- ============================================================
create or replace function public.get_course_files(p_course_id uuid)
returns table (
  file_id uuid,
  title text,
  file_url text,
  file_type text,
  uploaded_by uuid,
  uploader_name text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  return query
    select
      f.id,
      f.title,
      f.file_url,
      f.file_type,
      f.uploaded_by,
      p.full_name,
      f.created_at
    from public.course_files f
    join public.profiles p on p.id = f.uploaded_by
    where f.course_id = p_course_id
    order by f.created_at desc;
end;
$$;

grant execute on function public.get_course_files(uuid) to authenticated;

create or replace function public.add_course_file(p_course_id uuid, p_title text, p_file_url text, p_file_type text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if p_course_id is null or nullif(trim(p_title), '') is null or nullif(trim(p_file_url), '') is null then
    raise exception 'بيانات الملف ناقصة';
  end if;

  insert into public.course_files (course_id, title, file_url, file_type, uploaded_by)
  values (p_course_id, trim(p_title), trim(p_file_url), coalesce(p_file_type, 'file'), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_course_file(uuid, text, text, text) to authenticated;

-- حذف ملف — رافعه أو الأدمن
create or replace function public.delete_course_file(p_file_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  delete from public.course_files f
  where f.id = p_file_id
    and (f.uploaded_by = auth.uid() or public.is_admin());

  if not found then
    raise exception 'غير مصرح بحذف هذا الملف';
  end if;
end;
$$;

grant execute on function public.delete_course_file(uuid) to authenticated;

-- ============================================================
-- 11) منح الشهور يدوياً (الأدمن)
-- ============================================================
create or replace function public.add_student_month_grant(p_student_id uuid, p_month text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() then
    raise exception 'غير مصرح';
  end if;

  if p_student_id is null or nullif(p_month, '') is null then
    raise exception 'اختر الطالب والشهر';
  end if;

  insert into public.student_month_grants (student_id, month, granted_by)
  values (p_student_id, p_month, auth.uid())
  on conflict (student_id, month) do nothing
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_student_month_grant(uuid, text) to authenticated;

create or replace function public.remove_student_month_grant(p_grant_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() then
    raise exception 'غير مصرح';
  end if;

  delete from public.student_month_grants where id = p_grant_id;
end;
$$;

grant execute on function public.remove_student_month_grant(uuid) to authenticated;

-- منح الطالب + حجوزاته المؤكدة (للأدمن — عرض الشهور المتاحة للطالب)
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

  if not public.is_admin() then
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
-- 12) حساب المبلغ الاحترافي (اختياري — للعرض)
-- ============================================================
create or replace function public.get_course_price(p_course_id uuid)
returns numeric
language sql stable security definer set search_path = public
as $$
  select price from public.courses where id = p_course_id;
$$;

grant execute on function public.get_course_price(uuid) to authenticated;

-- ============================================================
-- 13) Storage bucket لملفات الكورس
-- ============================================================
insert into storage.buckets (id, name, public)
values ('course-files', 'course-files', true)
on conflict (id) do nothing;

drop policy if exists "course-files: public read" on storage.objects;
create policy "course-files: public read" on storage.objects
  for select using (bucket_id = 'course-files');
drop policy if exists "course-files: authenticated upload" on storage.objects;
create policy "course-files: authenticated upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'course-files');
drop policy if exists "course-files: owner update" on storage.objects;
create policy "course-files: owner update" on storage.objects
  for update to authenticated using (bucket_id = 'course-files') with check (bucket_id = 'course-files');
drop policy if exists "course-files: owner delete" on storage.objects;
create policy "course-files: owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'course-files');