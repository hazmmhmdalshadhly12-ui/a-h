import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import VisionCore from '../../components/vision/VisionCore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { signUpStudent } from '../../lib/auth.js';
import { GRADES_OPTIONS } from '../../config/constants.js';
import { validateEmail, validatePassword, validatePhone, validateName } from '../../utils/validators.js';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { getFriendlyError } from '../../utils/errors.js';

/** ترجمة رسائل Auth المعروفة من Supabase لرسائل عربية واضحة (بدون أي تفاصيل تقنية) */
function translateAuthError(error) {
  const msg = (error?.message || '').toLowerCase();
  const code = (error?.code || '').toLowerCase();

  if (msg.includes('already registered') || code.includes('user_already_exists')) {
    return { email: 'هذا الإيميل مسجل بالفعل — جرّب تسجيل الدخول' };
  }
  if (msg.includes('disabled') || msg.includes('not allowed') || code.includes('signup_disabled') || msg.includes('signups')) {
    return {
      form: 'التسجيل غير مفعّل حالياً في إعدادات Supabase — فعّل "Enable Sign Ups" من Authentication → Sign In / Up'
    };
  }
  if (msg.includes('password') || code.includes('weak_password')) {
    return { password: 'الباسورد غير صالح — 6 أحرف على الأقل' };
  }
  if (msg.includes('invalid email') || msg.includes('email not allowed') || msg.includes('unable to validate email')) {
    return { email: 'الإيميل غير صالح — تأكد من كتابته صح' };
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return { form: 'طلبات كتير في وقت قصير — استنى شوية وحاول تاني' };
  }
  if (msg.includes('over email send rate limit')) {
    return { form: 'لينكات التفعيل اتتبعتت كتير — استنى دقيقة وحاول تاني' };
  }
  return null;
}

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    parentPhone: '',
    grade: 'first_secondary',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(false);

  const validate = () => {
    const errs = {};
    errs.fullName = validateName(form.fullName);
    errs.phone = validatePhone(form.phone, { required: true });
    errs.parentPhone = validatePhone(form.parentPhone, { label: 'رقم ولي الأمر' });
    errs.email = validateEmail(form.email);
    errs.password = validatePassword(form.password);
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!isSupabaseConfigured) {
      toast.warning('Supabase مش متظبط في الـ env — اتبع خطوات README الأول');
      return;
    }

    setLoading(true);
    const { data, error } = await signUpStudent(form);
    setLoading(false);

    if (error) {
      // سجّل الخطأ الفعلي للتحقق (من غير ما يظهر للمستخدم أي تفاصيل)
      console.error('[Register] signUp error:', error);

      const translated = translateAuthError(error);
      if (translated?.email) {
        setErrors({ email: translated.email });
      } else if (translated?.password) {
        setErrors({ password: translated.password });
      } else if (translated?.form) {
        setErrors({ form: translated.form });
      } else {
        toast.error(getFriendlyError(error, 'فشل التسجيل — تأكد من البيانات أو حاول مرة أخرى'));
      }
      return;
    }

    if (data?.session) {
      toast.success('تم إنشاء حسابك');
      navigate('/student/dashboard', { replace: true });
    } else {
      // لو تفعيل الإيميل شغال في Supabase — بيقوله يتفقد الإيميل
      setNeedConfirm(true);
    }
  };

  return (
    <PublicLayout>
      <section className="container-site flex justify-center py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <VisionCore size={72} />
            <div>
              <h1 className="font-display text-3xl font-black">إنشاء حساب طالب</h1>
              <p className="mt-1 text-sm text-muted">افتكر: امتحان واحد لكل طالب — الفرض بيتقفل بعد التسليم.</p>
            </div>
          </div>

          <Card>
            {needConfirm ? (
              <div className="space-y-3 py-4 text-center">
                <p className="text-signal font-display text-lg font-bold">كمل خطوة التفعيل ✉️</p>
                <p className="text-sm text-muted">
                  حسابك اتخلق بس محتاج تفعيل — افتح الإيميل {form.email} واضغط على رابط التفعيل،
                  وبعدها سجل دخولك. (أو اقفل "Confirm email" من إعدادات Auth في Supabase لو عايز الدخول فوري)
                </p>
                <Button variant="secondary" onClick={() => navigate('/login')}>
                  روح لتسجيل الدخول
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Input
                  name="fullName"
                  label="الاسم الكامل"
                  placeholder="الاسم ثلاثي"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  error={errors.fullName}
                  required
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    name="phone"
                    label="رقم موبايل الطالب"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    error={errors.phone}
                    required
                  />
                  <Input
                    name="parentPhone"
                    label="موبايل ولي الأمر (اختياري)"
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    value={form.parentPhone}
                    onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                    error={errors.parentPhone}
                  />
                </div>
                <Select
                  name="grade"
                  label="الصف الدراسي"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  options={GRADES_OPTIONS}
                  required
                />
                <Input
                  name="email"
                  type="email"
                  label="الإيميل"
                  placeholder="you@example.com"
                  dir="ltr"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  error={errors.email}
                  required
                />
                <Input
                  name="password"
                  type="password"
                  label="الباسورد"
                  placeholder="6 أحرف على الأقل"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  error={errors.password}
                  hint="مش هنخزنه نص — Supabase بيشفّره تلقائياً"
                  required
                />
                <Button type="submit" className="w-full" size="lg" loading={loading}>
                  إنشاء الحساب
                </Button>
              </form>
            )}
          </Card>

          <p className="mt-5 text-center text-sm text-muted">
            عندك حساب؟{' '}
            <Link to="/login" className="font-semibold text-signal hover:text-signal-light">
              سجل دخول
            </Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}