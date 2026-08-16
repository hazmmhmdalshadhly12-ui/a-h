import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import DataTable from '../../../components/admin/DataTable.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { fetchExamQuestions, deleteQuestion } from '../../../services/examService.js';
import { useToast } from '../../../components/ui/Toast.jsx';
import { QUESTION_TYPES } from '../../../config/constants.js';

export default function ExamQuestions() {
  const { examId } = useParams();
  const toast = useToast();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await fetchExamQuestions(examId);
    setQuestions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [examId]);

  const handleDelete = async (id) => {
    if (!window.confirm('حذف هذا السؤال؟')) return;
    const { error } = await deleteQuestion(id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    load();
  };

  const columns = [
    {
      key: 'question',
      label: 'السؤال',
      render: (q) => <span className="font-medium text-paper">{q.question_text}</span>
    },
    {
      key: 'type',
      label: 'النوع',
      render: (q) => <Badge color="muted">{QUESTION_TYPES[q.type]?.label || q.type}</Badge>
    },
    { key: 'points', label: 'الدرجة', render: (q) => <span className="font-mono text-stream">{q.points}</span> },
    {
      key: 'correct',
      label: 'الإجابة الصحيحة',
      render: (q) =>
        q.type === 'short_answer' ? (
          <span className="text-warning">مقالي</span>
        ) : (
          <span className="font-mono text-muted">{q.type === 'true_false' ? (q.correct_answer === 'true' ? 'صح' : 'غلط') : q.correct_answer}</span>
        )
    },
    {
      key: 'actions',
      label: '',
      render: (q) => (
        <Button size="sm" variant="danger" onClick={() => handleDelete(q.id)}>
          <Icon name="trash" className="h-3.5 w-3.5" />
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="أسئلة الامتحان"
        subtitle="الإجابات الصحيحة مخفية عن الطلاب تماماً (الوصول من السيرفر فقط)"
        actions={
          <Link to={`/admin/exams/${examId}`}>
            <Button size="sm" variant="secondary">
              <Icon name="edit" className="h-4 w-4" /> تعديل من محرر الأسئلة
            </Button>
          </Link>
        }
      />
      {loading ? (
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      ) : (
        <DataTable columns={columns} rows={questions} emptyMessage="لا توجد أسئلة" />
      )}
    </div>
  );
}