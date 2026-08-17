-- ============================================================
-- 016_course_system.sql
-- تطوير نظام الكورسات والاشتراك:
--   1) أقسام الكورسات (course_sections) — ينشئها الأدمن
--   2) الكورس: صورة + قسم (courses: image_url + section_id)
--   3) محاضرات جوه الكورس (lessons)
--   4) واجبات جوه الكورس + أسئلة + تسليمات (homeworks / homework_questions / homework_submissions)
--   5) رقم التحويل في الحجز (bookings.transfer_number) — لخطوات الدفع
--   6) الحجز المؤكد شرط للوصول + نظام الوصول بالشهور
--   7) RPC: الأدمن يفتح محادثة مع أي طالب
-- ============================================================

-- ============================================================
-- 1) الأقسام
-- ============================================================
create table if not exists public.course_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  grade text not null default 'first_secondary'
    check (grade in ('first_secondary', 'second_secondary')),
  order_index int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2) تعديل الكورسات: قسم + صورة
-- ============================================================
alter table public.courses
  add column if not exists section_id uuid references public.course_sections(id) on delete set null;
alter table public.courses
  add column if not exists image_url text;

-- ============================================================
-- 3) المحاضرات (جوه الكورس)
-- ============================================================
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  video_url text,
  order_index int not null default 1,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 4) الواجبات + الأسئلة + التسليمات
-- ============================================================
create table if not exists public.homeworks (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  order_index int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.homework_questions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  question_text text not null,
  type text not null default 'mcq'
    check (type in ('mcq', 'true_false')),
  options jsonb,
  correct_answer text,
  points int not null default 1,
  order_index int not null default 1
);

create table if not exists public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  auto_score numeric not null default 0,
  total_points numeric not null default 0,
  submitted_at timestamptz not null default now(),
  unique (homework_id, student_id)
);

create index if not exists lessons_course_idx on public.lessons (course_id, order_index);
create index if not exists homeworks_course_idx on public.homeworks (course_id, order_index);
create index if not exists homework_questions_hw_idx on public.homework_questions (homework_id, order_index);
create index if not exists homework_submissions_student_idx on public.homework_submissions (student_id);

-- ============================================================
-- 5) رقم التحويل في الحجز
-- ============================================================
alter table public.bookings
  add column if not exists transfer_number text;

-- ============================================================
-- 6) دوال الوصول (الاشتراك الشهري)
-- ------------------------------------------------------------
-- القاعدة: الطالب يرى الكورسات اللي شهر نزولها جوه النطاق
-- [أول شهر مؤكد, آخر شهر مؤكد] من حجوزاته المؤكدة.
-- ------------------------------------------------------------
create or replace function public.get_confirmed_months()
returns text[]
language sql stable security definer set search_path = public
as $$
  select coalesce(array_agg(b.month order by b.month), '{}')
  from public.bookings b
  where b.student_id = auth.uid() and b.status = 'confirmed' and b.month is not null;
$$;

-- هل الطالب الحالي عنده حجز مؤكد واحد على الأقل؟
create or replace function public.has_confirmed_booking()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.student_id = auth.uid() and b.status = 'confirmed'
  );
$$;

-- هل الكورس متاح للطالب الحالي حسب الاشتراك الشهري؟
-- النطاق: من أول شهر مؤكد لآخر شهر مؤكد (شامل) — شهر نزول الكورس جوه النطاق.
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_month text;
  v_months text[] := public.get_confirmed_months();
  v_first text;
  v_last text;
begin
  if p_course_id is null then
    return false;
  end if;

  select to_char(created_at, 'YYYY-MM') into v_course_month
  from public.courses where id = p_course_id;
  if v_course_month is null then
    return false;
  end if;

  if array_length(v_months, 1) is null then
    return false;
  end if;

  -- v_months مرتّب تصاعدياً (رجع بالـ order by)
  v_first := v_months[1];
  v_last := v_months[array_length(v_months, 1)];

  return v_course_month >= v_first and v_course_month <= v_last;
end;
$$;

