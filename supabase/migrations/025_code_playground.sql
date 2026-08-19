-- ============================================================
-- 025_code_playground.sql
-- محرر الكود الاحترافي:
--   * code_challenges — تحديات برمجية (Python) لكل صف:
--       كود البداية + كود الاختبارات + الحل النهائي (مخفي عن الطلاب)
--   * code_solutions — محاولات الطلاب (عشان المدرس يتابعهم)
--   * التنفيذ بيحصل في متصفح الطالب (Pyodide) مش على السيرفر
-- ============================================================

-- ============================================================
-- 1) التحديات
-- ============================================================
create table if not exists public.code_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starter_code text not null default '',
  test_code text not null,                -- بيتضاف بعد كود الطالب ويشغّل الاختبارات
  solution_code text,
  difficulty text not null default 'easy'
    check (difficulty in ('easy', 'medium', 'hard')),
  grade text not null,
  order_index int not null default 0,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists code_challenges_grade_idx
  on public.code_challenges (grade, order_index, created_at);

-- ============================================================
-- 2) محاولات الطلاب
-- ============================================================
create table if not exists public.code_solutions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.code_challenges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  passed boolean not null default false,
  run_count int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists code_solutions_student_idx
  on public.code_solutions (student_id, challenge_id, created_at desc);

-- ============================================================
-- 3) RLS
-- ============================================================
alter table public.code_challenges enable row level security;
alter table public.code_solutions enable row level security;

grant select on public.code_challenges to authenticated;
grant insert, update, delete on public.code_challenges to authenticated;
grant select, insert on public.code_solutions to authenticated;

-- الطالب يقرا المنشور لصفه بس — الأدمن كل حاجة (بما فيها الحل والاختبارات)
create policy "code_challenges: read published own grade or admin"
  on public.code_challenges for select to authenticated
  using (
    public.is_admin()
    or (
      is_published = true
      and grade = (select grade from public.profiles where id = auth.uid())
    )
  );

create policy "code_challenges: admin write"
  on public.code_challenges for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- الحلول: الطالب يقرا حلوله هو بس (ويضيف) — الأدمن الكل
create policy "code_solutions: read own or admin"
  on public.code_solutions for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy "code_solutions: student insert own"
  on public.code_solutions for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.code_challenges c
      where c.id = challenge_id
        and c.is_published = true
        and c.grade = (select grade from public.profiles where id = auth.uid())
    )
  );

-- ضمانة: الطالب مش بيعت student_id — بتاخده من التوكن تلقائياً
create or replace function public.code_solutions_set_student()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.student_id is null then
    new.student_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists code_solutions_set_student on public.code_solutions;
create trigger code_solutions_set_student
  before insert on public.code_solutions
  for each row execute procedure public.code_solutions_set_student();

-- ============================================================
-- 4) جلب التحديات للطالب (من غير الحل النهائي — solution_code)
--    + كود الاختبارات (بيشتغل في متصفح الطالب — تعليم TDD)
--    + علامة "حليته" لآخر حل نجح
-- ============================================================
create or replace function public.get_code_challenges(p_grade text)
returns table (
  challenge_id uuid,
  title text,
  description text,
  starter_code text,
  test_code text,
  difficulty text,
  grade text,
  order_index int,
  solved boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_grade text;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if public.is_admin() then
    v_grade := coalesce(nullif(p_grade, ''), '');
  else
    select grade into v_grade from public.profiles where id = v_uid;
    if v_grade is null then
      raise exception 'البروفايل غير موجود';
    end if;
  end if;

  return query
    select
      c.id,
      c.title,
      c.description,
      c.starter_code,
      c.test_code,
      c.difficulty,
      c.grade,
      c.order_index,
      exists (
        select 1 from public.code_solutions s
        where s.challenge_id = c.id and s.student_id = v_uid and s.passed
      ) as solved
    from public.code_challenges c
    where c.is_published = true
      and (public.is_admin() or c.grade = v_grade)
    order by c.order_index asc, c.created_at asc;
end;
$$;

grant execute on function public.get_code_challenges(text) to authenticated;

-- ============================================================
-- 5) تحدي تجريبي (مثال للمدرس يقلّد منه)
--    يظهر لصف الأول الثانوي — اقدر تعدّله أو تمسحه من صفحة
--    "تحديات الكود" في لوحة التحكم
-- ============================================================
insert into public.code_challenges (title, description, starter_code, test_code, solution_code, difficulty, grade, order_index, is_published)
values (
  'دالة الجمع',
  'اكتب دالة add(a, b) ترجع مجموع العددين a و b. مثال: add(3, 5) لازم ترجع 8.',
  'def add(a, b):\n    # اكتب كودك هنا\n    pass\n',
  'assert add(3, 5) == 8\nassert add(-1, 1) == 0\nassert add(0, 0) == 0\nassert add(100, 250) == 350\n',
  'def add(a, b):\n    return a + b\n',
  'easy',
  'first_secondary',
  1,
  true
)
on conflict do nothing;