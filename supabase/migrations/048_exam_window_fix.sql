-- ============================================================
-- 048_exam_window_fix.sql — إصلاح توفر الامتحانات المنشورة
--
-- المشكلة (مطابقة لبلاغ الإنتاج): امتحان عامل «عام» نُشر ومدته
--   60 دقيقة مثلًا — كان exam_attempt_deadline يفرض حدًا عالميًا
--   start_at + المدة + 60ث، فيتقفل الامتحان بعد ساعة من نشره
--   حتى لو لم يدخله أحد وبلا end_at، وتظهر البطاقة «غير متاح».
-- الإصلاح: يظل الامتحان متاحًا طوال نافذة [start_at , end_at]،
--   والمدة تُحسب لكل طالب من بدء محاولته هو (نفس نموذج
--   start_exam_attempt — المؤقت لا يُصفَّر بالتحديث)، وend_at
--   يظل حدًا صارمًا بلا مهلة.
--   التسليم المباشر عبر RPC بلا محاولة مسجلة يظل مرجعه start_at
--   الرسمي (داخل submit_exam نفسه) — لا تجاوز للمؤقت.
--
-- إضافي بالكامل: لا يحذف بيانات ولا يغير مخططًا ولا يمس دوال أخرى.
-- نفس التوقيع ونوع الإرجاع → CREATE OR REPLACE مباشرة بلا DROP
--   (لا خطأ 42P13). قابل لإعادة التشغيل بأمان.
-- القواعد التي تُبنى من 047_exam_access_part1 المحدث لا تحتاجه؛
--   الملف مخصص للقواعد التي نفذت part1 قبل هذا الإصلاح.
-- ============================================================

do $$
begin
  if to_regprocedure('public.exam_attempt_deadline(public.exams, timestamptz)') is null then
    raise exception '048 يتطلب تنفيذ 047_exam_access_part1.sql وpart2 أولاً';
  end if;
end
$$;

create or replace function public.exam_attempt_deadline(p_exam public.exams, p_attempt_started timestamptz)
returns timestamptz
language sql stable
as $$
  select least(
    coalesce(p_exam.end_at, 'infinity'::timestamptz),
    case
      when p_exam.duration_minutes is not null and p_exam.duration_minutes > 0
           and p_attempt_started is not null
        then p_attempt_started + make_interval(mins => p_exam.duration_minutes) + interval '60 seconds'
      else 'infinity'::timestamptz
    end
  );
$$;
