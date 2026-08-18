import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import VisionCore from '../../components/vision/VisionCore.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { signIn } from '../../lib/auth.js';
import { validateEmail, validatePassword } from '../../utils/validators.js';

export default function Login() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    errs.email = validateEmail(form.email);
    errs.password = validatePassword(form.password);
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await signIn(form);
    setLoading(false);

    if (error) {
      setErrors({ form: 'بيانات الدخول غير صحيحة أو الحساب غير مفعل' });
      return;
    }

    // بعد الدخول بنجيب البروفايل ونحوله للمسار الصح (أدمن / ولي أمر / طالب)
    const profile = await refreshProfile();
    const target =
      profile?.role === 'admin' ? '/admin' : profile?.role === 'parent' ? '/parent/dashboard' : '/student/dashboard';
    navigate(target, { replace: true });
  };

  return (
    <PublicLayout>
      <section className="container-site flex justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <VisionCore size={72} />
            <div>
              <h1 className="font-display text-3xl font-black">تسجيل الدخول</h1>
              <p className="mt-1 text-sm text-muted">
                حساب واحد لكل الطلاب والأدمن — الوجهة بتتحدد حسب الصلاحية.
              </p>
            </div>
          </div>

          <Card>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {errors.form && (
                <p className="rounded-lens border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {errors.form}
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
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                required
              />
              <Button type="submit" className="w-full" size="lg" loading={loading}>
                دخول
              </Button>
            </form>
          </Card>

          <p className="mt-5 text-center text-sm text-muted">
            لسه مسجلتش؟{' '}
            <Link to="/register" className="font-semibold text-signal hover:text-signal-light">
              أنشئ حسابك مجاناً
            </Link>
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}