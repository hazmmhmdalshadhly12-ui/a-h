-- ============================================================
-- 047_exam_access_part2.sql — الجزء 2/2 (الأقسام 7-11)
-- RPC الامتحانات: سياسة وصول موحدة + مؤقت من الخادم + Snapshot
-- للمراجعة + حفظ ذري. يتطلب تنفيذ 047_exam_access_part1.sql أولاً.
-- قابل لإعادة التشغيل بأمان.
-- ============================================================

-- تحقق: الجزء الأول نُفّذ قبل أي شيء
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'exams' and column_name = 'access_mode'
  )
     or to_regclass('public.exam_attempts') is null
     or to_regprocedure('public.exam_attempt_deadline(public.exams, timestamptz)') is null then
    raise exception '047 (الجزء 2) يتطلب تنفيذ 047_exam_access_part1.sql أولاً';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 7) get_exam_questions — للطلاب فقط (الأدمن يقرأ exam_questions
--    مباشرة عبر RLS). مسموح إذا:
--    أ) الطالب سلم من قبل (مراجعة إجاباته في أي وقت)، أو
--    ب) امتحانه المنشور + لصفه + مصرح به (عام أو مشترك/محاولة مصرح بها)
--       + داخل النافذة الزمنية + قبل موعد الاستقطاع.
--    أول جلب أسئلة لطالب غير مسلم = بدء محاولته (تثبيت المؤقت).
-- ------------------------------------------------------------
create or replace function public.get_exam_questions(p_exam_id uuid)
returns table (
  question_id uuid,
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
  v_exam public.exams%rowtype;
  v_submitted boolean := false;
  v_attempt_started timestamptz;
  v_attempt_access_ok boolean := false;
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  -- فحص دور الطالب: هذه الدالة للطلاب فقط — لا يمكن للأدمن/ولي الأمر سحب الأسئلة عبرها
  if not public.is_student() then
    raise exception 'غير مسموح للطالب الحالي بعرض أسئلة الامتحان';
  end if;

  select * into v_exam from public.exams e where e.id = p_exam_id;
  if not found then
    raise exception 'الامتحان غير موجود';
  end if;

  select grade into v_grade from public.profiles where id = v_student_id;

  v_submitted := exists (
    select 1 from public.exam_submissions s
    where s.exam_id = p_exam_id and s.student_id = v_student_id
  );

  -- (أ) مسلّم من قبل → مراجعة (بدون فحوصات وقت/اشتراك)
  if not v_submitted then
    -- (ب) مسار الحل الحي
    if not v_exam.is_published then
      raise exception 'هذا الامتحان غير منشور';
    end if;

    if v_exam.grade is distinct from v_grade then
      raise exception 'هذا الامتحان ليس لصفك';
    end if;

    select a.started_at, a.access_ok into v_attempt_started, v_attempt_access_ok
    from public.exam_attempts a
    where a.exam_id = p_exam_id and a.student_id = v_student_id;

    -- خاص → اشتراك مؤكد أو محاولة سابقة مصرح بها (تغيير الخصوصية لا يفسد محاولة جارية)
    if v_exam.access_mode = 'subscribers'
       and not public.has_confirmed_booking()
       and coalesce(v_attempt_access_ok, false) = false then
      raise exception 'هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات';
    end if;

    if v_exam.start_at is not null and now() < v_exam.start_at then
      raise exception 'لم يبدأ وقت الامتحان بعد';
    end if;

    if v_exam.end_at is not null and now() > v_exam.end_at then
      raise exception 'انتهى وقت الامتحان';
    end if;

    -- أول جلب للأسئلة = بدء المحاولة (لا يُصفَّر المؤقت بتحديث الصفحة)
    -- EXECUTE ضروري هنا: معامل الإرجاع exam_id يتعارض مع عمود جدول
    -- exam_attempts في ON CONFLICT فيرفضه PostgreSQL كمرجع ملتبس
    execute 'insert into public.exam_attempts (exam_id, student_id, access_ok)
             values ($1, $2, true)
             on conflict (exam_id, student_id) do nothing'
    using p_exam_id, v_student_id;

    select a.started_at into v_attempt_started
    from public.exam_attempts a
    where a.exam_id = p_exam_id and a.student_id = v_student_id;

    if now() > public.exam_attempt_deadline(v_exam, v_attempt_started) then
      raise exception 'انتهى وقت الامتحان';
    end if;
  end if;

  return query
    select q.id::uuid as question_id, q.exam_id, q.question_text, q.type, q.options, q.points, q.order_index
    from public.exam_questions q
    where q.exam_id = p_exam_id
    order by q.order_index asc;
exception
  when others then
    if SQLERRM like '%غير مصرح%'
      or SQLERRM like '%غير مسموح%'
      or SQLERRM like '%يجب تسجيل%'
      or SQLERRM like '%غير موجود%'
      or SQLERRM like '%ليس لصفك%'
      or SQLERRM like '%غير منشور%'
      or SQLERRM like '%لم يبدأ%'
      or SQLERRM like '%انتهى وقت%'
      or SQLERRM like '%خاص بالمشتركين%'
    then
      raise;
    end if;
    raise exception 'تعذر تحميل أسئلة الامتحان حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.get_exam_questions(uuid) to authenticated;

-- ------------------------------------------------------------
-- 8) start_exam_attempt — يفرض كل الشروط قبل بدء المحاولة ويرجّع
--    server_now + attempt_started_at + deadline حتى يكون العد التنازلي
--    مصدره الخادم. المحاولة تُسجل مرة واحدة — إعادة الاستدعاء لا تُصفّرها.
-- ------------------------------------------------------------
create or replace function public.start_exam_attempt(p_exam_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_exam public.exams%rowtype;
  v_attempt_started timestamptz;
  v_cutoff timestamptz;
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  if not public.is_student() then
    raise exception 'غير مسموح للطالب الحالي بتسليم الامتحانات';
  end if;

  select * into v_exam from public.exams where id = p_exam_id;
  if not found then
    raise exception 'الامتحان غير موجود';
  end if;

  -- سلم من قبل؟ الواجهة تتحول للمراجعة
  if exists (
    select 1 from public.exam_submissions s
    where s.exam_id = p_exam_id and s.student_id = v_student_id
  ) then
    return jsonb_build_object('already_submitted', true);
  end if;

  if not v_exam.is_published then
    raise exception 'هذا الامتحان غير منشور';
  end if;

  if v_exam.grade is distinct from (select grade from public.profiles where id = v_student_id) then
    raise exception 'هذا الامتحان ليس لصفك';
  end if;

  select a.started_at into v_attempt_started
  from public.exam_attempts a
  where a.exam_id = p_exam_id and a.student_id = v_student_id;

  -- محاولة جديدة → فرض سياسة الخصوصية بالكامل
  -- محاولة قائمة (مصرح بها عند بدئها) → تكمّل حتى لو تغيرت خصوصية الامتحان
  if v_attempt_started is null then
    if v_exam.access_mode = 'subscribers' and not public.has_confirmed_booking() then
      raise exception 'هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات';
    end if;
  end if;

  -- النافذة الزمنية تفرض دائمًا (حتى على المحاولات القائمة)
  if v_exam.start_at is not null and now() < v_exam.start_at then
    raise exception 'لم يبدأ وقت الامتحان بعد';
  end if;

  if v_exam.end_at is not null and now() > v_exam.end_at then
    raise exception 'انتهى وقت الامتحان';
  end if;

  if v_attempt_started is null then
    insert into public.exam_attempts (exam_id, student_id, access_ok)
    values (p_exam_id, v_student_id, true)
    on conflict (exam_id, student_id) do nothing;

    select a.started_at into v_attempt_started
    from public.exam_attempts a
    where a.exam_id = p_exam_id and a.student_id = v_student_id;
  end if;

  v_cutoff := public.exam_attempt_deadline(v_exam, v_attempt_started);

  if now() > v_cutoff then
    raise exception 'انتهى وقت الامتحان';
  end if;

  return jsonb_build_object(
    'already_submitted', false,
    'attempt_started_at', v_attempt_started,
    'deadline', case when v_cutoff = 'infinity'::timestamptz then null else v_cutoff end,
    'server_now', now(),
    'duration_minutes', v_exam.duration_minutes
  );
exception
  when others then
    if SQLERRM like '%غير مسموح%'
      or SQLERRM like '%يجب تسجيل%'
      or SQLERRM like '%غير موجود%'
      or SQLERRM like '%ليس لصفك%'
      or SQLERRM like '%غير منشور%'
      or SQLERRM like '%لم يبدأ%'
      or SQLERRM like '%انتهى وقت%'
      or SQLERRM like '%خاص بالمشتركين%'
    then
      raise;
    end if;
    raise exception 'تعذر بدء الامتحان حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.start_exam_attempt(uuid) to authenticated;

-- ------------------------------------------------------------
-- 9) submit_exam — سياسة موحدة + مهلة من الخادم + Snapshot
--    - الاشتراك يُفحص للامتحانات الخاصة فقط، مع احترام المحاولة المصرح بها
--    - المهلة تُحسب من وقت بدء محاولة الطالب. التسليم المباشر عبر RPC
--      بدون محاولة مسجلة: المرجع هو start_at الرسمي للامتحان —
--      لا يُمنح وقت جديد بالاستدعاء المباشر (منع تجاوز المؤقت)
--    - Snapshot للأسئلة مع التسليم + الدرجة لا تُرجع قبل نشرها
--    - طريقة احتساب الدرجات نفسها تمامًا بدون تغيير
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
  v_attempt_started timestamptz;
  v_attempt_access_ok boolean := false;
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول أولاً';
  end if;

  if not public.is_student() then
    raise exception 'غير مسموح للطالب الحالي بتسليم الامتحانات';
  end if;

  select * into v_exam from public.exams where id = p_exam_id;
  if not found then
    raise exception 'الامتحان غير موجود';
  end if;

  -- فحص التكرار مبكرًا (القيد الفريد (exam_id, student_id) هو الضامن الفعلي)
  if exists (
    select 1 from public.exam_submissions s
    where s.exam_id = p_exam_id and s.student_id = v_student_id
  ) then
    raise exception 'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً';
  end if;

  if not v_exam.is_published then
    raise exception 'هذا الامتحان غير منشور';
  end if;

  if v_exam.grade is distinct from (select grade from public.profiles where id = v_student_id) then
    raise exception 'هذا الامتحان ليس لصفك';
  end if;

  select a.started_at, a.access_ok into v_attempt_started, v_attempt_access_ok
  from public.exam_attempts a
  where a.exam_id = p_exam_id and a.student_id = v_student_id;

  -- خاص → اشتراك مؤكد أو محاولة مصرح بها (تغيير الخصوصية لا يفسد محاولة جارية)
  if v_exam.access_mode = 'subscribers'
     and not public.has_confirmed_booking()
     and coalesce(v_attempt_access_ok, false) = false then
    raise exception 'هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات';
  end if;

  if v_exam.start_at is not null and now() < v_exam.start_at then
    raise exception 'لم يبدأ وقت الامتحان بعد';
  end if;

  if v_exam.end_at is not null and now() > v_exam.end_at then
    raise exception 'انتهى وقت الامتحان';
  end if;

  -- المهلة من الخادم: مرجعها وقت بدء المحاولة، وإن لم توجد محاولة
  -- (استدعاء RPC مباشر) فالمرجع start_at الرسمي — قبل تسجيل أي محاولة جديدة
  if now() > public.exam_attempt_deadline(v_exam, coalesce(v_attempt_started, v_exam.start_at)) then
    raise exception 'انتهى وقت الامتحان';
  end if;

  -- تسجيل المحاولة إن لم تكن موجودة (للسجل فقط — بعد فحص المهلة)
  if v_attempt_started is null then
    insert into public.exam_attempts (exam_id, student_id, access_ok)
    values (p_exam_id, v_student_id, true)
    on conflict (exam_id, student_id) do nothing;
  end if;

  -- التصحيح الآلي للموضوعي (mcq + true_false) — نفس المنطق القديم
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

  -- الإدراج + Snapshot للأسئلة (النسخة التي أجاب عنها الطالب)
  insert into public.exam_submissions (exam_id, student_id, answers, auto_score, score, question_snapshot)
  values (
    p_exam_id,
    v_student_id,
    p_answers,
    v_auto,
    v_auto,
    jsonb_build_object(
      'captured_at', now(),
      'questions', coalesce((
        select jsonb_agg(jsonb_build_object(
                  'id', q.id,
                  'question_text', q.question_text,
                  'type', q.type,
                  'options', q.options,
                  'points', q.points,
                  'order_index', q.order_index,
                  'correct_answer', q.correct_answer
                ) order by q.order_index asc)
        from public.exam_questions q
        where q.exam_id = p_exam_id
      ), '[]'::jsonb)
    )
  )
  on conflict (exam_id, student_id) do nothing
  returning id into v_submission_id;

  if v_submission_id is null then
    raise exception 'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً';
  end if;

  insert into public.notifications (student_id, title, body)
  values (
    v_student_id,
    'تم تسليم الامتحان',
    coalesce((select title from public.exams where id = p_exam_id), 'الامتحان') || ' — اتستلمت إجاباتك، والنتيجة هتظهر بعد مراجعة المستر.'
  );

  return jsonb_build_object('submission_id', v_submission_id);
