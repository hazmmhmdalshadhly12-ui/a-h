-- ============================================================
-- 047_exam_access_mode_and_integrity.sql
-- نظام الامتحانات: خصوصية مستقلة لكل امتحان + سلامة البيانات + موثوقية الوقت
--
-- 1) عمود access_mode على exams:
--    - 'public'     : امتحان عام — أي طالب مسجل من الصف المستهدف يدخله بدون اشتراك
--    - 'subscribers': امتحان خاص — يتطلب اشتراكًا مؤكدًا (السلوك الحالي لكل الامتحانات)
--    - القيمة الافتراضية للامتحانات القديمة: 'subscribers' (لا يتحول أي امتحان قديم لعام تلقائيًا)
--
-- 2) جدول exam_attempts: تسجيل وقت بدء محاولة كل طالب (المؤقت لا يُصفَّر بالتحديث)
--
-- 3) عمود question_snapshot على exam_submissions: نسخة الأسئلة التي أجاب عنها الطالب
--    (تعديل أو حذف أسئلة الامتحان لاحقًا لا يفسد مراجعة النتائج القديمة)
--
-- 4) حارس منع حذف امتحان له نتائج طلاب (بدلاً من ON DELETE CASCADE الصامت)
--
-- 5) إصلاح RPC:
--    - get_exam_questions: توحيد سياسة الوصول + النافذة الزمنية (كانت بدون فحص اشتراك/وقت)
--    - submit_exam: سياسة موحدة + مهلة محاولة من الخادم + Snapshot (بدون تسريب auto_score)
--    - start_exam_attempt (جديدة): بدء آمن للمحاولة + إرجاع موعد الاستقطاع من الخادم
--    - save_exam (جديدة): إنشاء/تعديل الامتحان وأسئلته ذريًا مع الحفاظ على معرفات الأسئلة
--
-- سياسة تغيير الخصوصية أثناء وجود محاولات:
--    - التغيير يمنع المحاولات الجديدة للطلاب غير المستوفين فورًا.
--    - المحاولات والنتائج السابقة لا تُحذف ولا تتأثر.
--    - المحاولة التي بدأت وهي مصرح بها (access_ok) تظل قابلة للاستكمال والتسليم.
--
-- هامش التسليم (Grace): 60 ثانية تُضاف على مهلة المدة فقط (وليس على end_at)
--    لتغطية زمن إرسال التسليم الآلي عند انتهاء العد التنازلي.
--
-- الملف إضافي بالكامل ولا يعدّل أي Migration قديم، وكل الأوامر آمنة لإعادة التشغيل.
-- ============================================================

-- ------------------------------------------------------------
-- 1) عمود access_mode + قيد CHECK
-- ------------------------------------------------------------
alter table public.exams
  add column if not exists access_mode text not null default 'subscribers';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'exams_access_mode_check'
      and conrelid = 'public.exams'::regclass
  ) then
    alter table public.exams
      add constraint exams_access_mode_check check (access_mode in ('public', 'subscribers'));
  end if;
end
$$;

comment on column public.exams.access_mode is
  'خصوصية الامتحان: public = عام لكل طلاب الصف، subscribers = خاص بالمشتركين المؤكدين فقط';

-- ------------------------------------------------------------
-- 2) جدول exam_attempts — وقت بدء محاولة كل طالب لكل امتحان
--    (محاولة واحدة لكل طالب: unique (exam_id, student_id))
-- ------------------------------------------------------------
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  -- هل كانت المحاولة مصرحًا بها عند بدئها؟ (لحماية محاولة جارية عند تغيير خصوصية الامتحان)
  access_ok boolean not null default true,
  created_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create index if not exists exam_attempts_exam_idx on public.exam_attempts (exam_id);
create index if not exists exam_attempts_student_idx on public.exam_attempts (student_id);

alter table public.exam_attempts enable row level security;

-- الطلاب لا يلمسون الجدول مباشرة إطلاقًا — كل الوصول عبر RPC (security definer)
drop policy if exists "exam_attempts: admin only direct access" on public.exam_attempts;
create policy "exam_attempts: admin only direct access"
  on public.exam_attempts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ------------------------------------------------------------
-- 3) عمود question_snapshot على exam_submissions
--    نسخة الأسئلة وقت التسليم (مع الإجابات الصحيحة للمراجعة الإدارية).
--    الطلاب لا يصلون لهذا العمود إلا عبر get_my_submission (بدون correct_answer).
-- ------------------------------------------------------------
alter table public.exam_submissions
  add column if not exists question_snapshot jsonb;

comment on column public.exam_submissions.question_snapshot is
  'Snapshot لأسئلة الامتحان لحظة التسليم — يحفظ تفسير إجابات الطالب حتى لو تعدلت الأسئلة أو حذفت لاحقًا';

