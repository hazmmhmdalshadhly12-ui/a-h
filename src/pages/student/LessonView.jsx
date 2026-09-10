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
import { fetchCourseLessons, fetchCourseHomeworks, fetchCourseFiles, fetchCourseComments, addCourseComment, deleteCourseComment, uploadCourseFile, addCourseFile, deleteCourseFile, courseFileDownloadUrl } from '../../services/courseService.js';
import { createBooking } from '../../services/bookingService.js';
import { GRADE_SHORT } from '../../config/site.js';
import { PAYMENT_INFO } from '../../config/constants.js';
import { getFriendlyError } from '../../utils/errors.js';
import { cn } from '../../lib/utils.js';
import { formatDateTime } from '../../utils/formatDate.js';
import { supabase } from '../../lib/supabaseClient.js';

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
    Promise.all([
      supabase.rpc('get_course_lessons', { p_course_id: courseId }),
      supabase.rpc('get_course_homeworks', { p_course_id: courseId }),
      supabase.rpc('get_course_files', { p_course_id: courseId }),
      supabase.rpc('get_course_comments', { p_course_id: courseId })
    ])
      .then(([l, h, f, c]) => {
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

        const contentBased = lessonList.length > 0 || hwList.length > 0 || (f.data && f.data.length > 0);
        setCanAccess(contentBased || (course?.accessible ?? false));
        setExtraLoading(false);
      })
      .catch(() => setExtraLoading(false));
  }, [courseId, lessonId, navigate]);

  if (courseLoading) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-72" /></div>;
  }

  if (!course) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <p className="text-muted">الكورس غير موجود.</p>
        <Link to="/student/courses"><Button variant="secondary">رجوع للكورسات</Button></Link>
      </Card>
    );
  }

  const isProfessional = course.grade === 'professional';
  const isMyGrade = profile?.grade === course.grade;
  const effectiveAccess = canAccess || Boolean(course?.accessible);
  const canWatch = Boolean(profile) && effectiveAccess && (isProfessional || isMyGrade);

  const activeLesson = lessons.find(l => l.lesson_id === lessonId);
  const isLessonAccessible = activeLesson?.accessible === true || activeLesson?.is_free === true;
  const videoUrl = toEmbedUrl(activeLesson?.video_url || course.video_url);
  const instagram = PAYMENT_INFO.instagramNumber;

  function toEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('/embed/')) return url;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  }

  // ===== التعليقات =====
  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return toast.error('اكتب تعليقك الأول');
    setCommentSubmitting(true);
    const { error } = await supabase.rpc('add_course_comment', { p_course_id: courseId, p_body: commentBody });
    setCommentSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل إضافة التعليق'));
    setCommentBody('');
    toast.success('تمت إضافة تعليقك');
    const { data } = await supabase.rpc('get_course_comments', { p_course_id: courseId });
    setComments(data || []);
  };

  const removeMyComment = async (commentId) => {
    if (!window.confirm('حذف تعليقك؟')) return;
    const { error } = await supabase.rpc('delete_course_comment', { p_comment_id: commentId });
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم الحذف');
    const { data } = await supabase.rpc('get_course_comments', { p_course_id: courseId });
    setComments(data || []);
  };

  // ===== رفع ملف (الطالب) =====
  const submitUpload = async (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return toast.error('اكتب اسم الملف');
    if (!uploadFile) return toast.error('اختار ملف PDF أو ZIP الأول');
    setUploadSubmitting(true);

    const { data: upload, error: upErr } = await uploadCourseFile(uploadFile, { courseId, studentId: profile?.id });
    if (upErr) {
      setUploadSubmitting(false);
      return toast.error(getFriendlyError(upErr, 'فشل رفع الملف'));
    }

    const { error } = await supabase.rpc('add_course_file', { p_course_id: courseId, p_title: uploadTitle.trim(), p_file_url: upload.fileUrl, p_file_type: upload.fileType });
    setUploadSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success('تم رفع ملفك');
    setUploadTitle('');
    setUploadFile(null);
    const { data } = await supabase.rpc('get_course_files', { p_course_id: courseId });
    setFiles(data || []);
  };

  const removeFile = async (fileId) => {
    if (!window.confirm('حذف هذا الملف؟')) return;
    const { error } = await supabase.rpc('delete_course_file', { p_file_id: fileId });
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم الحذف');
    const { data } = await supabase.rpc('get_course_files', { p_course_id: courseId });
    setFiles(data || []);
  };

  // ===== اشتراك احترافي =====
  const submitSubscription = async (e) => {
    e.preventDefault();
    if (!subForm.transfer_number.trim()) return toast.error('اكتب الرقم اللي حولت منه');
    setSubmittingSub(true);
    const { error } = await createBooking({
      studentId: profile.id,
      fullName: profile.full_name,
      phone: profile.phone,
      parentPhone: subForm.parent_phone,
      grade: 'professional',
      month: null,
      courseId,
      notes: `اشتراك في الكورس الاحترافي: ${course.title}`,
      transferNumber: subForm.transfer_number.trim()
    });
    setSubmittingSub(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل إرسال طلب الاشتراك'));
    toast.success('تم إرسال طلب اشتراكك — قيد مراجعة المستر');
  };

  const gradeLabel = GRADE_SHORT[course.grade] || course.grade;

  if (!activeLesson) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <p className="text-muted">الدرس غير موجود.</p>
        <Link to={`/student/courses/${courseId}`}><Button variant="secondary">رجوع للكورس</Button></Link>
      </Card>
    );
  }

  const isLessonAccessible = activeLesson.accessible === true || activeLesson.is_free === true;
  const videoUrl = toEmbedUrl(activeLesson.video_url || course.video_url);

  function toEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('/embed/')) return url;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-stream">#{String(course.order_index || 1).padStart(2, '0')} — {GRADE_SHORT[course.grade] || course.grade}</p>
          <h1 className="mt-1 font-display text-2xl font-black">{course.title}</h1>
          {isProfessional && course.price != null && <p className="mt-1 text-sm font-bold text-signal">💰 سعر الكورس: {course.price} جنيه</p>}
        </div>
        <Link to={`/student/courses/${courseId}`}>
          <Button variant="secondary" size="sm"><Icon name="chevronRight" className="h-4 w-4" /> كل الكورس</Button>
        </Link>
      </div>

      {/* الكورس الاحترافي غير مشترك */}
      {isProfessional && !canWatch && !effectiveAccess ? (
        <Card className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-black">اشترك في {course.title}</h2>
              <p className="mt-1 text-sm text-muted">{course.description || 'كورس احترافي بنظام مستويات — اشترك علشان يفتح ليك.'}</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl font-black text-signal">{course.price ?? '—'} <span className="text-base font-bold text-muted">جنيه</span></p>
              {!showSubscribe && <Button className="mt-2" onClick={() => setShowSubscribe(true)}><Icon name="lock" className="h-4 w-4" /> اشترك</Button>}
            </div>
          </div>
          {showSubscribe && (
            <div className="space-y-4 rounded-lens border border-signal/40 bg-signal/10 p-4">
              <h3 className="font-display text-base font-black text-paper">خطوات الاشتراك 💳</h3>
              <ul className="space-y-1.5 text-sm leading-relaxed text-paper/90">
                <li>حوّل <b>{course.price ?? '—'} جنيه</b> للكورس الاحترافي</li>
                <li>على رقم الإنستجرام: <b dir="ltr" className="font-mono">{instagram}</b></li>
                <li>محفظة كاش غير متوفر الآن — التحويل يكون من رقم مضمون بإسمك</li>
              </ul>
              <form onSubmit={submitSubscription} className="grid gap-3 sm:grid-cols-2">
                <input name="parent_phone" label="موبايل ولي الأمر (اختياري)" dir="ltr" placeholder="01xxxxxxxxx" value={subForm.parent_phone} onChange={e => setSubForm({...subForm, parent_phone: e.target.value})} className="input-base" />
                <input name="transfer_number" label="الرقم اللي حولت منه *" dir="ltr" placeholder="01xxxxxxxxx" value={subForm.transfer_number} onChange={e => setSubForm({...subForm, transfer_number: e.target.value})} className="input-base" required />
                <div className="sm:col-span-2"><Button type="submit" loading={submittingSub} className="w-full">إرسال طلب الاشتراك</Button></div>
              </form>
              <p className="text-xs text-muted">بعد الإرسال هتنتظر المستر يؤكد اشتراكك.</p>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* ===== الشاشة الرئيسية: فيديو + شريط جانبي دروس ===== */}
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* الشريط الجانبي: قائمة الدروس */}
            <Card className="lg:sticky lg:top-6 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <div className="flex items-center gap-2 border-b border-ink-600 px-4 py-3">
                <Icon name="layers" className="h-4 w-4 text-signal" />
                <p className="font-display text-sm font-bold text-paper">دروس الكورس ({lessons.length})</p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {extraLoading ? (
                  <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
                ) : lessons.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted">لا توجد دروس بعد.</p>
                ) : (
                  <ul>
                    {lessons.map((l, i) => {
                      const accessible = l.accessible === true || l.is_free === true;
                      const isActive = l.lesson_id === lessonId;
                      return (
                        <li key={l.lesson_id}>
                          <Link
                            to={`/student/courses/${courseId}/lesson/${l.lesson_id}`}
                            className={cn(
                              'focus-ring flex w-full items-start gap-3 border-b border-ink-700/50 px-4 py-3 text-right transition hover:bg-ink-800/60',
                              isActive && 'bg-signal/10',
                              !accessible && 'opacity-70'
                            )}
                          >
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs text-muted">
                              {String(l.order_index).padStart(2, '0')}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-paper">{l.title}</span>
                              <span className="block text-xs text-muted">
                                {!accessible && <span className="text-warning">🔒 مقفول</span>}
                                {l.video_url ? (accessible ? 'فيديو ✓' : 'فيديو 🔒') : ''}
                                {l.is_free && <span className="text-success ml-2">🆓 مجاني</span>}
                              </span>
                            </span>
                            {!accessible && <Icon name="lock" className="mt-1 h-4 w-4 shrink-0 text-warning/60" />}
                            {isActive && accessible && <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-signal" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Card>

            {/* منطقة الفيديو + محتوى الدرس */}
            <div className="space-y-6">
              <div className="card-panel overflow-hidden rounded-lens">
                {isLessonAccessible && videoUrl ? (
                  <div className="aspect-video w-full">
                    <iframe
                      src={videoUrl}
                      title={activeLesson?.title || course.title}
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-ink-900/60">
                    <Icon name="lock" className="h-12 w-12 text-warning/60" />
                    <p className="font-display text-lg font-bold text-paper">
                      {activeLesson?.video_url ? 'هذا الدرس مقفول' : 'لا يوجد فيديو لهذا الدرس بعد'}
                    </p>
                    {activeLesson?.video_url && !isLessonAccessible && (
                      <div className="max-w-md text-center space-y-3">
                        <p className="text-sm text-muted">هذا الدرس متاح للطلاب المشتركين فقط.</p>
                        {!effectiveAccess && !isProfessional && (
                          <Button variant="secondary" onClick={() => setShowSubscribe(true)}>
                            <Icon name="lock" className="h-4 w-4" /> اشترك في الكورس
                          </Button>
                        )}
                        {effectiveAccess && !activeLesson?.accessible && activeLesson?.is_free === false && (
                          <p className="text-xs text-muted">الدرس ده مش مجاني — تواصل مع المستر لو محتاج تشوفه.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {isLessonAccessible && activeLesson?.description && (
                <Card>
                  <h2 className="mb-2 font-display text-lg font-bold">شرح الدرس</h2>
                  <div className="whitespace-pre-wrap leading-relaxed text-muted">{activeLesson.description}</div>
                </Card>
              )}

              {/* ===== الملفات ===== */}
              <section className="space-y-4">
                <div className="flex items-center gap-2"><Icon name="download" className="h-5 w-5 text-signal" /><h2 className="font-display text-lg font-bold">ملفات الدرس ({files.length})</h2></div>
                <Card className="space-y-4">
                  <form onSubmit={submitUpload} className="grid gap-3 sm:grid-cols-3">
                    <input name="upload_title" label="اسم ملفك" placeholder="مثال: حل التمارين" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="input-base" />
                    <div className="flex items-end">
                      <input type="file" accept=".pdf,.zip" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="focus-ring block w-full rounded-lens border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-paper file:mr-3 file:rounded-lens file:border-0 file:bg-signal/15 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-signal" />
                    </div>
                    <div className="flex items-end"><Button type="submit" loading={uploadSubmitting}>رفع ملف</Button></div>
                  </form>
                  {files.length === 0 ? (
                    <p className="text-sm text-muted">لا توجد ملفات بعد.</p>
                  ) : (
                    <ul className="divide-y divide-ink-700/60">
                      {files.map(f => {
                        const mine = f.uploaded_by === profile?.id;
                        return (
                          <li key={f.file_id} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 text-sm font-semibold text-paper">
                                <Badge color={f.file_type === 'pdf' ? 'danger' : f.file_type === 'zip' ? 'warning' : 'muted'}>
                                  {f.file_type === 'pdf' ? 'PDF' : f.file_type === 'zip' ? 'ZIP' : 'ملف'}
                                </Badge>
                                <span className="truncate">{f.title}</span>
                              </p>
                              <p className="text-xs text-muted">{f.uploader_name || 'طالب'} • {formatDateTime(f.created_at)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <a href={courseFileDownloadUrl(f)} target="_blank" rel="noreferrer" download>
                                <Button size="sm" variant="secondary"><Icon name="download" className="h-3.5 w-3.5" /> تحميل</Button>
                              </a>
                              {mine && <Button size="sm" variant="danger" onClick={() => removeFile(f.file_id)}><Icon name="trash" className="h-3.5 w-3.5" /></Button>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </section>

              {/* ===== التعليقات ===== */}
              <section className="space-y-4">
                <div className="flex items-center gap-2"><Icon name="chat" className="h-5 w-5 text-signal" /><h2 className="font-display text-lg font-bold">تعليقات ({comments.length})</h2></div>
                <Card className="space-y-4">
                  <form onSubmit={submitComment} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <textarea name="comment" label="اكتب تعليق أو سؤال للمستر" rows={2} placeholder="اسأل أو شارك معلومة..." value={commentBody} onChange={e => setCommentBody(e.target.value)} className="input-base min-h-[80px] resize-y" />
                    <Button type="submit" loading={commentSubmitting}><Icon name="send" className="h-4 w-4" /> إرسال</Button>
                  </form>
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted">لا توجد تعليقات بعد — كن أول من يعلق.</p>
                  ) : (
                    <ul className="space-y-3">
                      {comments.map(c => {
                        const mine = c.student_id === profile?.id;
                        return (
                          <li key={c.comment_id} className="rounded-lens bg-ink-800/60 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="flex items-center gap-2 text-xs text-muted"><span className="font-semibold text-paper">{c.student_name || 'طالب'}</span> {c.is_pinned && <Badge color="warning">📌 مثبّت</Badge>} <span>{formatDateTime(c.created_at)}</span></p>
                              {mine && <button type="button" onClick={() => removeMyComment(c.comment_id)} className="focus-ring text-muted hover:text-danger" aria-label="حذف تعليقك"><Icon name="trash" className="h-4 w-4" /></button>}
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-paper">{c.body}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Card>
              </section>

              {/* ===== الواجبات ===== */}
              <section className="space-y-4">
                <div className="flex items-center gap-2"><Icon name="edit" className="h-5 w-5 text-signal" /><h2 className="font-display text-lg font-bold">واجبات الكورس ({homeworks.length})</h2></div>
                {extraLoading ? <Skeleton className="h-24" /> : homeworks.length === 0 ? (
                  <Card className="text-sm text-muted">لا توجد واجبات في هذا الكورس حالياً.</Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {homeworks.map(h => (
                      <Card key={h.homework_id} className="flex flex-col gap-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lens bg-signal/15 text-signal"><Icon name="edit" className="h-5 w-5" /></div>
                          {h.submitted ? <Badge color="success">تم التسليم — {h.score}/{h.total_points}</Badge> : <Badge color="warning">لم يُسلّم</Badge>}
                        </div>
                        <div><h3 className="font-display font-bold text-paper">{h.title}</h3>{h.description && <p className="mt-1 text-sm text-muted line-clamp-2">{h.description}</p>}</div>
                        <div className="mt-auto pt-1">
                          {h.submitted ? <p className="text-sm font-semibold text-success">اتصحح وظهرت نتيجتك ✓</p> : <Link to={`/student/courses/${courseId}/homework/${h.homework_id}`}><Button size="sm" className="w-full">حل الواجب</Button></Link>}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default LessonView;