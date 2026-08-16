-- ============================================================
-- 010_rls_policies.sql
-- أمان البيانات (أهم نقطة في المشروع)
-- كل صفحة أدمن وكل وصول للبيانات بيتأكد من قاعدة البيانات نفسها،
-- مش من إخفاء الزرار في الواجهة.
-- ============================================================

-- ---------- تمكين RLS على كل الجداول ----------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.exams enable row level security;
alter table public.exam_questions enable row level security;
alter table public.exam_submissions enable row level security;
alter table public.bookings enable row level security;
alter table public.competitions enable row level security;
alter table public.notifications enable row level security;
alter table public.contact_links enable row level security;

-- ---------- صلاحيات (grants) — سياسات RLS هي اللي بتقرر ----------
grant usage on schema public to anon, authenticated, service_role;

grant select on public.contact_links to anon, authenticated;
grant select on public.courses_public to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.courses to authenticated;
grant select on public.exams to authenticated;
grant select on public.exam_questions to authenticated;
grant select on public.exam_submissions to authenticated;
grant select on public.bookings to authenticated;
grant select on public.competitions to authenticated;
grant select on public.notifications to authenticated;

grant update on public.profiles to authenticated;
grant insert, update on public.bookings to authenticated;
grant update on public.notifications to authenticated;

-- عمليات الأدمن بس — بتتحكم فيها سياسات is_admin()
grant insert, update, delete on public.courses to authenticated;
grant insert, update, delete on public.exams to authenticated;
grant insert, update, delete on public.exam_questions to authenticated;
grant insert, update, delete on public.exam_submissions to authenticated;
grant insert, update, delete on public.competitions to authenticated;
grant insert, update, delete on public.contact_links to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_student() to authenticated;

-- ---------- PROFILES ----------
create policy "profiles: select own or admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- الأدمن يقدر يعدّل أي بروفايل (ترقية صلاحية، تعديل صف...)
-- وغير الأدمن محدود بنفسه بس — وتغيير role/grade بيحميه Trigger منفصل
create policy "profiles: update own or admin"
  on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------- COURSES ----------
create policy "courses: authenticated users read"
  on public.courses for select to authenticated
  using (true);

create policy "courses: admin write"
  on public.courses for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- EXAMS ----------
create policy "exams: students read published for own grade"
  on public.exams for select to authenticated
  using (
    public.is_admin()
    or (
      is_published = true
      and grade = (select grade from public.profiles where id = auth.uid())
    )
  );

create policy "exams: admin write"
  on public.exams for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- EXAM_QUESTIONS ----------
-- الطلاب ميقدرش يعمل SELECT مباشر على الأسئلة إطلاقاً.
-- الأسئلة بتيجي بس من Function آمنة (get_exam_questions) من غير الإجابة الصحيحة.
create policy "exam_questions: admin only (no student access)"
  on public.exam_questions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- EXAM_SUBMISSIONS ----------
-- الطلاب مش بيعملوا select/insert مباشر — التسليم عن طريق RPC submit_exam
-- والقراءة عن طريق get_my_submissions / get_my_submission (بس درجة منشورة)
create policy "exam_submissions: admin only direct access"
  on public.exam_submissions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- BOOKINGS ----------
create policy "bookings: student reads own, admin reads all"
  on public.bookings for select to authenticated
  using (student_id = auth.uid() or public.is_admin());

create policy "bookings: student creates own"
  on public.bookings for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());

create policy "bookings: admin update status"
  on public.bookings for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "bookings: admin delete"
  on public.bookings for delete to authenticated
  using (public.is_admin());

-- ---------- COMPETITIONS ----------
create policy "competitions: authenticated read"
  on public.competitions for select to authenticated
  using (true);

create policy "competitions: admin write"
  on public.competitions for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- NOTIFICATIONS ----------
create policy "notifications: own read"
  on public.notifications for select to authenticated
  using (student_id = auth.uid());

create policy "notifications: own update (mark read)"
  on public.notifications for update to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ---------- CONTACT_LINKS ----------
create policy "contact_links: public read"
  on public.contact_links for select to anon, authenticated
  using (true);

create policy "contact_links: admin write"
  on public.contact_links for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());