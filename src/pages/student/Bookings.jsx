import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useBookings } from '../../hooks/useBookings.js';
import BookingCard from '../../components/academy/BookingCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { GRADES_OPTIONS } from '../../config/constants.js';
import { validateName, validatePhone } from '../../utils/validators.js';
import { getFriendlyError } from '../../utils/errors.js';

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Bookings() {
  const { profile } = useAuth();
  const { bookings, loading, reload, requestBooking } = useBookings();
  const toast = useToast();

  // بيملى من البروفايل — الطالب بيأكد بياناته وبيختار الشهر
  const [form, setForm] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    parent_phone: profile?.parent_phone || '',
    grade: profile?.grade || 'first_secondary',
    month: currentMonth(),
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const errs = {};
    errs.full_name = validateName(form.full_name);
    errs.phone = validatePhone(form.phone, { required: true });
    errs.parent_phone = validatePhone(form.parent_phone, { label: 'رقم ولي الأمر' });
    if (!form.month) errs.month = 'اختر شهر الحجز';
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await requestBooking({
      fullName: form.full_name,
      phone: form.phone,
      parentPhone: form.parent_phone,
      grade: form.grade,
      month: form.month,
      notes: form.notes
    });
    setSubmitting(false);
    if (error) {
      toast.error(getFriendlyError(error, 'فشل الحجز'));
      return;
    }
    toast.success('تم إرسال طلب الحجز الشهري — قيد مراجعة المستر');
    reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">الحجوزات</h1>
        <p className="mt-1 text-sm text-muted">
          سجّل اشتراكك الشهري وانتظر تأكيد المستر — الحالة بتتحدث تلقائياً.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">حجز شهر جديد</h2>
        <p className="rounded-lens bg-ink-800 px-3 py-2 text-xs text-muted">
          بياناتك دي بتتسجل في الحجز لتأكيد هويتك — راجعها قبل الإرسال.
        </p>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input
            name="full_name"
            label="الاسم الكامل *"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            error={errors.full_name}
            required
          />
          <Input
            name="phone"
            label="رقم موبايل الطالب *"
            dir="ltr"
            placeholder="01xxxxxxxxx"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            error={errors.phone}
            required
          />
          <Input
            name="parent_phone"
            label="رقم ولي الأمر *"
            dir="ltr"
            placeholder="01xxxxxxxxx"
            value={form.parent_phone}
            onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
            error={errors.parent_phone}
            required
          />
          <Select
            name="grade"
            label="الصف الدراسي *"
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            options={GRADES_OPTIONS}
            required
          />
          <Input
            name="month"
            label="شهر الحجز *"
            type="month"
            value={form.month}
            onChange={(e) => setForm({ ...form, month: e.target.value })}
            error={errors.month}
            required
          />
          <Textarea
            name="notes"
            label="ملاحظات (اختياري)"
            rows={2}
            placeholder="مثال: مفضل الحضور يوم السبت"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="sm:col-span-2">
            <Button type="submit" loading={submitting}>
              إرسال طلب الحجز
            </Button>
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">حجوزاتي</h2>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState icon="bookings" title="لا توجد حجوزات" description="أول حجز ليك هيظهر هنا." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}