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