-- ============================================================
-- 023_security_hardening_3.sql
-- جولة الأمان الثالثة:
--
--  1) [مهم] get_student_courses:
--     - كان بياخد الصف من اللي بيستدعي (p_grade) من غير تحقق
--       => أي طالب يقدر ياخد كورسات صف تاني (عناوين وأسعار وفيديوهات).
--     - كان بيرجّع video_url حتى للكورسات المقفولة
--       => تسريب محتوى مدفوع من غير اشتراك.
--     الحل: الصف من البروفايل دايماً + الفيديو يظهر فقط لما يكون متاح.
--
--  2) [متوسط] get_homework_questions / submit_homework:
--     كانوا بيتأكدوا بس من "حجز مؤكد" — أي واجب لأي كورس.
--     الحل: الواجب لازم يكون لكورس متاح + من صف الطالب (أو الاحترافي).
--
--  3) [متوسط] get_leaderboard: غير الأدمن يشوف ترتيب صفه هو بس.
--
--  4) [إصلاح 021] استثناء الكورس الاحترافي في ملفات/تعليقات الكورسات:
--     طالب أولى/تانية مشترك في الاحترافي لازم يقدر يرفع/يعلق فيه.
-- ============================================================

-- ============================================================
-- 1) get_student_courses — الصف من البروفايل + حجب الفيديو المقفول
-- ============================================================
create or replace function public.get_student_courses(p_grade text)
returns table (
  course_id uuid,
  title text,
  description text,
  grade text,
  video_url text,
  image_url text,
  price numeric,
  section_id uuid,
  section_title text,
  order_index int,
  created_at timestamptz,
  accessible boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  v_grade text;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  -- الصف بييجي من البروفايل دايماً — مش من اللي بيستدعي (منع تسريب صف تاني)
  select grade into v_grade from public.profiles where id = auth.uid();
  if v_grade is null then
    raise exception 'البروفايل غير موجود';
  end if;

  return query
    select
      c.id,
      c.title,
      c.description,
      c.grade,
      -- الفيديو بيتحجب لو الكورس مش متاح للاشتراك الحالي (منع تسريب محتوى مدفوع)
      case when public.can_access_course(c.id) then c.video_url else null end as video_url,
      c.image_url,
      c.price,
      c.section_id,
      s.title,
      c.order_index,
      c.created_at,
      public.can_access_course(c.id) as accessible
    from public.courses c
    left join public.course_sections s on s.id = c.section_id
    where c.grade = v_grade or c.grade = 'professional'
    order by c.order_index asc;
end;
$$;

grant execute on function public.get_student_courses(text) to authenticated;

-- ============================================================
-- 2) الواجبات: لازم الكورس متاح + صف الطالب (أو الاحترافي)
-- ============================================================
create or replace function public.get_homework_questions(p_homework_id uuid)
returns table (
  question_id uuid,
  homework_id uuid,
  question_text text,
  type text,
  options jsonb,
  points int,
  order_index int
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() then
    if not public.has_confirmed_booking() then
      raise exception 'الواجبات متاحة للمشتركين المؤكدين فقط';
    end if;

    if not exists (
      select 1
      from public.homeworks h
      join public.courses c on c.id = h.course_id
      where h.id = p_homework_id
        and public.can_access_course(c.id)
        and (
          c.grade = (select grade from public.profiles where id = auth.uid())
          or c.grade = 'professional'
        )
    ) then
      raise exception 'غير مصرح بقراءة هذا الواجب';
    end if;
  end if;

  return query
    select q.id, q.homework_id, q.question_text, q.type, q.options, q.points, q.order_index
    from public.homework_questions q
    where q.homework_id = p_homework_id
    order by q.order_index asc;
end;
$$;

grant execute on function public.get_homework_questions(uuid) to authenticated;

create or replace function public.submit_homework(p_homework_id uuid, p_answers jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_student_id uuid := auth.uid();
  v_question record;
  v_answer text;
  v_auto numeric := 0;
  v_total numeric := 0;
  v_submission_id uuid;
begin
  if v_student_id is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin() then
    if not public.has_confirmed_booking() then
      raise exception 'الواجبات متاحة للمشتركين المؤكدين فقط';
    end if;

    if not exists (
      select 1
      from public.homeworks h
      join public.courses c on c.id = h.course_id
      where h.id = p_homework_id
        and public.can_access_course(c.id)
        and (
          c.grade = (select grade from public.profiles where id = auth.uid())
          or c.grade = 'professional'
        )
    ) then
      raise exception 'غير مصرح بتسليم هذا الواجب';
    end if;
  end if;

  if p_answers is null then
    raise exception 'اكتب إجاباتك أولاً';
  end if;

  for v_question in
    select * from public.homework_questions q
    where q.homework_id = p_homework_id
  loop
    v_total := v_total + coalesce(v_question.points, 1);
    v_answer := p_answers ->> v_question.id::text;
    if v_answer is not null and v_answer = v_question.correct_answer then
      v_auto := v_auto + coalesce(v_question.points, 1);
    end if;
  end loop;

  insert into public.homework_submissions (homework_id, student_id, answers, auto_score, total_points)
  values (p_homework_id, v_student_id, p_answers, v_auto, v_total)
  on conflict (homework_id, student_id) do nothing
  returning id into v_submission_id;

  if v_submission_id is null then
    raise exception 'سلمت هذا الواجب من قبل — محاولة واحدة فقط';
  end if;

  return jsonb_build_object(
    'submission_id', v_submission_id,
    'score', v_auto,
    'total', v_total
  );
end;
$$;

grant execute on function public.submit_homework(uuid, jsonb) to authenticated;

-- ============================================================
-- 3) get_leaderboard — غير الأدمن يشوف ترتيب صفه هو بس
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
    select grade into v_grade from public.profiles where id = auth.uid();
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

-- ============================================================
-- 4) استثناء الكورس الاحترافي (تصحيح إصلاحات 021)
--    طالب أولى/تانية مشترك في الاحترافي يقدر يرفع ملفات ويعلق فيه
-- ============================================================
drop policy if exists "course_files: student insert own" on public.course_files;
create policy "course_files: student insert own"
  on public.course_files for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_admin()
      or (
        exists (
          select 1 from public.courses c
          where c.id = course_id
            and (
              c.grade = (select grade from public.profiles where id = auth.uid())
              or (c.grade = 'professional' and public.can_access_course(c.id))
            )
        )
        and file_url like '%/storage/v1/object/public/course-files/%'
      )
    )
  );

