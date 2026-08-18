import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useCourse } from '../../hooks/useCourses.js';
import { useAuth } from '../../hooks/useAuth.js';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Input from '../../components/ui/Input.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import SubscriptionGate from '../../components/academy/SubscriptionGate.jsx';
import {
  fetchCourseLessons,
  fetchCourseHomeworks,
  fetchCourseFiles,
  fetchCourseComments,
  addCourseComment,
  deleteCourseComment,
  uploadCourseFile,
  addCourseFile,
  deleteCourseFile,
  courseFileDownloadUrl
} from '../../services/courseService.js';
import { createBooking } from '../../services/bookingService.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { GRADE_SHORT } from '../../config/site.js';
import { PAYMENT_INFO } from '../../config/constants.js';
import { getFriendlyError } from '../../utils/errors.js';
import { cn } from '../../lib/utils.js';
import { formatDateTime } from '../../utils/formatDate.js';

/** يحوّل أي رابط يوتيوب (watch / youtu.be / shorts) لصيغة embed الصالحة للتضمين */
function toEmbedUrl(url) {
  if (!url) return '';
  if (url.includes('/embed/')) return url;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (match) return `https://www.youtube.com/embed/${match[1]}`;
  return url;
}

export default function CourseDetails() {
  const { courseId } = useParams();
  const { profile } = useAuth();
  const { course, loading } = useCourse(courseId, profile?.grade);
  const toast = useToast();

  const [lessons, setLessons] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [files, setFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [extraLoading, setExtraLoading] = useState(true);
  const [canAccess, setCanAccess] = useState(false);

  // تعليقات
  const [commentBody, setCommentBody] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // رفع ملفات (الطلاب)
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // اشتراك احترافي
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [subForm, setSubForm] = useState({ parent_phone: '', transfer_number: '' });
  const [submittingSub, setSubmittingSub] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setExtraLoading(true);
    Promise.all([
      fetchCourseLessons(courseId),
      fetchCourseHomeworks(courseId),
      fetchCourseFiles(courseId),
      fetchCourseComments(courseId)
    ])
      .then(([l, h, f, c]) => {
        const lessonList = Array.isArray(l.data) ? l.data : [];
        const hwList = Array.isArray(h.data) ? h.data : [];
        setLessons(lessonList);
        setHomeworks(hwList);
        setFiles(Array.isArray(f.data) ? f.data : []);
        setComments(Array.isArray(c.data) ? c.data : []);
        setActiveLessonId(lessonList[0]?.lesson_id || null);
        const contentBased = lessonList.length > 0 || hwList.length > 0 || (f.data && f.data.length > 0);
        setCanAccess(contentBased || (course?.accessible ?? false));
        setExtraLoading(false);
      })
      .catch(() => setExtraLoading(false));
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!course) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <p className="text-muted">الكورس ده مش موجود.</p>
        <Link to="/student/courses">
          <Button variant="secondary">رجوع للكورسات</Button>
        </Link>
      </Card>
    );
  }

  const isProfessional = course.grade === 'professional';
  const isMyGrade = profile?.grade === course.grade;
  // الاحترافي: الوصول الرسمي من get_student_courses (accessible) — للمشترك من غير محتوى لسه
  const effectiveAccess = canAccess || Boolean(course?.accessible);
  // الكورس الاحترافي متاح للمشترك فيه من أي صف (أولى/تانية يقدر يشترك ويشاهد)
  const canWatch = Boolean(profile) && effectiveAccess && (isProfessional || isMyGrade);
  const activeLesson = lessons.find((l) => l.lesson_id === activeLessonId);
  const videoUrl = toEmbedUrl(activeLesson?.video_url || course.video_url);
  const instagram = PAYMENT_INFO.instagramNumber;

  // ===== التعليقات =====
  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return toast.error('اكتب تعليقك الأول');
    setCommentSubmitting(true);
    const { error } = await addCourseComment(courseId, commentBody);
    setCommentSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل إضافة التعليق'));
    setCommentBody('');
    toast.success('تمت إضافة تعليقك');
    const { data } = await fetchCourseComments(courseId);
    setComments(data || []);
  };

  const removeMyComment = async (commentId) => {
    if (!window.confirm('حذف تعليقك؟')) return;
    const { error } = await deleteCourseComment(commentId);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم الحذف');
    const { data } = await fetchCourseComments(courseId);
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

    const { error } = await addCourseFile(courseId, { title: uploadTitle.trim(), fileUrl: upload.fileUrl, fileType: upload.fileType });
    setUploadSubmitting(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحفظ'));
    toast.success('تم رفع ملفك');
    setUploadTitle('');
    setUploadFile(null);
    const { data } = await fetchCourseFiles(courseId);
    setFiles(data || []);
  };

  const removeFile = async (fileId) => {
    if (!window.confirm('حذف هذا الملف؟')) return;
    const { error } = await deleteCourseFile(fileId);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم الحذف');
    const { data } = await fetchCourseFiles(courseId);
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
    toast.success('تم إرسال طلب اشتراكك — قيد مراجعة المستر، وكمل الخطوات اللي تحت');
  };

  const gradeLabel = GRADE_SHORT[course.grade] || course.grade;

  return (
    <SubscriptionGate>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-stream">#{String(course.order_index || 1).padStart(2, '0')} — {gradeLabel}</p>
            <h1 className="mt-1 font-display text-2xl font-black">{course.title}</h1>
            {isProfessional && course.price != null && (
              <p className="mt-1 text-sm font-bold text-signal">💰 سعر الكورس: {course.price} جنيه</p>
            )}
          </div>
          <Link to="/student/courses">
            <Button variant="secondary" size="sm">
              <Icon name="chevronRight" className="h-4 w-4" /> كل الكورسات
            </Button>
          </Link>
        </div>

        {/* ===== الكورس الاحترافي غير المشترك: عرض السعر + الاشتراك ===== */}
        {isProfessional && !canWatch && !effectiveAccess ? (
          <Card className="space-y-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-black">اشترك في {course.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {course.description || 'كورس احترافي بنظام مستويات — اشترك علشان يفتح ليك.'}
                </p>
              </div>
              <div className="text-center">
                <p className="font-display text-3xl font-black text-signal">{course.price ?? '—'} <span className="text-base font-bold text-muted">جنيه</span></p>
                {!showSubscribe && (
                  <Button className="mt-2" onClick={() => setShowSubscribe(true)}>
                    <Icon name="lock" className="h-4 w-4" /> اشترك
                  </Button>
                )}
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
                  <Input
                    name="parent_phone"
                    label="موبايل ولي الأمر (اختياري)"
                    dir="ltr"
                    placeholder="01xxxxxxxxx"
                    value={subForm.parent_phone}
                    onChange={(e) => setSubForm({ ...subForm, parent_phone: e.target.value })}
                  />
                  <Input
                    name="transfer_number"
                    label="الرقم اللي حولت منه *"
                    dir="ltr"
                    placeholder="01xxxxxxxxx"
                    value={subForm.transfer_number}
                    onChange={(e) => setSubForm({ ...subForm, transfer_number: e.target.value })}
                    required
                  />
                  <div className="sm:col-span-2">
                    <Button type="submit" loading={submittingSub} className="w-full">إرسال طلب الاشتراك</Button>
                  </div>
                </form>
                <p className="text-xs text-muted">
                  بعد الإرسال هتنتظر المستر يؤكد اشتراكك — وبعدها الكورس هيشتغل ليك. سؤال؟ كلم المستر من الشات.
                </p>
              </div>
            )}
          </Card>
        ) : (
          <>
            {/* ===== المحاضرات + الفيديو ===== */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="overflow-hidden lg:col-span-1">
                <div className="flex items-center gap-2 border-b border-ink-600 px-4 py-3">
                  <Icon name="play" className="h-4 w-4 text-signal" />
                  <p className="font-display text-sm font-bold text-paper">المحاضرات ({lessons.length})</p>
                </div>
                <div className="max-h-[50vh] overflow-y-auto">
                  {extraLoading ? (
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-12" />
                      <Skeleton className="h-12" />
                    </div>
                  ) : lessons.length === 0 ? (
                    <p className="p-4 text-center text-sm text-muted">لا توجد محاضرات بعد — تابعنا.</p>
                  ) : (
                    <ul>
                      {lessons.map((l, i) => (
                        <li key={l.lesson_id}>
                          <button
                            type="button"
                            onClick={() => setActiveLessonId(l.lesson_id)}
                            className={cn(
                              'focus-ring flex w-full items-start gap-3 border-b border-ink-700/50 px-4 py-3 text-right transition hover:bg-ink-800/60',
                              activeLessonId === l.lesson_id && 'bg-signal/10'
                            )}
                          >
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-xs text-muted">
                              {String(i + 1).padStart(2, '0')}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-paper">{l.title}</span>
                              <span className="block text-xs text-muted">
                                {l.video_url ? 'فيديو ✓' : ''}
                                {l.content ? (l.video_url ? ' • نص ✓' : 'نص ✓') : ''}
                              </span>
                            </span>
                            {activeLessonId === l.lesson_id && <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-signal" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Card>

              <div className="space-y-6 lg:col-span-2">
                <div className="card-panel overflow-hidden rounded-lens">
                  {canWatch && videoUrl ? (
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
                      <Icon name="eye" className="h-12 w-12 text-signal/60" />
                      <p className="font-display text-lg font-bold text-paper">
                        {canWatch ? 'لا يوجد فيديو لهذا الدرس بعد' : 'الفيديو متاح لطلاب هذا الصف فقط'}
                      </p>
                      {!canWatch && (
                        <p className="max-w-md text-center text-sm text-muted">
                          الكورسات الكاملة متاحة للطلاب المسجلين في الصف المطابق. سجّل حسابك أو تواصل مع المستر لو محتاج وصول.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* نص المحاضرة */}
                {canWatch && activeLesson?.content && (
                  <Card>
                    <h2 className="mb-2 font-display text-lg font-bold">شرح المحاضرة</h2>
                    <div className="whitespace-pre-wrap leading-relaxed text-muted">{activeLesson.content}</div>
                  </Card>
                )}
              </div>
            </div>

            {/* ===== الملفات (PDF/ZIP) ===== */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Icon name="download" className="h-5 w-5 text-signal" />
                <h2 className="font-display text-lg font-bold">ملفات الدرس ({files.length})</h2>
              </div>

              <Card className="space-y-4">
                <form onSubmit={submitUpload} className="grid gap-3 sm:grid-cols-3">
                  <Input
                    name="upload_title"
                    label="اسم ملفك"
                    placeholder="مثال: حل التمارين"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                  />
                  <div className="flex items-end">
                    <input
                      type="file"
                      accept=".pdf,.zip"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="focus-ring block w-full rounded-lens border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-paper file:mr-3 file:rounded-lens file:border-0 file:bg-signal/15 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-signal"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" loading={uploadSubmitting}>رفع ملف</Button>
                  </div>
                </form>

                {files.length === 0 ? (
                  <p className="text-sm text-muted">لا توجد ملفات بعد — المستر أو الطلاب هينزّلوها هنا.</p>
                ) : (
                  <ul className="divide-y divide-ink-700/60">
                    {files.map((f) => {
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
                            <p className="text-xs text-muted">
                              {f.uploader_name || 'طالب'} • {formatDateTime(f.created_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <a href={courseFileDownloadUrl(f)} target="_blank" rel="noreferrer" download>
                              <Button size="sm" variant="secondary">
                                <Icon name="download" className="h-3.5 w-3.5" /> تحميل
                              </Button>
                            </a>
                            {mine && (
                              <Button size="sm" variant="danger" onClick={() => removeFile(f.file_id)}>
                                <Icon name="trash" className="h-3.5 w-3.5" />
                              </Button>
                            )}
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
              <div className="flex items-center gap-2">
                <Icon name="chat" className="h-5 w-5 text-signal" />
                <h2 className="font-display text-lg font-bold">تعليقات ({comments.length})</h2>
              </div>

              <Card className="space-y-4">
                <form onSubmit={submitComment} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Textarea
                    name="comment"
                    label="اكتب تعليق أو سؤال للمستر"
                    rows={2}
                    placeholder="اسأل أو شارك معلومة..."
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                  />
                  <Button type="submit" loading={commentSubmitting}>
                    <Icon name="send" className="h-4 w-4" /> إرسال
                  </Button>
                </form>

                {comments.length === 0 ? (
                  <p className="text-sm text-muted">لا توجد تعليقات بعد — كن أول من يعلق.</p>
                ) : (
                  <ul className="space-y-3">
                    {comments.map((c) => {
                      const mine = c.student_id === profile?.id;
                      return (
                        <li key={c.comment_id} className="rounded-lens bg-ink-800/60 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-2 text-xs text-muted">
                              <span className="font-semibold text-paper">{c.student_name || 'طالب'}</span>
                              {c.is_pinned && <Badge color="warning">📌 مثبّت</Badge>}
                              <span>{formatDateTime(c.created_at)}</span>
                            </p>
                            {mine && (
                              <button
                                type="button"
                                onClick={() => removeMyComment(c.comment_id)}
                                className="focus-ring text-muted hover:text-danger"
                                aria-label="حذف تعليقك"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            )}
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
              <div className="flex items-center gap-2">
                <Icon name="edit" className="h-5 w-5 text-signal" />
                <h2 className="font-display text-lg font-bold">واجبات الدرس ({homeworks.length})</h2>
              </div>

              {extraLoading ? (
                <Skeleton className="h-24" />
              ) : homeworks.length === 0 ? (
                <Card className="text-sm text-muted">لا توجد واجبات في هذا الدرس حالياً.</Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {homeworks.map((h) => (
                    <Card key={h.homework_id} className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lens bg-signal/15 text-signal">
                          <Icon name="edit" className="h-5 w-5" />
                        </div>
                        {h.submitted ? (
                          <Badge color="success">تم التسليم — {h.score}/{h.total_points}</Badge>
                        ) : (
                          <Badge color="warning">لم يُسلّم</Badge>
                        )}
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-paper">{h.title}</h3>
                        {h.description && <p className="mt-1 text-sm text-muted line-clamp-2">{h.description}</p>}
                      </div>
                      <div className="mt-auto pt-1">
                        {h.submitted ? (
                          <p className="text-sm font-semibold text-success">اتصحح وظهرت نتيجتك ✓</p>
                        ) : (
                          <Link to={`/student/courses/${courseId}/homework/${h.homework_id}`}>
                            <Button size="sm" className="w-full">
                              حل الواجب
                            </Button>
                          </Link>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </SubscriptionGate>
  );
}