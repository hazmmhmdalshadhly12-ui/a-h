import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { GRADES_OPTIONS } from '../../config/constants.js';
import { supabase } from '../../lib/supabaseClient.js';
import { useToast } from '../ui/Toast.jsx';

/** فورم كورس مبسّط — إنشاء بالاسم فقط + النوع (أولى/تانية/احترافي) + سعر (للمحترف).
 *  باقي المحتوى (محاضرات/واجبات/ملفات/تعليقات) بتتدار من صفحة إدارة الكورس. */
export default function CourseForm({ initial, onSubmit, submitting }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    grade: 'first_secondary',
    price: '',
    is_published: true,
    image_url: '',
    ...initial
  });
  const [uploading, setUploading] = useState(false);
  const patch = (fields) => setForm((f) => ({ ...f, ...fields }));
  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('اختر صورة فقط');
    if (file.size > 4 * 1024 * 1024) return toast.error('الحجم الأقصى 4 ميجا');
    setUploading(true);
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `course-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('course-files').upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) { setUploading(false); return toast.error('فشل رفع الصورة'); }
    const { data } = supabase.storage.from('course-files').getPublicUrl(path);
    patch({ image_url: data.publicUrl });
    setUploading(false);
    toast.success('تم رفع الصورة');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description?.trim() || null,
      grade: form.grade,
      price: form.price !== '' ? Number(form.price) : null,
      is_published: !!form.is_published,
      image_url: form.image_url || null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel space-y-4 rounded-lens p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="title"
          label="اسم الدرس *"
          placeholder="مثال: المستوى الأول — أساسيات البرمجة"
          value={form.title}
          onChange={(e) => patch({ title: e.target.value })}
          required
        />
        <Select
          name="grade"
          label="النوع"
          value={form.grade}
          onChange={(e) => patch({ grade: e.target.value })}
          options={GRADES_OPTIONS}
          required
        />
      </div>

      <Input
        name="price"
        label="سعر الكورس (جنيه) — اتركه فاضي لو مجاني"
        type="number"
        min="0"
        placeholder="مثال: 150"
        value={form.price}
        onChange={(e) => patch({ price: e.target.value })}
      />
      <Input
        name="description"
        label="وصف مختصر (اختياري)"
        placeholder="مثال: شرح منهج أولى ثانوي كامل"
        value={form.description}
        onChange={(e) => patch({ description: e.target.value })}
      />
      <div className="rounded-lens border border-ink-600 bg-ink-900 p-3">
        <p className="mb-2 text-sm font-semibold text-paper">صورة الكورس</p>
        {form.image_url && <img src={form.image_url} alt="معاينة" className="mb-2 h-36 w-full rounded-lens object-cover" />}
        <input type="file" accept="image/*" onChange={handleImage} disabled={uploading} className="block w-full text-sm text-muted file:mr-3 file:rounded-lens file:border-0 file:bg-signal file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-ink" />
        {uploading && <p className="mt-2 text-xs text-signal">جارٍ الرفع...</p>}
        <Input name="image_url" label="أو رابط صورة مباشر" placeholder="https://..." value={form.image_url} onChange={(e) => patch({ image_url: e.target.value })} className="mt-2" />
      </div>
      <label className="flex items-center gap-2 rounded-lens border border-ink-600 bg-ink-800 px-3 py-2.5">
        <input type="checkbox" checked={!!form.is_published} onChange={(e) => patch({ is_published: e.target.checked })} className="h-4 w-4 accent-signal" />
        <span className="text-sm font-semibold text-paper">منشور للطلاب</span>
        <span className="text-xs text-muted">— لو مقفول الطالب مش هيشوفه</span>
      </label>

      <p className="rounded-lens bg-ink-800 px-3 py-2 text-xs text-muted">
        بعد الإنشاء، افتح «إدارة المحتوى» عشان تضيف المحاضرات والواجبات والملفات — والتعليقات بتظهر للطلاب جوه الدرس.
      </p>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>حفظ الدرس</Button>
      </div>
    </form>
  );
}