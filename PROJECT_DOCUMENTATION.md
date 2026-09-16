# Vision Academy — وثائق المشروع الكاملة

---

## 1. نظرة عامة

**Vision Academy** منصة تعليمية متكاملة لمادة **علوم الحاسب / البرمجة** للمرحلة الثانوية المصرية (الصف الأول والثاني الثانوي + الكورس الاحترافي)، تخدم ثلاثة أدوار:

| الدور | القدرات الأساسية |
|--------|------------------|
| **الطالب** | تصفح الكورسات، حل الامتحانات والواجبات، ممارسة الكود (Python في المتصفح)، متابعة الدرجات والصدارة، حجز الاشتراكات، المسابقات، المذكرات، الشات مع المدرس، الإشعارات، تخصيص اللوحة |
| **ولي الأمر** | متابعة أبناءه (الدرجات، الحضور، الحجوزات)، الشات مع المدرس |
| **المدرس (الأدمن)** | إدارة الكورسات/الأقسام/الامتحانات/الأسئلة، بنك الأسئلة، التصحيح الآلي واليدوي، إدارة الحجوزات والمسابقات، المذكرات والملفات، تحديات الكود، الإعلانات، الطلاب، الإعدادات، الشات |

> **الحالة**: مشروع جاهز للإنتاج، يعمل على **GitHub Pages / Cloudflare Pages** مع **Supabase** كـ Backend-as-a-Service.

---

## 2. التقنيات المستخدمة (Tech Stack)

### Frontend
| التقنية | الإصدار | السبب |
|----------|---------|-------|
| **React** | 18.3 | واجهة تفاعلية، مكونات قابلة لإعادة الاستخدام |
| **Vite** | 5.4 | بناء سريع، HMR، تحسين الإنتاج |
| **Tailwind CSS** | 3.4 | Utility-first، تصميم متسق، RTL جاهز، Dark mode افتراضي |
| **React Router** | 6.26 | توجيه SPA، مسارات محمية حسب الدور |
| **Monaco Editor** | 0.52 (CDN) | محرر كود احترافي (VS Code engine) للـ Python Playground |
| **Pyodide** | 0.26 (CDN) | Python runtime في المتصفح (WebAssembly) لتنفيذ كود الطالب |
| **Supabase JS** | 2.45 | عميل قاعدة البيانات، Auth، Realtime، Storage |

### Backend / Database (Supabase)
| المكون | الاستخدام |
|----------|-----------|
| **PostgreSQL** | قاعدة البيانات العلائقية كاملة |
| **Row Level Security (RLS)** | أمان على مستوى الصف — كل استعلام يمر بسياسات صارمة |
| **Supabase Auth** | تسجيل دخول بالبريد/كلمة مرور، جلسات في HttpOnly Cookies، أدوار (student, parent, admin) |
| **Edge Functions (Deno)** | دوال خادمية: `vision-ai` (مساعد ذكي), `submit-exam`, `release-grade` — تعمل بجانب قاعدة البيانات بزمن استجابة منخفض |
| **Storage Buckets** | `materials` و `course-files` — ملفات عامة للتحميل المباشر |
| **Database Triggers** | `created_by` تلقائي، `student_id` للتفضيلات، التحقق من حجز الطالب |

### DevOps / Deployment
| الأداة | الوصف |
|--------|-------|
| **GitHub Actions** | CI/CD: `npm ci → build → deploy` على كل push للـ `main` |
| **GitHub Pages / Cloudflare Pages** | استضافة مجانية، SSL تلقائي، CDN عالمي |
| **Keep-alive Workflow** | طلب مجدول كل 5 ساعات لمنع سكون Supabase المجاني |
| **Security Headers** | CSP صارم، X-Frame-Options، HSTS، Permissions-Policy — عبر `public/_headers` و `<meta>` tags |

### المكتبات المساعدة
- `lucide-react` / أيقونات SVG مخصصة (`src/components/ui/Icon.jsx`)
- `date-fns` (تنسيق التواريخ بالعربي)
- Custom hooks: `useAuth`, `useAccess`, `useExams`, `useBookings`, `useNotifications`, `useStudentPrefs`
- Contexts: `AuthContext`, `StudentPrefsContext`