create or replace function public.add_course_file(p_course_id uuid, p_title text, p_file_url text, p_file_type text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if p_course_id is null or nullif(trim(p_title), '') is null or nullif(trim(p_file_url), '') is null then
    raise exception 'بيانات الملف ناقصة';
  end if;

  if not public.is_admin() then
    if not exists (
      select 1 from public.courses c
      where c.id = p_course_id
        and (
          c.grade = (select grade from public.profiles where id = auth.uid())
          or (c.grade = 'professional' and public.can_access_course(c.id))
        )
    ) then
      raise exception 'غير مصرح — هذا الكورس ليس لصفك';
    end if;
    if trim(p_file_url) not like '%/storage/v1/object/public/course-files/%' then
      raise exception 'غير مصرح — الرابط لازم يكون من رفع سلة الكورسات';
    end if;
  end if;

  insert into public.course_files (course_id, title, file_url, file_type, uploaded_by)
  values (p_course_id, trim(p_title), trim(p_file_url), coalesce(p_file_type, 'file'), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.add_course_file(uuid, text, text, text) to authenticated;

drop policy if exists "course_files: read authenticated" on public.course_files;
create policy "course_files: read authenticated"
  on public.course_files for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.grade = (select grade from public.profiles where id = auth.uid())
          or (c.grade = 'professional' and public.can_access_course(c.id))
        )
    )
  );

create or replace function public.get_course_files(p_course_id uuid)
returns table (
  file_id uuid,
  title text,
  file_url text,
  file_type text,
  uploaded_by uuid,
  uploader_name text,
  created_at timestamptz
)
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if not public.is_admin()
     and not exists (
       select 1 from public.courses c
       where c.id = p_course_id
         and (
           c.grade = (select grade from public.profiles where id = auth.uid())
           or (c.grade = 'professional' and public.can_access_course(c.id))
         )
     ) then
    raise exception 'غير مصرح — هذا الكورس ليس لصفك';
  end if;

  return query
    select
      f.id,
      f.title,
      f.file_url,
      f.file_type,
      f.uploaded_by,
      p.full_name,
      f.created_at
    from public.course_files f
    join public.profiles p on p.id = f.uploaded_by
    where f.course_id = p_course_id
    order by f.created_at desc;
end;
$$;

grant execute on function public.get_course_files(uuid) to authenticated;

drop policy if exists "course_comments: student insert own" on public.course_comments;
create policy "course_comments: student insert own"
  on public.course_comments for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.courses c
      where c.id = course_id
        and (
          c.grade = (select grade from public.profiles where id = auth.uid())
          or (c.grade = 'professional' and public.can_access_course(c.id))
        )
    )
  );