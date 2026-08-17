# قاعدة البيانات (Database)

كل الجداول جاهزة في `supabase/migrations/` — شغّلها بالترتيب.

## الجداول

| الجدول | الوصف | ملاحظات أمان |
| --- | --- | --- |
| `profiles` | بيانات الطلاب/الأدمن مرتبطة بـ `auth.users` | يُعمل تلقائياً من Trigger؛ حماية ضد تغيير الـ `role`/`grade` |
| `courses` | الكورسات بالفيديو | `video_url` ممنوع للزوار → View `courses_public` بدونه |
| `exams` | بيانات الامتحان والنافذة الزمنية | القراءة للطلاب: منشور + صف مطابق فقط |
| `exam_questions` | الأسئلة + **الإجابة الصحيحة** | لا قراءة للطلاب إطلاقاً؛ من Function آمنة فقط |
| `exam_submissions` | تسليمات الامتحانات | `unique (exam_id, student_id)` = محاولة واحدة |
| `bookings` | الاشتراك الشهري (اسم + موبايل + ولي أمر + صف + شهر) | الحالة: pending/confirmed/rejected |
| `competitions` | المسابقات | — |
| `notifications` | إشعارات الطلاب | تنتج من Triggers/RPCs تلقائياً |
| `contact_links` | روابط التواصل | عامة للقراءة، تعديل من الأدمن |
| `conversations` | محادثة الطالب مع المعلم | محادثة واحدة لكل طالب `unique (student_id)` |
| `messages` | رسائل الشات | RLS: الطالب يرى/يرسل في محادثته فقط، الأدمن في الكل؛ حماية ضد تعديل الرسائل |

## العلاقات

```
auth.users ──1:1──▶ profiles (id = auth.users.id)
exams ──1:N──▶ exam_questions
exams ──1:N──▶ exam_submissions ──N:1──▶ profiles
profiles ──1:N──▶ bookings
profiles ──1:N──▶ notifications
profiles ──1:1──▶ conversations ──1:N──▶ messages
```

## دوال السيرفر (RPCs)

| الدالة | الوظيفة |
| --- | --- |
| `submit_exam(p_exam_id, p_answers)` | التسليم + فحص النافذة الزمنية + تصحيح آلي + قيد المحاولة الواحدة (أخطاء غير متوقعة → رسالة عامة) |
| `get_exam_questions(p_exam_id)` | أسئلة الطالب **من غير** `correct_answer` (أخطاء غير متوقعة → رسالة عامة) |
| `get_my_submissions()` | حالة تسليماتي + الدرجة (لو منشورة) |
| `get_my_submission(p_exam_id)` | إجاباتي للمراجعة + الدرجة (لو منشورة) |
| `publish_grade(p_submission_id)` | نشر درجة طالب (أدمن فقط) |
| `publish_exam_grades(p_exam_id)` | نشر كل درجات امتحان دفعة واحدة |
| `get_or_create_conversation()` | إنشاء/جلب محادثة الطالب مع أول أدمن (معلم) |

## Triggers

- `on_auth_user_created` — إنشاء بروفايل عند التسجيل.
- `profiles_role_guard` — منع الطالب يغيّر الصلاحية/الصف/البريد.
- `bookings_notify` — إشعار الطالب عند تغيير حالة الحجز.
- `exams_published_notify` — إشعار كل طلاب الصف بنشر امتحان جديد.
- `messages_guard_update` — منع تعديل محتوى/مرسل الرسائل (is_read فقط يُسمح).
- `messages_touch_conversation` — تحديث `last_message_at` عند رسالة جديدة.
- `messages_notify_chat` — إشعار الطرف الآخر برسالة جديدة في الشات.

## بيانات تجريبية
شغّل `supabase/seed.sql` — كورسات + امتحان تجريبي بأسئلة (مع الإجابات الصحيحة) + مسابقة + روابط تواصل.