---

## 3. arquitectura المشروع (Project Structure)

```
vision-academy/
├── public/
│   ├── _headers              # Security Headers (Netlify/CF Pages format)
│   ├── favicon.svg
│   └── manifest.json         # PWA Manifest
├── src/
│   ├── components/
│   │   ├── ui/               # مكونات أساسية: Button, Card, Modal, Input, Badge, Icon, Toast, Skeleton...
│   │   ├── admin/            # AdminHeader, VisionAI (الشات الذكي)
│   │   ├── layout/           # StudentSidebar, StudentNavbar, MobileNav, SidebarNav
│   │   ├── code/             # CodeEditor (Monaco + Pyodide)
│   │   ├── student/          # DashboardCustomizer, dashboardSections
│   │   ├── ai/               # VisionAI component
│   │   └── vision/           # VisionCore (الشعار المتحرك)
│   ├── context/
│   │   ├── AuthContext.jsx   # حالة المصادقة + البروفايل
│   │   └── StudentPrefsContext.jsx # تفضيلات الطالب (لون + ترتيب اللوحة)
│   ├── hooks/
│   │   ├── useAuth.js, useAccess.js, useExams.js, useBookings.js, useNotifications.js, useStudentPrefs.js
│   ├── lib/
│   │   ├── supabaseClient.js # عميل Supabase موحد
│   │   ├── auth.js           # دوال الجلسة والتسجيل
│   │   ├── cookieStorage.js  # إدارة الكوكيز الآمنة
│   │   └── utils.js          # `cn` (classnames helper)
│   ├── pages/
│   │   ├── public/           # Home, Courses, About, Contact, Login, Register
│   │   ├── student/          # Dashboard, MyCourses, CourseDetails, Exams, TakeExam, Grades, Bookings,
│   │   │                     # Competitions, Leaderboard, Materials, CodePlayground, Profile, Chat, Notifications
│   │   ├── parent/           # Dashboard, StudentDetails, Chat
│   │   ├── admin/            # Dashboard, Exams (CRUD), Courses, Sections, Materials, Bookings,
│   │   │                     # Competitions, Announcements, Materials, Students, Contacts, Settings, Chat,
│   │   │                     # **CodeChallenges** (إدارة تحديات الكود)
│   │   └── errors/           # 403, 404, 500
│   ├── routes/
│   │   ├── AppRoutes.jsx     # جميع المسارات + Guards (StudentRoute, AdminRoute, ParentRoute)
│   │   ├── StudentRoute.jsx, AdminRoute.jsx, ParentRoute.jsx
│   ├── services/             # طبقة استدعاء Supabase (courseService, materialService, examService, codeService, codeRunner, preferencesService...)
│   ├── config/
│   │   ├── navigation.js     # قوائم التنقل لكل دور
│   │   ├── constants.js      # الثوابت (الصفوف، أنواع الأسئلة، حالات الحجز...)
│   │   └── site.js           # إعدادات الموقع
│   ├── utils/
│   │   ├── formatDate.js, errors.js, permissions.js
│   ├── App.jsx, main.jsx, index.css
├── supabase/
│   └── migrations/           # 26 migration ملفًا (001_profiles → 026_user_preferences)
├── .github/workflows/
│   ├── deploy.yml            # Build & Deploy
│   └── keep-alive.yml        # منع السكون
├── package.json, tailwind.config.js, vite.config.js, index.html
```

---

## 4. قاعدة البيانات — مخطط مختصر (ER Overview)

