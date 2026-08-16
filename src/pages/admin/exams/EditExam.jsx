import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import ExamBuilder from '../../../components/admin/ExamBuilder.jsx';
import Card from '../../../components/ui/Card.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchExamById, updateExam, fetchExamQuestions, replaceExamQuestions } from '../../../services/examService.js';
import { isSupabaseConfigured } from '../../../lib/supabaseClient.js';

export default function EditExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([fetchExamById(examId), fetchExamQuestions(examId)]).then(([e, q]) => {
      if (!active) return;
      setExam(e.data);
      setQuestions(q.data || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [examId]);

  const handleSubmit = async (payload) => {
    const { questions: newQuestions, ...updates } = payload;
    const { error } = await updateExam(examId, updates);
    if (error) return toast.error('فشل حفظ بيانات الامتحان');
    const { error: qError } = await replaceExamQuestions(examId, newQuestions);
    if (qError) return toast.error('فشل حفظ الأسئلة');
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
    <div className="mx-auto max-w-4xl">
      <AdminHeader title="تعديل الامتحان" subtitle={exam.title} />
      <ExamBuilder initial={{ ...exam, questions }} onSubmit={handleSubmit} />
    </div>
  );
}