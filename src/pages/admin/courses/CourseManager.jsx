import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchCourseLessonsAdmin, addCourseLesson, updateCourseLesson, deleteCourseLesson, reorderLessons, uploadCourseFile } from '../../../services/courseService.js';
import { supabase } from '../../../lib/supabaseClient.js';
import { GRADES } from '../../../config/site.js';
import { getFriendlyError } from '../../../utils/errors.js';

const VIDEO_PROVIDERS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'direct', label: 'رابط مباشر (MP4/M3U8)' },
  { value: 'vimeo', label: 'Vimeo' }
];

const EMPTY_LESSON = {
  title: '',
  description: '',
  video_url: '',
  video_provider: 'youtube',
  duration_minutes: 0,
  order_index: 0,
  is_free: false
};

function CourseManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [lessonForm, setLessonForm] = useState({
    title: '',
    description: '',
    video_url: '',
    video_provider: 'youtube',
    duration_minutes: 0,
    order_index: 0,
    is_free: false
  });
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [hwTitle, setHwTitle] = useState('');
  const [hwUploading, setHwUploading] = useState(false);
  const [lessonFile, setLessonFile] = useState(null);
  const [lessonFileTitle, setLessonFileTitle] = useState('');
  const [fileUploading, setFileUploading] = useState(false);

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    const { data, error } = await uploadCourseFile(file, { courseId });
    setUploadingVideo(false);
    if (error) {
      toast.error(error.message || 'فشل رفع الفيديو');
      return;
    }
    setLessonForm((f) => ({ ...f, video_url: data.fileUrl, video_provider: 'direct' }));
    toast.success('تم رفع الفيديو على سيرفر المنصة');
  };

  useEffect(() => {
    loadCourse();
    loadLessons();
  }, [courseId]);

  const loadCourse = async () => {
    const { data } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (data) setCourse(data);
  };

  const loadLessons = async () => {
    const { data } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setLessons(data || []);
    setLoading(false);
  };

  const submitLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) return toast.error('عنوان الدرس مطلوب');

    setSubmitting(true);
    let error;
    if (editingLessonId) {
      ({ error } = await updateCourseLesson(editingLessonId, lessonForm));
    } else {
      ({ error } = await addCourseLesson(courseId, lessonForm));
    }
    setSubmitting(false);
    if (error) return toast.error(error.message || 'فشل الحفظ');
    toast.success(editingLessonId ? 'تم تحديث الدرس' : 'تمت إضافة الدرس');
    resetLessonForm();
    loadLessons();
  };

  const editLesson = (lesson) => {
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      video_url: lesson.video_url || '',
      video_provider: lesson.video_provider || 'youtube',
      duration_minutes: lesson.duration_minutes || 0,
      order_index: lesson.order_index,
      is_free: lesson.is_free
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLesson = async (id) => {
    if (!window.confirm('متأكد تحذف الدرس؟')) return;
    const { error } = await deleteCourseLesson(id);
    if (error) return toast.error(error.message || 'فشل الحذف');
    toast.success('تم حذف الدرس');
    loadLessons();
  };

  const handleAddHomework = async (lessonId) => {
    if (!hwTitle.trim()) return toast.error('اكتب عنوان الواجب');
    setHwUploading(true);
    const { error } = await supabase.from('homeworks').insert({ course_id: courseId, lesson_id: lessonId, title: hwTitle.trim() });
    setHwUploading(false);
    if (error) return toast.error(error.message);
    toast.success('تم إضافة الواجب');
    setHwTitle('');
    setExpandedLesson(null);
  };

  const handleLessonFileUpload = async (lessonId) => {
    if (!lessonFile || !lessonFileTitle.trim()) return toast.error('اختر ملف واكتب عنوانه');
    setFileUploading(true);
    const ext = lessonFile.name.split('.').pop();
    const path = `${courseId}/${lessonId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('course-files').upload(path, lessonFile);
    if (upErr) { setFileUploading(false); return toast.error(upErr.message); }
    const { data } = supabase.storage.from('course-files').getPublicUrl(path);
    const { error } = await supabase.from('course_files').insert({ course_id: courseId, lesson_id: lessonId, title: lessonFileTitle.trim(), file_url: data.publicUrl, file_type: ext });
    setFileUploading(false);
    if (error) return toast.error(error.message);
    toast.success('تم رفع الملف');
    setLessonFile(null);
    setLessonFileTitle('');
    setExpandedLesson(null);
  };

  const resetLessonForm = () => {
    setEditingLessonId(null);
    setLessonForm({
      title: '',
      description: '',
      video_url: '',
      video_provider: 'youtube',
      duration_minutes: 0,
      order_index: lessons.length + 1,
      is_free: false
    });
  };

  const handleReorder = (fromIndex, toIndex) => {
    const newLessons = [...lessons];
    const [moved] = newLessons.splice(fromIndex, 1);
    newLessons.splice(toIndex, 0, moved);
    const lessonOrders = newLessons.map((l, i) => ({ id: l.id, order_index: i }));
    reorderLessons(lessonOrders).then(() => loadLessons());
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Skeleton className="h-8 w-64" /></div>;

  return (
    <div className="space-y-6">
      <AdminHeader
        title={course?.title || 'إدارة الكورس'}
        subtitle="إدارة الدروس — المستر يضيف/يعدل/يرتب الدروس، والطالب يشوفها في الشريط الجانبي"
        actions={<Button variant="secondary" onClick={() => navigate(-1)}>رجوع للكورسات</Button>}
      />

      {/* نموذج إضافة/تعديل درس */}
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{editingLessonId ? 'تعديل الدرس' : 'إضافة درس جديد'}</h2>
        <form onSubmit={submitLesson} className="space-y-4">
          <Input name="title" label="عنوان الدرس *" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} required />
          <Input name="order_index" label="الترتيب *" type="number" value={lessonForm.order_index} onChange={e => setLessonForm({...lessonForm, order_index: e.target.value})} required />
          <Select name="video_provider" label="مصدر الفيديو" value={lessonForm.video_provider} onChange={e => setLessonForm({...lessonForm, video_provider: e.target.value})} options={VIDEO_PROVIDERS} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input name="duration_minutes" label="المدة (دقيقة)" type="number" value={lessonForm.duration_minutes} onChange={e => setLessonForm({...lessonForm, duration_minutes: e.target.value})} />
            <Input name="video_url" label="رابط الفيديو" placeholder="https://youtube.com/watch?v=... أو رابط مباشر" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} />
          </div>
          <div className="rounded-lens border border-ink-600 bg-ink-900/60 p-3.5">
            <p className="mb-1.5 text-sm font-semibold text-paper">أو ارفع الفيديو على سيرفر المنصة</p>
            <p className="mb-2 text-xs text-muted">الفيديو المرفوع هنا يشتغل بمشغّل المنصة بدون أي ظهور ليوتيوب (MP4/MOV).</p>
            <input
              type="file"
              accept="video/mp4,video/m4v,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm"
              onChange={handleVideoUpload}
              disabled={uploadingVideo}
              className="focus-ring block w-full rounded-lens border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-paper file:mr-3 file:rounded-lens file:border-0 file:bg-signal/15 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-signal disabled:opacity-50"
            />
            {uploadingVideo && <p className="mt-1.5 text-xs text-signal">جارٍ رفع الفيديو...</p>}
          </div>
          <Textarea name="description" label="وصف الدرس" rows={3} placeholder="شرح مختصر للدرس..." value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={lessonForm.is_free} onChange={e => setLessonForm({...lessonForm, is_free: e.target.checked})} className="h-4 w-4 accent-signal" />
            <span className="font-medium text-paper">درس مجاني (مفتوح للجميع)</span>
          </label>
          <div className="flex gap-2">
            <Button type="submit" loading={submitting}>{editingLessonId ? 'حفظ التعديل' : 'إضافة الدرس'}</Button>
            {editingLessonId && <Button type="button" variant="ghost" onClick={resetLessonForm}>إلغاء</Button>}
          </div>
        </form>
      </Card>

      {/* قائمة الدروس مع سحب للترتيب */}
      <div className="space-y-3">
        {lessons.length === 0 ? (
          <Card className="text-center py-8 text-muted">لا توجد دروس — أضف أول درس من فوق.</Card>
        ) : (
          <div className="space-y-2" role="list" aria-label="قائمة الدروس">
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="space-y-2">
                <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 relative" role="listitem">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onMouseDown={() => false}
                    onClick={() => false}
                    className="cursor-grab active:cursor-grabbing text-muted hover:text-signal flex h-10 w-10 items-center justify-center rounded-lens bg-ink-800 transition"
                    aria-label="سحب للترتيب"
                  >
                    <Icon name="grip" className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">#{String(lesson.order_index).padStart(2, '0')}</span>
                      <span className="font-semibold text-paper truncate">{lesson.title}</span>
                      {lesson.is_free && <Badge color="success">مجاني</Badge>}
                      <Badge color={lesson.video_url ? 'stream' : 'muted'}>
                        {lesson.video_provider || '—'}
                      </Badge>
                    </div>
                    {lesson.description && <p className="mt-1 text-xs text-muted truncate">{lesson.description}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}>
                    <Icon name="layers" className="h-4 w-4" /> ملف/واجب
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => editLesson(lesson)}>
                    <Icon name="edit" className="h-4 w-4" /> تعديل
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger" onClick={() => deleteLesson(lesson.id)}>
                    <Icon name="trash" className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
                {expandedLesson === lesson.id && (
                  <Card className="space-y-4 border-dashed bg-ink-900/40 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-paper">إضافة واجب للدرس</p>
                        <Input placeholder="عنوان الواجب" value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} />
                        <Button size="sm" loading={hwUploading} onClick={() => handleAddHomework(lesson.id)}>إضافة الواجب</Button>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-bold text-paper">رفع ملف إضافي</p>
                        <Input placeholder="عنوان الملف" value={lessonFileTitle} onChange={(e) => setLessonFileTitle(e.target.value)} />
                        <input type="file" onChange={(e) => setLessonFile(e.target.files?.[0] || null)} className="block w-full text-sm text-muted file:mr-2 file:rounded-lens file:border-0 file:bg-signal file:px-3 file:py-1 file:text-ink" />
                        <Button size="sm" loading={fileUploading} onClick={() => handleLessonFileUpload(lesson.id)}>رفع الملف</Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseManager;