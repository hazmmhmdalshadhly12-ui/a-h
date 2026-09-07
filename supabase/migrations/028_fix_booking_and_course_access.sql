-- ============================================================
-- 028_fix_booking_and_course_access.sql
-- إصلاحات لمشاكل الحجز المؤكد ووصول الكورسات
-- ============================================================

-- ============================================================
-- 1) تحسين has_confirmed_booking — يتحقق من أي حجز مؤكد للصف الحالي
--    أو حجز كورس احترافي
-- ============================================================
drop function if exists public.has_confirmed_booking();
create or replace function public.has_confirmed_booking()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.student_id = auth.uid()
      and b.status = 'confirmed'
      and (
        -- حجز صف عادي للصف الحالي
        (b.grade = (select grade from public.profiles where id = auth.uid()) and b.month is not null)
        or
        -- حجز كورس احترافي
        (b.grade = 'professional' and b.course_id is not null)
      )
  );
$$;
grant execute on function public.has_confirmed_booking() to authenticated;

-- ============================================================
-- 2) تحسين can_access_course — يظهر الكورسات حتى لو مش متاحة (مقفولة)
--    الدالة get_student_courses بتعرض الكورسات مع accessible = false
--    لكن دالة can_access_course كانت ترجع false وتخفي الكورس تماماً في بعض الحالات
-- ============================================================
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_month text;
  v_grade text;
  v_months text[];
  v_first text;
  v_last text;
begin
  if p_course_id is null then
    return false;
  end if;

  select c.grade, to_char(c.created_at, 'YYYY-MM') into v_grade, v_course_month
  from public.courses c where c.id = p_course_id;
  if v_grade is null then
    return false;
  end if;

  -- الكورس الاحترافي: حجز مؤكد على نفس الكورس
  if v_grade = 'professional' then
    return exists (
      select 1 from public.bookings b
      where b.student_id = auth.uid()
        and b.status = 'confirmed'
        and b.course_id = p_course_id
    );
  end if;

  -- الكورسات العادية: النطاق الشهري (يشمل المنح اليدوية)
  if v_course_month is null then
    return false;
  end if;

  select public.get_confirmed_months() into v_months;
  if array_length(v_months, 1) is null then
    -- لو مفيش حجز مؤكد، نرجع false (الكورس هيتعرض مقفول)
    return false;
  end if;

  v_first := v_months[1];
  v_last := v_months[array_length(v_months, 1)];
  return v_course_month >= v_first and v_course_month <= v_last;
end;
$$;

-- ============================================================
-- 3) تحسين get_student_courses — يضمن إن الكورسات تبان حتى لو الطالب مشتركش
--    (الوصول يتحدد بحقل accessible)
-- ============================================================
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
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  -- الصف بييجي من البروفايل دايماً — مش من اللي بيستدعي (منع تسريب صف تاني)
  select grade into v_grade from public.profiles where id = auth.uid();
  if v_grade is null then
    raise exception 'البروفايل غير موجود';
  end if;

  return query
    select
      c.id,
      c.title,
      c.description,
      c.grade,
      -- الفيديو بيتحجب لو الكورس مش متاح للاشتراك الحالي (منع تسريب محتوى مدفوع)
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
    where c.grade = v_grade or c.grade = 'professional'
    order by c.order_index asc;
end;
$$;
grant execute on function public.get_student_courses(text) to authenticated;

-- ============================================================
-- 4) تحسين submit_exam — رسائل خطأ أوضح للطالب
-- ============================================================
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

  -- الاشتراك المؤكد مطلوب
  if not public.has_confirmed_booking() then
    raise exception 'الامتحانات متاحة للمشتركين المؤكدين فقط — راجع حالة حجزك في صفحة الحجوزات';
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
  when unique_violation then
    raise exception 'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً';
  when others then
    raise exception 'تعذر تسليم الامتحان حالياً، حاول مرة أخرى';
end;
$$;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;

-- ============================================================
-- 5) منح execute للدوال المحدثة
-- ============================================================
grant execute on function public.has_confirmed_booking() to authenticated;
grant execute on function public.can_access_course(uuid) to authenticated;
grant execute on function public.get_student_courses(text) to authenticated;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;