### الجداول الرئيسية
| الجدول | الغرض | مفاتيح مهمة |
|--------|-------|-------------|
| `profiles` | المستخدمون (extends auth.users) | `id PK`, `full_name`, `role` (student/parent/admin), `grade`, `phone` |
| `courses` | الكورسات | `id`, `title`, `grade`, `is_professional`, `video_url`, `order_index` |
| `course_sections` | أقسام الكورس (وحدات/دروس) | `course_id FK`, `title`, `order_index`, `video_url`, `is_locked` |
| `exams` | الامتحانات | `course_id`, `title`, `start_at`, `end_at`, `duration_min`, `passing_score` |
| `exam_questions` | أسئلة الامتحان | `exam_id`, `type` (mcq/true_false/short_answer), `question_text`, `options`, `correct_answer`, `points` |
| `exam_attempts` | محاولات الطالب | `exam_id`, `student_id`, `answers`, `score`, `submitted_at`, `status` |
| `homework` / `homework_questions` / `homework_submissions` | الواجبات المنزلية |
| `bookings` | حجوزات الاشتراك الشهري | `student_id`, `month`, `status` (pending/confirmed/rejected), `grade`, `proof_url` |
| `materials` | المذكرات والملفات (للأدمن) | `title`, `grade`, `file_url`, `file_type`, `created_by` |
| `course_files` | ملفات الكورس (مرفقات الدروس) | `course_id`, `section_id`, `file_url`, `uploaded_by` |
| `announcements` | إعلانات المنصة | `title`, `body`, `target_grade`, `is_pinned` |
| `competitions` / `competition_questions` / `competition_attempts` | المسابقات |
| `conversations` / `messages` | الشات بين الطالب والمدرس |
| `notifications` | إشعارات داخل التطبيق |
| `leaderboard` (view) | الصدارة — تحسب من `exam_attempts` + `homework_submissions` |
| **`code_challenges`** | تحديات الكود (Python) | `title`, `starter_code`, `test_code`, `solution_code`, `difficulty`, `grade`, `is_published` |
| **`code_solutions`** | محاولات الطالب في الكود | `challenge_id`, `student_id`, `code`, `passed`, `run_count` |
| **`user_preferences`** | تخصيص الطالب | `student_id PK`, `accent`, `dashboard_layout` (JSON) |

> **عدد الـ Migrations**: 26 ملفًا — من إنشاء الجداول الأساسية حتى `026_user_preferences`. كل migration يحتوي على RLS policies، triggers، و RPC functions آمنة (`security definer` مع `search_path = public`).

---

## 5. الميزات الأساسية بالتفصيل

### 5.1 بوابة الطالب
- **Dashboard قابل للتخصيص**: الطالب يختار لون اللوحة (6 ألوان) ويرتّب/يخفي الأقسام (إعلانات، إحصائيات، امتحانات، حجوزات) — محفوظ في `user_preferences`.
- **الكورسات**: عرض الكورسات حسب الصف، فيديو الدروس، مواد مرفقة، تتبع التقدم.
- **الامتحانات**: مؤقت، تصحيح تلقائي (MCQ/TF)، تصحيح يدوي (إجابات قصيرة)، مراجعة الإجابات بعد الانتهاء.
- **الواجبات**: أسئلة مقالية، تسليم، تصحيح المدرس مع تعليقات.
- **ممارسة الكود (Code Playground)**:
  - محرر Monaco (VS Code engine) — تحميل من CDN، لا يعتمد على npm.
  - تنفيذ Python حقيقي بـ **Pyodide** داخل **Web Worker** (لا يجمد الواجهة).
  - مهلة 10 ثواني — لو الكود علق يتوقف الـ worker ويعاد إنشاؤه.
  - الاختبارات (`test_code`) تُضاف لكود الطالب وتعمل في المتصفح — تعليم TDD.
  - الحلول محفوظة للمدرس (`code_solutions`).
- **الصدارة (Leaderboard)**: فلترة حسب الصف، عرض النقاط، الترتيب، نسبة النجاح.
- **الحجوزات**: اشتراك شهري، رفع إثبات الدفع، انتظار تأكيد المدرس.
- **المسابقات**: وقت محدد، أسئلة متنوعة، ترتيب فوري.
- **المذكرات**: تحميل مباشر (Buckets عامة)، زرار تحميل باسم ملف واضح.
- **الشات**: محادثات فورية مع المدرس (Realtime)، إشعارات غير مقروءة.
- **الإشعارات**: داخل التطبيق + عداد في الـ Navbar.

### 5.2 بوابة ولي الأمر
- ربط الأبناء برقم الهاتف (RLS يضمن الأب يرى أبناءه فقط).
- لوحة متابعة: الدرجات، الحضور، الحجوزات، الإشعارات.
- شات مباشر مع المدرس.

