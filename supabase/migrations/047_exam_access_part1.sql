-- ============================================================
-- 047_exam_access_part1.sql — الجزء 1/2 (الأقسام 1-6)
-- خصوصية الامتحان (public/subscribers) + تثبيت المحاولات + Snapshot
-- التسليمات القديمة + حارس الحذف + حساب المهلة + سياسة الوصول
--
-- يتطلب: migrations 001-046. شغّل 047_exam_access_part2.sql بعده.
-- إضافي بالكامل: لا يحذف بيانات ولا يعدّل أي Migration قديمة.
-- قابل لإعادة التشغيل بأمان (وليس بالاعتماد على IF NOT EXISTS وحده).
-- ============================================================

-- تحقق من وجود الجداول والدوال الأساسية قبل أي شيء
do $$
begin
  if to_regclass('public.exams') is null
     or to_regclass('public.exam_questions') is null
     or to_regclass('public.exam_submissions') is null
     or to_regclass('public.profiles') is null
     or to_regclass('public.bookings') is null
     or to_regprocedure('public.has_confirmed_booking()') is null then
    raise exception '047 (الجزء 1) يتطلب تنفيذ migrations 001-046 أولاً';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 1) عمود access_mode على exams
--    القيمة الافتراضية subscribers: لا يتحول أي امتحان قديم لعام تلقائيًا
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
-- 2) exam_attempts — تثبيت وقت بدء محاولة كل طالب لكل امتحان
--    (محاولة واحدة: unique (exam_id, student_id) — المؤقت لا يُصفَّر بالتحديث)
--    الطلاب لا يلمسون الجدول مباشرة — كل الوصول عبر RPC (الجزء 2)
-- ------------------------------------------------------------
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  -- هل كانت المحاولة مصرحًا بها عند بدئها؟ (حماية محاولة جارية عند تغيير الخصوصية)
  access_ok boolean not null default true,
  created_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create index if not exists exam_attempts_exam_idx on public.exam_attempts (exam_id);
create index if not exists exam_attempts_student_idx on public.exam_attempts (student_id);

alter table public.exam_attempts enable row level security;

drop policy if exists "exam_attempts: admin only direct access" on public.exam_attempts;
create policy "exam_attempts: admin only direct access"
  on public.exam_attempts for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- نفس نمط exam_submissions: الصلاحية موجودة والـ RLS هو الحارس
grant select on public.exam_attempts to authenticated;

-- ------------------------------------------------------------
-- 3) question_snapshot على exam_submissions + تجميد نسخة أسئلة
--    كل التسليمات القديمة (Backfill).
--    مراجعة أي نتيجة قديمة لا تتأثر مستقبلًا بتعديل أو حذف الأسئلة.
--    التنفيذ بشرط where is null يجعله آمنًا لإعادة التشغيل.
-- ------------------------------------------------------------
alter table public.exam_submissions
  add column if not exists question_snapshot jsonb;

comment on column public.exam_submissions.question_snapshot is
  'Snapshot لأسئلة الامتحان لحظة التسليم — يحفظ تفسير إجابات الطالب حتى لو تعدلت الأسئلة أو حذفت لاحقًا';

update public.exam_submissions s
set question_snapshot = jsonb_build_object(
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
        where q.exam_id = s.exam_id
      ), '[]'::jsonb)
    )
where s.question_snapshot is null;

-- ------------------------------------------------------------
-- 4) حارس حذف الامتحانات ذات نتائج الطلاب
--    (البديل الآمن للحذف: إلغاء النشر is_published = false)
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
--    cutoff = أقرب ( end_at ، بدء المحاولة + المدة + 60ث مهلة )
--    نافذة الدخول [start_at , end_at]: أي طالب يدخل داخلها يأخذ مدته
--    كاملة من بدء محاولته هو — لا حد عالمي من start_at الرسمي
--    (الحد العالمي كان يقفل الامتحان بعد المدة من نشره حتى لو لم
--    يدخله أحد — أزيلناه؛ للامتحان المتزامن حدد end_at = البدء + المدة).
--    end_at صارم بلا مهلة. المهلة الستينية تغطي زمن إرسال التسليم الآلي فقط.
--    دالة داخلية: تُستدعى من دوال الجزء الثاني فقط.
-- ------------------------------------------------------------
create or replace function public.exam_attempt_deadline(p_exam public.exams, p_attempt_started timestamptz)
returns timestamptz
language sql stable
as $$
  select least(
    coalesce(p_exam.end_at, 'infinity'::timestamptz),
    case
      when p_exam.duration_minutes is not null and p_exam.duration_minutes > 0
           and p_attempt_started is not null
        then p_attempt_started + make_interval(mins => p_exam.duration_minutes) + interval '60 seconds'
      else 'infinity'::timestamptz
    end
  );
$$;

-- ------------------------------------------------------------
-- 6) can_access_exam — سياسة موحدة وفق خصوصية الامتحان
--    + سياسة RLS للامتحانات: طلاب الصف يرون كل امتحانات صفهم المنشورة
--    (الامتحان الخاص يظهر مقفولًا مع سبب المنع — فرض الوصول الفعلي
--     يتم داخل RPC الجزء الثاني، فلا يمكن تجاوزه من الواجهة)
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
