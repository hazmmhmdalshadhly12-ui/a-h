import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { supabase } from '../../../lib/supabaseClient.js';
import { getFriendlyError } from '../../../utils/errors.js';

const VIDEO_PROVIDERS = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'direct', label: 'رابط مباشر (MP4/M3U8)' },
  { value: 'vimeo', label: 'Vimeo' }
];

const EMPTY_SECTION = { title: '', description: '', order_index: 0 };
const EMPTY_LESSON = {
  title: '',
  description: '',
  video_url: '',
  video_provider: 'youtube',
  duration_minutes: 0,
  order_index: 0,
  is_free: false
};

export default function CourseSections() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState(null);

  // Forms
  const [sectionForm, setSectionForm] = useState(EMPTY_SECTION);
  const [editingSectionId, setEditingSectionId] = useState(null);

  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonSectionId, setLessonSectionId] = useState(null);

  useEffect(() => {
    loadCourse();
    loadSections();
  }, [courseId]);

  const loadCourse = async () => {
    const { data } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (data) setCourse(data);
  };

  const loadSections = async () => {
    const { data } = await supabase
      .from('course_sections')
      .select('*, lessons(*)')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    if (data) {
      data.forEach(s => s.lessons?.sort((a, b) => a.order_index - b.order_index));
      setSections(data);
    }
    setLoading(false);
  };

  const saveSection = async (e) => {
    e.preventDefault();
    if (!sectionForm.title.trim()) return toast.error('عنوان القسم مطلوب');

    setLoading(true);
    let error;
    if (editingSectionId) {
      ({ error } = await supabase.from('course_sections').update(sectionForm).eq('id', editingSectionId));
    } else {
      ({ error } = await supabase.from('course_sections').insert({ ...sectionForm, course_id: courseId }).select().single());
    }
    setLoading(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editingSectionId ? 'تم تحديث القسم' : 'تم إضافة القسم');
    resetSectionForm();
    loadSections();
  };

  const editSection = (s) => {
    setEditingSectionId(s.id);
    setSectionForm({ title: s.title, description: s.description || '', order_index: s.order_index });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSection = async (id) => {
    if (!window.confirm('حذف القسم يحذف كل دروسه. متأكد؟')) return;
    const { error } = await supabase.from('course_sections').delete().eq('id', id);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم حذف القسم');
    loadSections();
  };

  const resetSectionForm = () => {
    setEditingSectionId(null);
    setSectionForm(EMPTY_SECTION);
  };

  // ==================== دروس ====================
  const startAddLesson = (sectionId) => {
    setLessonSectionId(sectionId);
    setEditingLessonId(null);
    setLessonForm({ ...EMPTY_LESSON, order_index: (sections.find(s => s.id === sectionId)?.lessons?.length || 0) + 1 });
  };

  const editLesson = (lesson) => {
    setLessonSectionId(lesson.section_id);
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

  const saveLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) return toast.error('عنوان الدرس مطلوب');
    if (!lessonSectionId) return toast.error('اختر قسماً للدرس');

    setLoading(true);
    let error;
    const payload = { ...lessonForm, section_id: lessonSectionId };
    if (editingLessonId) {
      ({ error } = await supabase.from('lessons').update(payload).eq('id', editingLessonId));
    } else {
      ({ error } = await supabase.from('lessons').insert(payload).select().single());
    }
    setLoading(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editingLessonId ? 'تم تحديث الدرس' : 'تم إضافة الدرس');
    resetLessonForm();
    loadSections();
  };

  const deleteLesson = async (id) => {
    if (!window.confirm('متأكد تحذف الدرس؟')) return;
    const { error } = await supabase.from('lessons').delete().eq('id', id);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم حذف الدرس');
    loadSections();
  };

  const resetLessonForm = () => {
    setEditingLessonId(null);
    setLessonSectionId(null);
    setLessonForm(EMPTY_LESSON);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Skeleton className="h-8 w-64" /></div>;

  return (
    <div className="space-y-6">
      <AdminHeader
        title={course?.title || 'أقسام الكورس'}
        subtitle="إدارة الأقسام والدروس — الطالب المشترك يشوف الدروس المفتوحة، وغير المشترك يشوفها مقفولة"
        actions={<Button variant="secondary" onClick={() => navigate(-1)}><Icon name="chevronRight" className="h-4 w-4" /> رجوع للكورس</Button>}
      />

      {/* نموذج إضافة/تعديل قسم */}
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{editingSectionId ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
        <form onSubmit={saveSection} className="grid gap-4 sm:grid-cols-2">
          <Input name="title" label="عنوان القسم *" value={sectionForm.title} onChange={e => setSectionForm({...sectionForm, title: e.target.value})} required />
          <Input name="order_index" label="الترتيب *" type="number" value={sectionForm.order_index} onChange={e => setSectionForm({...sectionForm, order_index: e.target.value})} required />
          <Input name="description" label="الوصف" className="sm:col-span-2" value={sectionForm.description} onChange={e => setSectionForm({...sectionForm, description: e.target.value})} />
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" loading={loading}>{editingSectionId ? 'حفظ التعديل' : 'إضافة القسم'}</Button>
            {editingSectionId && <Button type="button" variant="ghost" onClick={resetSectionForm}>إلغاء</Button>}
          </div>
        </form>
      </Card>

      {/* قائمة الأقسام والدروس */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <Card className="text-center py-8 text-muted">لا توجد أقسام — أضف أول قسم من فوق.</Card>
        ) : sections.map((section) => (
          <Card key={section.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">{section.title}</h3>
                <p className="text-sm text-muted">ترتيب: {section.order_index} • {section.lessons?.length || 0} دروس</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startAddLesson(section.id)}>
                  <Icon name="plus" className="h-4 w-4" /> إضافة درس
                </Button>
                <Button variant="outline" size="sm" onClick={() => editSection(section)}><Icon name="edit" className="h-4 w-4" /> تعديل</Button>
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => deleteSection(section.id)}><Icon name="trash" className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* دروس القسم */}
            <div className="border-t border-ink-700/60 pt-4">
              {section.lessons?.length === 0 ? (
                <p className="text-sm text-muted py-4 text-center">لا توجد دروس — أضف أول درس.</p>
              ) : (
                <div className="space-y-2">
                  {section.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lens border border-ink-600 bg-ink-900/50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted">#{String(lesson.order_index).padStart(2, '0')}</span>
                          <span className="font-semibold text-paper">{lesson.title}</span>
                          {lesson.is_free && <Badge color="success">مجاني</Badge>}
                          <Badge color={lesson.video_url ? 'stream' : 'muted'}>
                            {lesson.video_provider || '—'}
                          </Badge>
                        </div>
                        {lesson.description && <p className="text-xs text-muted mt-0.5">{lesson.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => editLesson(lesson)}><Icon name="edit" className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-danger" onClick={() => deleteLesson(lesson.id)}><Icon name="trash" className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* نموذج إضافة/تعديل درس داخل القسم */}
              {(lessonSectionId === section.id) && (
                <form onSubmit={saveLesson} className="mt-4 p-4 rounded-lens border border-signal/30 bg-signal/5 space-y-4">
                  <h4 className="font-display font-bold">{editingLessonId ? 'تعديل الدرس' : 'إضافة درس جديد'}</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input name="title" label="عنوان الدرس *" value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} required />
                    <Input name="order_index" label="الترتيب *" type="number" value={lessonForm.order_index} onChange={e => setLessonForm({...lessonForm, order_index: e.target.value})} required />
                    <Select name="video_provider" label="مصدر الفيديو" value={lessonForm.video_provider} onChange={e => setLessonForm({...lessonForm, video_provider: e.target.value})} options={VIDEO_PROVIDERS} />
                    <Input name="duration_minutes" label="المدة (دقيقة)" type="number" value={lessonForm.duration_minutes} onChange={e => setLessonForm({...lessonForm, duration_minutes: e.target.value})} />
                    <Input name="video_url" label="رابط الفيديو" placeholder="https://youtube.com/watch?v=... أو رابط مباشر" value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} className="sm:col-span-2" />
                    <Input name="description" label="الوصف" className="sm:col-span-2" value={lessonForm.description} onChange={e => setLessonForm({...lessonForm, description: e.target.value})} />
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={lessonForm.is_free} onChange={e => setLessonForm({...lessonForm, is_free: e.target.checked})} className="h-4 w-4 accent-signal" />
                      <span className="font-medium text-paper">درس مجاني (مفتوح للجميع)</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" loading={loading}>{editingLessonId ? 'حفظ التعديل' : 'إضافة الدرس'}</Button>
                    <Button type="button" variant="ghost" onClick={resetLessonForm}>إلغاء</Button>
                  </div>
                </form>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}