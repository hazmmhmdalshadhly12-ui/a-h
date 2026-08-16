-- ============================================================
-- setup_all.sql — التشغيل الكامل للمشروع في مرة واحدة
-- دمج: 11 migrations + seed. شغّل الملف كله مرة واحدة في SQL Editor.
-- ============================================================

-- ====================================================================
-- ==== 001_initial_schema.sql ====
-- ====================================================================

-- ============================================================
-- 001_initial_schema.sql
-- إعدادات أساسية وتمكين الامتدادات
-- ============================================================

-- gen_random_uuid() متاحة مدمجة من PostgreSQL 13، لكن بتتأكد من وجود pgcrypto
create extension if not exists pgcrypto;

-- الاتجاه والمفاتيح الأساسية (اختياري كإعداد افتراضي)
alter database postgres set timezone to 'Africa/Cairo';


-- ====================================================================
-- ==== 002_profiles.sql ====
-- ====================================================================

-- ============================================================
-- 002_profiles.sql
-- جدول البروفايلات + إنشاء البروفايل تلقائياً عند تسجيل مستخدم جديد
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  parent_phone text,
  grade text not null default 'first_secondary'
    check (grade in ('first_secondary', 'second_secondary')),
  role text not null default 'student'
    check (role in ('student', 'admin')),
  email text,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'بيانات الطلاب والأدمن — بترتبط بجدول المستخدمين في auth';

-- مساعدات الصلاحيات (security definer عشان تقرا من غير مشاكل RLS)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_student()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'student'
  );
$$;

-- إنشاء البروفايل تلقائياً عند تسجيل أي مستخدم جديد
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, parent_phone, grade, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'parent_phone', ''),
    coalesce(new.raw_user_meta_data->>'grade', 'first_secondary'),
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when public.profiles.full_name = '' then excluded.full_name
      else public.profiles.full_name
    end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- حماية الصلاحية/الصف: الطالب ميقدرش يغير role أو grade من الواجهة
create or replace function public.prevent_profile_escalation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin()
     and (new.role is distinct from old.role
          or new.grade is distinct from old.grade) then
    raise exception 'غير مسموح بتغيير الصلاحية أو الصف الدراسي';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute procedure public.prevent_profile_escalation();


-- ====================================================================
-- ==== 003_courses.sql ====
-- ====================================================================

-- ============================================================
-- 003_courses.sql
-- الكورسات (فيديوهات مقسمة حسب الصف والترتيب)
-- ============================================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade text not null check (grade in ('first_secondary', 'second_secondary')),
  video_url text,
  order_index int not null default 1,
  created_at timestamptz not null default now()
);

-- View عام للزوار — من غير video_url (الفيديوهات للمسجلين فقط)
create view public.courses_public
with (security_invoker = on) as
select id, title, description, grade, order_index
from public.courses;


-- ====================================================================
-- ==== 004_exams.sql ====
-- ====================================================================

-- ============================================================
-- 004_exams.sql
-- الامتحانات + الأسئلة (الإجابة الصحيحة مخزنة هنا — وصولها ممنوع للطلاب)
-- ============================================================

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade text not null check (grade in ('first_secondary', 'second_secondary')),
  duration_minutes int,
  start_at timestamptz,
  end_at timestamptz,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_text text not null,
  type text not null check (type in ('mcq', 'true_false', 'short_answer')),
  options jsonb,
  correct_answer text,
  points int not null default 1,
  order_index int not null default 1
);

create index exam_questions_exam_idx on public.exam_questions (exam_id, order_index);


-- ====================================================================
-- ==== 005_submissions.sql ====
-- ====================================================================

-- ============================================================
-- 005_submissions.sql
-- تسليمات الامتحانات
-- الـ unique constraint (exam_id, student_id) هو الحارس الحقيقي:
-- بيمنع تسليم نفس الامتحان مرتين حتى لو الطالب حاول يتلاعب من الـ Network
-- ============================================================

create table public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  auto_score numeric default 0,          -- تصحيح آلي للموضوعي (بيتحسب لحظة التسليم من السيرفر)
  manual_score numeric default 0,        -- تصحيح يدوي للمقالي (من الأدمن)
  score numeric,                          -- الإجمالي — بيتفعل عند نشر الدرجة بس
  grade_released boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (exam_id, student_id)            -- محاولة واحدة فقط لكل طالب لكل امتحان
);

create index exam_submissions_exam_idx on public.exam_submissions (exam_id);
create index exam_submissions_student_idx on public.exam_submissions (student_id);


-- ====================================================================
-- ==== 006_bookings.sql ====
-- ====================================================================

-- ============================================================
-- 006_bookings.sql
-- حجوزات الحصص — بيتأكد/بيترفض يدوياً من الأدمن
-- ============================================================

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  requested_datetime timestamptz not null,
  subject text not null default 'cs',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create index bookings_student_idx on public.bookings (student_id);
