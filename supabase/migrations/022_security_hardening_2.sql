-- ============================================================
-- 022_security_hardening_2.sql
-- جولة الأمان الثانية — ثغرتان حرجتان:
--
-- [حرج] 1) التصعيد للأدمن من التسجيل:
--   handle_new_user كان بياخد role من بيانات التسجيل من غير فلترة،
--   فأي حد يقدر يبعت role='admin' وقت إنشاء الحساب ويبقى أدمن كامل.
--   الحل: التسجيل الذاتي يقبل "طالب" أو "ولي أمر" بس.
--   الأدمن بيتعمل يدوياً (كود جاهز تحت بأمان).
--
-- [حرج] 2) ربط ولي الأمر بأي طالب بدون تصريح:
--   بوليصة student_parents: parent insert own كانت بتسمح لأي ولي أمر
--   يربط نفسه بأي student_id مباشرة (والـ IDs بتتسرب من ليدر بورد
--   get_leaderboard) => يقدر يفتح درجات وامتحانات أي طالب.
--   الحل: الإزالة — الربط يبقى بس عبر link_student_to_parent
--   اللي بيطابق رقم موبايل الطالب.
-- ============================================================

-- ============================================================
-- 1) [حرج] قفل تسجيل الأدمن
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role text;
begin
  -- التسجيل الذاتي: "طالب" أو "ولي أمر" بس — أي حاجة تانية (زي admin)
  -- بترجع طالب تلقائياً. الأدمن بيتعمل يدوياً (شوف آخر الملف).
  v_role := lower(coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student'));
  if v_role <> 'parent' then
    v_role := 'student';
  end if;

  insert into public.profiles (id, full_name, phone, parent_phone, grade, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'parent_phone', ''),
    coalesce(nullif(new.raw_user_meta_data->>'grade', ''), 'first_secondary'),
    new.email,
    v_role
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
-- 2) [حرج] الربط يبقى عبر رقم الموبايل بس (RPC آمن)
-- ============================================================
drop policy if exists "student_parents: parent insert own" on public.student_parents;

-- ============================================================
-- ملاحظة: هاتعمل "أدمن" جديد إزاي (بأمان):
--   1) سجّل الحساب عادي (أو أدمن قديم ينشئه)
--   2) شغّل الكود ده في SQL Editor (بدّل الإيميل):
--      update public.profiles set role = 'admin' where email = 'admin@example.com';
-- ============================================================