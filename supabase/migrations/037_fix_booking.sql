-- ============================================================
-- إصلاح الاشتراكات - نسخة آمنة بدون ON CONFLICT
-- ============================================================

-- 1. شوف الحجوزات الحالية
select id, student_id, grade, month, status, course_id, created_at
from public.bookings 
where student_id = auth.uid()
order by created_at desc;

-- 2. أصلح الحجز ليكون مؤكد ومطابق للكورس (second_secondary)
update public.bookings 
set 
  status = 'confirmed',
  grade = 'second_secondary',
  course_id = null
where student_id = auth.uid() 
  and (status != 'confirmed' or grade != 'second_secondary');

-- 3. لو مفيش حجز أصلاً، أضف واحد جديد (بدون ON CONFLICT)
do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.bookings
  where student_id = auth.uid() and month = to_char(now(), 'YYYY-MM');
  
  if v_count = 0 then
    insert into public.bookings (student_id, grade, month, status, transfer_number)
    values (
      auth.uid(),
      'second_secondary',
      to_char(now(), 'YYYY-MM'),
      'confirmed',
      'AUTO-' || floor(random() * 1000000)::text
    );
  end if;
end $$;

-- 3. تحقق من النتيجة
select 
  b.id, b.grade, b.month, b.status, b.course_id,
  c.title as course_title, c.grade as course_grade,
  public.can_access_course(c.id) as accessible
from public.bookings b
cross join public.courses c
where b.student_id = auth.uid()
  and c.grade = 'second_secondary'
  and c.is_published = true;