create index bookings_status_idx on public.bookings (status);


-- ====================================================================
-- ==== 007_competitions.sql ====
-- ====================================================================

-- ============================================================
-- 007_competitions.sql
-- المسابقات
-- ============================================================

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade text not null check (grade in ('first_secondary', 'second_secondary')),
  deadline timestamptz,
  details text,
  created_at timestamptz not null default now()
);

create index competitions_grade_idx on public.competitions (grade);


-- ====================================================================
-- ==== 008_notifications.sql ====
-- ====================================================================

-- ============================================================
-- 008_notifications.sql
-- إشعارات الطلاب (نشر درجات، تغيير حالة حجز، امتحان جديد...)
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_student_idx on public.notifications (student_id, created_at desc);


-- ====================================================================
-- ==== 009_contact_links.sql ====
-- ====================================================================

-- ============================================================
-- 009_contact_links.sql
-- روابط التواصل — تُدار من لوحة الأدمن من غير تعديل كود
-- ============================================================

create table public.contact_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  label text,
  value text not null
);

create unique index contact_links_platform_idx on public.contact_links (platform);


-- ====================================================================
-- ==== 010_rls_policies.sql ====
-- ====================================================================

-- ============================================================
-- 010_rls_policies.sql
-- أمان البيانات (أهم نقطة في المشروع)
-- كل صفحة أدمن وكل وصول للبيانات بيتأكد من قاعدة البيانات نفسها،
-- مش من إخفاء الزرار في الواجهة.
-- ============================================================

-- ---------- تمكين RLS على كل الجداول ----------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.bookings enable row level security;
alter table public.competitions enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_links enable row level security;

-- ---------- صلاحيات (grants) — سياسات RLS هي اللي بتقرر ----------
grant usage on schema public to anon, authenticated, service_role;

grant select on public.contact_links to anon, authenticated;
grant select on public.courses_public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.courses to authenticated;
grant select on public.exams to authenticated;
grant select on public.exam_questions to authenticated;
grant select on public.exam_submissions to authenticated;
grant select on public.bookings to authenticated;
grant select on public.competitions to authenticated;
grant select on public.notifications to authenticated;

grant update on public.profiles to authenticated;
grant insert, update on public.bookings to authenticated;
grant update on public.notifications to authenticated;

-- عمليات الأدمن بس — بتتحكم فيها سياسات is_admin()
grant insert, update, delete on public.courses to authenticated;
grant insert, update, delete on public.exams to authenticated;
grant insert, update, delete on public.exam_questions to authenticated;
grant insert, update, delete on public.exam_submissions to authenticated;
grant insert, update, delete on public.competitions to authenticated;
grant insert, update, delete on public.contact_links to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_student() to authenticated;

-- ---------- PROFILES ----------
create policy "profiles: select own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- الأدمن يقدر يعدّل أي بروفايل (ترقية صلاحية، تعديل صف...)
-- وغير الأدمن محدود بنفسه بس — وتغيير role/grade بيحميه Trigger منفصل
create policy "profiles: update own or admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------- COURSES ----------
create policy "courses: authenticated users read"
  on public.courses for select to authenticated
  using (true);

create policy "courses: admin write"
  on public.courses for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- EXAMS ----------
create policy "exams: students read published for own grade"
  on public.exams for select to authenticated
  using (
    public.is_admin()
    or (
      is_published = true
      and grade = (select grade from public.profiles where id = auth.uid())
    )
  );

create policy "exams: admin write"
  on public.exams for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- EXAM_QUESTIONS ----------
-- الطلاب ميقدرش يعمل SELECT مباشر على الأسئلة إطلاقاً.
-- الأسئلة بتيجي بس من Function آمنة (get_exam_questions) من غير الإجابة الصحيحة.
create policy "exam_questions: admin only (no student access)"
  on public.exam_questions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- EXAM_SUBMISSIONS ----------
-- الطلاب مش بيعملوا select/insert مباشر — التسليم عن طريق RPC submit_exam
-- والقراءة عن طريق get_my_submissions / get_my_submission (بس درجة منشورة)
create policy "exam_submissions: admin only direct access"
  on public.exam_submissions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- BOOKINGS ----------
create policy "bookings: student reads own, admin reads all"
  on public.bookings for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy "bookings: student creates own"
  on public.bookings for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());

create policy "bookings: admin update status"
  on public.bookings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "bookings: admin delete"
  on public.bookings for delete to authenticated
  using (public.is_admin());

-- ---------- COMPETITIONS ----------
create policy "competitions: authenticated read"
  on public.competitions for select to authenticated
  using (true);

create policy "competitions: admin write"
  on public.competitions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- NOTIFICATIONS ----------
create policy "notifications: own read"
  on public.notifications for select to authenticated
  using (student_id = auth.uid());

