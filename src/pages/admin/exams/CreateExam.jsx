import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import ExamBuilder from '../../../components/admin/ExamBuilder.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { saveExam } from '../../../services/examService.js';
import { getFriendlyError } from '../../../utils/errors.js';

export default function CreateExam() {
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  // إنشاء الامتحان وأسئلته في معاملة واحدة (RPC ذرية) —
  // فشل أي جزء لا يترك امتحانًا ناقصًا أو منشورًا بأسئلة مفقودة.
  const handleSubmit = async (payload) => {
    const { questions, ...exam } = payload;
    setSubmitting(true);
    const { error } = await saveExam({ ...exam, id: null, questions });
    setSubmitting(false);
    if (error) {
      toast.error(getFriendlyError(error, 'فشل إنشاء الامتحان'));
      return;
    }
    toast.success('تم إنشاء الامتحان بنجاح');
    navigate('/admin/exams');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader title="امتحان جديد" subtitle="بيانات الامتحان + الأسئلة — الحفظ ذري بالكامل" />
      <ExamBuilder onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