exception
  when unique_violation then
    raise exception 'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً';
  when others then
    if SQLERRM like '%محاولة واحدة%'
      or SQLERRM like '%غير مصرح%'
      or SQLERRM like '%غير مسموح%'
      or SQLERRM like '%يجب تسجيل%'
      or SQLERRM like '%غير موجود%'
      or SQLERRM like '%ليس لصفك%'
      or SQLERRM like '%غير منشور%'
      or SQLERRM like '%لم يبدأ%'
      or SQLERRM like '%انتهى وقت%'
      or SQLERRM like '%خاص بالمشتركين%'
    then
      raise;
    end if;
    raise exception 'تعذر تسليم الامتحان حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.submit_exam(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- 10) get_my_submission — مراجعة تسليم الطالب + review_questions
--     (Snapshot بدون الإجابات الصحيحة).
--     تسليم قديم بلا Snapshot → fallback لأسئلة الامتحان الحالية
--     (نفس سلوك المراجعة ما قبل 047).
--     هام: أضفنا عمودًا للإرجاع → DROP أولاً لأن PostgreSQL لا يسمح
--     بـ CREATE OR REPLACE تغيير نوع إرجاع دالة قائمة (خطأ 42P13).
--     الحذف بدون CASCADE، والصلاحية تُعاد فورًا بعد الإنشاء بنفس المعاملة.
-- ------------------------------------------------------------
drop function if exists public.get_my_submission(uuid);

