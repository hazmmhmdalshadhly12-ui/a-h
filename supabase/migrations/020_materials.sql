-- ============================================================
-- 020_materials.sql
-- مكتبة المذكرات والملفات: المستر يرفع ملفات (PDF/صور) لكل صف،
-- والطلاب يفتحوا ملفات صفهم وينزلوها.
--   1) Bucket تخزين باسم materials (عام عشان التحميل مباشر)
--   2) جدول materials فيه وصف الملف + مساره
--   3) سياسات: قراءة لكل المسجلين، كتابة/حذف للأدمن فقط
-- ============================================================

-- 1) سلة التخزين (متكرر التشغيل بأمان)
insert into storage.buckets (id, name, public)
values ('materials', 'materials', true)
on conflict (id) do nothing;

-- 2) جدول الملفات
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  grade text not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists materials_grade_idx on public.materials (grade, created_at desc);

alter table public.materials enable row level security;

grant select on public.materials to authenticated;
grant select, insert, update, delete on public.materials to authenticated;

-- يقرأها كل المسجلين
drop policy if exists "materials: read authenticated" on public.materials;
create policy "materials: read authenticated"
  on public.materials for select to authenticated using (true);

-- يكتب/يمسح الأدمن فقط
drop policy if exists "materials: admin write" on public.materials;
create policy "materials: admin write"
  on public.materials for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ضمانة: لو مفيش كاتب مبعوت، خد من المستخدم المسجل (التوكن)
create or replace function public.materials_set_author()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists materials_set_author on public.materials;
create trigger materials_set_author
  before insert on public.materials
  for each row execute procedure public.materials_set_author();

-- 3) سياسات رفع/حذف الملفات في السلة (للأدمن فقط)
drop policy if exists "materials: admin upload" on storage.objects;
create policy "materials: admin upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'materials' and public.is_admin());

drop policy if exists "materials: admin update" on storage.objects;
create policy "materials: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'materials' and public.is_admin())
  with check (bucket_id = 'materials' and public.is_admin());

drop policy if exists "materials: admin delete" on storage.objects;
create policy "materials: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and public.is_admin());