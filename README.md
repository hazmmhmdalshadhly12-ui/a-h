# 🧠 Vision Academy

منصة تعليمية متكاملة لمادة **البرمجة (علوم الحاسب)** للصف الأول والثاني الثانوي — React + Vite + Tailwind على الفرونت، و Supabase (PostgreSQL + Auth + Storage + RLS) على الباك إند.

> **رؤية برمجية لمستقبلك.** هوية بصرية خاصة بالعالم البرمجي — عنصر مميز "Vision Core" (عدسة/بؤرة) بتتكرر في الشعار واللودر والرئيسية.

---

## ✨ المميزات

| الفئة | التفاصيل |
| --- | --- |
| **عام (بدون تسجيل)** | الرئيسية، الكورسات (نظرة عامة)، عن الأكاديمية، التواصل |
| **بوابة الطالب** | لوحة سريعة، كورسات كاملة (فيديو)، امتحانات بمحاولة واحدة، درجات، اشتراك شهري، مسابقات، إشعارات، شات مع المعلم، ملف شخصي |
| **لوحة الأدمن** | إحصائيات، إدارة امتحانات وأسئلة، مراجعة ونشر درجات، كورسات، اشتراكات شهرية (تأكيد/رفض)، مسابقات، طلاب (بحث وفلترة)، شات مع الطلاب، روابط تواصل، إعدادات |
| **الشات مع المعلم** | كل طالب عنده محادثة واحدة مع المعلم — يسأل أي سؤال، والمعلم بيرد من لوحة الأدمن. حماية RLS كاملة على الرسائل |
| **الشات بوت** | ودجت عائم في كل الصفحات، بيجيب بيانات حية من قاعدة البيانات، والـ API Key مخفي في Edge Function |
| **الأمان** | RLS على كل الجداول، إجابات الأسئلة الصحيحة مش بتوصل للفرونت إلا للسيرفر، محاولة امتحان واحدة مفروضة بـ `unique (exam_id, student_id)` على قاعدة البيانات نفسها، أخطاء قاعدة البيانات متعرضش تفاصيلها للمستخدم |

---

## 🚀 التشغيل محلياً

```bash
# 1) متطلبات
#     Node.js 18+

# 2) تثبيت الحزم
npm install

# 3) ضبط البيئة
cp .env.example .env     # واكتب قيم Supabase بتاعتك

# 4) شغّل الموقع
npm run dev              # http://localhost:5173

# البناء للإنتاج
npm run build
npm run preview
```

---

## 🛠️ إعداد Supabase (باك إند مجاني)