create or replace function public.get_my_submission(p_exam_id uuid)
returns table (
  id uuid,
  exam_id uuid,
  answers jsonb,
  auto_score numeric,
  manual_score numeric,
  score numeric,
  grade_released boolean,
  submitted_at timestamptz,
  review_questions jsonb
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
           s.grade_released, s.submitted_at,
           case
             when s.question_snapshot is not null
                  and jsonb_typeof(s.question_snapshot->'questions') = 'array'
               then (
                 select coalesce(jsonb_agg(elem - 'correct_answer' order by ord), '[]'::jsonb)
                 from jsonb_array_elements(s.question_snapshot->'questions') with ordinality as t(elem, ord)
               )
             else (
               select coalesce(jsonb_agg(jsonb_build_object(
                         'id', q.id,
                         'question_text', q.question_text,
                         'type', q.type,
                         'options', q.options,
                         'points', q.points,
                         'order_index', q.order_index
                       ) order by q.order_index asc), '[]'::jsonb)
               from public.exam_questions q
               where q.exam_id = s.exam_id
             )
           end as review_questions
    from public.exam_submissions s
    where s.student_id = auth.uid() and s.exam_id = p_exam_id
    limit 1;
exception
  when others then
    raise exception 'تعذر جلب بيانات تسليمك حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.get_my_submission(uuid) to authenticated;

-- ------------------------------------------------------------
-- 11) save_exam — إنشاء/تعديل الامتحان وأسئلته في معاملة واحدة:
--     فشل أي جزء لا يغير شيئًا. الأسئلة تتحدث بنفس معرفاتها،
--     والمحذوفة من الواجهة تُحذف فعلاً (التسليمات القديمة محمية بالـ Snapshot)
-- ------------------------------------------------------------
create or replace function public.save_exam(p_payload jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_exam_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_title text := btrim(coalesce(p_payload->>'title', ''));
  v_grade text := p_payload->>'grade';
  v_access_mode text := coalesce(p_payload->>'access_mode', 'subscribers');
  v_duration int;
  v_published boolean := coalesce((p_payload->>'is_published')::boolean, false);
  v_questions jsonb := coalesce(p_payload->'questions', '[]'::jsonb);
  v_q record;
  v_qid uuid;
  v_count int;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح — صلاحية أدمن مطلوبة';
  end if;

  if v_title = '' then
    raise exception 'عنوان الامتحان مطلوب';
  end if;

  if coalesce(v_grade, '') not in ('first_secondary', 'second_secondary') then
    raise exception 'الصف الدراسي غير صحيح';
  end if;

  if v_access_mode not in ('public', 'subscribers') then
    raise exception 'قيمة خصوصية الامتحان غير صحيحة';
  end if;

  begin
    v_duration := nullif(p_payload->>'duration_minutes', '')::int;
  exception
    when others then
      v_duration := null;
  end;

  if v_duration is not null and v_duration < 0 then
    raise exception 'مدة الامتحان غير صحيحة';
  end if;

  select count(*) into v_count from jsonb_array_elements(v_questions) t(elem);
  if v_count = 0 then
    raise exception 'أضف سؤالاً واحداً على الأقل قبل الحفظ';
  end if;

  for v_q in select * from jsonb_array_elements(v_questions) with ordinality as t(elem, ord) loop
    if btrim(coalesce(v_q.elem->>'question_text', '')) = '' then
      raise exception 'نص السؤال مطلوب لكل الأسئلة';
    end if;
    if coalesce(v_q.elem->>'type', '') not in ('mcq', 'true_false', 'short_answer') then
      raise exception 'نوع سؤال غير صحيح';
    end if;
    if v_q.elem->>'type' <> 'short_answer'
       and btrim(coalesce(v_q.elem->>'correct_answer', '')) = '' then
      raise exception 'كل سؤال موضوعي لازم يكون ليه إجابة صحيحة';
    end if;
  end loop;

  if v_exam_id is null then
    insert into public.exams
      (title, description, grade, duration_minutes, start_at, end_at, is_published, access_mode)
    values
      (v_title,
       p_payload->>'description',
       v_grade,
       v_duration,
       nullif(p_payload->>'start_at', '')::timestamptz,
       nullif(p_payload->>'end_at', '')::timestamptz,
       v_published,
       v_access_mode)
    returning id into v_exam_id;
  else
    if not exists (select 1 from public.exams e where e.id = v_exam_id) then
      raise exception 'الامتحان غير موجود';
    end if;

    update public.exams
      set title = v_title,
          description = p_payload->>'description',
          grade = v_grade,
          duration_minutes = v_duration,
          start_at = nullif(p_payload->>'start_at', '')::timestamptz,
          end_at = nullif(p_payload->>'end_at', '')::timestamptz,
          is_published = v_published,
          access_mode = v_access_mode
      where id = v_exam_id;
  end if;

  delete from public.exam_questions q
  where q.exam_id = v_exam_id
    and not exists (
      select 1 from jsonb_array_elements(v_questions) t(elem)
      where t.elem ? 'id' and (t.elem->>'id')::uuid = q.id
    );

  for v_q in select * from jsonb_array_elements(v_questions) with ordinality as t(elem, ord) loop
    v_qid := nullif(v_q.elem->>'id', '')::uuid;

    if v_qid is not null then
      update public.exam_questions
        set question_text = v_q.elem->>'question_text',
            type = v_q.elem->>'type',
            options = v_q.elem->'options',
            correct_answer = v_q.elem->>'correct_answer',
            points = coalesce((v_q.elem->>'points')::int, 1),
            order_index = v_q.ord::int
        where id = v_qid and exam_id = v_exam_id;

      if not found then
        raise exception 'السؤال المطلوب تعديله غير موجود — أعد تحميل الصفحة وحاول مرة أخرى';
      end if;
    else
      insert into public.exam_questions
        (exam_id, question_text, type, options, correct_answer, points, order_index)
      values
        (v_exam_id,
         v_q.elem->>'question_text',
         v_q.elem->>'type',
         v_q.elem->'options',
         v_q.elem->>'correct_answer',
         coalesce((v_q.elem->>'points')::int, 1),
         v_q.ord::int);
    end if;
  end loop;

  return v_exam_id;
exception
  when others then
    if SQLERRM like '%غير مصرح%'
      or SQLERRM like '%عنوان الامتحان%'
      or SQLERRM like '%الصف الدراسي%'
      or SQLERRM like '%خصوصية%'
      or SQLERRM like '%مدة الامتحان%'
      or SQLERRM like '%أضف سؤالاً%'
      or SQLERRM like '%نص السؤال%'
      or SQLERRM like '%نوع سؤال%'
      or SQLERRM like '%إجابة صحيحة%'
      or SQLERRM like '%غير موجود%'
      or SQLERRM like '%السؤال المطلوب%'
    then
      raise;
    end if;
    raise exception 'تعذر حفظ الامتحان حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.save_exam(jsonb) to authenticated;
