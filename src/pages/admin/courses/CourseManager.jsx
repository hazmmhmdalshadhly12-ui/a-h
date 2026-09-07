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
import { fetchCoursesAdmin, fetchCourseSectionsAdmin, addCourseSection, updateCourseSection, deleteCourseSection, addCourseLesson, updateCourseLesson, deleteCourseLesson } from '../../../services/courseService.js';
import { GRADES } from '../../../config/site.js';
import { getFriendlyError } from '../../../utils/errors.js';
import { supabase } from '../../../lib/supabaseClient.js';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'اختيار من متعدد' },
  { value: 'true_false', label: 'صح / غلط' },
  { value: 'short_answer', label: 'سؤال مقالي قصير' }
];

const EMPTY_QUESTION = {
  question_text: '',
  type: 'mcq',
  options: [],
  correct_answer: '',
  points: 1,
  order_index: 0
};

export default function CourseManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionSubmitting, setSectionSubmitting] = useState(false);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);

  const [sectionForm, setSectionForm] = useState({ title: '', order_index: 1 });
  const [editingSection, setEditingSection] = useState(null);

  const [questionForm, setQuestionForm] = useState(EMPTY_QUESTION);
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
    loadCourse();
    loadSections();
  }, [courseId]);

  const loadCourse = async () => {
    const { data } = await supabase.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (data) setCourse(data);
  };

  const loadSections = async () => {
    const { data } = await fetchCourseSectionsAdmin(courseId);
    if (data) {
      data.forEach(s => s.questions?.sort((a, b) => a.order_index - b.order_index));
      setSections(data);
    }
    setLoading(false);
  };

  const submitSection = async (e) => {
    e.preventDefault();
    if (!sectionForm.title.trim()) return toast.error('اكتب عنوان القسم');
    setSectionSubmitting(true);
    const { error } = editingSection
      ? await updateCourseSection(editingSection.section_id, sectionForm.title, sectionForm.order_index)
      : await addCourseSection(courseId, sectionForm.title, sectionForm.order_index);
    setSectionSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editingSection ? 'تم تحديث القسم' : 'تمت إضافة القسم');
    setEditingSection(null);
    setSectionForm({ title: '', order_index: 1 });
    loadSections();
  };

  const startEditSection = (s) => {
    setEditingSection(s);
    setSectionForm({ title: s.section_title || '', order_index: s.section_order || 1 });
  };

  const removeSection = async (sectionId) => {
    if (!window.confirm('حذف هذا القسم وكل دروسه؟')) return;
    const { error } = await deleteCourseSection(sectionId);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم حذف القسم');
    loadSections();
  };

  // ==================== الأسئلة ====================

  const renderOptionsHint = (q) => {
    if (q.type === 'true_false') {
      return <span className="text-xs text-muted">الاجابة الصحيحة: {q.correct_answer === 'true' ? 'صح' : q.correct_answer === 'false' ? 'غلط' : q.correct_answer || '-'}</span>;
    }
    const opts = Array.isArray(q.options) ? q.options : [];
    return (
      <span className="text-xs text-muted">
        الاختيارات: {opts.join(' | ') || '-'} - الصحيح: {q.correct_answer || '-'}
      </span>
    );
  };

  // ==================== الأسئلة ====================
  const loadQuestions = async (sectionId) => {
    setActiveSectionId(sectionId);
    const { data } = await supabase
      .from('course_questions')
      .select('*')
      .eq('section_id', sectionId)
      .order('order_index', { ascending: true });
    setQuestions(data || []);
  };

  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.question_text.trim()) return toast.error('اكتب نص السؤال');
    if (questionForm.type === 'mcq' && (!questionForm.options || questionForm.options.filter(Boolean).length < 2)) {
      return toast.error('السؤال الاختياري محتاج على الأقل خيارين');
    }
    if (!questionForm.correct_answer) return toast.error('اختار الإجابة الصحيحة');

    setQuestionSubmitting(true);
    const payload = { ...questionForm, section_id: activeSectionId };
    const { error } = editingQuestion
      ? await supabase.from('course_questions').update(payload).eq('id', editingQuestion)
      : await supabase.from('course_questions').insert(payload);
    setQuestionSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editingQuestion ? 'تم تحديث السؤال' : 'تمت إضافة السؤال');
    resetQuestionForm();
    loadQuestions(activeSectionId);
  };

  const startEditQuestion = (q) => {
    setEditingQuestion(q.id);
    setQuestionForm({
      question_text: q.question_text || '',
      type: q.type,
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      points: q.points || 1,
      order_index: q.order_index || 0
    });
  };

  const removeQuestion = async (id) => {
    if (!window.confirm('متأكد تحذف السؤال؟')) return;
    const { error } = await supabase.from('course_questions').delete().eq('id', id);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم حذف السؤال');
    loadQuestions(activeSectionId);
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null);
    setQuestionForm(EMPTY_QUESTION);
  };

  const handleOptionChange = (index, value) => {
    const opts = [...questionForm.options];
    opts[index] = value;
    setQuestionForm({ ...questionForm, options: opts });
  };

  const addOption = () => {
    setQuestionForm({ ...questionForm, options: [...questionForm.options, ''] });
  };

  const removeOption = (index) => {
    const opts = questionForm.options.filter((_, i) => i !== index);
    setQuestionForm({ ...questionForm, options: opts });
  };

  const setCorrectAnswer = (answer) => {
    setQuestionForm({ ...questionForm, correct_answer: answer });
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Skeleton className="h-8 w-64" /></div>;

  return (
    <div className="space-y-6">
      <AdminHeader
        title={course?.title || 'إدارة الكورس'}
        subtitle="إدارة الأقسام والأسئلة — الأسئلة بتتعرض للطلاب في الامتحانات"
        actions={<Button variant="secondary" onClick={() => navigate(-1)}>رجوع للكورسات</Button>}
      />

      {/* نموذج إضافة/تعديل قسم */}
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">{editingSection ? 'تعديل القسم' : 'إضافة قسم جديد'}</h2>
        <form onSubmit={submitSection} className="grid gap-4 sm:grid-cols-2">
          <Input name="title" label="عنوان القسم *" value={sectionForm.title} onChange={e => setSectionForm({...sectionForm, title: e.target.value})} required />
          <Input name="order_index" label="الترتيب *" type="number" value={sectionForm.order_index} onChange={e => setSectionForm({...sectionForm, order_index: e.target.value})} required />
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" loading={sectionSubmitting}>{editingSection ? 'حفظ التعديل' : 'إضافة القسم'}</Button>
            {editingSection && <Button type="button" variant="ghost" onClick={() => { setEditingSection(null); setSectionForm({ title: '', order_index: 1 }); }}>إلغاء</Button>}
          </div>
        </form>
      </Card>

      {/* قائمة الأقسام */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <Card className="text-center py-8 text-muted">لا توجد أقسام — أضف أول قسم من فوق.</Card>
        ) : sections.map((section) => (
          <Card key={section.section_id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold">{section.section_title}</h3>
                <p className="text-sm text-muted">ترتيب: {section.section_order} • {section.questions?.length || 0} أسئلة</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => loadQuestions(section.section_id)}>
                  <span>الأسئلة</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => startEditSection(section)}>تعديل</Button>
                <Button variant="ghost" size="sm" className="text-danger" onClick={() => removeSection(section.section_id)}>حذف</Button>
              </div>
            </div>

            {activeSectionId === section.section_id && (
              <div className="space-y-4 border-t border-ink-700/60 pt-4">
                <h4 className="font-display font-bold">أسئلة القسم</h4>

                {/* نموذج إضافة/تعديل سؤال */}
                <Card className="space-y-4 p-4 border-signal/30 bg-signal/5">
                  <h5 className="font-display font-bold">{editingQuestion ? 'تعديل السؤال' : 'إضافة سؤال جديد'}</h5>
                  <form onSubmit={submitQuestion} className="space-y-4">
                    <Input name="question_text" label="نص السؤال *" value={questionForm.question_text} onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})} required />
                    <Select name="type" label="نوع السؤال" value={questionForm.type} onChange={e => setQuestionForm({...questionForm, type: e.target.value})} options={QUESTION_TYPES} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input name="points" label="النقاط" type="number" value={questionForm.points} onChange={e => setQuestionForm({...questionForm, points: e.target.value})} />
                      <Input name="order_index" label="الترتيب" type="number" value={questionForm.order_index} onChange={e => setQuestionForm({...questionForm, order_index: e.target.value})} />
                    </div>

                    {questionForm.type === 'mcq' && (
                      <div className="space-y-2">
                        <p className="font-medium text-sm text-paper">الخيارات (على الأقل 2):</p>
                        <div className="space-y-2">
                          {questionForm.options.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                name={`option_${i}`}
                                placeholder={`الخيار ${i + 1}`}
                                value={opt}
                                onChange={(e) => handleOptionChange(i, e.target.value)}
                              />
                              <button type="button" onClick={() => removeOption(i)} className="focus-ring flex h-10 items-center px-3 text-danger hover:bg-danger/10" aria-label="حذف الخيار">
                                ✕
                              </button>
                            </div>
                          ))}
                          <button type="button" onClick={addOption} className="focus-ring text-sm text-signal hover:text-signal-light">+ إضافة خيار</button>
                        </div>
                      </div>
                    )}

                    {questionForm.type === 'true_false' && (
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-medium text-sm text-paper">الإجابة الصحيحة:</p>
                        <button type="button" onClick={() => setCorrectAnswer('true')} className={`focus-ring rounded-lens px-4 py-2 text-sm font-bold ${questionForm.correct_answer === 'true' ? 'bg-signal text-ink' : 'border border-ink-600 bg-ink-800'}`}>صح</button>
                        <button type="button" onClick={() => setCorrectAnswer('false')} className={`focus-ring rounded-lens px-4 py-2 text-sm font-bold ${questionForm.correct_answer === 'false' ? 'bg-signal text-ink' : 'border border-ink-600 bg-ink-800'}`}>غلط</button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button type="submit" loading={questionSubmitting}>{editingQuestion ? 'حفظ التعديل' : 'إضافة السؤال'}</Button>
                      {editingQuestion && <Button type="button" variant="ghost" onClick={resetQuestionForm}>إلغاء</Button>}
                    </div>
                  </form>
                </Card>

                {/* قائمة الأسئلة */}
                <div className="space-y-2">
                  {questions.length === 0 ? (
                    <p className="text-sm text-muted text-center py-4">لا توجد أسئلة — أضف أول سؤال من فوق.</p>
                  ) : questions.map((q) => (
                    <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lens border border-ink-600 bg-ink-900/50 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge color="muted">{q.order_index}</Badge>
                          <Badge color={q.type === 'mcq' ? 'signal' : q.type === 'true_false' ? 'stream' : 'warning'}>{QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type}</Badge>
                          <span className="font-semibold text-paper truncate">{q.question_text}</span>
                        </div>
                        <div className="mt-1 text-xs text-muted">{renderOptionsHint(q)}</div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button variant="outline" size="sm" onClick={() => startEditQuestion(q)}>تعديل</Button>
                        <Button variant="ghost" size="sm" className="text-danger" onClick={() => removeQuestion(q.id)}>حذف</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