### 1) إنشاء المشروع
1. ادخل على [supabase.com](https://supabase.com) → **New Project** → اختر أقرب منطقة (مثلاً `eu-central-1` Frankfurt).
2. من **Project Settings → API** خد:
   - `Project URL` → دي `VITE_SUPABASE_URL`
   - `anon public key` → دي `VITE_SUPABASE_ANON_KEY`

### 2) تشغيل قاعدة البيانات
كل الجداول والصلاحيات جاهزة في مجلد `supabase/migrations/`. اتبع طريقة من الطريقتين:

**الطريقة السهلة (بدون CLI):**
- Supabase → **SQL Editor** → ارفع/الصق كل ملف بالترتيب التالي:

```
001_initial_schema.sql
002_profiles.sql
003_courses.sql
004_exams.sql
005_submissions.sql
006_bookings.sql
007_competitions.sql
008_notifications.sql
009_contact_links.sql
010_rls_policies.sql
011_functions_triggers.sql
012_security_fixes.sql
013_monthly_booking.sql
014_harden_functions.sql
015_chat.sql
```

ثم شغّل `supabase/seed.sql` (بيانات تجريبية: كورسات + امتحان + مسابقة + روابط تواصل).

**الطريقة الاحترافية (Supabase CLI):**
```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

### 3) ضبط الـ Environment Variables
```bash
# في ملف .env على الجهاز أو في Secrets لوحة النشر (Vercel/GitHub)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 4) الشات بوت (Edge Function)
1. من **Edge Functions** ارفع الدوال في `supabase/functions/` أو بالنشر اليدوي:
   ```bash
   supabase functions deploy vision-ai --verify-jwt
   supabase functions deploy submit-exam --verify-jwt
   supabase functions deploy release-grade --verify-jwt
   ```
2. من **Edge Functions → Secrets** ضيف:
   ```
   OPENAI_API_KEY=sk-...               (مفتاح OpenAI)
   OPENAI_MODEL=gpt-4o-mini            (اختياري)
   OPENAI_BASE_URL=https://api.openai.com/v1   (اختياري — تقدر تستخدم Groq مجاني)
   ```
   الـ Key ده **مش بيوصل للفرونت أبداً** — الاتصال بيتم من السيرفر.

> ⚠️ **الأمان (إلزامي):** الدوال مفروضة تُنشر **بدون** `--no-verify-jwt` عشان الدخول يبقى موثق،
> و CORS محدد على `hazem.blog` فقط. لو عندك domain تاني، حدثه في ملفات الدوال قبل النشر.

---

## 🔑 الحسابات التجريبية

> لازم تعملهم يدوياً من Supabase لأن جدول `auth.users` مش بيتعدل من SQL.

### حساب الطالب
1. من **Authentication → Users → Add user** اعمل مستخدم `student@vision.test` بكلمة سر.
2. افتح الموقع → سجّل دخول — البروفايل بيتعمل تلقائياً من الـ Trigger.

### حساب الأدمن
1. اعمل مستخدم `admin@vision.test` بنفس الطريقة.
2. نفّذ في SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
   where email = 'admin@vision.test';
   ```
3. سجّل دخول — هيتحوّل تلقائياً لـ `/admin`.

> ⚠️ **تفعيل الإيميل:** للتجربة السريعة اقفل "Confirm email" من **Authentication → Providers → Email**، أو فعّل الإيميل وإنت هتعمل تفعيل يدوي من الرسالة.

---

## 🔒 تأكيد "محاولة امتحان واحدة" من السيرفر

النقطة دي مش مجرد إخفاء زرار — القفل حقيقي على قاعدة البيانات:

1. **Constraint:** `unique (exam_id, student_id)` في `exam_submissions` — أي `insert` مكرر بيرفضه السيرفر نفسه.
2. **تسليم واحد فقط:** الطالب بيسلم عن طريق `submit_exam` (Postgres function بـ `security definer`):
   - بيدخل بـ `on conflict (exam_id, student_id) do nothing` → لو في تسليم مسبق بيرجع خطأ "محاولة واحدة فقط".
   - بيتحقق إن المستخدم طالب، الامتحان منشور لصفه، وفي النافذة الزمنية.
3. **تصحيح آلي:** درجة الموضوعي بتتحسب جوه نفس الـ function لحظة التسليم (مش من الفرونت).
4. **مقاومة التلاعب:** حتى لو حد فتح الـ Network وكرر الطلب أو عدّل الباودي — النتيجة واحدة: رفض من قاعدة البيانات.

**اختبار سريع:**
- سلم امتحان تجريبي → هتلاقي رسالة "تم التسليم". حاول تسلمه تاني من نفس الحساب → هيترفض حتى لو استدعيت الدالة مباشرة من SQL/API.

---

## 🧑‍🏫 إضافة الأدمن من الواجهة (بديل)
من **لوحة الأدمن → الطلاب → ملف الطالب** في زرار "ترقية لأدمن". (لو محتاج أول أدمن فقط من SQL زي الخطوة فوق.)

---

## 🌐 النشر

### الخيار الأسهل: Vercel (موصى به)
1. ارفع الكود على GitHub → ادخل [vercel.com](https://vercel.com) → **New Project**.
2. في إعدادات المشروع ضيف:
   ```
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   ```
3. `Build Command: npm run build` — دي مظبوطة افتراضياً. Vercel بيبقى تلقائي على أي Push.

### GitHub Pages
1. ارفع الكود على GitHub (المشروع بيشتغل بـ HashRouter، فمافيش مشكلة Refresh على مسارات).
2. **Settings → Pages** → Source: **GitHub Actions**.
3. ضيف Secrets في **Settings → Secrets and variables → Actions**:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
4. اعمل push على `main` — ملف `.github/workflows/deploy.yml` هينشر الموقع تلقائياً.

> ⚠️ GitHub Pages بيستضيف **فرونت فقط** — الداتا والـ Auth والشات بوت كلهم على Supabase (مجاني) وملف جاهزين.

---

## 📁 هيكل المشروع

```
vision-academy/
├── src/
│   ├── components/        # ui, layout, vision, academy, exam, admin, ai
│   ├── pages/             # public, student, admin, errors
│   ├── routes/            # AppRoutes + حمايات (Protected/Student/Admin)
│   ├── hooks/             # useAuth, useExams, useBookings ...
│   ├── services/          # طبقة التعامل مع Supabase (جداول + RPCs)
│   ├── context/           # Auth, Academy, Theme
│   ├── config/            # هوية الموقع والألوان والتنقل
│   └── lib/               # عميل Supabase + أدوات مساعدة
├── supabase/
│   ├── migrations/        # 011 ملفات إنشاء الجداول والأمان والدوال
│   ├── functions/         # vision-ai, submit-exam, release-grade
│   └── seed.sql           # بيانات تجريبية
├── docs/                  # التوثيق التقني والأمني
└── .github/workflows/     # نشر GitHub Pages تلقائي
```

---

## 📚 التوثيق الكامل
- `docs/architecture.md` — المعمارية وتدفق البيانات
- `docs/database.md` — جداول قاعدة البيانات
- `docs/security.md` — نموذج الأمان وRSL
- `docs/deployment.md` — خطوات النشر بالتفصيل

## 🛠️ تقنيات
React 18 · Vite 5 · Tailwind CSS 3 · React Router 6 · Supabase JS v2 · Deno Edge Functions · Cairo/Tajawal (عربي RTL)

---

## 💬 الشات مع المعلم

نظام رسائل مباشر بين الطالب والمعلم (من لوحة الأدمن):

- كل طالب عنده **محادثة واحدة** — بتتعمل تلقائياً أول ما يفتح صفحة الشات (`/student/chat`).
- الطالب يشوف محادثته بس ويرسل فيها بس؛ الأدمن يشوف ويرد على كل المحادثات (`/admin/chat`).
- إشعارات تلقائية للطرف الآخر عند كل رسالة جديدة.
- **الأمان:** RLS على الجدولين + محادثة واحدة لكل طالب (constraint) + منع تعديل/حذف الرسائل (trigger يحمي `body` و `sender_id`).

> التشغيل: شغّل `015_chat.sql` في SQL Editor بعد باقي الـ migrations — ثم تحدّث الواجهة (صفحات الشات + قائمة التنقل) وارفعها.

---

## 🍪 جلسة الدخول بالكوكيز (Session in Cookies)

جلسة Supabase (الـ access token + refresh token) بتتحفظ في **كوكيز** بدل `localStorage`:

- **كيف؟** `src/lib/cookieStorage.js` بيقدم مخزن جلسة مخصص لعميل Supabase (`auth.storage`)، بكوكيز `Path=/` مع `SameSite=Lax` و `Secure` على HTTPS، وعمر 30 يوم (بتتحدث تلقائياً مع كل refresh).
- **لماذا؟** الكوكيز شغالة حتى لو `localStorage` متقفول (تصفح خاص)، وبتفضل محفوظة عبر الصفحات والنطاق.
- **الجلسات الكبيرة:** لو الجلسة عدّت حجم الكوكي (~4KB) بتتقسّم تلقائياً على أكتر من كوكي (`<key>__0`, `<key>__1`...) وتتجمع عند القراءة.
- **ترقية سلسة:** عند أول تشغيل، `migrateLegacySession()` بنقل الجلسة القديمة من `localStorage` للكوكيز تلقائياً — المستخدم ميفقدش دخوله.
- **إلغاء:** عند الخروج بتتمسح كل كوكيات الجلسة (الأصلية + الشظايا).

> ملاحظة حماية: الكوكيز دي مش `HttpOnly` لأنها بتتحط من الـ Frontend (الموقع مستضاف سايتيك على GitHub Pages) — لكن قيمتها Session JWT، والـ RLS هو الحارس الحقيقي على البيانات.