import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import ExamBuilder from '../../../components/admin/ExamBuilder.jsx';
import Card from '../../../components/ui/Card.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchExamById, fetchExamQuestions, saveExam } from '../../../services/examService.js';
import { fetchSubmissionsForExam } from '../../../services/submissionService.js';
import { getFriendlyError } from '../../../utils/errors.js';

export default function EditExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchExamById(examId), fetchExamQuestions(examId), fetchSubmissionsForExam(examId)]).then(
      ([e, q, s]) => {
        if (!active) return;
        setExam(e.data);
        setQuestions(q.data || []);
        setSubmissionsCount((s.data || []).length);
        setLoading(false);
      }
    );
    return () => {
      active = false;
    };
  }, [examId]);

  // تعديل الامتحان وأسئلته في معاملة واحدة (RPC ذرية) —
  // الأسئلة القديمة تتحدث بنفس معرفاتها حتى لا تنكسر مراجعة التسليمات.
  const handleSubmit = async (payload) => {
    const { questions: newQuestions, ...updates } = payload;
    setSubmitting(true);
    const { error } = await saveExam({ ...updates, id: examId, questions: newQuestions });
    setSubmitting(false);
    if (error) {
      toast.error(getFriendlyError(error, 'فشل حفظ الامتحان'));
      return;
    }
    toast.success('تم تحديث الامتحان');
    navigate('/admin/exams');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <AdminHeader title="تعديل الامتحان" />
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="mx-auto max-w-4xl">
        <AdminHeader title="تعديل الامتحان" />
        <Card className="text-center text-danger">الامتحان غير موجود.</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <AdminHeader title="تعديل الامتحان" subtitle={exam.title} />
      {submissionsCount > 0 && (
        <p className="rounded-lens border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          هذا الامتحان له {submissionsCount} تسليم طالب — الطلاب اللي سلموا هيراجعوا نسخة الأسئلة اللي جاوبوا
          عنها (Snapshot محفوظة مع تسليمهم)، والتعديلات هتطبق على من لسه مسلمش.
        </p>
      )}
      <ExamBuilder initial={{ ...exam, questions }} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
