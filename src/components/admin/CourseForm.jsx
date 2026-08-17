import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import { GRADES_OPTIONS } from '../../config/constants.js';

/** فورم كورس مبسّط — إنشاء بالاسم فقط + النوع (أولى/تانية/احترافي) + سعر (للمحترف).
 *  باقي المحتوى (محاضرات/واجبات/ملفات/تعليقات) بتتدار من صفحة إدارة الكورس. */
export default function CourseForm({ initial, onSubmit, submitting }) {
  const [form, setForm] = useState({
    title: '',
    grade: 'first_secondary',
    price: '',
    ...initial
  });

  const patch = (fields) => setForm((f) => ({ ...f, ...fields }));

  const isProfessional = form.grade === 'professional';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      price: isProfessional && form.price ? Number(form.price) : null
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

      {isProfessional && (
        <Input
          name="price"
          label="سعر الكورس الاحترافي (جنيه)"
          type="number"
          min="0"
          placeholder="مثال: 300"
          value={form.price}
          onChange={(e) => patch({ price: e.target.value })}
        />
      )}

      <p className="rounded-lens bg-ink-800 px-3 py-2 text-xs text-muted">
        بعد الإنشاء، افتح «إدارة المحتوى» عشان تضيف المحاضرات والواجبات والملفات — والتعليقات بتظهر للطلاب جوه الدرس.
      </p>

      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>حفظ الدرس</Button>
      </div>
    </form>
  );
}