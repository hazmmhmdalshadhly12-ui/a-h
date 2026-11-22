-- ============================================================
-- testdb/seed.sql — بيانات امتحانات ونتائج قديمة (حالة ما قبل 047)
-- ============================================================

insert into auth.users (id) values
  ('00000000-0000-4000-8000-00000000ad01'),  -- admin
  ('00000000-0000-4000-8000-00000000a101'),  -- student A (مشترك شهري)
  ('00000000-0000-4000-8000-00000000b201'),  -- student B (غير مشترك)
  ('00000000-0000-4000-8000-00000000c301'),  -- student C (مشترك، صف ثانٍ)
  ('00000000-0000-4000-8000-00000000d401'),  -- student D (مشترك بكورس)
  ('00000000-0000-4000-8000-00000000e501');  -- student E (غير مشترك)

insert into public.profiles (id, full_name, grade, role) values
  ('00000000-0000-4000-8000-00000000ad01', 'الأدمن', 'first_secondary', 'admin'),
  ('00000000-0000-4000-8000-00000000a101', 'أحمد', 'first_secondary', 'student'),
  ('00000000-0000-4000-8000-00000000b201', 'بكر', 'first_secondary', 'student'),
  ('00000000-0000-4000-8000-00000000c301', 'حسن', 'second_secondary', 'student'),
  ('00000000-0000-4000-8000-00000000d401', 'دانا', 'first_secondary', 'student'),
  ('00000000-0000-4000-8000-00000000e501', 'سعاد', 'first_secondary', 'student');

insert into public.courses (id, title, grade) values
  ('00000000-0000-4000-8000-000000c0de01', 'كورس الحاسب', 'first_secondary');

insert into public.bookings (student_id, status, grade, month) values
  ('00000000-0000-4000-8000-00000000a101', 'confirmed', 'first_secondary', '2026-11'),
  ('00000000-0000-4000-8000-00000000c301', 'confirmed', 'second_secondary', '2026-11');

insert into public.bookings (student_id, status, course_id) values
  ('00000000-0000-4000-8000-00000000d401', 'confirmed', '00000000-0000-4000-8000-000000c0de01');

-- ===== امتحان قديم E1 (صف أول، منشور، بدون access_mode — سيُضاف في 047) =====
insert into public.exams (id, title, grade, duration_minutes, is_published) values
  ('11111111-1111-4111-8111-111111111111', 'الامتحان الشهري القديم', 'first_secondary', 30, true);

insert into public.exam_questions (id, exam_id, question_text, type, options, correct_answer, points, order_index) values
  ('11111111-1111-4111-8111-000000000001', '11111111-1111-4111-8111-111111111111', 'ما وحدة قياس سرعة المعالج؟', 'mcq', '["جيجاهرتز","ميجابايت","بكسل"]', 'جيجاهرتز', 2, 1),
  ('11111111-1111-4111-8111-000000000002', '11111111-1111-4111-8111-111111111111', 'الرام تخزن دائم', 'true_false', '["صح","خطأ"]', 'خطأ', 1, 2),
  ('11111111-1111-4111-8111-000000000003', '11111111-1111-4111-8111-111111111111', 'اذكر وظيفة نظام التشغيل', 'short_answer', null, null, 3, 3);

-- ===== نتيجة قديمة (قبل 047): بلا question_snapshot إطلاقًا =====
insert into public.exam_submissions (id, exam_id, student_id, answers, auto_score, score, grade_released, submitted_at) values
  ('11111111-1111-4111-8111-a00000000001',
   '11111111-1111-4111-8111-111111111111',
   '00000000-0000-4000-8000-00000000a101',
   '{"11111111-1111-4111-8111-000000000001": "جيجاهرتز", "11111111-1111-4111-8111-000000000002": "خطأ", "11111111-1111-4111-8111-000000000003": "إدارة الموارد"}',
   3, 3, false, now() - interval '10 days');

-- ===== امتحان قديم E2 (صف ثانٍ، منشور) + نتيجة قديمة منشورة درجتها =====
insert into public.exams (id, title, grade, is_published) values
  ('22222222-2222-4222-8222-222222222222', 'امتحان الصف الثاني القديم', 'second_secondary', true);

insert into public.exam_questions (id, exam_id, question_text, type, options, correct_answer, points, order_index) values
  ('22222222-2222-4222-8222-000000000001', '22222222-2222-4222-8222-222222222222', 'ما لغة برمجة قواعد البيانات؟', 'mcq', '["SQL","HTML","CSS"]', 'SQL', 5, 1);

insert into public.exam_submissions (id, exam_id, student_id, answers, auto_score, score, grade_released, submitted_at) values
  ('22222222-2222-4222-8222-a00000000001',
   '22222222-2222-4222-8222-222222222222',
   '00000000-0000-4000-8000-00000000c301',
   '{"22222222-2222-4222-8222-000000000001": "SQL"}',
   5, 5, true, now() - interval '20 days');

-- ===== امتحان E3 بدون نتائج (لاختبار أن الحذف ما زال ممكنًا) =====
insert into public.exams (id, title, grade, is_published) values
  ('33333333-3333-4333-8333-333333333333', 'امتحان تجريبي بلا نتائج', 'first_secondary', false);

insert into public.exam_questions (id, exam_id, question_text, type, options, correct_answer, points, order_index) values
  ('33333333-3333-4333-8333-000000000001', '33333333-3333-4333-8333-333333333333', 'سؤال تجريبي', 'true_false', '["صح","خطأ"]', 'صح', 1, 1);