### 5.3 لوحة تحكم المدرس (Admin)
- **إدارة الكورسات والأقسام**: CRUD كامل، رفع فيديوهات/ملفات، ترتيب بالسحب.
- **بنك الأسئلة وإنشاء الامتحانات**: أنواع أسئلة متنوعة، نسخ امتحانات، جدولة.
- **التصحيح**: تلقائي للاختيار، يدوي للإجابات القصيرة — واجهة مراجعة مريحة.
- **إدارة الحجوزات**: تأكيد/رفض، فلترة حسب الشهر والصف.
- **المسابقات**: إنشاء، جدولة، متابعة المحاولات.
- **المذكرات والملفات**: رفع، حذف، تنظيم حسب الصف.
- **تحديات الكود (CodeChallenges)**: CRUD كامل — كود البداية، كود الاختبارات، الحل النموذجي (مخفي)، متابعة حلول الطلاب مع حالة النجاح/الفشل.
- **الطلاب**: عرض، بحث، تعديل الصف/الدور، رؤية نشاط الطالب.
- **الإعلانات**: تثبيت، استهداف صف معين.
- **الإعدادات**: ألوان الهوية، إعدادات المنصة.
- **Vision AI**: مساعد ذكي (Edge Function) يجيب على أسئلة المدرس/الطلاب من سياق المنصة فقط.

---

## 6. الأمان والحماية (Security Hardening)

تم تنفيذ **4 جولات تقوية أمنية** (Migrations 021–024) تغطي:

| التهديد | الحماية المنفذة |
|----------|----------------|
| **SQL Injection** | لا توجد استعلامات ديناميكية (`EXECUTE`)، كل الدوال `security definer` مع `search_path = public`، معاملات `text` مع تحقق. |
| **XSS** | لا `dangerouslySetInnerHTML`، CSP صارم (`script-src 'self' https://cdn.jsdelivr.net`)، `referrer-policy`، output encoding تلقائي في React. |
| **CSRF** | جلسة في **HttpOnly Secure SameSite=Lax Cookies** — لا توكن في localStorage. |
| **Broken Access Control** | RLS على كل جدول، سياسات `using`/`with check` تتحقق من `auth.uid()` و `grade` و `is_admin()`، RPC functions تتحقق من الصلاحية قبل التنفيذ. |
| **File Upload** | Allowlist للامتدادات (مانع `svg, html, xml, js, php, exe...`)، أسماء ملفات عشوائية، Buckets عامة للقراءة فقط. |
| **Secrets** | `service_role` و `OpenAI key` في Edge Functions فقط، `.env` في `.gitignore`. |
| **Security Headers** | CSP، X-Frame-Options: DENY، X-Content-Type-Options: nosniff، Permissions-Policy، HSTS — مطبقة عبر `<meta>` و `public/_headers` و Cloudflare Transform Rules. |
| **Rate Limiting / Abuse** | Edge Functions بـ CORS مقيد، JWT verification، مهلة تنفيذ للكود (10 ثواني)، Keep-alive يمنع السكون. |

---

## 7. تجربة المطور (Developer Experience)

- **صفر تبعيات npm جديدة للميزات الكبيرة** — Monaco + Pyodide من CDN.
- **بناء على GitHub Actions فقط** — لا حاجة لـ Node محلياً.
- **TypeScript غير مستخدم** — JavaScript حديث (ESM) مع JSDoc في الأماكن الحرجة.
- **قواعد كود موحدة**: مكونات `ui` قابلة لإعادة الاستخدام، `cn` helper للـ classnames، Hooks مخصصة للمنطق، Services للـ API.
- **مسارات محمية بـ Guards** (`StudentRoute`, `AdminRoute`, `ParentRoute`) + تحقق من الخادم (RLS).
- **Error Boundaries** و `ErrorState`/`ServerError` pages.

---

## 8. نشر وتشغيل (Deployment)

