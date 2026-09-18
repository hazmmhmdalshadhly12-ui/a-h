-- 044_payment_methods_and_publish.sql
-- إصلاح النشر وإضافة طرق دفع مرنة

-- 1) تأكد من عمود النشر والسعر لكل الكورسات
alter table public.courses add column if not exists is_published boolean not null default true;
alter table public.courses add column if not exists price numeric;
update public.courses set is_published = true where is_published is null;

-- 2) جدول طرق الدفع — الأدمن يضيف/يعدل كما يشاء
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  details text not null,
  type text not null default 'instapay' check (type in ('instapay','vodafone_cash','fawry','bank','other')),
  is_active boolean not null default true,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists payment_methods_order_idx on public.payment_methods (order_index);

alter table public.payment_methods enable row level security;
grant select on public.payment_methods to authenticated, anon;
grant insert, update, delete on public.payment_methods to authenticated;

drop policy if exists "payment_methods: public read" on public.payment_methods;
create policy "payment_methods: public read" on public.payment_methods for select using (is_active = true or public.is_admin());
drop policy if exists "payment_methods: admin all" on public.payment_methods;
create policy "payment_methods: admin all" on public.payment_methods for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- بيانات افتراضية
insert into public.payment_methods (name, details, type, order_index, is_active)
values ('انستاباي', '01127703810', 'instapay', 0, true)
on conflict do nothing;

-- 3) إصلاح RLS للكورسات: الطالب يشوف كورسات صفه المنشورة فقط (مقفول أو مفتوح)
drop policy if exists "courses: read accessible or admin" on public.courses;
drop policy if exists "courses: student read own grade or published professional" on public.courses;
drop policy if exists "courses: read own grade or admin" on public.courses;

create policy "courses: read published own grade"
  on public.courses for select to authenticated
  using (public.is_admin() or (coalesce(is_published,true)=true and (grade = (select grade from public.profiles where id=auth.uid()) or grade='professional')));

create policy "courses: admin all"
  on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 4) تحديث get_student_courses لضمان الظهور مع النشر
create or replace function public.get_student_courses(p_grade text)
returns table (course_id uuid, title text, description text, grade text, video_url text, image_url text, price numeric, section_id uuid, section_title text, order_index int, created_at timestamptz, accessible boolean)
language plpgsql stable security definer set search_path = public as $$
declare v_grade text; v_uid uuid:=auth.uid();
begin
  if v_uid is null then raise exception 'يجب تسجيل الدخول'; end if;
  if public.is_admin() then v_grade:=coalesce(nullif(p_grade,''), (select grade from public.profiles where id=v_uid));
  else select grade into v_grade from public.profiles where id=v_uid; if v_grade is null then raise exception 'البروفايل غير موجود'; end if; end if;
  return query select c.id, c.title, c.description, c.grade,
    case when public.can_access_course(c.id) then c.video_url else null end, c.image_url, c.price, c.section_id, s.title, c.order_index, c.created_at,
    public.can_access_course(c.id)
  from public.courses c left join public.course_sections s on s.id=c.section_id
  where coalesce(c.is_published,true)=true and (c.grade=v_grade or c.grade='professional')
  order by c.order_index asc, c.created_at asc;
end; $$;
grant execute on function public.get_student_courses(text) to authenticated;
