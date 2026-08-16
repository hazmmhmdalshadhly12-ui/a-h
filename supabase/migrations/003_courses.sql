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