import { useState } from 'react';
import { useBookings } from '../../hooks/useBookings.js';
import BookingCard from '../../components/academy/BookingCard.jsx';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function Bookings() {
  const { bookings, loading, reload, requestBooking } = useBookings();
  const toast = useToast();
  const [form, setForm] = useState({ requested_datetime: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.requested_datetime) {
      toast.error('حدد ميعاد الحصة');
      return;
    }
    setSubmitting(true);
    const { error } = await requestBooking({
      requestedDatetime: new Date(form.requested_datetime).toISOString(),
      subject: 'cs',
      notes: form.notes
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || 'فشل الحجز');
      return;
    }
    toast.success('تم إرسال طلب الحجز — قيد مراجعة المستر');
    setForm({ requested_datetime: '', notes: '' });
    reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">الحجوزات</h1>
        <p className="mt-1 text-sm text-muted">
          احجز حصة وانتظر تأكيد المستر — الحالة بتتحدث تلقائياً.
        </p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">حجز حصة جديدة</h2>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input
            name="datetime"
            label="الميعاد المطلوب *"
            type="datetime-local"
            value={form.requested_datetime}
            onChange={(e) => setForm({ ...form, requested_datetime: e.target.value })}
            required
          />
          <Textarea
            name="notes"
            label="ملاحظات (اختياري)"
            rows={3}
            placeholder="مثال: عايز مراجعة على المصفوفات"
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