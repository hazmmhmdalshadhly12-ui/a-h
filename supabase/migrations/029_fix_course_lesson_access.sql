-- ============================================================
-- 029_fix_course_lesson_access.sql
-- إصلاح نظام الكورسات: أقسام، دروس، تحكم وصول صحيح
-- ============================================================

-- ============================================================
-- 1) دالة تحقق الوصول للكورس (محدثة)
-- ============================================================
create or replace function public.can_access_course(p_course_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_month text;
  v_grade text;
  v_months text[];
  v_first text;
  v_last text;
begin
  if p_course_id is null then
    return false;
  end if;

  select c.grade, to_char(c.created_at, 'YYYY-MM') into v_grade, v_course_month
  from public.courses c where c.id = p_course_id;
  if v_grade is null then
    return false;
  end if;

  -- الكورس الاحترافي: حجز مؤكد على نفس الكورس
  if v_grade = 'professional' then
    return exists (
      select 1 from public.bookings b
      where b.student_id = auth.uid()
        and b.status = 'confirmed'
        and b.course_id = p_course_id
    );
  end if;

  -- الكورسات العادية: النطاق الشهري (يشمل المنح اليدوية)
  if v_course_month is null then
    return false;
  end if;

  select public.get_confirmed_months() into v_months;
  if array_length(v_months, 1) is null then
    return false;
  end if;

  v_first := v_months[1];
  v_last := v_months[array_length(v_months, 1)];
  return v_course_month >= v_first and v_course_month <= v_last;
end;
$$;

-- ============================================================
-- 2) دالة تحقق الوصول للدرس (بتبع الكورس)
-- ============================================================
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  v_course_id uuid;
begin
  select course_id into v_course_id
  from public.course_sections cs
  join public.course_lessons cl on cl.section_id = cs.id
  where cl.id = p_lesson_id;
  
  if v_course_id is null then
    return false;
  end if;
  
  return public.can_access_course(v_course_id);
end;
$$;

-- ============================================================
-- 3) جلب دروس الكورس للطالب (مع حالة الوصول)
-- ============================================================
create or replace function public.get_course_lessons(p_course_id uuid)
returns table (
  lesson_id uuid,
  section_id uuid,
  section_title text,
  title text,
  description text,
  video_url text,
  video_duration text,
  order_index int,
  is_free boolean,
  accessible boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;

  return query
    select
      cl.id,
      cl.section_id,
      cs.title as section_title,
      cl.title,
      cl.description,
      case when public.can_access_lesson(cl.id) then cl.video_url else null end as video_url,
      cl.video_duration,
      cl.order_index,
      cl.is_free,
      public.can_access_lesson(cl.id) as accessible
    from public.course_lessons cl
    join public.course_sections cs on cs.id = cl.section_id
    where cs.course_id = p_course_id
    order by cs.order_index asc, cl.order_index asc;
end;
$$;
grant execute on function public.get_course_lessons(uuid) to authenticated;

-- ============================================================
-- 4) جلب أقسام ودروس الكورس للأدمن (من غير قيود وصول)
-- ============================================================
create or replace function public.get_course_sections_admin(p_course_id uuid)
returns table (
  section_id uuid,
  section_title text,
  section_order int,
  lesson_id uuid,
  lesson_title text,
  lesson_description text,
  lesson_video_url text,
  lesson_video_duration text,
  lesson_order int,
  lesson_is_free boolean
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'يجب تسجيل الدخول';
  end if;
  
  if not public.is_admin() then
    raise exception 'غير مصرح';
  end if;

  return query
    select
      cs.id,
      cs.title,
      cs.order_index,
      cl.id,
      cl.title,
      cl.description,
      cl.video_url,
      cl.video_duration,
      cl.order_index,
      cl.is_free
    from public.course_sections cs
    left join public.course_lessons cl on cl.section_id = cs.id
    where cs.course_id = p_course_id
    order by cs.order_index asc, cl.order_index asc;
end;
$$;
grant execute on function public.get_course_sections_admin(uuid) to authenticated;

-- ============================================================
-- 5) إضافة قسم للكورس (أدمن)
-- ============================================================
create or replace function public.add_course_section(p_course_id uuid, p_title text, p_order_index int default 0)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_section_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'غير مصرح';
  end if;
  
  insert into public.course_sections (course_id, title, order_index)
  values (p_course_id, p_title, p_order_index)
  returning id into v_section_id;
  
  return v_section_id;
end;
$$;
grant execute on function public.add_course_section(uuid, text, int) to authenticated;

-- ============================================================
-- 6) إضافة درس للقسم (أدمن)
-- ============================================================
create or replace function public.add_course_lesson(
  p_section_id uuid, 
  p_title text, 
  p_description text default '',
  p_video_url text default '',
  p_video_duration text default '',
  p_order_index int default 0,
  p_is_free boolean default false
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_lesson_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'غير مصرح';
  end if;
  
  insert into public.course_lessons (section_id, title, description, video_url, video_duration, order_index, is_free)
  values (p_section_id, p_title, p_description, p_video_url, p_video_duration, p_order_index, p_is_free)
  returning id into v_lesson_id;
  
  return v_lesson_id;
end;
$$;
grant execute on function public.add_course_lesson(uuid, text, text, text, text, int, boolean) to authenticated;

-- ============================================================
-- 6) تحديث قسم (أدمن)
-- ============================================================
create or replace function public.update_course_section(p_section_id uuid, p_title text, p_order_index int)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'غير مصرح';
  end if;
  
  update public.course_sections
  set title = p_title, order_index = p_order_index
  where id = p_section_id;
end;
$$;
grant execute on function public.update_course_section(uuid, text, int) to authenticated;

-- ============================================================
-- 7) تحديث درس (أدمن)
-- ============================================================
create or replace function public.update_course_lesson(
  p_lesson_id uuid, 
  p_title text, 
  p_description text, 
  p_video_url text, 
  p_video_duration text, 
  p_order_index int, 
  p_is_free boolean
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'غير مصرح';
  end if;
  
  update public.course_lessons
  set title = p_title, 
      description = p_description, 
      video_url = p_video_url, 
      video_duration = p_video_duration, 
      order_index = p_order_index, 
      is_free = p_is_free
  where id = p_lesson_id;
end;
$$;
grant execute on function public.update_course_lesson(uuid, text, text, text, text, int, boolean) to authenticated;

-- ============================================================
-- 8) حذف قسم (أدمن)
-- ============================================================
create or replace function public.delete_course_section(p_section_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'غير مصرح';
  end if;
  
  delete from public.course_sections where id = p_section_id;
end;
$$;
grant execute on function public.delete_course_section(uuid) to authenticated;

-- ============================================================
-- 9) حذف درس (أدمن)
-- ============================================================
create or replace function public.delete_course_lesson(p_lesson_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'غير مصرح';
  end if;
  
  delete from public.course_lessons where id = p_lesson_id;
end;
$$;
grant execute on function public.delete_course_lesson(uuid) to authenticated;

-- ============================================================
-- منح الصلاحيات
-- ============================================================
grant execute on function public.can_access_lesson(uuid) to authenticated;
grant execute on function public.can_access_course(uuid) to authenticated;