import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import CourseForm from '../../../components/admin/CourseForm.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchCourseById, updateCourse } from '../../../services/courseService.js';
import { fetchSections } from '../../../services/sectionService.js';

export default function EditCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchCourseById(courseId), fetchSections()]).then(([c, s]) => {
      setCourse(c.data);
      setSections(s.data || []);
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
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminHeader
        title="تعديل الدرس"
        actions={
          <Link to={`/admin/courses/${courseId}/manage`}>
            <Button size="sm">
              <Icon name="plus" className="h-4 w-4" /> إدارة المحاضرات والواجبات
            </Button>
          </Link>
        }
      />
      <CourseForm initial={course} onSubmit={handleSubmit} sections={sections} />
    </div>
  );
}