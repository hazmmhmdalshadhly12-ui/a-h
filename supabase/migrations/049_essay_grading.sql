-- ============================================================
-- 049_essay_grading.sql — تصحيح المقالي بدرجة نهائية من نقاط الامتحان
--
-- الطلب (بلاغ المستخدم): المستر يصحح إجابات الطالب في الامتحان المقالي
--   بدرجة نهائية من نقاط الامتحان نفسها (امتحان من 20 → يقدر يدي
--   20 من 20 أو 17 من 20)، ويقدر يعدل الدرجة في أي وقت — والتعديل
--   يظهر للطالب ولوحة التفوق فورًا لو كانت الدرجة منشورة.
--
-- قواعد النشر:
--   - امتحان فيه أسئلة مقالية: تسليم الطالب لا يُنشر قبل تصحيح درجته
--     النهائية — الموضوعي والمقالي يتpublishوا مع بعض (لوحة التفوق
--     بتستنى المستر)، وده نفس آلية النشر الموجودة حاليًا.
--   - النشر الجماعي (publish_exam_grades) بينشر المصحح فقط؛ اللي فيه
--     مقالي غير مصحح بيستنى المستر ولاياخد إشعار.
--
--   grade_exam_submission(uuid, numeric)  — RPC جديد للأدمن:
--     * يتحقق الدرجة بين 0 ومجموع نقاط أسئلة الامتحان (Snapshot وقت
--       التسليم وإلا الأسئلة الحية) — لا تجاوز لدرجة الامتحان.
--     * يخزّن manual_score = الدرجة − auto_score (للشفافية) ويضبط
--       score مباشرة — فأي تعديل بعد النشر يظهر فورًا بدون إعادة نشر.
--     * لو الدرجة كانت منشورة واتغيرت → إشعار للطالب «تم تعديل درجتك».
--   publish_grade / publish_exam_grades — نفس التوقيع القديم (void →
--     لا خطأ 42P13): نفس السلوك القديم + بوابة «صحّح المقالي أولاً»
--     + إشعار مرة واحدة فقط عند أول نشر (بدل تكراره مع كل إعادة نشر).
--
-- إضافي بالكامل: يضيف عمود essay_graded_at فقط — لا يحذف بيانات ولا يغير
-- أي عمود قائم. قابل لإعادة التشغيل.
-- يتطلب: migrations الأساسية + 047_exam_access_part1 (عمود question_snapshot).
-- ============================================================

do $$
begin
  if to_regclass('public.exam_submissions') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'exam_submissions'
         and column_name = 'question_snapshot'
     ) then
    raise exception '049 يتطلب تنفيذ migrations الأساسية و047_exam_access_part1 أولاً';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 0) عمود essay_graded_at — علامة «المستر صحح الدرجة النهائية»
--    (لا يكفي manual_score: قيمته الافتراضية 0 منذ 005، فالصفر قد يكون
--     «لم يُصحح بعد» أو «أعطى صفرًا فعلاً». العلامة تحسم الفرق)
--    لا يوجد Backfill: كل النتائج المنشورة خالية من القيد، والقديمة
--    غير المنشورة ذات manual_score ≠ 0 تعتبر مصححة (مسار الواجهة القديم)
-- ------------------------------------------------------------
alter table public.exam_submissions
  add column if not exists essay_graded_at timestamptz;

comment on column public.exam_submissions.essay_graded_at is
  'وقت حفظ المستر الدرجة النهائية عبر grade_exam_submission — يعني أن المقالي صحيح حتى لو كانت الدرجة 0';

-- ------------------------------------------------------------
-- 1) دوال داخلية: أسئلة التسليم الفعّالة ونقاطه
--    (Snapshot وقت التسليم — وإلا الأسئلة الحية للاختبارات القديمة)
--    داخلية فقط: لا تُمنح لأي دور (تُستدعى من دوال definer أدناه)
-- ------------------------------------------------------------
create or replace function public.submission_questions(p_submission_id uuid)
returns jsonb
language sql stable
as $$
  select case
    when jsonb_typeof(s.question_snapshot->'questions') = 'array'
         and s.question_snapshot->'questions' <> '[]'::jsonb
      then s.question_snapshot->'questions'
    else coalesce((
      select jsonb_agg(jsonb_build_object('points', q.points, 'type', q.type))
      from public.exam_questions q
      where q.exam_id = s.exam_id
    ), '[]'::jsonb)
  end
  from public.exam_submissions s
  where s.id = p_submission_id;
