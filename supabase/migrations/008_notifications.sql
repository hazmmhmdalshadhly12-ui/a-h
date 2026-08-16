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