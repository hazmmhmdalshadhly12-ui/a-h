-- ============================================================
-- 014_harden_functions.sql
-- تحصين دوال الامتحانات ضد تسريب معلومات قاعدة البيانات
--
-- المشكلة: لما طلب جلب الأسئلة أو التسليم يفشل، كان المستخدم
-- بيشوف رسالة الخطأ الخام من PostgreSQL فيها معلومات داخلية
-- (أسماء الجداول، الدوال، الـ policies، أو كود SQL).
--
-- الحل:
--   1) كل استثناء غير متوقع جوه الدوال بيتحوّل لرسالة عامة
--      من غير أي تفاصيل داخلية (get_exam_questions و submit_exam).
--   2) رسائل "الرفض" المتعمدة (غير مصرح/غير منشور...) تفضل
--      زي ما هي لأنها آمنة ومقصودة — لكن بدون أي سياق تقني.
-- ============================================================

-- ------------------------------------------------------------
-- get_exam_questions — آمنة من التسريب
-- ------------------------------------------------------------
create or replace function public.get_exam_questions(p_exam_id uuid)
returns table (
  id uuid,
  exam_id uuid,
  question_text text,
  type text,
  options jsonb,
  points int,
  order_index int
)
language plpgsql security definer set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_grade text;
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  select grade into v_grade from public.profiles where id = v_student_id;

  -- لازم الامتحان منشور لصف الطالب (أو الطالب مسلمه خلاص عشان المراجعة)
  if not exists (
    select 1 from public.exams e
    where e.id = p_exam_id
      and e.is_published = true
      and e.grade = v_grade
  ) and not exists (
    select 1 from public.exam_submissions s
    where s.exam_id = p_exam_id and s.student_id = v_student_id
  ) then
    raise exception 'غير مصرح بقراءة أسئلة هذا الامتحان';
  end if;

  return query
    select q.id as id, q.exam_id, q.question_text, q.type, q.options, q.points, q.order_index
    from public.exam_questions q
    where q.exam_id = p_exam_id
    order by q.order_index asc;
exception
  -- أي خطأ غير متوقع (خلل داخلي) → رسالة عامة، من غير تفاصيل PostgreSQL
  when others then
    raise exception 'تعذر تحميل أسئلة الامتحان حالياً، حاول مرة أخرى';
end;
$$;

-- ------------------------------------------------------------
-- submit_exam — آمنة من التسريب
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
exception
  -- أخطاء الـ unique constraint (محاولة مكررة) → رسالة واضحة مقصودة
  when unique_violation then
    raise exception 'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً';
  -- أي خطأ غير متوقع → رسالة عامة من غير تفاصيل داخلية
  when others then
    raise exception 'تعذر تسليم الامتحان حالياً، حاول مرة أخرى';
end;
$$;

-- ------------------------------------------------------------
-- get_my_submissions / get_my_submission — آمنة من التسريب
-- ------------------------------------------------------------
create or replace function public.get_my_submissions()
returns table (
  exam_id uuid,
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

  return query
    select s.exam_id, s.submitted_at, s.grade_released,
           case when s.grade_released then s.score else null end as score
    from public.exam_submissions s
    where s.student_id = auth.uid();
exception
  when others then
    raise exception 'تعذر جلب بيانات تسليماتك حالياً، حاول مرة أخرى';
end;
$$;

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
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  return query
    select s.id, s.exam_id, s.answers,
           case when s.grade_released then s.auto_score else null end as auto_score,
           case when s.grade_released then s.manual_score else null end as manual_score,
           case when s.grade_released then s.score else null end as score,
           s.grade_released, s.submitted_at
    from public.exam_submissions s
    where s.student_id = auth.uid() and s.exam_id = p_exam_id
    limit 1;
exception
  when others then
    raise exception 'تعذر جلب بيانات تسليمك حالياً، حاول مرة أخرى';
end;
$$;