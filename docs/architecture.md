# المعمارية (Architecture)

## نظرة عامة

```
┌─────────────────────────────┐        ┌──────────────────────────┐
│        المتصفح (React)      │        │         Supabase         │
│  React 18 + Vite + Tailwind │  HTTPS │  ┌────────────────────┐  │
│  RTL كامل + HashRouter      │ ──────▶ │  PostgreSQL (RLS)   │  │
│                             │        │  Auth (باسورد مشفر)  │  │
│  supabase-js (anon key)     │        │  Edge Functions      │  │
│                             │        │  (مفاتيح AI مخفية)   │  │
└─────────────────────────────┘        └──────────────────────┘  │
        │                                    │ OpenAI-compatible │
        ▼                                    └─────────▶─────────┘
  GitHub Pages / Vercel (Frontend فقط)
```

- **الفرونت فقط** بيتنشر على GitHub Pages/Vercel.
- كل الداتا والـ Auth والصلاحيات على Supabase عبر API — من غير سيرفر مكتوب من الصفر.

## تدفق البيانات الأساسي

### المصادقة
1. `Register` → `supabase.auth.signUp` مع `data` فيها (الاسم، الموبايل، الصف).
2. Trigger `handle_new_user` بيشيّل البروفايل من الـ metadata تلقائياً.
3. `Login` → `signInWithPassword` → جلب البروفايل → لو `role=admin` يتحول لـ `/admin`.

### الامتحانات (الأهم)
```
الطالب
 ├─ fetchExamsForStudent  → exams (منشورة + صفه) + حالة التسليم من get_my_submissions()
 ├─ fetchExamQuestionsForStudent → get_exam_questions() (من غير الإجابات الصحيحة)
 ├─ submitExam           → submit_exam() RPC على قاعدة البيانات
 │                          • يتحقق من الصلاحية/النافذة الزمنية
 │                          • يصحح الموضوعي آلياً
 │                          • الإدراج بقيد unique (exam_id, student_id)
 └─ get_my_submission()  → إجاباتي للمراجعة، والدرجة بتظهر بس لما تنشر

الأدمن
 ├─ ExamBuilder → createExam + replaceExamQuestions
 ├─ GradeTable  → setManualScore (المقالي) + publish_grade/publish_exam_grades
 └─ fetchSubmissionsForExam → select مباشر (RLS admin)
```

### الشات بوت
`VisionAI (ودجت عائم) → fetch POST /functions/v1/vision-ai → Edge Function`
- الـ Edge Function بيقرا بيانات حية (كورسات/امتحانات/مسابقات/تواصل) بـ **service role**.
- بيبني System Prompt من `academy-context.ts` ويبعت لـ OpenAI — والمفتاح مخفي في Secrets.

## نمط الشيفرة
- **الخدمات** (`src/services/*`) هي الطبقى الوحيدة اللي بتلمس Supabase — الصفحات مابتكلمش مع الـ SDK مباشرة.
- **الخطافات** (`src/hooks/*`) بتغلف الخدمات وتعمل حالة (`loading/data/error`).
- **السياقات** (`src/context/*`) بتوزع الجلسة والبروفايل وروابط التواصل على كل الموقع.
- **وضع العرض:** لو `VITE_SUPABASE_URL` مش متظبط، الخدمات بتعمل fallback لبيانات تجريبية (`lib/mockData.js`) عشان الموقع يفضل شغال.