$$;

create or replace function public.submission_total_points(p_submission_id uuid)
returns numeric
language sql stable
as $$
  select coalesce(sum((elem->>'points')::numeric), 0)
  from jsonb_array_elements(public.submission_questions(p_submission_id)) t(elem);
$$;

-- هل التسليم فيه أسئلة مقالية لم تُصحح بعد؟
--   المقالي «غير مصحح» = فيه أسئلة مقالية + غير منشور + لم يُصحح عبر
--   grade_exam_submission (essay_graded_at فارغ) + manual_score بذلك الـ 0
--   الافتراضي القديم. أما غير المنشور وmanual_score ≠ 0 فهو مصحح
--   بالمسار القديم (تحديث مباشر من الواجهة السابقة) فيُنشر عادي.
create or replace function public.submission_essay_pending(p_submission_id uuid)
returns boolean
language sql stable
as $$
  select exists (
    select 1
    from public.exam_submissions s
    where s.id = p_submission_id
      and not s.grade_released
      and s.essay_graded_at is null
      and coalesce(s.manual_score, 0) = 0
      and exists (
        select 1
        from jsonb_array_elements(public.submission_questions(p_submission_id)) t(elem)
        where elem->>'type' = 'short_answer'
      )
  );
$$;

revoke execute on function public.submission_questions(uuid) from public, authenticated;
revoke execute on function public.submission_total_points(uuid) from public, authenticated;
revoke execute on function public.submission_essay_pending(uuid) from public, authenticated;

-- ------------------------------------------------------------
-- 2) grade_exam_submission — الأدمن يكتب/يعدل الدرجة النهائية
--    (من مجموع نقاط الامتحان) في أي وقت — قبل أو بعد النشر
-- ------------------------------------------------------------
create or replace function public.grade_exam_submission(p_submission_id uuid, p_total_score numeric)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_sub public.exam_submissions%rowtype;
  v_title text;
  v_total_points numeric;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  if not public.is_admin() then
    raise exception 'غير مصرح — صلاحية أدمن مطلوبة';
  end if;

  select * into v_sub from public.exam_submissions s where s.id = p_submission_id;
  if not found then
    raise exception 'التسليم غير موجود';
  end if;

  select title into v_title from public.exams e where e.id = v_sub.exam_id;

  v_total_points := public.submission_total_points(p_submission_id);
  if v_total_points is null or v_total_points <= 0 then
    raise exception 'تعذر تحديد نقاط هذا الامتحان — لا توجد أسئلة';
  end if;

  if p_total_score is null then
    raise exception 'أدخل الدرجة النهائية';
  end if;

  if p_total_score < 0 then
    raise exception 'الدرجة لا يمكن أن تكون سالبة';
  end if;

  if p_total_score > v_total_points then
    raise exception 'الدرجة أكبر من درجة الامتحان (الامتحان من %)', v_total_points;
  end if;

  update public.exam_submissions s
  set manual_score = p_total_score - coalesce(s.auto_score, 0),
      score = p_total_score,
      essay_graded_at = now()
  where s.id = p_submission_id;

  -- لو الدرجة كانت منشورة واتغيرت → الطالب يشوف التعديل فورًا + إشعار
  if v_sub.grade_released and v_sub.score is distinct from p_total_score then
    insert into public.notifications (student_id, title, body)
    values (
      v_sub.student_id,
      'تم تعديل درجتك',
      'درجتك في امتحان ' || coalesce(v_title, '') || ' اتحدثت: ' || p_total_score || ' من ' || v_total_points || '.'
    );
  end if;

  return jsonb_build_object(
    'total_points', v_total_points,
    'auto_score', v_sub.auto_score,
    'manual_score', p_total_score - coalesce(v_sub.auto_score, 0),
    'score', p_total_score,
    'grade_released', v_sub.grade_released
  );
