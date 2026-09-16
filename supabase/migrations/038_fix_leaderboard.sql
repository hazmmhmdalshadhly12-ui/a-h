-- ============================================================
-- 038_fix_leaderboard.sql
-- إصلاح لوحة التفوق: column reference "grade" is ambiguous
-- السبب: السطر select grade ... من profiles كان فيه grade غير
-- محددة، والدالة نفسها بترجع عمود اسمه grade — تم تحديدها كلها.
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

  -- الأدمن يقدر يشوف أي صف — الطالب يشوف صفه هو بس
  if public.is_admin() then
    v_grade := coalesce(nullif(p_grade, ''), (select pr.grade from public.profiles pr where pr.id = auth.uid()));
  else
    select pr.grade into v_grade from public.profiles pr where pr.id = auth.uid();
  end if;

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
