-- ============================================================
-- 001_initial_schema.sql
-- إعدادات أساسية وتمكين الامتدادات
-- ============================================================

-- gen_random_uuid() متاحة مدمجة من PostgreSQL 13، لكن بتتأكد من وجود pgcrypto
create extension if not exists pgcrypto;

-- الاتجاه والمفاتيح الأساسية (اختياري كإعداد افتراضي)
alter database postgres set timezone to 'Africa/Cairo';