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