-- ------------------------------------------------------------
-- 4) حارس حذف الامتحانات: ممنوع حذف امتحان له نتائج طلاب
--    (البديل الآمن: إلغاء النشر is_published = false)
-- ------------------------------------------------------------
create or replace function public.prevent_exam_delete_with_submissions()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.exam_submissions s where s.exam_id = old.id) then
    raise exception 'لا يمكن حذف امتحان له نتائج طلاب — استخدم إلغاء النشر بدلاً من الحذف';
  end if;
  return old;
end;
$$;

drop trigger if exists exams_delete_guard on public.exams;
create trigger exams_delete_guard
  before delete on public.exams
  for each row execute procedure public.prevent_exam_delete_with_submissions();

-- ------------------------------------------------------------
-- 5) exam_attempt_deadline — المصدر الموحد لموعد استقطاع المحاولة
--    cutoff = أقرب (end_at ، start_at+duration ، started_at+duration) + مهلة 60 ثانية
--    على بنود المدة فقط. end_at صارم بلا مهلة (لا يغير سلوكه القديم).
-- ------------------------------------------------------------
create or replace function public.exam_attempt_deadline(p_exam public.exams, p_attempt_started timestamptz)
returns timestamptz
language sql stable
as $$
  select least(
    coalesce(p_exam.end_at, 'infinity'::timestamptz),
    case
      when p_exam.duration_minutes is not null and p_exam.duration_minutes > 0
           and p_exam.start_at is not null
        then p_exam.start_at + make_interval(mins => p_exam.duration_minutes) + interval '60 seconds'
      else 'infinity'::timestamptz
    end,
    case
      when p_exam.duration_minutes is not null and p_exam.duration_minutes > 0
           and p_attempt_started is not null
        then p_attempt_started + make_interval(mins => p_exam.duration_minutes) + interval '60 seconds'
      else 'infinity'::timestamptz
    end
  );
$$;

-- ------------------------------------------------------------
-- 6) can_access_exam — خصوصية الامتحان + الصف + النشر
--    (تُستخدم في سياسة RLS على exams لبيانات الامتحان الأساسية فقط؛
--     فرض الاشتراك الفعلي يحدث داخل RPC الأسئلة/المحاولة/التسليم)
-- ------------------------------------------------------------
create or replace function public.can_access_exam(p_exam_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.exams e
    where e.id = p_exam_id
      and e.is_published = true
      and e.grade = (select grade from public.profiles where id = auth.uid())
      and (
        e.access_mode = 'public'
        or public.has_confirmed_booking()
      )
  );
$$;

grant execute on function public.can_access_exam(uuid) to authenticated;

