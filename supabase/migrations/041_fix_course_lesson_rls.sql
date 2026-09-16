-- 041_fix_course_lesson_rls.sql — إرجاع حماية courses/lessons عبر can_access_*
-- كان 032/033 فكّ الحماية لـ grade=own فقط → تسريب video_url

-- courses: ارجع للأصل المحمي بـ can_access_course
drop policy if exists "courses: student read own grade or published professional" on public.courses;
drop policy if exists "courses: read accessible or admin" on public.courses;

create policy "courses: read accessible or admin"
  on public.courses for select to authenticated
  using (public.is_admin() or public.can_access_course(id));

-- حافظ على إمكانية رؤية العنوان للطالب (للعرض المقفول) عبر RPC get_student_courses
-- لكن direct SELECT يرجع فقط المتاح — وهذا هو المطلوب أمنياً
-- لعرض القفل نعتمد على RPC لا على SELECT مباشر

-- lessons: حماية فعلية بـ can_access_lesson
drop policy if exists "lessons: student read own grade or professional" on public.lessons;
drop policy if exists "lessons: admin all" on public.lessons;
drop policy if exists "lessons: student read own grade or professional" on public.lessons;

create policy "lessons: read accessible or free or admin"
  on public.lessons for select to authenticated
  using (public.is_admin() or is_free = true or public.can_access_lesson(id));

create policy "lessons: admin all"
  on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.lessons to authenticated;
