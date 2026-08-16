-- ============================================================
-- 011_functions_triggers.sql
-- دوال الأمان + الإشعارات
-- ============================================================

-- =================================================================
-- 1) submit_exam — تسليم الامتحان (security definer)
--    * يتحقق من الطالب والامتحان والنافذة الزمنية
--    * يصحح الموضوعي آلياً
--    * يدرج تسليم — والـ unique constraint بيمنع أي تكرار
-- =================================================================
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

-- =================================================================
-- 2) get_exam_questions — أسئلة الامتحان للطالب
--    من غير correct_answer إطلاقاً (security definer)
-- =================================================================
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
    select q.id, q.exam_id, q.question_text, q.type, q.options, q.points, q.order_index
    from public.exam_questions q
    where q.exam_id = p_exam_id
    order by q.order_index asc;
end;
$$;

-- =================================================================
-- 3) get_my_submissions — حالة تسليمات الطالب (بدون إجابات/درجات غير منشورة)
-- =================================================================
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
  return query
    select s.exam_id, s.submitted_at, s.grade_released,
           case when s.grade_released then s.score else null end as score
    from public.exam_submissions s
    where s.student_id = auth.uid();
end;
$$;

-- =================================================================
-- 4) get_my_submission — تسليم الطالب في امتحان معين
--    الدرجة مش بتتسرب قبل النشر
-- =================================================================
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
    select s.id, s.exam_id, s.answers, s.auto_score, s.manual_score,
           case when s.grade_released then s.score else null end as score,
           s.grade_released, s.submitted_at
    from public.exam_submissions s
    where s.student_id = auth.uid() and s.exam_id = p_exam_id
    limit 1;
end;
$$;

-- =================================================================
-- 5) publish_grade — نشر درجة طالب (الأدمن بس)
-- =================================================================
create or replace function public.publish_grade(p_submission_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid;
  v_exam_title text;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح — صلاحية أدمن مطلوبة';
  end if;

  select s.student_id, e.title
    into v_student, v_exam_title
  from public.exam_submissions s
  join public.exams e on e.id = s.exam_id
  where s.id = p_submission_id;

  update public.exam_submissions s
  set score = coalesce(s.auto_score, 0) + coalesce(s.manual_score, 0),
      grade_released = true
  where s.id = p_submission_id;

  if v_student is not null then
    insert into public.notifications (student_id, title, body)
    values (v_student, 'درجتك اتعلنت', 'درجة امتحان ' || coalesce(v_exam_title, '') || ' متاحة دلوقتي في صفحة الدرجات.');
  end if;
end;
$$;

-- =================================================================
-- 6) publish_exam_grades — نشر كل درجات امتحان دفعة واحدة (الأدمن)
-- =================================================================
create or replace function public.publish_exam_grades(p_exam_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_sub record;
  v_title text;
begin
  if not public.is_admin() then
    raise exception 'غير مصرح — صلاحية أدمن مطلوبة';
  end if;

  select title into v_title from public.exams where id = p_exam_id;

  update public.exam_submissions s
  set score = coalesce(s.auto_score, 0) + coalesce(s.manual_score, 0),
      grade_released = true
  where s.exam_id = p_exam_id;

  for v_sub in
    select s.id, s.student_id
    from public.exam_submissions s
    where s.exam_id = p_exam_id
  loop
    insert into public.notifications (student_id, title, body)
    values (
      v_sub.student_id,
      'درجتك اتعلنت',
      'درجة امتحان ' || coalesce(v_title, '') || ' متاحة دلوقتي في صفحة الدرجات.'
    );
  end loop;
end;
$$;

-- ---------- تنفيذ الدوال على الدور authenticated ----------
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;
grant execute on function public.get_exam_questions(uuid) to authenticated;
grant execute on function public.get_my_submissions() to authenticated;
grant execute on function public.get_my_submission(uuid) to authenticated;
grant execute on function public.publish_grade(uuid) to authenticated;
grant execute on function public.publish_exam_grades(uuid) to authenticated;

-- =================================================================
-- 7) إشعار تغيير حالة الحجز
-- =================================================================
create or replace function public.notify_booking_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notifications (student_id, title, body)
    values (
      new.student_id,
      'تحديث حالة الحجز',
      case new.status
        when 'confirmed' then 'تم تأكيد حجزك بنجاح — مستنيك في الحصة 🎉'
        when 'rejected' then 'نأسف، تم رفض حجزك — تواصل معنا لترتيب ميعاد تاني.'
        else 'حجزك قيد المراجعة حالياً.'
      end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_notify on public.bookings;
create trigger bookings_notify
  after update on public.bookings
  for each row execute procedure public.notify_booking_status();

-- =================================================================
-- 8) إشعار الطلاب بنشر امتحان جديد لصفهم
-- =================================================================
create or replace function public.notify_exam_published()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.is_published and (old.is_published is not true or old.is_published is null) then
    insert into public.notifications (student_id, title, body)
    select p.id, 'امتحان جديد متاح', new.title || ' — منشور لصفك، تقدر تحله من لوحة الطالب.'
    from public.profiles p
    where p.role = 'student' and p.grade = new.grade;
  end if;
  return new;
end;
$$;

drop trigger if exists exams_published_notify on public.exams;
create trigger exams_published_notify
  after update on public.exams
  for each row execute procedure public.notify_exam_published();