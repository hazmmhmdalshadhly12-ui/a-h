-- 045_lesson_homework_file.sql — ربط الواجب والملف بالدرس
alter table public.homeworks add column if not exists lesson_id uuid references public.lessons(id) on delete set null;
alter table public.course_files add column if not exists lesson_id uuid references public.lessons(id) on delete set null;
create index if not exists homeworks_lesson_idx on public.homeworks (lesson_id);
create index if not exists course_files_lesson_idx on public.course_files (lesson_id);

-- تحديث get_course_lessons ليعيد homework/file count لكل درس (اختياري للعرض)
-- لا حاجة لتغيير RPC، الواجهة تستدعي get_course_homeworks و get_course_files منفصلين
