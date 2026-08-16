import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useProfile } from '../../hooks/useProfile.js';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import { GRADES_OPTIONS } from '../../config/constants.js';
import { validateName, validatePhone } from '../../utils/validators.js';

export default function Profile() {
  const { profile } = useAuth();
  const { saveProfile, saving } = useProfile();

  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    parent_phone: profile?.parent_phone || ''
  });
  const [errors, setErrors] = useState({});

  if (!profile) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    errs.full_name = validateName(form.full_name);
    errs.phone = validatePhone(form.phone, { required: true });
    errs.parent_phone = validatePhone(form.parent_phone, { label: 'رقم ولي الأمر' });
    setErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const { error } = await saveProfile({
      full_name: form.full_name,
      phone: form.phone,
      parent_phone: form.parent_phone || null
    });
    if (!error) setErrors({});
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">ملفي الشخصي</h1>
        <p className="mt-1 text-sm text-muted">حدّث بياناتك — الصف والإيميل بيتقفلوا للأمان.</p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-4 rounded-lens bg-ink-900/50 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal/20 font-display text-xl font-black text-signal">
            {(profile.full_name || 'ط').slice(0, 1)}
          </div>
          <div>
            <p className="font-display text-lg font-bold text-paper">{profile.full_name}</p>
            <p className="text-sm text-muted">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            name="full_name"
            label="الاسم الكامل"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            error={errors.full_name}
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="phone"
              label="موبايل الطالب"
              dir="ltr"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              error={errors.phone}
              required
            />
            <Input
              name="parent_phone"
              label="موبايل ولي الأمر"
              dir="ltr"
              value={form.parent_phone}
              onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
              error={errors.parent_phone}
            />
          </div>
          <p className="rounded-lens bg-ink-800 px-3 py-2 text-xs text-muted">
            الصف: {GRADES_OPTIONS.find((g) => g.value === profile.grade)?.label} — لتغيير الصف تواصل مع الأدمن.
          </p>
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}