-- ============================================================
-- seed.sql — بيانات تجريبية للبدء
-- شغّل الملف ده في SQL Editor بعد الـ migrations عشان يظهر المحتوى.
--
-- ملاحظة: حسابات الأدمن والطلاب التجريبية بتتعمل من لوحة تحكم Supabase
-- (Authentication → Add user) لأنها جدول auth.users الخاص — مش ممكن يتعملها insert من SQL.
-- شوف README → قسم "الحسابات التجريبية".
-- ============================================================

-- ---------- روابط التواصل ----------
insert into public.contact_links (platform, label, value) values
  ('whatsapp',  'واتساب',   '01000000000'),
  ('phone',     'تليفون',   '01000000000'),
  ('facebook',  'فيسبوك',   'https://facebook.com/visionacademy'),
  ('youtube',   'يوتيوب',   'https://youtube.com/@visionacademy'),
  ('telegram',  'تليجرام',  'https://t.me/visionacademy'),
  ('instagram', 'إنستجرام', 'https://instagram.com/visionacademy')
on conflict (platform) do nothing;

-- ---------- كورسات تجريبية ----------
insert into public.courses (title, description, grade, video_url, order_index) values
  (
    'مدخل إلى البرمجة — Python',
    'أساسيات البرمجة: المتغيرات، الشروط، الحلقات، والدوال من الصفر.',
    'first_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    1
  ),
  (
    'بنية الحاسب والمنطق الرقمي',
    'كيف يعمل الحاسب؟ البوابات المنطقية، نظام العد الثنائي، وتحويلات الأنظمة.',
    'first_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    2
  ),
  (
    'الخوارزميات والتفكير المنطقي',
    'خطوات حل المشكلات، المخططات الانسيابية، وترتيب العمليات.',
    'second_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    1
  ),
  (
    'قواعد البيانات و SQL',
    'مقدمة للقواعد العلائقية، لغة SQL، والاستعلامات الأساسية.',
    'second_secondary',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    2
  );

-- ---------- مسابقة تجريبية ----------
insert into public.competitions (title, description, grade, deadline, details) values
  (
    'مسابقة البرمجة الصيفية',
    'تحدي برمجي لحل مشكلات برمجية واقعية بلغة Python.',
    'first_secondary',
    now() + interval '14 days',
    'اكتب كود بلغة Python تحل به 3 مشكلات، والفائز يحصل على شهادة تقدير.'
  );

-- ---------- امتحان تجريبي منشور (مع إجابة صحيحة لكل سؤال) ----------
insert into public.exams (title, description, grade, duration_minutes, start_at, end_at, is_published)
values (
  'امتحان تجريبي: أساسيات Python',
  'اختبر نفسك في أساسيات البرمجة — 4 أسئلة، محاولة واحدة فقط.',
  'first_secondary',
  30,
  now() - interval '1 hour',
  now() + interval '7 days',
  true
);

insert into public.exam_questions (exam_id, question_text, type, options, correct_answer, points, order_index)
select
  e.id,
  q.question_text,
  q.type,
  q.options::jsonb,
  q.correct_answer,
  q.points,
  q.order_index
from public.exams e
cross join (values
  (
    'ما هي النتيجة النهائية لـ 2 ** 3 في بايثون؟',
    'mcq',
    '[{"value":"6","label":"6"},{"value":"8","label":"8"},{"value":"9","label":"9"},{"value":"23","label":"23"}]',
    '8',
    2,
    1
  ),
  (
    'عبارة if بتنفذ الكود جواها إذا كان الشرط صحيحاً.',
    'true_false',
    '[{"value":"true","label":"صح"},{"value":"false","label":"غلط"}]',
    'true',
    1,
    2
  ),
  (
    'ما نوع البيانات المناسب لتخزين اسم الطالب؟ (إجابة قصيرة)',
    'short_answer',
    '[]',
    '',
    2,
    3
  ),
  (
    'ما الكلمة المفتاحية المستخدمة لتعريف دالة في بايثون؟',
    'mcq',
    '[{"value":"function","label":"function"},{"value":"def","label":"def"},{"value":"func","label":"func"},{"value":"fn","label":"fn"}]',
    'def',
    1,
    4
  )
) as q(question_text, type, options, correct_answer, points, order_index)
where e.title = 'امتحان تجريبي: أساسيات Python'
on conflict do nothing;