import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { isSupabaseConfigured } from '../../../lib/supabaseClient.js';
import { SITE } from '../../../config/site.js';
import { supabase } from '../../../lib/supabaseClient.js';
import { fetchAllPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from '../../../services/paymentService.js';

export default function Settings() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState([]);
  const [mForm, setMForm] = useState({ name: '', details: '', type: 'instapay', order_index: 0, is_active: true });
  const [editingM, setEditingM] = useState(null);

  useEffect(() => {
    loadEmail();
    loadMethods();
  }, []);

  const loadMethods = async () => {
    const { data } = await fetchAllPaymentMethods();
    setMethods(data || []);
  };
  const saveMethod = async (e) => {
    e.preventDefault();
    if (!mForm.name.trim() || !mForm.details.trim()) return toast.error('الاسم والتفاصيل مطلوبين');
    const payload = { name: mForm.name.trim(), details: mForm.details.trim(), type: mForm.type, order_index: Number(mForm.order_index) || 0, is_active: !!mForm.is_active };
    const { error } = editingM ? await updatePaymentMethod(editingM, payload) : await createPaymentMethod(payload);
    if (error) return toast.error('فشل الحفظ');
    toast.success(editingM ? 'تم التحديث' : 'تمت الإضافة');
    setMForm({ name: '', details: '', type: 'instapay', order_index: 0, is_active: true });
    setEditingM(null);
    loadMethods();
  };
  const editM = (m) => { setEditingM(m.id); setMForm({ name: m.name, details: m.details, type: m.type, order_index: m.order_index, is_active: m.is_active }); };
  const delM = async (id) => { if (!confirm('حذف طريقة الدفع؟')) return; const { error } = await deletePaymentMethod(id); if (error) return toast.error('فشل الحذف'); toast.success('تم الحذف'); loadMethods(); };

  const loadEmail = async () => {
    const { data } = await supabase.from('admin_settings').select('notification_email').eq('id', 1).maybeSingle();
    if (data?.notification_email) setEmail(data.notification_email);
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (email && !email.includes('@')) {
      toast.error('الإيميل غير صالح');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('admin_settings')
      .upsert({ id: 1, notification_email: email.trim() || null });
    setSaving(false);
    if (error) return toast.error('فشل الحفظ');
    toast.success('تم حفظ إيميل الإشعارات');
  };

  const rows = [
    { icon: 'dashboard', label: 'اسم الأكاديمية', value: SITE.name },
    { icon: 'eye', label: 'الشعار', value: SITE.tagline },
    { icon: 'user', label: 'المدرس', value: SITE.instructor.title },
    { icon: 'info', label: 'قاعدة البيانات', value: isSupabaseConfigured ? 'Supabase متصل' : 'Supabase غير مظبوط (وضع العرض)' }
  ];

  return (
    <div className="space-y-6">
      <AdminHeader title="الإعدادات" subtitle="معلومات عامة عن الأكاديمية وإيميل إشعارات الحجوزات" />

      <Card className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 border-b border-ink-700/60 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lens bg-ink-700 text-muted">
                <Icon name={r.icon} className="h-5 w-5" />
              </div>
              <p className="font-medium text-paper">{r.label}</p>
            </div>
            <Badge color={isSupabaseConfigured && r.label.includes('قاعدة') ? 'success' : 'muted'}>{r.value}</Badge>
          </div>
        ))}
      </Card>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <h2 className="mb-2 font-display text-lg font-bold">إيميل إشعارات الحجز</h2>
          <p className="text-sm text-muted">هنا هتوصلك رسالة بكل طلب حجز جديد من الطلاب.</p>
          <Input
            name="notification_email"
            type="email"
            label="إيميل المستر"
            placeholder="teacher@example.com"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={saving}>حفظ الإيميل</Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">طرق الدفع</h2>
        <p className="text-sm text-muted">أضف/عدل طرق الدفع اللي تظهر للطالب في صفحة الحجز. الطالب يختار الطريقة ويحول عليها.</p>
        <form onSubmit={saveMethod} className="grid gap-3 sm:grid-cols-2 border-b border-ink-700 pb-4">
          <Input name="m_name" label="الاسم *" placeholder="مثال: انستاباي" value={mForm.name} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} required />
          <Input name="m_details" label="التفاصيل *" placeholder="رقم المحفظة/ الحساب" value={mForm.details} onChange={(e) => setMForm({ ...mForm, details: e.target.value })} required />
          <Select name="m_type" label="النوع" value={mForm.type} onChange={(e) => setMForm({ ...mForm, type: e.target.value })} options={[{ value: 'instapay', label: 'انستاباي' }, { value: 'vodafone_cash', label: 'فودافون كاش' }, { value: 'fawry', label: 'فوري' }, { value: 'bank', label: 'تحويل بنكي' }, { value: 'other', label: 'أخرى' }]} />
          <Input name="m_order" label="الترتيب" type="number" value={mForm.order_index} onChange={(e) => setMForm({ ...mForm, order_index: e.target.value })} />
          <label className="flex items-center gap-2 self-end pb-2"><input type="checkbox" checked={mForm.is_active} onChange={(e) => setMForm({ ...mForm, is_active: e.target.checked })} className="h-4 w-4 accent-signal" /> نشط</label>
          <div className="sm:col-span-2 flex gap-2"><Button type="submit">{editingM ? 'تحديث' : 'إضافة'}</Button>{editingM && <Button type="button" variant="secondary" onClick={() => { setEditingM(null); setMForm({ name: '', details: '', type: 'instapay', order_index: 0, is_active: true }); }}>إلغاء</Button>}</div>
        </form>
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded-lens border border-ink-700 bg-ink-800 px-3 py-2">
              <div><p className="font-semibold text-paper">{m.name} <Badge color={m.is_active ? 'success' : 'muted'}>{m.is_active ? 'نشط' : 'موقف'}</Badge></p><p className="text-xs text-muted" dir="ltr">{m.details} • {m.type}</p></div>
              <div className="flex gap-1"><Button size="xs" variant="secondary" onClick={() => editM(m)}>تعديل</Button><Button size="xs" variant="danger" onClick={() => delM(m.id)}>حذف</Button></div>
            </div>
          ))}
          {methods.length === 0 && <p className="text-center text-sm text-muted">لا توجد طرق دفع — أضف واحدة.</p>}
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">ملاحظات تقنية</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>• الاسم والوصف والمدرس بيتظبطوا من <code className="code-chip">src/config/site.js</code></li>
          <li>• روابط التواصل بتتعدل من لوحة الأدمن → روابط التواصل (بتحفظ في قاعدة البيانات)</li>
          <li>• تظبيط الشات بوت: Supabase → Edge Functions → Set secrets (OPENAI_API_KEY)</li>
          <li>• أمان الامتحانات: محاولة واحدة لكل طالب مفروضة بـ unique constraint + RPC على السيرفر</li>
        </ul>
      </Card>
    </div>
  );
}