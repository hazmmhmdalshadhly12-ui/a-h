import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { supabase } from '../../../lib/supabaseClient.js';
import { QUESTION_TYPES } from '../../../config/constants.js';

export default function HomeworkQuestions() {
  const { homeworkId } = useParams();
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ question_text: '', type: 'mcq', options: ['', ''], correct_answer: '', points: 1, order_index: 1 });
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    const { data } = await supabase.from('homework_questions').select('*').eq('homework_id', homeworkId).order('order_index');
    setQuestions(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [homeworkId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.question_text.trim()) return toast.error('اكتب نص السؤال');
    const payload = { homework_id: homeworkId, question_text: form.question_text.trim(), type: form.type, options: form.type === 'mcq' ? form.options.filter(Boolean) : null, correct_answer: form.correct_answer, points: Number(form.points) || 1, order_index: Number(form.order_index) || 1 };
    const { error } = editingId ? await supabase.from('homework_questions').update(payload).eq('id', editingId) : await supabase.from('homework_questions').insert(payload);
    if (error) return toast.error('فشل الحفظ');
    toast.success(editingId ? 'تم التحديث' : 'تمت الإضافة');
    setForm({ question_text: '', type: 'mcq', options: ['', ''], correct_answer: '', points: 1, order_index: questions.length + 1 });
    setEditingId(null);
    load();
  };
  const editQ = (q) => { setEditingId(q.id); setForm({ question_text: q.question_text, type: q.type, options: q.options || ['', ''], correct_answer: q.correct_answer || '', points: q.points, order_index: q.order_index }); };
  const delQ = async (id) => { if (!confirm('حذف السؤال؟')) return; const { error } = await supabase.from('homework_questions').delete().eq('id', id); if (error) return toast.error('فشل الحذف'); toast.success('تم الحذف'); load(); };

  return (
    <div className="space-y-6">
      <AdminHeader title="أسئلة الواجب" subtitle="إضافة / تعديل / حذف أسئلة الواجب الإلكتروني — مثل الامتحانات" actions={<Link to={`/admin/courses`}><Button size="sm" variant="secondary">الكورسات</Button></Link>} />
      <Card className="space-y-4">
        <h3 className="font-bold">{editingId ? 'تعديل سؤال' : 'إضافة سؤال'}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea label="نص السؤال *" value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} required />
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={Object.values(QUESTION_TYPES)} />
            <Input label="الدرجة" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} />
            <Input label="الترتيب" type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: e.target.value })} />
          </div>
          {form.type === 'mcq' && (
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder={`اختيار ${i + 1}`} value={opt} onChange={(e) => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }); }} />
                  <Button type="button" variant="ghost" onClick={() => setForm({ ...form, options: form.options.filter((_, idx) => idx !== i) })}>حذف</Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={() => setForm({ ...form, options: [...form.options, ''] })}>إضافة اختيار</Button>
            </div>
          )}
          <Input label="الإجابة الصحيحة *" value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} placeholder={form.type === 'true_false' ? 'true أو false' : 'نص الإجابة'} required />
          <div className="flex gap-2"><Button type="submit">{editingId ? 'تحديث' : 'إضافة'}</Button>{editingId && <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm({ question_text: '', type: 'mcq', options: ['', ''], correct_answer: '', points: 1, order_index: questions.length + 1 }); }}>إلغاء</Button>}</div>
        </form>
      </Card>
      <Card>
        <h3 className="mb-3 font-bold">الأسئلة ({questions.length})</h3>
        {loading ? <p className="text-muted">جارٍ التحميل...</p> : questions.length === 0 ? <p className="text-muted">لا توجد أسئلة</p> : (
          <div className="space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-lens border border-ink-700 p-3">
                <div><p className="font-semibold">{q.question_text}</p><p className="text-xs text-muted">{QUESTION_TYPES[q.type]?.label} • {q.points} درجات • الصحيح: {q.correct_answer}</p></div>
                <div className="flex gap-1"><Button size="xs" variant="secondary" onClick={() => editQ(q)}>تعديل</Button><Button size="xs" variant="danger" onClick={() => delQ(q.id)}>حذف</Button></div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
