-- 046: إضافة صورة إثبات التحويل للحجز
alter table public.bookings add column if not exists transfer_proof_url text;
