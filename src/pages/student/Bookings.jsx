import { useEffect, useState } from 'react';
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
import { getFriendlyError } from '../../utils/errors.js';
import { supabase } from '../../lib/supabaseClient.js';
import { fetchStudentCourses } from '../../services/courseService.js';
import { fetchPaymentMethods } from '../../services/paymentService.js';

export default function Bookings() {
  const { profile } = useAuth();
  const { bookings, loading, reload, requestBooking } = useBookings();
  const toast = useToast();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  const [form, setForm] = useState({
    course_id: '',
    notes: '',
    transfer_number: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const selectedCourse = courses.find((c) => (c.course_id || c.id) === form.course_id);
  const amount = selectedCourse?.price ?? null;
  const [payMethods, setPayMethods] = useState([]);

  useEffect(() => {
    if (!profile?.grade) return;
    fetchStudentCourses(profile.grade).then(({ data }) => {
      setCourses(data || []);
      setCoursesLoading(false);
    });
    fetchPaymentMethods().then(({ data }) => setPayMethods(data || []));
  }, [profile?.grade]);

  const bookedIds = new Set(bookings.filter((b) => b.status !== 'rejected' && b.course_id).map((b) => b.course_id));
  const availableCourses = courses.filter((c) => !bookedIds.has(c.course_id || c.id));
  const bookedCourses = courses.filter((c) => bookedIds.has(c.course_id || c.id));
  const courseOptions = availableCourses.map((c) => ({
    value: c.course_id || c.id,
    label: `${c.title} ${c.price ? `— ${c.price} جنيه` : ''}`
  }));

  const validate = () => {
    const errs = {};
    if (!form.course_id) errs.course_id = 'اختر الكورس';
    if (!form.transfer_number.trim()) errs.transfer_number = 'اكتب الرقم اللي حولت منه';
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (!showPayment) {
      setShowPayment(true);
      return;
    }

    setSubmitting(true);
    const { error } = await requestBooking({
      fullName: profile.full_name,
      phone: profile.phone,
      parentPhone: profile.parent_phone,
      grade: selectedCourse?.grade || profile.grade,
      courseId: form.course_id,
      month: null,
      notes: form.notes,
      transferNumber: form.transfer_number.trim()
    });
    setSubmitting(false);
    if (error) {
      toast.error(getFriendlyError(error, 'فشل الحجز'));
      return;
    }
    // إرسال إشعار للمستر
    try {
      await supabase.functions.invoke('send-booking-email', {
        body: {
          bookingData: { grade: selectedCourse?.grade || profile.grade, course_id: form.course_id, notes: form.notes, transfer_number: form.transfer_number.trim(), month: null },
          studentData: { full_name: profile.full_name, phone: profile.phone, parent_phone: profile.parent_phone }
        }
      });
    } catch {}
    toast.success('تم إتمام الطلب — قيد مراجعة المستر');
    setShowPayment(false);
    setForm({ course_id: '', notes: '', transfer_number: '' });
    reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">الحجوزات</h1>
        <p className="mt-1 text-sm text-muted">احجز كورساً محدداً وانتظر تأكيد المستر — كل كورس باشتراك منفصل.</p>
      </div>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">حجز كورس جديد</h2>
        {bookedCourses.length > 0 && (
          <div className="rounded-lens border border-success/30 bg-success/10 p-3">
            <p className="text-sm font-bold text-success">✓ كورسات مشترك فيها:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {bookedCourses.map((c) => (
                <span key={c.course_id || c.id} className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">✓ {c.title}</span>
              ))}
            </div>
          </div>
        )}

        {selectedCourse && payMethods.length > 0 && (
          <div className="rounded-lens border border-signal/40 bg-signal/10 p-4">
            <h3 className="font-display text-base font-black text-paper">رسالة الدفع 💳</h3>
            <p className="mt-1 text-sm text-paper/90">حوّل <b>{amount ? `${amount} جنيه` : 'المبلغ المحدد'}</b> لكورس <b>{selectedCourse.title}</b> على إحدى الطرق:</p>
            <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm leading-relaxed text-paper/90">
              {payMethods.map((m) => (
                <li key={m.id}>
                  {m.name}: <b dir="ltr" className="font-mono">{m.details}</b>
                </li>
              ))}
            </ul>
          </div>
        )}

        {coursesLoading ? (
          <Skeleton className="h-20" />
        ) : availableCourses.length === 0 && bookedCourses.length === 0 ? (
          <p className="text-sm text-muted">لا توجد كورسات متاحة لصفك حالياً</p>
        ) : availableCourses.length === 0 ? (
          <p className="text-sm text-success">✓ أنت مشترك في كل الكورسات المتاحة</p>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select
                name="course_id"
                label="اختر الكورس *"
                value={form.course_id}
                onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                options={courseOptions}
                placeholder="— اختر كورس —"
                error={errors.course_id}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                name="transfer_number"
                label="الرقم اللي حولت منه *"
                dir="ltr"
                placeholder="01xxxxxxxxx"
                value={form.transfer_number}
                onChange={(e) => setForm({ ...form, transfer_number: e.target.value })}
                error={errors.transfer_number}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                name="notes"
                label="ملاحظات (اختياري)"
                rows={2}
                placeholder="مثال: مفضل الحضور يوم السبت"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={submitting}>
                {showPayment ? 'إتمام الطلب' : 'عرض بيانات الدفع'}
              </Button>
            </div>
          </form>
        )}

        {showPayment && (
          <p className="text-xs text-muted">بعد التحويل اضغط "إتمام الطلب" وانتظر المستر يؤكد اشتراكك.</p>
        )}
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
