# نموذج الأمان (Security)

الأمان هو "أهم نقطة" في المشروع — الحماية الحقيقية على قاعدة البيانات نفسها، والواجهة مجرد طبقة عرض.

## المبادئ

1. **RLS على كل الجداول** — أي طلب API بيتحول لاستعلام PostgreSQL بيه مرور Policies، فالتلاعب من الـ Network مفيش منه فايدة.
2. **الإجابات الصحيحة مش بتوصل للفرونت** — جدول `exam_questions` مش مسموح للطلاب يعملوا عليه `SELECT` خالص. الأسئلة بتيجي من Function `security definer` بتشيل `correct_answer`.
3. **محاولة واحدة = constraint** — `unique (exam_id, student_id)` بيمنع أي تكرار إدراج، حتى لو الطالب استدعى `submit_exam` تاني من الـ API.
4. **الدرجات متسربش قبل النشر** — الطالب بيشوف `score` بس لما `grade_released = true` (جوه `get_my_submissions`/`get_my_submission`).

## مصفوفة الصلاحيات

| الجدول | زائر | طالب | أدمن |
| --- | --- | --- | --- |
| `profiles` | ✗ | نفسي فقط (update بدون role/grade) | الكل |
| `courses` | ✗ (View عام بدون فيديو) | الكل | CRUD |
| `exams` | ✗ | المنشور لصفه | CRUD |
| `exam_questions` | ✗ | ✗ (Function فقط) | CRUD |
| `exam_submissions` | ✗ | ✗ (RPC فقط) | CRUD |
| `bookings` | ✗ | حجوزاته + إنشاء | الكل + تأكيد/رفض |
| `competitions` | ✗ | قراءة | CRUD |
| `notifications` | ✗ | إشعاراته (تحديث للقراءة) | إدراج (من RPCs/Triggers) |
| `contact_links` | قراءة | قراءة | CRUD |

## حماية خاصة

### منع تسريب الإجابات
```sql
-- لا يوجد أي policy بتسمح بـ select للطلاب على exam_questions
create policy "exam_questions: admin only" on public.exam_questions for all
  to authenticated using (public.is_admin()) with check (public.is_admin());
```
والأسئلة بتطلع من:
```sql
create function get_exam_questions(p_exam_id uuid) returns table (... بدون correct_answer)
security definer set search_path = public
```

### منع رفع الصلاحيات (Privilege Escalation)
```sql
create trigger profiles_role_guard before update on profiles for each row
execute procedure prevent_profile_escalation();
-- بترفض أي تغيير لـ role/grade إلا لو is_admin()
```

### الدوال الحساسة بتتحقق من الأدمن جواها
```sql
-- publish_grade / publish_exam_grades بيبتدوا بـ:
if not public.is_admin() then raise exception 'غير مصرح'; end if;
```

## الشات بوت والأسرار
- `OPENAI_API_KEY` بيترمز في **Edge Function Secrets** فقط — الفرونت بينادي `/functions/v1/vision-ai` من غير ما يعرف المفتاح.
- `SUPABASE_SERVICE_ROLE_KEY` مستخدمة بس جوه Edge Functions (بيانات حية للبوت) — ومش موجودة في `.env` الخاص بالفرونت.

## الباسوردات
Supabase Auth بيدير التشفير والجلسات (JWT + Refresh) — مفيش كلمة سر مخزنة نصية في الكود أو الداتابيز.

## اختبار الأمان يدوياً
1. حاول تعمل `SELECT` على `exam_questions` بحساب طالب → هيترفض.
2. سلم امتحان ثم كرر استدعاء `submit_exam` من الـ API Console → `23505` / رسالة "محاولة واحدة فقط".
3. حاول ترفع `role` بتاعك لـ `admin` من الواجهة → هيترفض من الـ Trigger.
4. افتح `Network` ولاحظ أن طلبات الأسئلة بتجيب `correct_answer` إطلاقاً.