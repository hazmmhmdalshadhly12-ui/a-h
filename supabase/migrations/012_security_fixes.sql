-- ============================================================
-- 012_security_fixes.sql
-- إصلاحات أمنية (تقرير فحص الثغرات):
--   1) منع تسريب auto_score / manual_score قبل نشر الدرجة
--   2) فرض مدة الامتحان على السيرفر (duration_minutes)
--   3) منع الطالب من تغيير email في جدول profiles
-- ============================================================

-- ------------------------------------------------------------
-- 1) get_my_submission — الدرجات لا تتسرب قبل النشر
--    auto_score و manual_score كانوا بييجوا للطالب فوراً (حتى قبل النشر)
--    والدرجة النهائية هي مجموعهم غالباً => تسريب فعلي.
--    الحل: يرجعهم null إلا لو grade_released = true
-- ------------------------------------------------------------
create or replace function public.get_my_submission(p_exam_id uuid)
returns table (
  id uuid,
  exam_id uuid,
  answers jsonb,
  auto_score numeric,
  manual_score numeric,
  score numeric,
  grade_released boolean,
  submitted_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
    select s.id, s.exam_id, s.answers,
           case when s.grade_released then s.auto_score else null end as auto_score,
           case when s.grade_released then s.manual_score else null end as manual_score,
           case when s.grade_released then s.score else null end as score,
           s.grade_released, s.submitted_at
    from public.exam_submissions s
    where s.student_id = auth.uid() and s.exam_id = p_exam_id
    limit 1;
end;
$$;

-- ------------------------------------------------------------
-- 2) submit_exam — فرض مدة الامتحان على السيرفر
--    duration_minutes كان بيتطبق على الفرونت بس (يُمسح بتعديل الـ JS).
--    الحل: لو في مدة محددة، لازم now() <= (start_at + duration)
-- ------------------------------------------------------------
create or replace function public.submit_exam(p_exam_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_exam public.exams%rowtype;
  v_question record;
  v_answer text;
  v_auto numeric := 0;
  v_submission_id uuid;
  v_deadline timestamptz;
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  -- الطالب فقط هو اللي بيحل الامتحانات (الأدمن لا)
  if not public.is_student() then
    raise exception 'غير مسموح للطالب الحالي بتسليم الامتحانات';
  end if;

  select * into v_exam from public.exams where id = p_exam_id;
  if not found then
    raise exception 'الامتحان غير موجود';
  end if;

  if not v_exam.is_published then
    raise exception 'هذا الامتحان غير منشور';
  end if;

  if v_exam.grade is distinct from (select grade from public.profiles where id = v_student_id) then
    raise exception 'هذا الامتحان ليس لصفك';
  end if;

  if v_exam.start_at is not null and now() < v_exam.start_at then
    raise exception 'لم يبدأ وقت الامتحان بعد';
  end if;

  if v_exam.end_at is not null and now() > v_exam.end_at then
    raise exception 'انتهى وقت الامتحان';
  end if;

  -- فرض المدة: لو في duration_minutes + start_at => deadline = start_at + duration
  if v_exam.duration_minutes is not null
     and v_exam.duration_minutes > 0
     and v_exam.start_at is not null then
    v_deadline := v_exam.start_at + (v_exam.duration_minutes || ' minutes')::interval;
    if now() > v_deadline then
      raise exception 'انتهى وقت الامتحان';
    end if;
  end if;

  -- التصحيح الآلي للموضوعي (mcq + true_false)
  for v_question in
    select * from public.exam_questions q
    where q.exam_id = p_exam_id
  loop
    v_answer := p_answers ->> v_question.id::text;
    if v_question.type <> 'short_answer'
       and v_answer is not null
       and v_answer = v_question.correct_answer then
      v_auto := v_auto + coalesce(v_question.points, 0);
    end if;
  end loop;

  -- الإدراج — on conflict do nothing: لو موجود تسليم مسبق => null
  insert into public.exam_submissions (exam_id, student_id, answers, auto_score, score)
  values (p_exam_id, v_student_id, p_answers, v_auto, v_auto)
  on conflict (exam_id, student_id) do nothing
  returning id into v_submission_id;

  if v_submission_id is null then
    raise exception 'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً';
  end if;

  -- إشعار الطالب بتأكيد التسليم
  insert into public.notifications (student_id, title, body)
  values (
    v_student_id,
    'تم تسليم الامتحان',
    coalesce((select title from public.exams where id = p_exam_id), 'الامتحان') || ' — اتستلمت إجاباتك، والنتيجة هتظهر بعد مراجعة المستر.'
  );

  return jsonb_build_object('submission_id', v_submission_id, 'auto_score', v_auto);
end;
$$;

-- ------------------------------------------------------------
-- 3) prevent_profile_escalation — قفل email للطلاب كمان
--    (الطالب كان يقدر يعدل بريده في جدول profiles؛ البريد الرسمي
--     في auth.users يتغير من مكان آخر، فهنا يُقفل غير الأدمن)
-- ------------------------------------------------------------
create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin()
     and (new.role is distinct from old.role
          or new.grade is distinct from old.grade
          or new.email is distinct from old.email) then
    raise exception 'غير مسموح بتغيير الصلاحية أو الصف الدراسي أو البريد';
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- إعادة تفعيل الـ trigger (لضمان استخدام النسخة الجديدة)
-- ------------------------------------------------------------
drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute procedure public.prevent_profile_escalation();