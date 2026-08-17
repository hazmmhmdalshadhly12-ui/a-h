import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import DataTable from '../../../components/admin/DataTable.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchSections, createSection, updateSection, deleteSection } from '../../../services/sectionService.js';
import { GRADES_OPTIONS } from '../../../config/constants.js';
import { GRADES } from '../../../config/site.js';
import { getFriendlyError } from '../../../utils/errors.js';

/** إدارة أقسام الكورسات — القسم بيجمع الكورسات اللي جواه */
export default function Sections() {
  const toast = useToast();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', grade: 'first_secondary', order_index: 1 });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    const { data } = await fetchSections();
    setSections(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', grade: 'first_secondary', order_index: 1 });
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ title: s.title || '', grade: s.grade || 'first_secondary', order_index: s.order_index || 1 });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('اكتب اسم القسم');
    setSubmitting(true);
    const payload = { title: form.title.trim(), grade: form.grade, order_index: Number(form.order_index) || 1 };
    const { error } = editing
      ? await updateSection(editing.id, payload)
      : await createSection(payload);
    setSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editing ? 'تم تحديث القسم' : 'تم إنشاء القسم');
    setShowForm(false);
    load();
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`حذف قسم "${s.title}"؟ الكورسات بتاعته هتفضل موجودة بس من غير قسم.`)) return;
    const { error } = await deleteSection(s.id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    load();
  };

  const columns = [
    { key: 'title', label: 'اسم القسم', render: (s) => <span className="font-semibold text-paper">{s.title}</span> },
    { key: 'grade', label: 'الصف', render: (s) => <Badge color="muted">{GRADES[s.grade] || s.grade}</Badge> },
    { key: 'order', label: 'الترتيب', render: (s) => <span className="font-mono text-muted">{s.order_index}</span> },
    {
      key: 'actions',
      label: 'إجراءات',
      render: (s) => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
            <Icon name="edit" className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(s)}>
            <Icon name="trash" className="h-3.5 w-3.5" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="أقسام الكورسات"
        subtitle="قسم بيجمع كورسات مع بعض — مثلاً: أساسيات، برمجة، قواعد بيانات"
        actions={
          <Button size="sm" onClick={openNew}>
            <Icon name="plus" className="h-4 w-4" /> قسم جديد
          </Button>
        }
      />

      {showForm && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">{editing ? 'تعديل القسم' : 'قسم جديد'}</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <Input
              name="title"
              label="اسم القسم *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Select
              name="grade"
              label="الصف"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
              options={GRADES_OPTIONS}
              required
            />
            <Input
              name="order_index"
              label="الترتيب"
              type="number"
              min="1"
              value={form.order_index}
              onChange={(e) => setForm({ ...form, order_index: e.target.value })}
            />
            <div className="flex items-end gap-2">
              <Button type="submit" loading={submitting}>{editing ? 'حفظ التعديلات' : 'إنشاء القسم'}</Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-muted">جارٍ التحميل...</p>
      ) : (
        <DataTable columns={columns} rows={sections} emptyMessage="لا توجد أقسام — أنشئ أول قسم" />
      )}
    </div>
  );
}