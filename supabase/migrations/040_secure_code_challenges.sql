-- 040_secure_code_challenges.sql — إغلاق تسريب الحل والاختبارات
-- الطالب كان يقدر يعمل select * مباشر ويقرأ solution_code/test_code
-- الحل: revoke + view عامة بدون الأعمدة الحساسة + إجبار المرور عبر RPC

revoke all on public.code_challenges from authenticated;
grant select, insert, update, delete on public.code_challenges to authenticated;

-- View عامة للطلاب بدون الحل والاختبارات
create or replace view public.code_challenges_public
with (security_invoker = on) as
select id, title, description, starter_code, difficulty, grade, order_index, is_published, created_by, created_at
from public.code_challenges;

grant select on public.code_challenges_public to authenticated;

-- سياسة جديدة: تمنع قراءة الأعمدة الحساسة إلا عبر RPC
-- نعيد إنشاء RLS بشكل يسمح فقط للـ RPC (الـ view تعتمد على نفس السياسة)
-- الحل العملي: إسقاط السياسة القديمة وإنشاء سياسة تسمح للأدمن فقط بالقراءة المباشرة
drop policy if exists "code_challenges: read published own grade or admin" on public.code_challenges;

create policy "code_challenges: read admin or via RPC"
  on public.code_challenges for select to authenticated
  using (public.is_admin());

-- السياسة القديمة للكتابة تظل للأدمن فقط (موجودة سابقاً "code_challenges: admin write")
-- الطلاب يقرأون عبر get_code_challenges() فقط
