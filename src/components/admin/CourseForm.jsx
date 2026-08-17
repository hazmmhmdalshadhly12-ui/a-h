import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import { GRADES_OPTIONS } from '../../config/constants.js';

/** فورم كورس — بيستخدم في الإنشاء والتعديل.
 *  الصورة: بتتخزن كرابط مباشر (Image URL) عشان يظهرلها في بطاقة الكورس.
 *  القسم: اختياري — جوه الأقسام اللي المستر ينشئها.
 */
export default function CourseForm({ initial, onSubmit, submitting, sections = [] }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    grade: 'first_secondary',
    video_url: '',
    image_url: '',
    section_id: '',
    order_index: 1,
    ...initial
  });

  const patch = (fields) => setForm((f) => ({ ...f, ...fields }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      order_index: Number(form.order_index) || 1,
      section_id: form.section_id || null
    });
  };

  const sectionOptions = [
    { value: '', label: 'بدون قسم' },
    ...sections.map((s) => ({ value: s.id, label: `${s.title} (${s.grade === 'second_secondary' ? 'ثانية' : 'أولى'})` }))
  ];

  return (
    <form onSubmit={handleSubmit} className="card-panel space-y-4 rounded-lens p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="title" label="عنوان الدرس" required value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        <Select
          name="grade"
          label="الصف"
          value={form.grade}
          onChange={(e) => patch({ grade: e.target.value })}
          options={GRADES_OPTIONS}
          required
        />
      </div>
      <Textarea name="description" label="الوصف" rows={3} value={form.description} onChange={(e) => patch({ description: e.target.value })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="video_url"
          label="رابط الفيديو (YouTube embed)"
          placeholder="https://www.youtube.com/embed/..."
          dir="ltr"
          value={form.video_url}
          onChange={(e) => patch({ video_url: e.target.value })}
        />
        <Input
          name="image_url"
          label="رابط صورة الكورس"
          placeholder="https://example.com/image.jpg"
          dir="ltr"
          value={form.image_url}
          onChange={(e) => patch({ image_url: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="section_id"
          label="القسم"
          value={form.section_id || ''}
          onChange={(e) => patch({ section_id: e.target.value })}
          options={sectionOptions}
        />
        <Input
          name="order_index"
          label="الترتيب"
          type="number"
          min="1"
          value={form.order_index}
          onChange={(e) => patch({ order_index: e.target.value })}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>حفظ الدرس</Button>
      </div>
    </form>
  );
}