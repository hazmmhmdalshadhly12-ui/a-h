import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useCourse } from '../../hooks/useCourses.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { fetchCourseHomeworks, fetchCourseFiles, fetchCourseComments, addCourseComment, deleteCourseComment, uploadCourseFile, addCourseFile, deleteCourseFile, courseFileDownloadUrl } from '../../services/courseService.js';
import { createBooking } from '../../services/bookingService.js';
import { GRADE_SHORT } from '../../config/site.js';
import { PAYMENT_INFO } from '../../config/constants.js';
import { getFriendlyError } from '../../utils/errors.js';
import { cn } from '../../lib/utils.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { supabase } from '../../lib/supabaseClient.js';

// Safe supabase wrapper
const safeSupabase = supabase ?? {
  rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not ready' } }),
  from: () => ({ select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) })
};

function toEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('/embed/')) return url;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

export default function LessonView() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { course, loading: courseLoading } = useCourse(courseId, null);
  const toast = useToast();

  const [lessons, setLessons] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [files, setFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [extraLoading, setExtraLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);

  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subForm, setSubForm] = useState({ parent_phone: '', transfer_number: '' });
  const [submittingSub, setSubmittingSub] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setExtraLoading(true);
    safeSupabase.rpc('get_course_lessons', { p_course_id: courseId })
      .then(({ data }) => {
        const lessonList = Array.isArray(l.data) ? l.data : [];
        const hwList = Array.isArray(h.data) ? h.data : [];
        setLessons(lessonList);
        setHomeworks(hwList);
        setFiles(Array.isArray(f.data) ? f.data : []);
        setComments(Array.isArray(c.data) ? c.data : []);

        if (!lessonId && lessonList.length > 0) {
          const firstAccessible = lessonList.find(l => l.accessible || l.is_free);
          if (firstAccessible) navigate(`/student/courses/${courseId}/lesson/${firstAccessible.lesson_id}`, { replace: true });
        }

        setCanAccess(course?.accessible ?? false);
        setExtraLoading(false);
      })
      .catch(() => setExtraLoading(false));
  }, [courseId, lessonId, navigate]);

  // ... باقي الكود كما هو، لكن استخدم safeSupabase بدلاً من supabase
  // في كل مكان: safeSupabase.rpc، safeSupabase.from، إلخ
}
