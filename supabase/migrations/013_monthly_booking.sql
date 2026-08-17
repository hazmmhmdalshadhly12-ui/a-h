-- ============================================================
-- 013_monthly_booking.sql
-- تحويل الحجز من "حجز حصة" إلى "حجز شهري"
-- الحقول المطلوبة: الاسم + رقم الموبايل + رقم ولي الأمر + الصف + الشهر
-- ============================================================

-- الحقول الجديدة (بـ if not exists عشان التحديث على جدول شغال أمان)
alter table public.bookings
  add column if not exists full_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists parent_phone text,
  add column if not exists grade text not null default 'first_secondary'
    check (grade in ('first_secondary', 'second_secondary')),
  add column if not exists month text;

-- الميعاد القديم (حصة) بقى اختياري — الحجز الجديد بالشهر
alter table public.bookings
  alter column requested_datetime drop not null;

-- المادة بقيت اختيارية كمان
alter table public.bookings
  alter column subject drop not null;