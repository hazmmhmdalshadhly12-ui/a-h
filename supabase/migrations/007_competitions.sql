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