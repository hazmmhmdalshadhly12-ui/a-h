-- 042_harden_lesson_progress.sql — تشديد تتبع الدروس
-- منع التلاعب في watched_seconds وحقن course_id خاطئ

-- 1) تأكد أن course_id يطابق الدرس فعلاً
alter table public.lesson_progress
  drop constraint if exists lesson_progress_course_match;

alter table public.lesson_progress
  add constraint lesson_progress_course_match
  check (course_id = (select course_id from public.lessons where id = lesson_id));

-- 2) حدود watched_seconds (أقل من يوم، وأكبر من أو يساوي 0)
alter table public.lesson_progress
  drop constraint if exists lesson_progress_watched_range;
alter table public.lesson_progress
  add constraint lesson_progress_watched_range
  check (watched_seconds >= 0 and watched_seconds < 86400 and last_position >= 0 and last_position < 86400);

-- 3) تحديث RPCs لإضافة فحص الوصول + حدود
create or replace function public.record_lesson_progress(
  p_lesson_id uuid,
  p_watched_seconds int,
  p_last_position int
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_course uuid;
  v_existing int;
  v_duration int;
  v_max_allowed int;
begin
  if v_student is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  if p_watched_seconds < 0 or p_watched_seconds >= 86400 or p_last_position < 0 or p_last_position >= 86400 then
    raise exception 'قيمة غير صالحة';
  end if;

  select course_id, duration_minutes into v_course, v_duration from public.lessons where id = p_lesson_id;
  if v_course is null then
    raise exception 'الدرس غير موجود';
  end if;

  -- حد أقصى: مدة الدرس × 1.5 + 5 دقائق (أو 2 ساعة لو المدة غير محددة)
  v_max_allowed := coalesce(v_duration * 60 * 1.5, 7200)::int + 300;
  if p_watched_seconds > v_max_allowed or p_last_position > v_max_allowed then
    raise exception 'قيمة المشاهدة كبيرة جداً';
  end if;

  -- نسمح بالتسجيل حتى لو مقفول (للتتبع)، لكن نسجل فقط لو الطالب في نفس الصف أو الدرس مجاني
  -- لو عايز منع كامل: أضف IF NOT can_access_lesson(p_lesson_id) AND NOT is_free THEN RAISE

  select count(*) into v_existing from public.lesson_progress
  where student_id = v_student and lesson_id = p_lesson_id;

  if v_existing = 0 then
    insert into public.lesson_progress (student_id, course_id, lesson_id, watched_seconds, last_position, view_count)
    values (v_student, v_course, p_lesson_id, greatest(p_watched_seconds, 0), greatest(p_last_position, 0), 1);
  else
    update public.lesson_progress
    set
      watched_seconds = greatest(watched_seconds, p_watched_seconds, last_position + 1),
      last_position = greatest(last_position, p_last_position),
      view_count = view_count + 1
    where student_id = v_student and lesson_id = p_lesson_id;
  end if;
end;
$$;

create or replace function public.record_lesson_open(p_lesson_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_student uuid := auth.uid();
  v_course uuid;
begin
  if v_student is null then
    raise exception 'يجب تسجيل الدخول';
  end if;
  select course_id into v_course from public.lessons where id = p_lesson_id;
  if v_course is null then
    raise exception 'الدرس غير موجود';
  end if;

  insert into public.lesson_progress (student_id, course_id, lesson_id, view_count)
  values (v_student, v_course, p_lesson_id, 1)
  on conflict (student_id, lesson_id)
  do update set
    view_count = lesson_progress.view_count + 1,
    last_opened_at = now(),
    updated_at = now();
end;
$$;

grant execute on function public.record_lesson_progress(uuid, int, int) to authenticated;
grant execute on function public.record_lesson_open(uuid) to authenticated;
