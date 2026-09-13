-- ============================================================
-- 031_fix_course_visibility.sql
-- إصلاح رؤية الكورسات: كل طالب يشوف كورسات صفه (مقفولة أو مفتوحة)
-- فصل "الرؤية" عن "الوصول للمحتوى"
-- ============================================================

-- 1) تعديل سياسة قراءة الكورسات: كل طالب يشوف كورسات صفه + الاحترافي المنشور
-- الأدمن يشوف الكل
drop policy if exists "courses: read accessible or admin" on public.courses;

create policy "courses: student read own grade or published professional"
  on public.courses for select to authenticated
  using (
    public.is_admin()
    or grade = (select grade from public.profiles where id = auth.uid())
    or (grade = 'professional' and is_published = true)
  );

-- ملاحظة: السياسات على course_files, course_comments, إلخ بتستخدم can_access_course
-- اللي بتيجي للـ "وصول للمحتوى" مش "الرؤية" - دي تفضل زي ما هي.

-- تحديث دالة get_student_courses لتعمل مع السياسة الجديدة
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
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if public.is_admin() then
    v_grade := coalesce(nullif(p_grade, ''), '');
  else
    select grade into v_grade from public.profiles where id = v_uid;
    if v_grade is null then
      raise exception 'البروفايل غير موجود';
    end if;
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
    where c.is_published = true
      and (c.grade = v_grade or c.grade = 'professional')
    order by c.order_index asc, c.created_at asc;
end;
$$;

grant execute on function public.get_student_courses(text) to authenticated;