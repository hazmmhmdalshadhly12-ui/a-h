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