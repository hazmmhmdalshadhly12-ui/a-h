import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import {
  fetchMaterials,
  uploadMaterial,
  deleteMaterial,
  materialUrl,
  formatFileSize
} from '../../../services/materialService.js';
import { GRADES } from '../../../config/site.js';
import { GRADES_OPTIONS } from '../../../config/constants.js';
import { formatDate } from '../../../utils/formatDate.js';
import { getFriendlyError } from '../../../utils/errors.js';

const EMPTY_FORM = { title: '', description: '', grade: GRADES_OPTIONS[0].value, file: null };

/** مكتبة المذكرات والملفات — رفع PDF/صور لكل صف والطلاب ينزلوها */
export default function Materials() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = () =>
    fetchMaterials().then(({ data }) => {
      setItems(data || []);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const patch = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file) return toast.error('اختار الملف الأول');
    setUploading(true);
    const { error } = await uploadMaterial(form);
    setUploading(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل رفع الملف'));
    toast.success('تم رفع الملف — الطلاب شايفينه دلوقتي');
    setForm(EMPTY_FORM);
    load();
  };

  const handleDelete = async (item) => {
    if (!window.confirm('متأكد تمسح الملف ده؟ مش هيقدر يتحمل تاني.')) return;
    const { error } = await deleteMaterial(item);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم حذف الملف');
    load();
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="مكتبة المذكرات والملفات"
        subtitle="ارفع مذكرات ومراجعات (PDF أو صور) لكل صف — الطالب يشوف ملفات صفه فقط ويفتحها مباشرة"
      />

      {/* رفع ملف جديد */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold text-paper">رفع ملف جديد</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              name="title"
              label="عنوان المذكرة"
              placeholder="مثال: مراجعة الشهر الأول — أولى ثانوي"
              value={form.title}
              onChange={(e) => patch('title', e.target.value)}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-paper">الصف</label>
              <select
                name="grade"
                value={form.grade}
                onChange={(e) => patch('grade', e.target.value)}
                className="w-full rounded-lens border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm text-paper outline-none transition focus:border-signal/70 focus:ring-2 focus:ring-signal/20"
              >
                {GRADES_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-paper">وصف الملف (اختياري)</label>
            <textarea
              name="description"
              rows={2}
              dir="rtl"
              className="w-full rounded-lens border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm text-paper outline-none transition placeholder:text-muted/60 focus:border-signal/70 focus:ring-2 focus:ring-signal/20"
              placeholder="مثال: تشمل أسئلة الامتحان الأول بالإجابات"
              value={form.description}
              onChange={(e) => patch('description', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-paper">الملف (PDF أو صورة)</label>
            <input
              type="file"
              name="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx"
              onChange={(e) => patch('file', e.target.files?.[0] || null)}
              className="w-full rounded-lens border border-dashed border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-paper file:mr-3 file:rounded-lens file:border-0 file:bg-signal file:px-3 file:py-1.5 file:text-ink file:font-bold"
            />
          </div>
          <Button type="submit" loading={uploading}>
            رفع الملف
          </Button>
        </form>
      </Card>

      {/* قائمة الملفات */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-paper">الملفات ({items.length})</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : items.length === 0 ? (
          <Card className="py-8 text-center text-sm text-muted">مفيش ملفات لسه — ارفع أول مذكرة من فوق.</Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-paper">{item.title}</p>
                  {item.description && <p className="mt-0.5 text-sm text-muted">{item.description}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted/80">
                    <Badge color="muted">{GRADES[item.grade] || item.grade}</Badge>
                    <span>{item.file_name}</span>
                    {formatFileSize(item.file_size) && <span>• {formatFileSize(item.file_size)}</span>}
                    <span>• {formatDate(item.created_at)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <a href={materialUrl(item.file_path)} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <Icon name="download" className="h-4 w-4" />
                      فتح
                    </Button>
                  </a>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => handleDelete(item)}>
                    حذف
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}