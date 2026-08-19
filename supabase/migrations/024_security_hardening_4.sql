-- ============================================================
-- 024_security_hardening_4.sql
-- جولة الأمان الرابعة — SQL Injection + XSS:
--
-- فحص SQL Injection:
--   * كل دوال قاعدة البيانات بتستخدم استعلامات ثابتة بـ PL/pgSQL
--     parameterized (مفيش EXECUTE ديناميكي أو concatenation خام)
--     => مفيش مدخل SQL Injection في المشروع. ✔
--   * الواجهة بتستخدم supabase-js (بينقل كل القيم كـ params). ✔
--
-- فحص XSS:
--   * الواجهة React بتقفل الهروب الافتراضي، ومفيش dangerouslySetInnerHTML
--     ولا eval ولا innerHTML. ✔
--   * روابط التحميل بتعمل encodeURIComponent + rel="noreferrer". ✔
--
-- المشاكل اللي اتصلحت هنا (XSS حقيقي + ثغرة وصول):
--   [حرج XSS] رفع أي نوع ملفات للسلال العامة: طالب يرفع evil.svg
--     => المتصفح يفتحه على نفس الأصل => سكربت يقرا localStorage
--     (توكنات Supabase) ويبعتو لطرف تاني = سرقة حسابات.
--     الحل: قائمة امتدادات آمنة (PDF/صور/فيديو/وثائق/ضغط...) وتمنع
--     svg/html/xml/js وأي امتداد تاني.
--   [وصول] add_course_comment كان security definer من غير فحص وصول
--     => يعدّي RLS وبيسمح التعليق على كورسات أي صف من غير اشتراك.
--     الحل: نفس قاعدة الكورسات (صف الطالب أو الاحترافي المتاح).
--   [وصول] get_course_comments نفس المشكلة — اتقفل بنفس القاعدة.
-- ============================================================

-- ============================================================
-- 1) [XSS] قائمة الامتدادات الآمنة للسلال العامة
-- ------------------------------------------------------------
-- ممنوع: svg, svgz, html, htm, xml, js, mjs, css, mhtml, xhtml,
--         wasm, swf, ... (أي حاجة المتصفح يقدر ينفذها)
-- ============================================================
drop policy if exists "course-files: authenticated upload" on storage.objects;
create policy "course-files: authenticated upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'course-files'
    and lower(substring(name from '\.([^\.]+)$'))
        in ('pdf','png','jpg','jpeg','jfif','webp','gif',
            'mp4','m4v','mov','zip','rar','7z',
            'doc','docx','xls','xlsx','ppt','pptx',
            'txt','csv','mp3','wav','ogg')
  );

drop policy if exists "materials: admin upload" on storage.objects;
create policy "materials: admin upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and public.is_admin()
    and lower(substring(name from '\.([^\.]+)$'))
        in ('pdf','png','jpg','jpeg','jfif','webp','gif',
            'mp4','m4v','mov','zip','rar','7z',
            'doc','docx','xls','xlsx','ppt','pptx',
            'txt','csv','mp3','wav','ogg')
  );

-- تحديث ملفات الكورس (المالك) — نفس القائمة لمنع تغيير الصفات لأمتداد تنفيذي
drop policy if exists "course-files: owner update" on storage.objects;
create policy "course-files: owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-files')
  with check (
    bucket_id = 'course-files'
    and lower(substring(name from '\.([^\.]+)$'))
        in ('pdf','png','jpg','jpeg','jfif','webp','gif',
            'mp4','m4v','mov','zip','rar','7z',
            'doc','docx','xls','xlsx','ppt','pptx',
            'txt','csv','mp3','wav','ogg')
  );

-- ============================================================
-- 2) [وصول] التعليقات — نفس قاعدة الوصول بتاعة الكورسات
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

  -- الأدمن يشوف الكل — الطالب كورسات صفه أو الاحترافي المتاح
  if not public.is_admin() and not exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (
        c.grade = (select grade from public.profiles where id = auth.uid())
        or (c.grade = 'professional' and public.can_access_course(c.id))
      )
  ) then
    raise exception 'غير مصرح بقراءة تعليقات هذا الكورس';
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

  -- الطالب يعلق على كورسات صفه بس أو الاحترافي المتاح له (الأدمن أي كورس)
  if not public.is_admin() and not exists (
    select 1 from public.courses c
    where c.id = p_course_id
      and (
        c.grade = (select grade from public.profiles where id = auth.uid())
        or (c.grade = 'professional' and public.can_access_course(c.id))
      )
  ) then
    raise exception 'غير مصرح — هذا الكورس ليس لصفك';
  end if;

  insert into public.course_comments (course_id, student_id, body)
  values (p_course_id, auth.uid(), trim(p_body))
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_course_comment(uuid, text) to authenticated;

-- ============================================================
-- ملاحظة: لو عندك ملفات قديمة في السلال بإمتداد مش في القائمة
-- (زي svg) حتفضل موجودة لكن مش هيتضاف غيرها — وممكن تمسحها يدوياً.
-- ============================================================