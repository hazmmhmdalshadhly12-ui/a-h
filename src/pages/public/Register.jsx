import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import VisionCore from '../../components/vision/VisionCore.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { signUpStudent } from '../../lib/auth.js';
import { linkStudentToParent } from '../../services/parentService.js';
import { validateEmail, validatePassword, validatePhone, validateName } from '../../utils/validators.js';
import { isSupabaseConfigured } from '../../lib/supabaseClient.js';
import { cn } from '../../lib/utils.js';

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
  if (msg.includes('database error') || msg.includes('database error saving new user')) {
    return {
      form: 'حصلت مشكلة تقنية في إنشاء البروفايل على السيرفر — تأكد إن كل أكواد SQL اشتغلت بالترتيب (001 → 018) أو راسل الأدمن'
    };
  }
  return null;
}

const ACCOUNT_TYPES = [
  { value: 'first_secondary', label: 'أولى ثانوي', hint: 'طالب' },
  { value: 'second_secondary', label: 'ثانية ثانوي', hint: 'طالب' },
  { value: 'professional', label: 'الكورس الاحترافي', hint: 'طالب' },
  { value: 'parent', label: 'ولي أمر', hint: 'متابعة الابن' }
];

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();
  const [accountType, setAccountType] = useState('first_secondary');
  const isParent = accountType === 'parent';
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    parentPhone: '',
    studentPhone: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [needConfirm, setNeedConfirm] = useState(false);
  // تشخيص مؤقت — يعرض نتيجة الطلب على الشاشة عشان نشوف إيه اللي بيحصل فعلاً
  const [diag, setDiag] = useState('');

  const validate = () => {
    const errs = {};
    errs.fullName = validateName(form.fullName);
    errs.phone = validatePhone(form.phone, { required: true });
    errs.parentPhone = isParent ? null : validatePhone(form.parentPhone, { label: 'رقم ولي الأمر' });
    errs.studentPhone = isParent ? validatePhone(form.studentPhone, { label: 'رقم الطالب', required: true }) : null;
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

    // مهلة أمان: لو الطلب علّق (نت) نوقف التحميل ونقول للمستخدم
    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve({ data: null, error: { status: 'TIMEOUT', message: 'timeout' } }), 20000)
    );

    try {
      const { data, error } = await Promise.race([
        signUpStudent({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          phone: form.phone,
          parentPhone: isParent ? null : form.parentPhone,
          grade: isParent ? 'first_secondary' : accountType,
          role: isParent ? 'parent' : 'student'
        }),
        timeout
      ]);
      setLoading(false);

      if (error) {
        console.error('[Register] signUp error:', error);
        console.error('[Register] signUp status:', error?.status, '| code:', error?.code);
        setDiag(`خطأ: ${error?.status || ''} ${error?.code || ''} ${error?.message || ''}`);

        const translated = translateAuthError(error);
        if (translated?.email) {
          setErrors({ email: translated.email });
        } else if (translated?.password) {
          setErrors({ password: translated.password });
        } else if (translated?.form) {
          setErrors({ form: translated.form });
        } else if (error?.status === 'TIMEOUT') {
          toast.error('الاتصال استغرق وقت أطول من المعتاد — تأكد من الإنترنت وحاول مرة أخرى');
        } else {
          const tag = error?.status || error?.code;
          toast.error(
            tag
              ? `فشل التسجيل (${tag}) — جرّب مرة أخرى أو راسل الأدمن`
              : 'فشل التسجيل — تأكد من البيانات أو حاول مرة أخرى'
          );
        }
        return;
      }

      // ولي الأمر: نربطه بالطالب فوراً (لو الجلسة متاحة) ثم نروح للوحة ولي الأمر
      if (isParent && data?.session) {
        const { error: linkError } = await linkStudentToParent(form.studentPhone.trim());
        if (linkError) {
          console.error('[Register] parent link error:', linkError);
        }
      }

      if (data?.session) {
        setDiag('نجاح: جلسة اتسجلت');
        toast.success('تم إنشاء حسابك');
        navigate(isParent ? '/parent/dashboard' : '/student/dashboard', { replace: true });
      } else {
        setDiag('نجاح بلا جلسة: الحساب اتخلق ومحتاج تفعيل إيميل (Confirm email)');
        setNeedConfirm(true);
      }
    } catch (err) {
      setLoading(false);
      console.error('[Register] signUp threw:', err);
      setDiag('استثناء: ' + (err?.message || String(err)));
      toast.error('حصلت مشكلة غير متوقعة في التسجيل — حاول مرة أخرى أو راسل الأدمن');
    }
  };

  return (
    <PublicLayout>
      <section className="container-site flex justify-center py-12">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <VisionCore size={72} />
            <div>
              <h1 className="font-display text-3xl font-black">إنشاء حساب</h1>
              <p className="mt-1 text-sm text-muted">
                {isParent
                  ? 'سجل كـ ولي أمر علشان تتابع درجات ابنك وحالته في الكورسات والامتحانات — وتكلم المعلم مباشرة.'
                  : 'افتكر: امتحان واحد لكل طالب — الفرض بيتقفل بعد التسليم.'}
              </p>
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
                {/* اختيار نوع الحساب */}
                <div>
                  <p className="mb-2 text-sm font-semibold text-paper">نوع الحساب</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setAccountType(t.value)}
                        className={cn(
                          'focus-ring flex flex-col items-center gap-0.5 rounded-lens border px-2 py-2.5 text-center transition',
                          accountType === t.value
                            ? 'border-signal bg-signal/15 text-paper'
                            : 'border-ink-600 bg-ink-900 text-muted hover:border-ink-500'
                        )}
                      >
                        <span className="text-sm font-bold">{t.label}</span>
                        <span className="text-[11px] opacity-70">{t.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  name="fullName"
                  label={isParent ? 'اسم ولي الأمر' : 'الاسم الكامل'}
                  placeholder="الاسم ثلاثي"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  error={errors.fullName}
                  required
                />

                {isParent ? (
                  <>
                    <Input
                      name="phone"
                      label="رقم موبايل ولي الأمر"
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      error={errors.phone}
                      required
                    />
                    <Input
                      name="studentPhone"
                      label="رقم موبايل الطالب"
                      placeholder="01xxxxxxxxx"
                      dir="ltr"
                      value={form.studentPhone}
                      onChange={(e) => setForm({ ...form, studentPhone: e.target.value })}
                      error={errors.studentPhone}
                      required
                    />
                    <p className="text-xs text-muted">
                      الرقم ده لازم يكون نفس الرقم اللي سجّل بيه ابنك/بنتك في الأكاديمية — علشان نربطه بحسابك.
                    </p>
                  </>
                ) : (
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
                )}

                {!isParent && (
                  <p className="text-xs text-muted">
                    {accountType === 'first_secondary' && 'حساب طالب — الصف الأول الثانوي (150 جنيه / شهر)'}
                    {accountType === 'second_secondary' && 'حساب طالب — الصف الثاني الثانوي (250 جنيه / شهر)'}
                    {accountType === 'professional' && 'حساب طالب — الكورس الاحترافي (بنظام مستويات، الاشتراك منفصل عن الحجز الشهري)'}
                  </p>
                )}

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
                  {isParent ? 'إنشاء حساب ولي الأمر' : 'إنشاء الحساب'}
                </Button>
                {diag && (
                  <p className="rounded-lg bg-black/5 p-3 text-xs text-muted" dir="ltr">
                    [diag] {diag}
                  </p>
                )}
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