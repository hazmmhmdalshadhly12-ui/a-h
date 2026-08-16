import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import CourseForm from '../../../components/admin/CourseForm.jsx';
import Card from '../../../components/ui/Card.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchCourseById, updateCourse } from '../../../services/courseService.js';

export default function EditCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseById(courseId).then(({ data }) => {
      setCourse(data);
      setLoading(false);
    });
  }, [courseId]);

  const handleSubmit = async (payload) => {
    const { error } = await updateCourse(courseId, payload);
    if (error) return toast.error('فشل الحفظ');
    toast.success('تم تحديث الدرس');
    navigate('/admin/courses');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <AdminHeader title="تعديل الدرس" />
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <AdminHeader title="تعديل الدرس" />
      <CourseForm initial={course} onSubmit={handleSubmit} />
    </div>
  );
}