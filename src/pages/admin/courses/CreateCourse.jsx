import { useNavigate } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import CourseForm from '../../../components/admin/CourseForm.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { createCourse } from '../../../services/courseService.js';

export default function CreateCourse() {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (payload) => {
    const { error } = await createCourse(payload);
    if (error) return toast.error(error.message || 'فشل الإنشاء');
    toast.success('تم إضافة الدرس');
    navigate('/admin/courses');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <AdminHeader title="درس جديد" />
      <CourseForm onSubmit={handleSubmit} />
    </div>
  );
}