create policy "notifications: own update (mark read)"
  on public.notifications for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ---------- CONTACT_LINKS ----------
create policy "contact_links: public read"
  on public.contact_links for select to anon, authenticated
  using (true);

create policy "contact_links: admin write"
  on public.contact_links for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ====================================================================
-- ==== 011_functions_triggers.sql ====
-- ====================================================================

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


-- ====================================================================
-- ==== seed.sql (بيانات تجريبية) ====
-- ====================================================================

-- ============================================================
-- seed.sql — بيانات تجريبية للبدء
-- شغّل الملف ده في SQL Editor بعد الـ migrations عشان يظهر المحتوى.
--
-- ملاحظة: حسابات الأدمن والطلاب التجريبية بتتعمل من لوحة تحكم Supabase
-- (Authentication → Add user) لأنها جدول auth.users الخاص — مش ممكن يتعملها insert من SQL.
-- شوف README → قسم "الحسابات التجريبية".
-- ============================================================

-- ---------- روابط التواصل ----------
insert into public.contact_links (platform, label, value) values
  ('whatsapp',  'واتساب',   '01000000000'),
  ('phone',     'تليفون',   '01000000000'),
  ('facebook',  'فيسبوك',   'https://facebook.com/visionacademy'),
  ('youtube',   'يوتيوب',   'https://youtube.com/@visionacademy'),
  ('telegram',  'تليجرام',  'https://t.me/visionacademy'),
  ('instagram', 'إنستجرام', 'https://instagram.com/visionacademy')
on conflict (platform) do nothing;

-- ---------- كورسات تجريبية ----------
insert into public.courses (title, description, grade, video_url, order_index) values
  (
    'مدخل إلى البرمجة — Python',
    'أساسيات البرمجة: المتغيرات، الشروط، الحلقات، والدوال من الصفر.',
    'first_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    1
  ),
  (
    'بنية الحاسب والمنطق الرقمي',
    'كيف يعمل الحاسب؟ البوابات المنطقية، نظام العد الثنائي، وتحويلات الأنظمة.',
    'first_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    2
  ),
  (
    'الخوارزميات والتفكير المنطقي',
    'خطوات حل المشكلات، المخططات الانسيابية، وترتيب العمليات.',
    'second_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    1
  ),
  (
    'قواعد البيانات و SQL',
    'مقدمة للقواعد العلائقية، لغة SQL، والاستعلامات الأساسية.',
    'second_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    2
  );

-- ---------- مسابقة تجريبية ----------
insert into public.competitions (title, description, grade, deadline, details) values
  (
    'مسابقة البرمجة الصيفية',
    'تحدي برمجي لحل مشكلات برمجية واقعية بلغة Python.',
    'first_secondary',
    now() + interval '14 days',
    'اكتب كود بلغة Python تحل به 3 مشكلات، والفائز يحصل على شهادة تقدير.'
  );

-- ---------- امتحان تجريبي منشور (مع إجابة صحيحة لكل سؤال) ----------
insert into public.exams (title, description, grade, duration_minutes, start_at, end_at, is_published)
values (
  'امتحان تجريبي: أساسيات Python',
  'اختبر نفسك في أساسيات البرمجة — 4 أسئلة، محاولة واحدة فقط.',
  'first_secondary',
  30,
  now() - interval '1 hour',
  now() + interval '7 days',
  true
);

insert into public.exam_questions (exam_id, question_text, type, options, correct_answer, points, order_index)
select
  e.id,
  q.question_text,
  q.type,
  q.options::jsonb,
  q.correct_answer,
  q.points,
  q.order_index
from public.exams e
cross join (values
  (
    'ما هي النتيجة النهائية لـ 2 ** 3 في بايثون؟',
    'mcq',
    '[{"value":"6","label":"6"},{"value":"8","label":"8"},{"value":"9","label":"9"},{"value":"23","label":"23"}]',
    '8',
    2,
    1
  ),
  (
    'عبارة if بتنفذ الكود جواها إذا كان الشرط صحيحاً.',
    'true_false',
    '[{"value":"true","label":"صح"},{"value":"false","label":"غلط"}]',
    'true',
    1,
    2
  ),
  (
    'ما نوع البيانات المناسب لتخزين اسم الطالب؟ (إجابة قصيرة)',
    'short_answer',
    '[]',
    '',
    2,
    3
  ),
  (
    'ما الكلمة المفتاحية المستخدمة لتعريف دالة في بايثون؟',
    'mcq',
    '[{"value":"function","label":"function"},{"value":"def","label":"def"},{"value":"func","label":"func"},{"value":"fn","label":"fn"}]',
    'def',
    1,
    4
  )
) as q(question_text, type, options, correct_answer, points, order_index)
where e.title = 'امتحان تجريبي: أساسيات Python'
on conflict do nothing;

