-- ============================================================
-- 021_security_hardening.sql
-- تحصين الأمان (نتيجة مراجعة شاملة):
--
-- [حرج] 1) الحجوزات: كان الطالب يقدر يعمل insert مباشر على جدول
--            bookings بحالة status='confirmed' => يأخذ وصول كامل
--            (كورسات/امتحانات/واجبات) من غير ما يدفع.
--            الحل: Trigger قبل الإدراج بيفرض status='pending' دايماً
--            (غير الأدمن) + بيمنع الحجز لطالب تاني.
--        2) ملفات الكورسات: الطالب كان يقدر يضيف ملف لأي كورس
--            برابط خارجي (فخ تصيّد/روابط خبيثة). الحل: الصف يطابق
--            صف الطالب + الرابط لازم من سلة الكورسات.
--        3) تعليقات الكورسات: الطالب يعلق بس على كورسات صفه.
--        4) get_course_files: الأدمن يشوف الكل، والطالب صفه بس.
--        5) المذكرات: الطالب يقرأ ملفات صفه بس (مش كل الصفوف).
-- ============================================================

-- ============================================================
-- 1) [حرج] قفل الحجوزات
-- ============================================================
create or replace function public.bookings_guard_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- الطالب مش بيقدر يحجز لطالب تاني
  if new.student_id <> auth.uid() and not public.is_admin() then
    raise exception 'غير مصرح — لا يمكن إنشاء حجز لطالب آخر';
  end if;

  -- غير الأدمن: الحجز الجديد يبدأ دايماً "قيد المراجعة" مهما أرسل
  if not public.is_admin() then
    new.status := 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_guard_insert on public.bookings;
create trigger bookings_guard_insert
  before insert on public.bookings
  for each row execute procedure public.bookings_guard_insert();

-- ============================================================
-- 2) ملفات الكورسات: الطالب يرفع فقط لكورسات صفه + رابط من السلة
-- ============================================================
drop policy if exists "course_files: student insert own" on public.course_files;
create policy "course_files: student insert own"
  on public.course_files for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_admin()
      or (
        exists (
          select 1 from public.courses c
          where c.id = course_id
            and c.grade = (select grade from public.profiles where id = auth.uid())
        )
        and file_url like '%/storage/v1/object/public/course-files/%'
      )
    )
  );

-- نفس القيود جوه دالة الرفع (خط دفاع ثاني)
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

  -- غير الأدمن: لازم الكورس من صف الطالب + الرابط من سلة الكورسات
  if not public.is_admin() then
    if not exists (
      select 1 from public.courses c
      where c.id = p_course_id
        and c.grade = (select grade from public.profiles where id = auth.uid())
    ) then
      raise exception 'غير مصرح — هذا الكورس ليس لصفك';
    end if;
    if trim(p_file_url) not like '%/storage/v1/object/public/course-files/%' then
      raise exception 'غير مصرح — الرابط لازم يكون من رفع سلة الكورسات';
    end if;
  end if;

  insert into public.course_files (course_id, title, file_url, file_type, uploaded_by)
  values (p_course_id, trim(p_title), trim(p_file_url), coalesce(p_file_type, 'file'), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_course_file(uuid, text, text, text) to authenticated;

-- القراءة: الطالب يقرأ ملفات صفه بس
drop policy if exists "course_files: read authenticated" on public.course_files;
create policy "course_files: read authenticated"
  on public.course_files for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_id
        and c.grade = (select grade from public.profiles where id = auth.uid())
    )
  );

-- get_course_files: نفس القيد على مستوى الدالة
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

  if not public.is_admin()
     and not exists (
       select 1 from public.courses c
       where c.id = p_course_id
         and c.grade = (select grade from public.profiles where id = auth.uid())
     ) then
    raise exception 'غير مصرح — هذا الكورس ليس لصفك';
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

-- ============================================================
-- 3) تعليقات الكورسات: الطالب يعلق على كورسات صفه بس
-- ============================================================
drop policy if exists "course_comments: student insert own" on public.course_comments;
create policy "course_comments: student insert own"
  on public.course_comments for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.courses c
      where c.id = course_id
        and c.grade = (select grade from public.profiles where id = auth.uid())
    )
  );

-- ============================================================
-- 4) المذكرات: الطالب يقرأ ملفات صفه بس
-- ============================================================
drop policy if exists "materials: read authenticated" on public.materials;
create policy "materials: read authenticated"
  on public.materials for select to authenticated
  using (
    public.is_admin()
    or grade = (select grade from public.profiles where id = auth.uid())
  );