import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import { GRADES_OPTIONS } from '../../config/constants.js';
import { toLocalInputValue } from '../../utils/formatTime.js';

export default function CompetitionForm({ initial, onSubmit, submitting }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    grade: 'first_secondary',
    deadline: toLocalInputValue(new Date(Date.now() + 7 * 86400000)),
    details: '',
    ...initial
  });

  const patch = (fields) => setForm((f) => ({ ...f, ...fields }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : null
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card-panel space-y-4 rounded-lens p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input name="title" label="عنوان المسابقة" required value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        <Select
          name="grade"
          label="الصف"
          value={form.grade}
          onChange={(e) => patch({ grade: e.target.value })}
          options={GRADES_OPTIONS}
          required
        />
      </div>
      <Textarea name="description" label="الوصف المختصر" rows={2} required value={form.description} onChange={(e) => patch({ description: e.target.value })} />
      <Input
        name="deadline"
        label="الموعد النهائي"
        type="datetime-local"
        value={form.deadline ? toLocalInputValue(form.deadline) : ''}
        onChange={(e) => patch({ deadline: e.target.value })}
        required
      />
      <Textarea name="details" label="التفاصيل الكاملة" rows={5} value={form.details} onChange={(e) => patch({ details: e.target.value })} />
      <div className="flex justify-end">
        <Button type="submit" loading={submitting}>حفظ المسابقة</Button>
      </div>
    </form>
  );
}