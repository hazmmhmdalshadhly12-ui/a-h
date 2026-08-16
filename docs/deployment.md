# خطوات النشر (Deployment)

## نظرة عامة
- **الفرونت** (React) بيتنشر على GitHub Pages أو Vercel — ملفات ثابتة فقط.
- **الباك إند** (الداتا + Auth + Edge Functions) على Supabase — مجاني وبيتعمل مرة واحدة.

---

## 1) Supabase

1. أنشئ مشروع جديد على [supabase.com](https://supabase.com).
2. نفّذ ملفات `supabase/migrations/` بالترتيب في SQL Editor (أو `supabase db push` بـ CLI).
3. نفّذ `supabase/seed.sql` للبيانات التجريبية.
4. انسخ `Project URL` و `anon key` من **Settings → API**.
5. (اختياري) اقفل "Confirm email" في **Authentication → Providers → Email** للتجربة السريعة.

## 2) الشات بوت

```bash
supabase functions deploy vision-ai --no-verify-jwt
supabase functions deploy submit-exam --no-verify-jwt
supabase functions deploy release-grade --no-verify-jwt
```
ومن **Edge Functions → Secrets**:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# OPENAI_BASE_URL=https://api.groq.com/openai/v1   # بديل مجاني
# OPENAI_MODEL=llama-3.3-70b-versatile
```

## 3) الحسابات التجريبية
- أنشئ `student@vision.test` و `admin@vision.test` من **Authentication → Users → Add user**.
- حوّل الأدمن:
  ```sql
  update public.profiles set role = 'admin' where email = 'admin@vision.test';
  ```

## 4) النشر

### Vercel (الأسهل)
1. اربط المستودع.
2. أضف Environment Variables:
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
3. Save + Deploy — وبعدها تلقائي على كل push.

### GitHub Pages
1. **Settings → Pages** → Source = **GitHub Actions**.
2. أضف Secrets (Settings → Secrets and variables → Actions):
   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   ```
3. Push على `main` — `.github/workflows/deploy.yml` هينشر تلقائياً.

> 💡 يستخدم المشروع **HashRouter** عشان يشتغل من مسار فرعي (`/vision-academy/`) بدون إعدادات Rewrite.

## 5) قائمة اختبار قبل الاستخدام الفعلي

- [ ] التسجيل → البروفايل بيتعمل تلقائياً (Trigger).
- [ ] الدخول بحساب أدمن → بيوصل `/admin`.
- [ ] الطالب بيشوف الامتحانات المنشورة لصفه فقط.
- [ ] تسليم الامتحان → قفل نهائي (إعادة المحاولة مرفوضة من الداتابيز).
- [ ] تصحيح آلي للموضوعي + إدخال يدوي للمقالي + نشر الدرجات → الطالب يشوفها.
- [ ] الحجز → تأكيد/رفض من الأدمن → إشعار للطالب.
- [ ] تعديل روابط التواصل من لوحة الأدمن → بتظهر في صفحة التواصل والفوتر فوراً.
- [ ] الشات بوت بيجيب بيانات حية (كورسات/امتحانات/تواصل) وردوده دقيقة.

## المشاكل الشائعة

| المشكلة | الحل |
| --- | --- |
| الموقع شغال ببيانات تجريبية | `VITE_SUPABASE_URL`/`ANON_KEY` مش متظبطين — ضيفهم وأعد البناء |
| فشل الدخول "Email not confirmed" | فعّل الإيميل أو اقفل Confirm email من إعدادات Auth |
| الشات بوت بيرد "مش متظبط مفتاح" | أضف `OPENAI_API_KEY` في Edge Function Secrets |
| جرافيك الفيديو مش بيظهر | استخدم رابط embed لليوتيوب `https://www.youtube.com/embed/...` |
| تعديل في مسارات/404 بعد النشر | اعمل refresh عادي — HashRouter مش بيمر على السيرفر أصلاً |