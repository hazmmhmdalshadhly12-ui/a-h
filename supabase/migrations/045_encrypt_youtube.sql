-- 045_encrypt_youtube.sql — تشفير رابط يوتيوب في الـ payload
-- نعيد video_url مشفر base64 حتى لا يظهر كرابط واضح في Network
create or replace function public.get_course_lessons(p_course_id uuid)
returns table (lesson_id uuid, title text, description text, video_url text, video_provider text, duration_minutes int, order_index int, is_free boolean, accessible boolean)
language plpgsql stable security definer set search_path=public as $$
begin if auth.uid() is null then raise exception 'يجب تسجيل الدخول'; end if;
if not exists (select 1 from courses c where c.id=p_course_id and (c.grade=(select p.grade from profiles p where p.id=auth.uid()) or c.grade='professional')) then raise exception 'هذا الكورس ليس لصفك'; end if;
return query select l.id, l.title, l.description,
  case when public.can_access_lesson(l.id) then encode(l.video_url::bytea,'base64') else null end,
  l.video_provider, l.duration_minutes, l.order_index, l.is_free, public.can_access_lesson(l.id)
from lessons l where l.course_id=p_course_id order by l.order_index; end; $$;
grant execute on function public.get_course_lessons(uuid) to authenticated;
