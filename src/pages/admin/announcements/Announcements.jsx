import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import {
  fetchAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  togglePinAnnouncement,
  deleteAnnouncement
} from '../../../services/announcementService.js';
import { formatDate } from '../../../utils/formatDate.js';
import { getFriendlyError } from '../../../utils/errors.js';
import { cn } from '../../../lib/utils.js';

const EMPTY_FORM = { title: '', body: '', isPinned: false };

/** إدارة إعلانات المنصة — بتظهر في لوحة الطالب + إشعار لكل طالب تلقائياً */
export default function Announcements() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const load = () =>
    fetchAnnouncements().then(({ data }) => {
      setItems(data || []);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) return toast.error('اكتب عنوان الإعلان الأول');
    setSaving(true);
    const { error } = editingId
      ? await updateAnnouncement(editingId, form)
      : await createAnnouncement(form);
    setSaving(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل حفظ الإعلان'));
    toast.success(editingId ? 'تم تحديث الإعلان' : 'تم نشر الإعلان — كل الطلاب هيوصله إشعار الآن');
    setForm(EMPTY_FORM);
    setEditingId(null);
    load();
  };

  const handlePin = async (item) => {
    const { error } = await togglePinAnnouncement(item.id, !item.is_pinned);
    if (error) return toast.error(getFriendlyError(error, 'فشل التثبيت'));
    toast.success(item.is_pinned ? 'تم إلغاء التثبيت' : 'تم تثبيت الإعلان — هيكون في الأول');
    load();
  };

  const handleDelete = async (item) => {
    if (!window.confirm('متأكد تمسح الإعلان ده؟')) return;
    const { error } = await deleteAnnouncement(item.id);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم حذف الإعلان');
    if (editingId === item.id) {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    load();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ title: item.title, body: item.body || '', isPinned: item.is_pinned });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="الإعلانات"
        subtitle="انشر إعلان يظهر في لوحة كل الطلاب + هيوصلهم إشعار تلقائياً (عناوين مهمة، مواعيد، جوائز...)"
      />

      {/* نموذج جديد / تعديل */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold text-paper">
          {editingId ? 'تعديل الإعلان' : 'إعلان جديد'}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            name="title"
            label="عنوان الإعلان"
            placeholder="مثال: امتحان الشهر الجاي يوم الأحد"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-paper">محتوى الإعلان</label>
            <textarea
              name="body"
              rows={3}
              dir="rtl"
              className="w-full rounded-lens border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm text-paper outline-none transition placeholder:text-muted/60 focus:border-signal/70 focus:ring-2 focus:ring-signal/20"
              placeholder="اكتب تفاصيل الإعلان هنا (اختياري)"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-paper">
            <input
              type="checkbox"
              checked={form.isPinned}
              onChange={(e) => setForm((f) => ({ ...f, isPinned: e.target.checked }))}
              className="h-4 w-4 accent-signal"
            />
            <Icon name="pin" className="h-4 w-4 text-muted" />
            تثبيت في الأول (مهم / عاجل)
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={saving}>
              {editingId ? 'حفظ التعديل' : 'نشر الإعلان'}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                إلغاء
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* القائمة */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-paper">الإعلانات المنشورة ({items.length})</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : items.length === 0 ? (
          <Card className="py-8 text-center text-sm text-muted">مفيش إعلانات لسه — انشر أول إعلان من فوق.</Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {item.is_pinned && (
                      <Icon name="pin" className="h-4 w-4 shrink-0 text-signal" />
                    )}
                    <p className="font-display font-bold text-paper">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handlePin(item)}>
                      {item.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                      تعديل
                    </Button>
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => handleDelete(item)}>
                      حذف
                    </Button>
                  </div>
                </div>
                {item.body && <p className={cn('text-sm text-muted', !item.is_pinned && 'text-paper/90')}>{item.body}</p>}
                <p className="text-xs text-muted/70">
                  {formatDate(item.created_at)} • {item.author?.full_name || 'المستر'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}