exception
  when others then
    if SQLERRM like '%غير مصرح%'
      or SQLERRM like '%يجب تسجيل%'
      or SQLERRM like '%التسليم غير موجود%'
      or SQLERRM like '%تعذر تحديد%'
      or SQLERRM like '%أدخل الدرجة%'
      or SQLERRM like '%سالبة%'
      or SQLERRM like '%أكبر من%'
    then
      raise;
    end if;
    raise exception 'تعذر حفظ الدرجة حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.grade_exam_submission(uuid, numeric) to authenticated;

-- ------------------------------------------------------------
-- 3) publish_grade — نفس التوقيع القديم (void) + بوابة المقالي:
--    امتحان فيه مقالي لا يُنشر تسليمه قبل كتابة درجته النهائية
-- ------------------------------------------------------------
create or replace function public.publish_grade(p_submission_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid;
  v_title text;
  v_was_released boolean;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح — صلاحية أدمن مطلوبة';
  end if;

  select s.student_id, s.grade_released, e.title
    into v_student, v_was_released, v_title
  from public.exam_submissions s
  join public.exams e on e.id = s.exam_id
  where s.id = p_submission_id;

  if v_student is null then
    raise exception 'التسليم غير موجود';
  end if;

  if public.submission_essay_pending(p_submission_id) then
    raise exception 'لا يمكن النشر بعد — صحّح الدرجة النهائية للمقالي أولاً ثم انشر';
  end if;

  update public.exam_submissions s
  set score = coalesce(s.auto_score, 0) + coalesce(s.manual_score, 0),
      grade_released = true
  where s.id = p_submission_id;

  if not v_was_released then
    insert into public.notifications (student_id, title, body)
    values (
      v_student,
      'درجتك اتعلنت',
      'درجة امتحان ' || coalesce(v_title, '') || ' متاحة دلوقتي في صفحة الدرجات.'
    );
  end if;
exception
  when others then
    if SQLERRM like '%غير مصرح%'
      or SQLERRM like '%التسليم غير موجود%'
      or SQLERRM like '%لا يمكن النشر%'
    then
      raise;
    end if;
    raise exception 'تعذر نشر الدرجة حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.publish_grade(uuid) to authenticated;

-- ------------------------------------------------------------
-- 4) publish_exam_grades — نفس التوقيع القديم (void):
--    ينشر المصحح فقط؛ غير المصحح (مقالي pending) يستنى المستر
--    ويظل مخفيًا عن الطالب ولوحة التفوق — بدون إشعار
-- ------------------------------------------------------------
create or replace function public.publish_exam_grades(p_exam_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_title text;
  v_newly uuid[];
begin
  if not public.is_admin() then
    raise exception 'غير مصرح — صلاحية أدمن مطلوبة';
  end if;

  select title into v_title from public.exams where id = p_exam_id;

  select array_agg(s.id) into v_newly
  from public.exam_submissions s
  where s.exam_id = p_exam_id
    and not s.grade_released
    and not public.submission_essay_pending(s.id);

  update public.exam_submissions s
  set score = coalesce(s.auto_score, 0) + coalesce(s.manual_score, 0),
      grade_released = true
  where s.exam_id = p_exam_id
    and not public.submission_essay_pending(s.id);

  if coalesce(array_length(v_newly, 1), 0) > 0 then
    insert into public.notifications (student_id, title, body)
    select s.student_id,
           'درجتك اتعلنت',
           'درجة امتحان ' || coalesce(v_title, '') || ' متاحة دلوقتي في صفحة الدرجات.'
    from public.exam_submissions s
    where s.id = any(v_newly);
  end if;
exception
  when others then
    if SQLERRM like '%غير مصرح%'
    then
      raise;
    end if;
    raise exception 'تعذر نشر الدرجات حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.publish_exam_grades(uuid) to authenticated;
