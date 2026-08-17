import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Input from '../../../components/ui/Input.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import Select from '../../../components/ui/Select.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import {
  fetchLessons,
  createLesson,
  updateLesson,
  deleteLesson
} from '../../../services/lessonService.js';
import {
  fetchHomeworks,
  createHomework,
  updateHomework,
  deleteHomework,
  fetchHomeworkQuestions,
  createHomeworkQuestion,
  updateHomeworkQuestion,
  deleteHomeworkQuestion,
  fetchSubmissions
} from '../../../services/homeworkService.js';
import { HOMEWORK_QUESTION_TYPE_OPTIONS } from '../../../config/constants.js';
import { getFriendlyError } from '../../../utils/errors.js';
import { cn } from '../../../lib/utils.js';

/** إدارة محتويات الكورس: المحاضرات + الواجبات + أسئلة كل واجب */
export default function CourseManager() {
  const { courseId } = useParams();
  const toast = useToast();

  const [lessons, setLessons] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [tab, setTab] = useState('lessons');
  const [loading, setLoading] = useState(true);

  // فورم محاضرة
  const [lessonForm, setLessonForm] = useState({ title: '', video_url: '', order_index: 1 });
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonSubmitting, setLessonSubmitting] = useState(false);

  // فورم واجب
  const [hwForm, setHwForm] = useState({ title: '', description: '', order_index: 1 });
  const [editingHw, setEditingHw] = useState(null);
  const [hwSubmitting, setHwSubmitting] = useState(false);

  // أسئلة واجب
  const [activeHw, setActiveHw] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qForm, setQForm] = useState({ question_text: '', type: 'mcq', options: '', correct_answer: '', points: 1 });
  const [editingQ, setEditingQ] = useState(null);
  const [qSubmitting, setQSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState([]);

  const load = async () => {
    const [l, h] = await Promise.all([fetchLessons(courseId), fetchHomeworks(courseId)]);
    setLessons(l.data || []);
    setHomeworks(h.data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) load();
  }, [courseId]);

  const loadQuestions = async (hwId) => {
    setActiveHw(hwId);
    const [q, s] = await Promise.all([fetchHomeworkQuestions(hwId), fetchSubmissions(hwId)]);
    setQuestions(q.data || []);
    setSubmissions(s.data || []);
    setEditingQ(null);
    setQForm({ question_text: '', type: 'mcq', options: '', correct_answer: '', points: 1 });
  };

  // ===== المحاضرات =====
  const submitLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.title.trim()) return toast.error('اكتب عنوان المحاضرة');
    setLessonSubmitting(true);
    const payload = {
      title: lessonForm.title.trim(),
      video_url: lessonForm.video_url || null,
      order_index: Number(lessonForm.order_index) || 1
    };
    const { error } = editingLesson
      ? await updateLesson(editingLesson.id, payload)
      : await createLesson({ courseId, ...payload });
    setLessonSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editingLesson ? 'تم تحديث المحاضرة' : 'تمت إضافة المحاضرة');
    setEditingLesson(null);
    setLessonForm({ title: '', video_url: '', order_index: 1 });
    load();
  };

  const startEditLesson = (l) => {
    setEditingLesson(l);
    setLessonForm({ title: l.title || '', video_url: l.video_url || '', order_index: l.order_index || 1 });
  };

  const removeLesson = async (id) => {
    if (!window.confirm('حذف هذه المحاضرة؟')) return;
    const { error } = await deleteLesson(id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    load();
  };

  // ===== الواجبات =====
  const submitHw = async (e) => {
    e.preventDefault();
    if (!hwForm.title.trim()) return toast.error('اكتب عنوان الواجب');
    setHwSubmitting(true);
    const payload = {
      title: hwForm.title.trim(),
      description: hwForm.description || null,
      order_index: Number(hwForm.order_index) || 1
    };
    const { error } = editingHw
      ? await updateHomework(editingHw.id, payload)
      : await createHomework({ courseId, ...payload });
    setHwSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editingHw ? 'تم تحديث الواجب' : 'تمت إضافة الواجب');
    setEditingHw(null);
    setHwForm({ title: '', description: '', order_index: 1 });
    load();
  };

  const startEditHw = (h) => {
    setEditingHw(h);
    setHwForm({ title: h.title || '', description: h.description || '', order_index: h.order_index || 1 });
  };

  const removeHw = async (id) => {
    if (!window.confirm('حذف هذا الواجب وكل أسئلته؟')) return;
    const { error } = await deleteHomework(id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    if (activeHw === id) setActiveHw(null);
    load();
  };

  // ===== أسئلة الواجب =====
  const submitQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.question_text.trim()) return toast.error('اكتب نص السؤال');
    setQSubmitting(true);
    const options = qForm.type === 'mcq' && qForm.options.trim()
      ? qForm.options.split('\n').map((s) => s.trim()).filter(Boolean)
      : null;
    const payload = {
      questionText: qForm.question_text.trim(),
      type: qForm.type,
      options,
      correctAnswer: qForm.correct_answer.trim() || null,
      points: Number(qForm.points) || 1
    };
    const { error } = editingQ
      ? await updateHomeworkQuestion(editingQ.id, {
          question_text: payload.questionText,
          type: payload.type,
          options: payload.options,
          correct_answer: payload.correctAnswer,
          points: payload.points
        })
      : await createHomeworkQuestion({ homeworkId: activeHw, ...payload });
    setQSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success(editingQ ? 'تم تحديث السؤال' : 'تمت إضافة السؤال');
    setEditingQ(null);
    setQForm({ question_text: '', type: 'mcq', options: '', correct_answer: '', points: 1 });
    loadQuestions(activeHw);
  };

  const startEditQ = (q) => {
    setEditingQ(q);
    setQForm({
      question_text: q.question_text || '',
      type: q.type || 'mcq',
      options: Array.isArray(q.options) ? q.options.join('\n') : '',
      correct_answer: q.correct_answer || '',
      points: q.points || 1
    });
  };

  const removeQ = async (id) => {
    if (!window.confirm('حذف هذا السؤال؟')) return;
    const { error } = await deleteHomeworkQuestion(id);
    if (error) return toast.error('فشل الحذف');
    toast.success('تم الحذف');
    loadQuestions(activeHw);
  };

  const renderOptionsHint = (q) => {
    if (q.type === 'true_false') {
      return <span className="text-xs text-muted">الإجابة الصحيحة: {q.correct_answer === 'true' ? 'صح ✓' : q.correct_answer === 'false' ? 'غلط ✗' : q.correct_answer || '—'}</span>;
    }
    const opts = Array.isArray(q.options) ? q.options : [];
    return (
      <span className="text-xs text-muted">
        الاختيارات: {opts.join(' • ') || '—'} — الصحيح: {q.correct_answer || '—'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="إدارة محتوى الدرس"
        subtitle="المحاضرات اللي الطالب يشوفها + الواجبات اللي يحلها ويسلمها"
        actions={
          <Link to="/admin/courses">
            <Button size="sm" variant="secondary">
              <Icon name="chevronRight" className="h-4 w-4" /> كل الكورسات
            </Button>
          </Link>
        }
      />

      {/* تبويبات */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('lessons')}
          className={cn(
            'focus-ring rounded-lens px-4 py-2 text-sm font-bold transition',
            tab === 'lessons' ? 'bg-signal text-ink' : 'bg-ink-800 text-muted hover:text-paper'
          )}
        >
          المحاضرات ({lessons.length})
        </button>
        <button
          onClick={() => setTab('homeworks')}
          className={cn(
            'focus-ring rounded-lens px-4 py-2 text-sm font-bold transition',
            tab === 'homeworks' ? 'bg-signal text-ink' : 'bg-ink-800 text-muted hover:text-paper'
          )}
        >
          الواجبات ({homeworks.length})
        </button>
      </div>

      {loading ? (
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      ) : tab === 'lessons' ? (
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-display text-lg font-bold">{editingLesson ? 'تعديل محاضرة' : 'إضافة محاضرة'}</h2>
            <form onSubmit={submitLesson} className="grid gap-4 sm:grid-cols-2">
              <Input
                name="title"
                label="عنوان المحاضرة *"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                required
              />
              <Input
                name="order_index"
                label="الترتيب"
                type="number"
                min="1"
                value={lessonForm.order_index}
                onChange={(e) => setLessonForm({ ...lessonForm, order_index: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Input
                  name="video_url"
                  label="رابط الفيديو (YouTube embed)"
                  placeholder="https://www.youtube.com/embed/..."
                  dir="ltr"
                  value={lessonForm.video_url}
                  onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" loading={lessonSubmitting}>{editingLesson ? 'حفظ' : 'إضافة المحاضرة'}</Button>
                {editingLesson && (
                  <Button type="button" variant="secondary" onClick={() => { setEditingLesson(null); setLessonForm({ title: '', video_url: '', order_index: 1 }); }}>
                    إلغاء
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {lessons.length === 0 ? (
            <Card className="text-center text-muted">لا توجد محاضرات في هذا الدرس بعد.</Card>
          ) : (
            <Card>
              <ul className="divide-y divide-ink-700/60">
                {lessons.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-paper">
                        <span className="font-mono text-muted">#{l.order_index} </span>
                        {l.title}
                      </p>
                      <p className="truncate text-xs text-muted" dir="ltr">{l.video_url || 'بدون فيديو'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => startEditLesson(l)}>
                        <Icon name="edit" className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => removeLesson(l.id)}>
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 font-display text-lg font-bold">{editingHw ? 'تعديل واجب' : 'إضافة واجب'}</h2>
            <form onSubmit={submitHw} className="grid gap-4 sm:grid-cols-2">
              <Input
                name="title"
                label="عنوان الواجب *"
                value={hwForm.title}
                onChange={(e) => setHwForm({ ...hwForm, title: e.target.value })}
                required
              />
              <Input
                name="order_index"
                label="الترتيب"
                type="number"
                min="1"
                value={hwForm.order_index}
                onChange={(e) => setHwForm({ ...hwForm, order_index: e.target.value })}
              />
              <div className="sm:col-span-2">
                <Textarea
                  name="description"
                  label="وصف الواجب"
                  rows={2}
                  value={hwForm.description}
                  onChange={(e) => setHwForm({ ...hwForm, description: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" loading={hwSubmitting}>{editingHw ? 'حفظ' : 'إضافة الواجب'}</Button>
                {editingHw && (
                  <Button type="button" variant="secondary" onClick={() => { setEditingHw(null); setHwForm({ title: '', description: '', order_index: 1 }); }}>
                    إلغاء
                  </Button>
                )}
              </div>
            </form>
          </Card>

          {homeworks.length === 0 ? (
            <Card className="text-center text-muted">لا توجد واجبات في هذا الدرس بعد.</Card>
          ) : (
            homeworks.map((h) => (
              <Card key={h.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-paper">
                      <span className="font-mono text-muted">#{h.order_index} </span>
                      {h.title}
                    </p>
                    {h.description && <p className="text-sm text-muted">{h.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant={activeHw === h.id ? '' : 'secondary'} onClick={() => loadQuestions(h.id)}>
                      <Icon name="edit" className="h-3.5 w-3.5" /> الأسئلة
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => startEditHw(h)}>
                      <Icon name="edit" className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => removeHw(h.id)}>
                      <Icon name="trash" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {activeHw === h.id && (
                  <div className="space-y-4 rounded-lens bg-ink-800/60 p-4">
                    <div>
                      <h3 className="mb-3 font-display text-sm font-bold text-paper">
                        أسئلة الواجب ({questions.length})
                      </h3>
                      <form onSubmit={submitQuestion} className="space-y-3">
                        <Textarea
                          name="question_text"
                          label="نص السؤال *"
                          rows={2}
                          value={qForm.question_text}
                          onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
                          required
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Select
                            name="type"
                            label="النوع"
                            value={qForm.type}
                            onChange={(e) => setQForm({ ...qForm, type: e.target.value, options: '', correct_answer: '' })}
                            options={HOMEWORK_QUESTION_TYPE_OPTIONS}
                          />
                          <Input
                            name="points"
                            label="الدرجة"
                            type="number"
                            min="0"
                            value={qForm.points}
                            onChange={(e) => setQForm({ ...qForm, points: e.target.value })}
                          />
                        </div>
                        {qForm.type === 'mcq' ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <Textarea
                              name="options"
                              label="الاختيارات (كل اختيار في سطر)"
                              rows={3}
                              dir="rtl"
                              value={qForm.options}
                              onChange={(e) => setQForm({ ...qForm, options: e.target.value })}
                            />
                            <Input
                              name="correct_answer"
                              label="الإجابة الصحيحة (من غير اختلاف — نفس نص الاختيار)"
                              value={qForm.correct_answer}
                              onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}
                            />
                          </div>
                        ) : (
                          <Select
                            name="correct_answer"
                            label="الإجابة الصحيحة"
                            value={qForm.correct_answer}
                            onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}
                            options={[
                              { value: 'true', label: 'صح ✓' },
                              { value: 'false', label: 'غلط ✗' }
                            ]}
                          />
                        )}
                        <div className="flex items-center gap-2">
                          <Button type="submit" loading={qSubmitting}>{editingQ ? 'حفظ السؤال' : 'إضافة السؤال'}</Button>
                          {editingQ && (
                            <Button type="button" variant="secondary" onClick={() => { setEditingQ(null); setQForm({ question_text: '', type: 'mcq', options: '', correct_answer: '', points: 1 }); }}>
                              إلغاء
                            </Button>
                          )}
                        </div>
                      </form>
                    </div>

                    {questions.length > 0 && (
                      <ul className="divide-y divide-ink-700/60">
                        {questions.map((q) => (
                          <li key={q.id} className="flex items-center justify-between gap-3 py-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-paper">
                                {q.points > 0 && <Badge color="muted">{q.points} نقطة</Badge>}{' '}
                                {q.question_text}
                              </p>
                              {renderOptionsHint(q)}
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Button size="sm" variant="secondary" onClick={() => startEditQ(q)}>
                                <Icon name="edit" className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => removeQ(q.id)}>
                                <Icon name="trash" className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {submissions.length > 0 && (
                      <div>
                        <h4 className="mb-2 font-display text-sm font-bold text-paper">
                          التسليمات ({submissions.length})
                        </h4>
                        <ul className="divide-y divide-ink-700/60 rounded-lens bg-ink-900/50 px-3">
                          {submissions.map((s) => (
                            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
                              <p className="text-sm text-paper">{s.student?.full_name || 'طالب'}</p>
                              <p className="text-xs text-muted">
                                {new Date(s.submitted_at).toLocaleDateString('ar-EG')} —{' '}
                                <span className="font-display font-bold text-signal">{s.auto_score}/{s.total_points}</span>
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}