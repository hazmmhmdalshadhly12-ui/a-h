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