-- هل الامتحان متاح للطالب الحالي (حجز مؤكد + نفس الصف + منشور)؟
create or replace function public.can_access_exam(p_exam_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select
    public.has_confirmed_booking()
    and exists (
      select 1 from public.exams e
      where e.id = p_exam_id and e.is_published = true
        and e.grade = (select grade from public.profiles where id = auth.uid())
    );
$$;

-- كورسات الطالب كاملة (معروضة بصرياً): كل كورسات صفه مع علم accessible
-- عشان يقدر يشوف المقفول "🔒 متاح بعد تجديد اشتراكك" بدل ما يختفي خالص.
create or replace function public.get_student_courses(p_grade text)
returns table (
  course_id uuid,
  title text,
  description text,
  grade text,
  video_url text,
  image_url text,
  section_id uuid,
  section_title text,
  order_index int,
  created_at timestamptz,
  accessible boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  return query
    select
      c.id,
      c.title,
      c.description,
      c.grade,
      c.video_url,
      c.image_url,
      c.section_id,
      s.title,
      c.order_index,
      c.created_at,
      public.can_access_course(c.id) as accessible
    from public.courses c
    left join public.course_sections s on s.id = c.section_id
    where c.grade = p_grade
    order by c.order_index asc;
end;
$$;

grant execute on function public.get_student_courses(text) to authenticated;

-- ============================================================
-- 7) RPC: الأدمن يفتح محادثة مع طالب محدد (مش شرط الطالب يبدأ)
-- ============================================================
create or replace function public.get_or_create_conversation_with(p_student_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_teacher uuid;
  v_conv uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() then
    raise exception 'غير مصرح';
  end if;

  if p_student_id is null then
    raise exception 'حدد الطالب أولاً';
  end if;

  -- الأدمن اللي فاتح هو المعلم
  select id into v_teacher from public.profiles where id = auth.uid();

  select id into v_conv from public.conversations where student_id = p_student_id;
  if v_conv is not null then
    return v_conv;
  end if;

  insert into public.conversations (student_id, teacher_id)
  values (p_student_id, v_teacher)
  on conflict (student_id) do nothing
  returning id into v_conv;

  if v_conv is null then
    select id into v_conv from public.conversations where student_id = p_student_id;
  end if;

  return v_conv;
end;
$$;

grant execute on function public.get_or_create_conversation_with(uuid) to authenticated;

-- ============================================================
-- RLS للجداول الجديدة
-- ============================================================
alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.homeworks enable row level security;
alter table public.homework_questions enable row level security;
alter table public.homework_submissions enable row level security;

-- الأقسام: يقراها الجميع (للترتيب)، يكتبها الأدمن
create policy "course_sections: read authenticated"
  on public.course_sections for select to authenticated using (true);
create policy "course_sections: admin write"
  on public.course_sections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- المحاضرات: مش متاحة للطلاب مباشرة — بتيجي عبر دالة آمنة
create policy "lessons: admin write"
  on public.lessons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- الواجبات: مش متاحة للطلاب مباشرة — بتيجي عبر دالة آمنة
create policy "homeworks: admin write"
  on public.homeworks for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- أسئلة الواجب: الأدمن بس (الإجابات مخفية عن الطلاب)
create policy "homework_questions: admin only"
  on public.homework_questions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- تسليمات الواجب: الأدمن يقرأ الكل، والطالب تسليمه بيحصل عن طريق RPC
create policy "homework_submissions: admin only direct"
  on public.homework_submissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.course_sections to authenticated;
grant insert, update, delete on public.course_sections to authenticated;
grant insert, update, delete on public.lessons to authenticated;
grant insert, update, delete on public.homeworks to authenticated;
grant insert, update, delete on public.homework_questions to authenticated;
grant insert, update, delete on public.homework_submissions to authenticated;
grant select, insert on public.homework_submissions to authenticated;

-- الكورسات: الطالب يقرأ بس المتاح له (حجز مؤكد + شهر النزول جوه نطاقه)
drop policy if exists "courses: authenticated users read" on public.courses;
create policy "courses: read accessible or admin"
  on public.courses for select to authenticated
  using (public.is_admin() or public.can_access_course(id));

-- الـ view العام للزوار لازم يفضل شغال — الـ view افتراضياً يعمل بصلاحيات المالك (postgres)
-- عشان كده مش بيتأثر بسياسة courses الجديدة (الزوار مالهمش حجوزات).
drop view if exists public.courses_public;
create view public.courses_public as
select id, title, description, grade, order_index
from public.courses;
grant select on public.courses_public to anon, authenticated;

-- الامتحانات: الطالب يشوف بس الامتحانات المتاحة (حجز مؤكد + صف مطابق + منشور)
drop policy if exists "exams: students read published for own grade" on public.exams;
create policy "exams: students read accessible"
  on public.exams for select to authenticated
  using (public.is_admin() or public.can_access_exam(id));

-- ============================================================
-- دوال الواجبات (للطالب — من غير الإجابات)
-- ============================================================
create or replace function public.get_homework_questions(p_homework_id uuid)
returns table (
  question_id uuid,
  homework_id uuid,
  question_text text,
  type text,
  options jsonb,
  points int,
  order_index int
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() and not public.has_confirmed_booking() then
    raise exception 'الواجبات متاحة للمشتركين المؤكدين فقط';
  end if;

  return query
    select q.id, q.homework_id, q.question_text, q.type, q.options, q.points, q.order_index
    from public.homework_questions q
    where q.homework_id = p_homework_id
    order by q.order_index asc;
end;
$$;

grant execute on function public.get_homework_questions(uuid) to authenticated;

-- محاضرات الكورس (للطالب المشترك)
create or replace function public.get_course_lessons(p_course_id uuid)
returns table (
  lesson_id uuid,
  course_id uuid,
  title text,
  video_url text,
  order_index int
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() and not public.can_access_course(p_course_id) then
    raise exception 'هذا الكورس غير متاح لاشتراكك الحالي';
  end if;

  return query
    select l.id, l.course_id, l.title, l.video_url, l.order_index
    from public.lessons l
    where l.course_id = p_course_id
    order by l.order_index asc;
end;
$$;

grant execute on function public.get_course_lessons(uuid) to authenticated;

-- واجبات الكورس (العناوين فقط — الأسئلة عن طريق get_homework_questions)
create or replace function public.get_course_homeworks(p_course_id uuid)
returns table (
  homework_id uuid,
  course_id uuid,
  title text,
  description text,
  order_index int,
  submitted boolean,
  score numeric,
  total_points numeric
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() and not public.can_access_course(p_course_id) then
    raise exception 'هذا الكورس غير متاح لاشتراكك الحالي';
  end if;

  return query
    select
      h.id, h.course_id, h.title, h.description, h.order_index,
      (hs.id is not null) as submitted,
      hs.auto_score as score,
      hs.total_points
    from public.homeworks h
    left join public.homework_submissions hs
      on hs.homework_id = h.id and hs.student_id = auth.uid()
    where h.course_id = p_course_id
    order by h.order_index asc;
end;
$$;

grant execute on function public.get_course_homeworks(uuid) to authenticated;

-- تسليم الواجب (تصحيح آلي فوري — صح/خطأ)
create or replace function public.submit_homework(p_homework_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_question record;
  v_answer text;
  v_auto numeric := 0;
  v_total numeric := 0;
  v_submission_id uuid;
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() and not public.has_confirmed_booking() then
    raise exception 'الواجبات متاحة للمشتركين المؤكدين فقط';
  end if;

  if p_answers is null then
    raise exception 'اكتب إجاباتك أولاً';
  end if;

  -- التصحيح الآلي
  for v_question in
    select * from public.homework_questions q
    where q.homework_id = p_homework_id
  loop
    v_total := v_total + coalesce(v_question.points, 1);
    v_answer := p_answers ->> v_question.id::text;
    if v_answer is not null and v_answer = v_question.correct_answer then
      v_auto := v_auto + coalesce(v_question.points, 1);
    end if;
  end loop;

  insert into public.homework_submissions (homework_id, student_id, answers, auto_score, total_points)
  values (p_homework_id, v_student_id, p_answers, v_auto, v_total)
  on conflict (homework_id, student_id) do nothing
  returning id into v_submission_id;

  if v_submission_id is null then
    raise exception 'سلمت هذا الواجب من قبل — محاولة واحدة فقط';
  end if;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'score', v_auto,
    'total', v_total
  );
end;
$$;

grant execute on function public.submit_homework(uuid, jsonb) to authenticated;

-- ============================================================
-- تأكيد الحجز شرط للامتحانات (يُعدل نسخ 014)
-- ------------------------------------------------------------
-- الطالب لازم يكون عنده حجز مؤكد علشان يقرأ أسئلة الامتحان
-- أو يسلم — ماعدا مراجعة تسليمه اللي عملو (زي ما كان).
-- ============================================================
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
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  -- المشتركين المؤكدين بس — ماعدا اللي عنده تسليم قديم (مراجعة)
  if not public.has_confirmed_booking()
     and not exists (
       select 1 from public.exam_submissions s
       where s.exam_id = p_exam_id and s.student_id = v_student_id
     ) then
    raise exception 'الامتحانات متاحة للمشتركين المؤكدين فقط';
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
    select q.id::uuid as question_id, q.exam_id, q.question_text, q.type, q.options, q.points, q.order_index
    from public.exam_questions q
    where q.exam_id = p_exam_id
    order by q.order_index asc;
exception
  -- أي خطأ غير متوقع (خلل داخلي) → رسالة عامة، من غير تفاصيل PostgreSQL
  when others then
    raise exception 'تعذر تحميل أسئلة الامتحان حالياً، حاول مرة أخرى';
end;
$$;

grant execute on function public.get_exam_questions(uuid) to authenticated;

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

  -- المشتركين المؤكدين بس
  if not public.has_confirmed_booking() then
    raise exception 'الامتحانات متاحة للمشتركين المؤكدين فقط';
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