import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import ExamBuilder from '../../../components/admin/ExamBuilder.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { createExam, replaceExamQuestions } from '../../../services/examService.js';
import { getFriendlyError } from '../../../utils/errors.js';

export default function CreateExam() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (payload) => {
    const { questions, ...exam } = payload;
    const { data, error } = await createExam(exam);
    if (error) {
      toast.error(getFriendlyError(error, 'فشل إنشاء الامتحان'));
      return;
    }
    const { error: qError } = await replaceExamQuestions(data.id, questions);
    if (qError) {
      toast.error('اتعمل الامتحان بس فشل حفظ الأسئلة');
      return;
    }
    toast.success('تم إنشاء الامتحان بنجاح');
    navigate('/admin/exams');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader title="امتحان جديد" subtitle="بيانات الامتحان + الأسئلة" />
      <ExamBuilder onSubmit={handleSubmit} />
    </div>
  );
}