### متطلبات البيئة (Environment Variables)
```env
VITE_SUPABASE_URL=https://yvkjqdmitwouluiqkuvv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### خطوات النشر
1. **Push إلى `main`** → GitHub Actions يشغل `deploy.yml`:
   - `npm ci`
   - `npm run build` (ينتج `dist/`)
   - Deploy إلى GitHub Pages / Cloudflare Pages
2. **Cloudflare Transform Rules** (اختياري لكن موصى به) لإضافة Headers على مستوى الحافة:
   - X-Frame-Options, CSP, HSTS, Permissions-Policy
3. **Supabase SQL Editor** → تنفيذ الـ 26 migration بالترتيب (001 → 026).
4. **Edge Functions** نشر يدوي من Dashboard أو CLI:
   - `vision-ai`, `submit-exam`, `release-grade`
5. **Storage Buckets**: `materials`, `course-files` — سياسات `public` للقراءة، `admin` للكتابة.

---

## 9. دليل المطور الجديد (Onboarding)

```bash
# استنساخ
git clone https://github.com/hazmmhmdalshadhly12-ui/a-h.git
cd vision-academy

# تثبيت (محلياً لو حابب تجرب)
npm install
npm run dev        # http://localhost:5173

# بناء الإنتاج
npm run build      # مجلد dist/
```

### أوامر مفيدة
```bash
npm run lint       # ESLint
npm run format     # Prettier
```

---

## 10. خارطة الطريق (Roadmap) — أفكار مستقبلية

| الميزة | الوصف | الجهد |
|----------|-------|-------|
| **PWA كامل** | `vite-plugin-pwa` + Service Worker + Manifest → تثبيت على الموبايل | منخفض |
| **Capacitor / Native App** | غلاف iOS/Android للرفع على المتاجر | متوسط (يحتاج Mac/Android Studio) |
| **AI Essay Grading** | تصحيح الإجابات المقالية بالذكاء الاصطناعي + مراجعة المدرس | متوسط (يستهلك OpenAI credits) |
| **Question Bank** | تخزين الأسئلة وإعادة استخدامها، توليد امتحانات عشوائية | متوسط |
| **Gamification** | نقاط، شارات، Streaks، بطولات كود | متوسط |
| **Analytics Dashboard** | رسوم بيانية للأداء (Chart.js / Recharts) | متوسط |
| **Offline Support** | Service Worker يكش الكورسات والامتحانات للمراجعة بدون نت | متوسط |
| **Video Streaming** | HLS/DASH للفيديوهات، تقدم المشاهدة | عالٍ |

---

## 11. معلومات التواصل

- **المطور**: المهندس/حازم محمد الشاذلي
- **المستودع**: `https://github.com/hazmmhmdalshadhly12-ui/a-h`
- **الموقع الحي**: `https://hazem.blog`
- **Supabase Project**: `yvkjqdmitwouluiqkuvv`
- **قاعدة البيانات**: PostgreSQL 15+ على Supabase Cloud

---

## 12. ملخص تنفيذي لصاحب المشروع

> **Vision Academy** منصة **كاملة الإنتاج** لتعليم البرمجة للمرحلة الثانوية، مبنية بتقنيات حديثة (React + Supabase) مع تركيز على **الأمان، الأداء، وتجربة المستخدم**.
>
> **ما يميزها**:
> - أول منصة عربية تدمج **محرر كود احترافي (Monaco) + تنفيذ Python حقيقي (Pyodide)** في متصفح الطالب — صفر تكلفة خادم.
> - **أمان بنكي**: RLS على كل جدول، CSP صارم، لا أسرار في الكود، جلسات كوكيز آمنة.
> - **تجربة طالب مخصصة**: لون اللوحة، ترتيب الأقسام، ممارسة كود تفاعلية، صدارة محفزة.
> - **أدمن قوي**: إدارة محتوى، بنوك أسئلة، تصحيح هجين، تحديات كود، شات، AI مساعد.
> - **نشر مجاني بالكامل**: GitHub Pages + Supabase Free Tier + GitHub Actions CI/CD.
>
> المشروع **جاهز للتسليم والتشغيل الفوري** — فقط تنفيذ الـ Migrations ورفع الكود.

---

*آخر تحديث: سبتمبر 2026*  
*إصدار التوثيق: 1.0*