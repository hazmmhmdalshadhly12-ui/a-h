import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useCourse } from '../../hooks/useCourses.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { fetchPaymentMethods } from '../../services/paymentService.js';
import { createBooking } from '../../services/bookingService.js';
import { getFriendlyError } from '../../utils/errors.js';
import { GRADE_SHORT } from '../../config/site.js';
import { supabase } from '../../lib/supabaseClient.js';

export default function Checkout() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { course, loading } = useCourse(courseId, profile?.grade);
  const toast = useToast();
  const [methods, setMethods] = useState([]);
  const [form, setForm] = useState({ transfer_number: '', notes: '' });
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { fetchPaymentMethods().then(({ data }) => setMethods(data || [])); }, []);

  if (loading) return <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-32" /></div>;
  if (!course) return <Card className="py-10 text-center">الكورس غير موجود</Card>;

  const priceLabel = course.price != null && Number(course.price) > 0 ? `${course.price} جنيه` : 'مجاني';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.transfer_number.trim()) return toast.error('اكتب رقم التحويل');
    if (!proofFile) return toast.error('ارفع صورة إثبات التحويل — إجباري');
    setSubmitting(true);
    let proofUrl = null;
    if (proofFile) {
      const ext = proofFile.name.split('.').pop() || 'jpg';
      const path = `proofs/${profile.id}/${courseId}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('course-files').upload(path, proofFile, { cacheControl: '3600' });
      if (upErr) { setSubmitting(false); return toast.error('فشل رفع صورة التحويل'); }
      const { data } = supabase.storage.from('course-files').getPublicUrl(path);
      proofUrl = data.publicUrl;
    }
    const { error } = await createBooking({
      studentId: profile.id,
      courseId,
      fullName: profile.full_name,
      phone: profile.phone,
      parentPhone: profile.parent_phone,
      grade: course.grade,
      notes: proofUrl ? `${form.notes}\n[proof:${proofUrl}]` : form.notes,
      transferNumber: form.transfer_number.trim()
    });
    setSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل إرسال الطلب'));
    setDone(true);
    toast.success('تم إرسال طلبك — قيد المراجعة');
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"><Icon name="check" className="h-8 w-8" /></div>
        <h1 className="font-display text-2xl font-black">تم إرسال طلب الدفع</h1>
        <p className="text-sm text-muted">حجزك لـ <b className="text-paper">{course.title}</b> قيد المراجعة. ستظهر المتابعة في صفحة الحجوزات.</p>
        <div className="flex justify-center gap-2"><Link to="/student/bookings"><Button>حجوزاتي</Button></Link><Link to="/student/courses"><Button variant="secondary">الكورسات</Button></Link></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to={`/student/courses/${courseId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-paper"><Icon name="chevronRight" className="h-4 w-4" /> رجوع</Link>

      <Card className="overflow-hidden p-0">
        <div className="grid sm:grid-cols-5">
          <div className="sm:col-span-2">
            {course.image_url ? <img src={course.image_url} alt={course.title} className="h-full w-full object-cover" /> : <div className="flex h-48 items-center justify-center bg-ink-800"><Icon name="courses" className="h-12 w-12 text-muted" /></div>}
          </div>
          <div className="p-6 sm:col-span-3">
            <p className="text-xs text-muted">{GRADE_SHORT[course.grade]}</p>
            <h1 className="mt-1 font-display text-xl font-black">{course.title}</h1>
            {course.description && <p className="mt-2 text-sm leading-6 text-muted">{course.description}</p>}
            <div className="mt-4 flex items-center gap-2"><Badge color="stream">{priceLabel}</Badge><Badge color="muted">#{String(course.order_index || 1).padStart(2, '0')}</Badge></div>
          </div>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">بيانات الدفع</h2>
        <div className="rounded-lens border border-signal/30 bg-signal/5 p-4">
          <p className="text-sm font-bold text-paper">اختر طريقة الدفع وحول المبلغ:</p>
          <ul className="mt-3 space-y-2">
            {methods.length === 0 ? <li className="text-sm text-muted">لا توجد طرق دفع — تواصل مع الإدارة.</li> : methods.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-lens border border-ink-700 bg-ink-800 px-3 py-2 text-sm"><span className="font-semibold text-paper">{m.name}</span><span dir="ltr" className="font-mono text-signal">{m.details}</span></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">بعد التحويل اكتب رقم العملية/المحفظة اللي حولت منها.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="transfer_number" label="رقم التحويل / العملية *" placeholder="01xxxxxxxxx" value={form.transfer_number} onChange={(e) => setForm({ ...form, transfer_number: e.target.value })} required />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-paper">صورة إثبات التحويل *</label>
            <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="block w-full rounded-lens border border-ink-600 bg-ink-800 px-3 py-2 text-sm text-paper file:mr-3 file:rounded-lens file:border-0 file:bg-signal file:px-3 file:py-1.5 file:text-ink file:font-bold" required />
            <p className="mt-1 text-xs text-muted">صورة واضحة للإيصال — إجباري. لن يتم قبول الحجز بدونها.</p>
          </div>
          <Textarea name="notes" label="ملاحظات (اختياري)" placeholder="مثال: حولت الساعة 8 م" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
          <div className="rounded-lens bg-ink-800 p-3 text-xs leading-5 text-muted">الاسم: {profile.full_name} • الموبايل: {profile.phone} • ولي الأمر: {profile.parent_phone || '—'} — تُرسل تلقائياً من بروفايلك.</div>
          <Button type="submit" loading={submitting} className="w-full" size="lg">إرسال طلب الاشتراك</Button>
        </form>
      </Card>
    </div>
  );
}
