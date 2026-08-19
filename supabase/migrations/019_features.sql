-- ============================================================
-- 019_features.sql
-- ميزتان جديدتان:
--   1) إعلانات ورسائل للجميع (announcements) — المستر ينشر إعلان
--      يظهر في لوحة الطالب + إشعار لكل طالب تلقائياً
--   2) لوحة تفوق ومتصدرين (get_leaderboard) — ترتيب الطلاب حسب
--      مجموع درجات الامتحانات المنشورة + درجات الواجبات
-- ============================================================

-- ============================================================
-- 1) الإعلانات
-- ============================================================
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  is_pinned boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_idx on public.announcements (is_pinned desc, created_at desc);

alter table public.announcements enable row level security;

grant select on public.announcements to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;

-- يقرأها كل المسجلين
drop policy if exists "announcements: read authenticated" on public.announcements;
create policy "announcements: read authenticated"
  on public.announcements for select to authenticated using (true);

-- يكتبها/يعدلها/يمسحها الأدمن فقط
drop policy if exists "announcements: admin write" on public.announcements;
create policy "announcements: admin write"
  on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- إشعار كل الطلاب بالإعلان الجديد تلقائياً
create or replace function public.notify_announcement()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (student_id, title, body)
  select p.id, 'إعلان جديد: ' || new.title, coalesce(nullif(trim(new.body), ''), 'إعلان جديد من الأكاديمية.')
  from public.profiles p
  where p.role = 'student';
  return new;
end;
$$;

drop trigger if exists announcements_notify on public.announcements;
create trigger announcements_notify
  after insert on public.announcements
  for each row execute procedure public.notify_announcement();

-- ضمانة: لو مفيش كاتب مبعوت، خد من المستخدم المسجل
create or replace function public.announcements_set_author()
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

drop trigger if exists announcements_set_author on public.announcements;
create trigger announcements_set_author
  before insert on public.announcements
  for each row execute procedure public.announcements_set_author();

-- ============================================================
-- 2) لوحة التفوق والمتصدرين
-- ------------------------------------------------------------
-- الترتيب لكل صف على حدة (أولى / تانية / احترافي):
--   total_points = مجموع درجات الامتحانات المنشورة (grade_released)
--                + مجموع درجات الواجبات المسلّمة (auto_score)
-- يرجع أول 20 طالب بالترتيب مع مركزهم
-- ============================================================
create or replace function public.get_leaderboard(p_grade text)
returns table (
  student_id uuid,
  full_name text,
  grade text,
  total_points numeric,
  exams_done bigint,
  homeworks_done bigint,
  student_rank bigint
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_grade text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  v_grade := coalesce(nullif(p_grade, ''), (select pr.grade from public.profiles pr where pr.id = auth.uid()));
  if v_grade is null then
    raise exception 'حدد الصف';
  end if;

  return query
    with exam_pts as (
      select sub.student_id,
             sum(coalesce(sub.score, 0)) as pts,
             count(*) as cnt
      from public.exam_submissions sub
      where sub.grade_released
      group by sub.student_id
    ),
    hw_pts as (
      select hs.student_id,
             sum(coalesce(hs.auto_score, 0)) as pts,
             count(*) as cnt
      from public.homework_submissions hs
      join public.homeworks hw on hw.id = hs.homework_id
      join public.courses crs on crs.id = hw.course_id
      where crs.grade = v_grade
      group by hs.student_id
    ),
    totals as (
      select
        pr.id as student_id,
        pr.full_name as full_name,
        pr.grade as grade,
        coalesce(ep.pts, 0) + coalesce(hw.pts, 0) as total_points,
        coalesce(ep.cnt, 0) as exams_done,
        coalesce(hw.cnt, 0) as homeworks_done
      from public.profiles pr
      left join exam_pts ep on ep.student_id = pr.id
      left join hw_pts hw on hw.student_id = pr.id
      where pr.role = 'student' and pr.grade = v_grade
    )
    select
      tl.student_id,
      tl.full_name,
      tl.grade,
      tl.total_points,
      tl.exams_done,
      tl.homeworks_done,
      row_number() over (
        order by tl.total_points desc, tl.exams_done desc, tl.homeworks_done desc
      )::bigint as student_rank
    from totals tl
    where tl.total_points > 0
    order by tl.total_points desc, tl.exams_done desc
    limit 20;
end;
$$;

grant execute on function public.get_leaderboard(text) to authenticated;