-- سياسة RLS للامتحانات: طلاب الصف يشوفون الامتحانات المنشورة لصفهم
-- (الامتحانات الخاصة تظهر للطالب غير المشترك بحالة مقفولة مع سبب المنع —
--  أما الأسئلة والتسليم فيفرضهما الـ RPC وفق access_mode)
drop policy if exists "exams: students read accessible" on public.exams;
drop policy if exists "exams: students read published for own grade" on public.exams;
create policy "exams: students read published for own grade"
  on public.exams for select to authenticated
  using (
    public.is_admin()
    or (
      is_published = true
      and grade = (select grade from public.profiles where id = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 7) get_exam_questions — سياسة وصول موحدة
--    مسموح فقط إذا:
--      أ) الطالب سلم من قبل (مراجعة إجاباته في أي وقت) — أو
--      ب) الامتحان منشور + لصفه + مصرح به (عام أو مشترك/محاولة سابقة مصرح بها)
--         + داخل النافذة الزمنية + قبل موعد الاستقطاع
--    أول جلب أسئلة لطالب (غير مسلم) = بدء محاولته (تثبيت المؤقت)
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

  select * into v_exam from public.exams e where e.id = p_exam_id;
  if not found then
    raise exception 'الامتحان غير موجود';
  end if;

  select grade into v_grade from public.profiles where id = v_student_id;

  v_submitted := exists (
    select 1 from public.exam_submissions s
    where s.exam_id = p_exam_id and s.student_id = v_student_id
  );

  -- (أ) مسلّم من قبل → مراجعة إجاباته (بدون فحوصات وقت/اشتراك)
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

    -- خصوصية الامتحان: عام → متاح للصف. خاص → اشتراك مؤكد أو محاولة سابقة مصرح بها
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

    -- أول جلب للأسئلة = بدء المحاولة (تثبيت المؤقت ضد تحديث الصفحة)
    if public.is_student() then
      insert into public.exam_attempts (exam_id, student_id, access_ok)
      values (p_exam_id, v_student_id, true)
      on conflict (exam_id, student_id) do nothing;

      select a.started_at into v_attempt_started
      from public.exam_attempts a
      where a.exam_id = p_exam_id and a.student_id = v_student_id;
    end if;

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
-- 8) start_exam_attempt — بدء محاولة الطالب بأمان
--    يفرض كل الشروط قبل بدء المحاولة، ويرجّع:
--    server_now + attempt_started_at + deadline (موعد الاستقطاع من الخادم)
--    حتى يكون العد التنازلي في الواجهة مصدره الخادم — لا يُصفَّر بالتحديث.
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

  -- سلم من قبل؟ مفيش محاولة جديدة — الواجهة تتحول للمراجعة
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
-- 9) submit_exam — سياسة وصول موحدة + مهلة من الخادم + Snapshot
--    التغييرات عن النسخ السابقة:
--    a) فحص التكرار مبكرًا (قبل سياسة الاشتراك) لتظهر رسالة "سبق التسليم" الصحيحة
--    b) الاشتراك يُفحص فقط للامتحانات الخاصة (access_mode = 'subscribers')
--       مع احترام المحاولة المصرح بها سابقًا (تغيير الخصوصية لا يفسد محاولة جارية)
--    c) المهلة تُحسب من وقت بدء محاولة الطالب (لا يُصفَّر بالتحديث) مع مهلة 60 ثانية
--    d) حفظ Snapshot للأسئلة مع التسليم — مراجعة النتائج القديمة لا تنكسر
--    e) الاستجابة لا تحتوي auto_score (كانت بتتسرب قبل نشر الدرجة)
--    طريقة احتساب الدرجات نفسها تمامًا بدون أي تغيير.
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

  -- خصوصية الامتحان: عام → بدون اشتراك. خاص → اشتراك مؤكد أو محاولة مصرح بها
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

  -- لو مفيش محاولة مسجلة (استدعاء RPC مباشر) → تُسجل الآن بنفس شروط البدء
  if v_attempt_started is null then
    insert into public.exam_attempts (exam_id, student_id, access_ok)
    values (p_exam_id, v_student_id, true)
    on conflict (exam_id, student_id) do nothing;

    select a.started_at into v_attempt_started
    from public.exam_attempts a
    where a.exam_id = p_exam_id and a.student_id = v_student_id;
  end if;

  if now() > public.exam_attempt_deadline(v_exam, v_attempt_started) then
    raise exception 'انتهى وقت الامتحان';
  end if;

  -- التصحيح الآلي للموضوعي (mcq + true_false) — نفس المنطق القديم بدون تغيير
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

  -- الإدراج + Snapshot للأسئلة (يحفظ النسخة التي أجاب عنها الطالب)
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

  -- إشعار الطالب بتأكيد التسليم
  insert into public.notifications (student_id, title, body)
  values (
    v_student_id,
    'تم تسليم الامتحان',
    coalesce((select title from public.exams where id = p_exam_id), 'الامتحان') || ' — اتستلمت إجاباتك، والنتيجة هتظهر بعد مراجعة المستر.'
  );

  -- الدرجة لا تُرجع في الاستجابة — تظهر للطالب فقط بعد نشرها من الأدمن
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
-- 10) get_my_submission — إضافة review_questions (Snapshot بدون الإجابات الصحيحة)
--     عشان مراجعة الطالب تفضل صحيحة حتى لو الأسئلة اتعدلت أو اتحذفت بعدين.
--     العمود إضافي والتوافق مع أي كود قديم محفوظ.
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
             when s.question_snapshot is null then null
             else (
               select coalesce(jsonb_agg(elem - 'correct_answer' order by ord), '[]'::jsonb)
               from jsonb_array_elements(s.question_snapshot->'questions') with ordinality as t(elem, ord)
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
-- 11) save_exam — إنشاء/تعديل الامتحان وأسئلته في معاملة واحدة (ذرية كاملة)
--     - فشل أي جزء → لا يتغير شيء (لا امتحان ناقص ولا أسئلة مفقودة)
--     - الأسئلة القديمة تتحدث بنفس معرفاتها (لا حذف وإعادة إنشاء)
--     - الأسئلة المحذوفة من الواجهة تُحذف فعلاً، والتسليمات القديمة محفوظة بالـ Snapshot
--     - تحقق كامل من صحة البيانات قبل أي كتابة
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

  -- التحقق من الأسئلة قبل أي كتابة
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

  -- إنشاء أو تحديث الامتحان
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

  -- حذف الأسئلة التي شالتها الواجهة فقط (المعرفات الموجودة في الحمولة محمية)
  delete from public.exam_questions q
  where q.exam_id = v_exam_id
    and not exists (
      select 1 from jsonb_array_elements(v_questions) t(elem)
      where t.elem ? 'id' and (t.elem->>'id')::uuid = q.id
    );

  -- تحديث القائم بإذن الله وإدراج الجديد — بنفس الترتيب المرسل
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
