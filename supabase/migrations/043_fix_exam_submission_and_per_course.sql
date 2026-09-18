-- ============================================================
-- 043_fix_exam_submission_and_per_course.sql
-- 1) إصلاح حجب رسالة الحجز في submit_exam
-- 2) تحويل الدفع من شهري إلى اشتراك بالكورس (per-course)
-- 3) إصلاح can_access_course و get_student_courses
-- ============================================================

-- ----------------------------------------------------------
-- 1) إصلاح submit_exam: إظهار رسالة الحجز بدل حجبها
-- ----------------------------------------------------------
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

  if not public.is_student() then
    raise exception 'غير مسموح للطالب الحالي بتسليم الامتحانات';
  end if;

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

  if v_exam.duration_minutes is not null and v_exam.duration_minutes > 0 and v_exam.start_at is not null then
    v_deadline := v_exam.start_at + (v_exam.duration_minutes || ' minutes')::interval;
    if now() > v_deadline then
      raise exception 'انتهى وقت الامتحان';
    end if;
  end if;

  for v_question in select * from public.exam_questions q where q.exam_id = p_exam_id loop
    v_answer := p_answers ->> v_question.id::text;
    if v_question.type <> 'short_answer' and v_answer is not null and v_answer = v_question.correct_answer then
      v_auto := v_auto + coalesce(v_question.points, 0);
    end if;
  end loop;

  insert into public.exam_submissions (exam_id, student_id, answers, auto_score, score)
  values (p_exam_id, v_student_id, p_answers, v_auto, v_auto)
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

  return jsonb_build_object('submission_id', v_submission_id, 'auto_score', v_auto);
exception
  when unique_violation then
    raise exception 'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً';
  when others then
    -- إعادة رسائل الحجز/الصلاحية كما هي بدون حجب
    if SQLERRM like '%مشتركين مؤكدين%' or SQLERRM like '%الحجز%' or SQLERRM like '%ليس لصفك%' or SQLERRM like '%لم يبدأ%' or SQLERRM like '%انتهى وقت%' or SQLERRM like '%محاولة واحدة%' or SQLERRM like '%غير مسموح%' or SQLERRM like '%غير موجود%' then
      raise;
    end if;
    raise exception 'تعذر تسليم الامتحان حالياً، حاول مرة أخرى';
end;
$$;
grant execute on function public.submit_exam(uuid, jsonb) to authenticated;

-- ----------------------------------------------------------
-- 2) تحديث نظام الحجز إلى per-course (مع الإبقاء على التوافق مع القديم)
-- ----------------------------------------------------------

-- has_confirmed_booking يبقى للتوافق، لكن نصلحه ليقبل per-course أو شهري
create or replace function public.has_confirmed_booking()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.student_id = auth.uid() and b.status = 'confirmed'
      and (
        -- per-course: حجز على كورس محدد
        b.course_id is not null
        -- شهري قديم: حجز للصف الحالي
        or (b.grade = (select grade from public.profiles where id = auth.uid()) and b.month is not null)
        -- احترافي: حجز كورس احترافي
        or (b.grade = 'professional' and b.course_id is not null)
      )
  );
$$;
grant execute on function public.has_confirmed_booking() to authenticated;

-- can_access_course: يتحقق من حجز per-course أولاً، ثم الشهري كـ fallback
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_grade text;
  v_course_month text;
  v_months text[];
  v_first text;
  v_last text;
begin
  if p_course_id is null then return false; end if;
  if public.is_admin() then return true; end if;

  select grade, to_char(created_at, 'YYYY-MM') into v_grade, v_course_month from public.courses where id = p_course_id;
  if v_grade is null then return false; end if;

  -- per-course: هل يوجد حجز مؤكد لهذا الكورس بالذات؟
  if exists (select 1 from public.bookings b where b.student_id = auth.uid() and b.status = 'confirmed' and b.course_id = p_course_id) then
    return true;
  end if;

  -- الكورس الاحترافي: فقط per-course
  if v_grade = 'professional' then return false; end if;

  -- fallback: النظام الشهري القديم (للتوافق)
  if v_course_month is null then return false; end if;
  select public.get_confirmed_months() into v_months;
  if array_length(v_months, 1) is null then return false; end if;
  v_first := v_months[1];
  v_last := v_months[array_length(v_months, 1)];
  return v_course_month >= v_first and v_course_month <= v_last;
end;
$$;
grant execute on function public.can_access_course(uuid) to authenticated;

-- can_access_lesson: نفس المنطق per-course
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_id uuid;
  v_is_free boolean;
  v_grade text;
  v_course_month text;
  v_months text[];
begin
  if p_lesson_id is null then return false; end if;
  select l.course_id, l.is_free into v_course_id, v_is_free from public.lessons where id = p_lesson_id;
  if v_course_id is null then return false; end if;
  if v_is_free then return true; end if;
  if public.is_admin() then return true; end if;

  -- per-course أولاً
  if exists (select 1 from public.bookings b where b.student_id = auth.uid() and b.status = 'confirmed' and b.course_id = v_course_id) then
    return true;
  end if;

  select grade, to_char(created_at, 'YYYY-MM') into v_grade, v_course_month from public.courses where id = v_course_id;
  if v_grade = 'professional' then return false; end if;
  if v_course_month is null then return false; end if;
  select public.get_confirmed_months() into v_months;
  if array_length(v_months, 1) is null then return false; end if;
  return v_course_month >= v_months[1] and v_course_month <= v_months[array_length(v_months, 1)];
end;
$$;
grant execute on function public.can_access_lesson(uuid) to authenticated;

-- إصلاح RLS على courses ليعتمد على is_published + grade (يشوف الكورس مقفول لا يخفيه)
drop policy if exists "courses: read accessible or admin" on public.courses;
drop policy if exists "courses: student read own grade or published professional" on public.courses;
create policy "courses: read own grade or admin"
  on public.courses for select to authenticated
  using (public.is_admin() or grade = (select grade from public.profiles where id = auth.uid()) or (grade = 'professional' and coalesce(is_published, true) = true));

-- إصلاح RLS على lessons ليستخدم can_access_lesson
drop policy if exists "lessons: read accessible or free or admin" on public.lessons;
drop policy if exists "lessons: student read own grade or professional" on public.lessons;
drop policy if exists "lessons: admin all" on public.lessons;
create policy "lessons: read free or accessible or admin"
  on public.lessons for select to authenticated
  using (public.is_admin() or is_free = true or public.can_access_lesson(id));
create policy "lessons: admin all"
  on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- إصلاح get_student_courses: يستخدم grade من البروفايل ويعرض الكل مع accessible
create or replace function public.get_student_courses(p_grade text)
returns table (
  course_id uuid, title text, description text, grade text, video_url text, image_url text, price numeric,
  section_id uuid, section_title text, order_index int, created_at timestamptz, accessible boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare v_grade text; v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول'; end if;
  if public.is_admin() then v_grade := coalesce(nullif(p_grade,''), (select grade from public.profiles where id=v_uid));
  else select grade into v_grade from public.profiles where id=v_uid; if v_grade is null then raise exception 'البروفايل غير موجود'; end if; end if;
  return query select c.id, c.title, c.description, c.grade,
    case when public.can_access_course(c.id) then c.video_url else null end, c.image_url, c.price, c.section_id, s.title, c.order_index, c.created_at,
    public.can_access_course(c.id) as accessible
  from public.courses c left join public.course_sections s on s.id=c.section_id
  where coalesce(c.is_published,true)=true and (c.grade=v_grade or c.grade='professional')
  order by c.order_index asc, c.created_at asc;
end; $$;
grant execute on function public.get_student_courses(text) to authenticated;

-- get_course_lessons: يحجب video_url للمقفول
create or replace function public.get_course_lessons(p_course_id uuid)
returns table (lesson_id uuid, title text, description text, video_url text, video_provider text, duration_minutes int, order_index int, is_free boolean, accessible boolean)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
  if not exists (select 1 from public.courses c where c.id=p_course_id and (c.grade=(select grade from public.profiles where id=auth.uid()) or c.grade='professional')) then
    raise exception 'هذا الكورس ليس لصفك'; end if;
  return query select l.id, l.title, l.description,
    case when public.can_access_lesson(l.id) then l.video_url else null end,
    l.video_provider, l.duration_minutes, l.order_index, l.is_free, public.can_access_lesson(l.id)
  from public.lessons l where l.course_id=p_course_id order by l.order_index asc;
end; $$;
grant execute on function public.get_course_lessons(uuid) to authenticated;
