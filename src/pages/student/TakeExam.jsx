import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useExam } from '../../hooks/useExams.js';
import { fetchExamQuestionsForStudent, startExamAttempt } from '../../services/examService.js';
import { submitExam, fetchSubmissionForExam } from '../../services/submissionService.js';
import { useToast } from '../../components/ui/Toast.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import VisionLoader from '../../components/vision/VisionLoader.jsx';
import ExamHeader from '../../components/exam/ExamHeader.jsx';
import ExamTimer from '../../components/exam/ExamTimer.jsx';
import QuestionRenderer from '../../components/exam/QuestionRenderer.jsx';
import QuestionNavigation from '../../components/exam/QuestionNavigation.jsx';
import ExamProgress from '../../components/exam/ExamProgress.jsx';
import SubmitExamModal from '../../components/exam/SubmitExamModal.jsx';
import SubscriptionGate from '../../components/academy/SubscriptionGate.jsx';
import { formatDate } from '../../utils/formatDate.js';
import { getFriendlyError } from '../../utils/errors.js';
import { computeRemainingSeconds } from '../../utils/examTime.js';
import { saveDraft, loadDraft, clearDraft } from '../../utils/examDraft.js';

/** هل نص الخطأ يعني "سبق تسليم هذا الامتحان" (حتى لو الاستجابة نفسها ضاعت) */
function isAlreadySubmittedError(error) {
  const msg = error?.message || '';
  return (
    error?.code === '23505' ||
    msg.includes('already submitted') ||
    msg.includes('محاولة واحدة')
  );
}

export default function TakeExam() {
  const { examId } = useParams();
  const { profile } = useAuth();
  const toast = useToast();

  const { exam, submission, loading } = useExam(examId);
  // override محلي بعد نجاح التسليم (حتى تظهر شاشة المراجعة فورًا بدون إعادة تحميل)
  const [submissionOverride, setSubmissionOverride] = useState(null);
  const effectiveSubmission = submissionOverride ?? submission;

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparing, setPreparing] = useState(true);
  const [questionsError, setQuestionsError] = useState(null);
  const [startError, setStartError] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const alreadySubmitted = Boolean(effectiveSubmission);
  const nowOpen = useMemo(() => {
    if (!exam) return false;
    const start = exam.start_at ? new Date(exam.start_at).getTime() : -Infinity;
    const end = exam.end_at ? new Date(exam.end_at).getTime() : Infinity;
    return Date.now() >= start && Date.now() <= end;
  }, [exam]);

  // ===== بدء المحاولة + جلب الأسئلة =====
  // - المراجعة بعد التسليم: الأسئلة متاحة في أي وقت (من غير محاولة جديدة)
  // - الحل الحي: start_exam_attempt أولاً (يفرض النشر/الصف/الخصوصية/الوقت من الخادم
  //   ويرجّع deadline الموحد) ثم جلب الأسئلة.
  // - أول جلب للأسئلة يثبت بدء المحاولة في قاعدة البيانات — تحديث الصفحة لا يصفّر المؤقت.
  useEffect(() => {
    if (!examId || !exam) return;
    let active = true;
    setPreparing(true);
    setQuestionsError(null);
    setStartError(null);

    // مؤقت أمان: لو الطلب علّق 15 ثانية → نوقف اللودر ونظهر رسالة بدل الانتظار للأبد
    const safetyTimer = setTimeout(() => {
      if (!active) return;
      console.error('[TakeExam] مهلة تحميل الامتحان انتهت (15 ثانية)');
      setQuestionsError('استغرقت العملية وقت طويل جداً — تأكد من اتصالك بالإنترنت وحاول مرة أخرى');
      setPreparing(false);
    }, 15000);

    const fetchQuestions = (isReview) =>
      fetchExamQuestionsForStudent(examId).then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setQuestionsError(getFriendlyError(error, 'فشل تحميل الأسئلة'));
          return;
        }
        setQuestions(data || []);
        if (!isReview) {
          // استرجاع المسودة المحلية (إجابات لم تُسلم بعد — لا تضيع بالتحديث أو الانقطاع)
          const draft = profile?.id ? loadDraft(window.localStorage, examId, profile.id) : null;
          const init = {};
          (data || []).forEach((q) => {
            const d = draft ? draft[q.id] : undefined;
            init[q.id] =
              d !== undefined && d !== null && d !== ''
                ? d
                : q.type === 'short_answer'
                  ? ''
                  : null;
          });
          setAnswers(init);
        }
      });

    const run = async () => {
      // مسار المراجعة: مسلّم من قبل → الأسئلة للمراجعة فقط
      if (alreadySubmitted) {
        await fetchQuestions(true);
        return;
      }

      // مش في النافذة الزمنية → مفيش جلب أسئلة أصلاً (شاشة "غير متاح" بتتكفل)
      if (!nowOpen) return;

      // بدء المحاولة من الخادم — المصدر الوحيد للمؤقت والصلاحية
      const { data: attemptData, error: startErr } = await startExamAttempt(examId);
      if (!active) return;
      if (startErr) {
        setStartError(getFriendlyError(startErr, 'تعذر بدء الامتحان'));
        return;
      }
      if (attemptData?.already_submitted) {
        // سلم في تاب آخر — نجيب التسليم ونعرض المراجعة
        const { data: sub } = await fetchSubmissionForExam(profile?.id, examId);
        if (active && sub) setSubmissionOverride(sub);
        return;
      }
      setAttempt(attemptData);
      await fetchQuestions(false);
    };

    run()
      .catch((err) => {
        if (!active) return;
        console.error('[TakeExam] فشل تحضير الامتحان:', err);
        setQuestionsError(getFriendlyError(err, 'فشل تحميل الأسئلة'));
      })
      .finally(() => {
        // إلغاء مؤقت الأمان فور اكتمال التحضير (نجاحًا أو فشلًا) حتى لا يطلق خطأً لاحقًا
        clearTimeout(safetyTimer);
        if (active) setPreparing(false);
      });

    return () => {
      active = false;
      clearTimeout(safetyTimer);
    };
  }, [examId, exam, retryKey, alreadySubmitted, nowOpen, profile?.id]);

  // حفظ تلقائي للإجابات في مسودة محلية (كل تغيير) — فقط أثناء الحل وبدون تسليم
  useEffect(() => {
    if (alreadySubmitted || !examId || !profile?.id) return;
    if (!questions.length) return;
    saveDraft(window.localStorage, examId, profile.id, answers);
  }, [answers, questions.length, alreadySubmitted, examId, profile?.id]);

  // تحذير قبل مغادرة الصفحة والإجابات غير مسلمة
  const hasAnyAnswer = useMemo(
    () => Object.values(answers).some((v) => v !== null && v !== undefined && String(v).trim() !== ''),
    [answers]
  );
  useEffect(() => {
    if (alreadySubmitted || !hasAnyAnswer) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [alreadySubmitted, hasAnyAnswer]);

  const unansweredCount = questions.filter((q) => {
    const v = answers[q.id];
    return v === null || v === undefined || String(v).trim() === '';
  }).length;

  const answerCount = questions.length - unansweredCount;

  const handleChange = useCallback((qid, value) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }, []);

  // doSubmit: دالة مستقرة (بتقرأ الإجابات من ref) ومحمية من الاستدعاء الخاطئ.
  // عند الفشل: الطالب يفضل في نفس الصفحة وإجاباته محفوظة (محليًا وفي الحالة) —
  // مفيش انتقال تلقائي لممكن يضيع الشغل، وممكن يعيد المحاولة.
  const doSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    if (alreadySubmitted) return;
    submittingRef.current = true;
    setSubmitting(true);
    const { error } = await submitExam(examId, answersRef.current);
    submittingRef.current = false;
    setSubmitting(false);
    setModalOpen(false);

    if (error) {
      // الحالة الخاصة: الخادم سجل التسليم فعلاً لكن الاستجابة ضاعت (انقطاع لحظي)
      // → نتحقق من الخادم مباشرة؛ لو موجود نعتبرها نجاح ولا نضيع إجابات الطالب
      if (isAlreadySubmittedError(error)) {
        const { data: sub } = await fetchSubmissionForExam(profile?.id, examId);
        if (sub) {
          clearDraft(window.localStorage, examId, profile?.id);
          setSubmissionOverride(sub);
          toast.success('تم تسليم هذا الامتحان من قبل — محاولتك محفوظة عندنا');
          return;
        }
        toast.error('انت سلّمت هذا الامتحان من قبل — محاولة واحدة فقط');
        return;
      }

      const msg = error.message || '';
      if (msg.includes('مشتركين') || msg.includes('المشتركين') || msg.includes('الحجز')) {
        setStartError(
          'هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات، وإجاباتك محفوظة عندك.'
        );
      } else if (msg.includes('لم يبدأ') || msg.includes('انتهى وقت')) {
        toast.error('انتهى وقت الامتحان — تعذر إكمال التسليم');
      } else {
        toast.error(getFriendlyError(error, 'فشل التسليم، حاول مرة أخرى — إجاباتك محفوظة'));
      }
      // نبقى في نفس الصفحة: الإجابات في الحالة + المسودة المحلية
      return;
    }

    // نجاح مؤكد من الخادم → مسح المسودة وعرض شاشة المراجعة
    clearDraft(window.localStorage, examId, profile?.id);
    toast.success('تم تسليم الامتحان بنجاح ✅');
    const { data: sub } = await fetchSubmissionForExam(profile?.id, examId);
    if (sub) {
      setSubmissionOverride(sub);
    } else {
      setSubmissionOverride({ exam_id: examId, answers: answersRef.current, grade_released: false });
    }
  }, [examId, profile?.id, toast, alreadySubmitted]);

  // الثواني المتبقية من موعد الخادم (لا يُصفَّر بالتحديث — نفس محاولة الطالب)
  const remainingSeconds = useMemo(() => {
    if (!attempt?.deadline || !attempt?.server_now) return null;
    return computeRemainingSeconds(attempt.server_now, attempt.deadline);
  }, [attempt]);

  // ===== شاشات الحالات =====
  if (loading) return <VisionLoader />;

  if (!exam) {
    return (
      <SubscriptionGate>
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <p className="text-muted">الامتحان غير موجود أو غير متاح لصفك.</p>
          <Link to="/student/exams">
            <Button variant="secondary">الرجوع للامتحانات</Button>
          </Link>
        </Card>
      </SubscriptionGate>
    );
  }

  // متسلم بالفعل → شاشة قفل + مراجعة إجاباتي (قراءة فقط — من Snapshot لو متاح)
  if (alreadySubmitted) {
    if (preparing) return <VisionLoader message="جاري تحميل مراجعتك..." />;
    const reviewQuestions =
      Array.isArray(effectiveSubmission?.review_questions) && effectiveSubmission.review_questions.length > 0
        ? effectiveSubmission.review_questions
        : questions;
    return (
      <SubmittedView
        exam={exam}
        submission={effectiveSubmission}
        questions={reviewQuestions}
        answers={effectiveSubmission?.answers || {}}
      />
    );
  }

  // منع بدء المحاولة من الخادم (خصوصية/اشتراك أو غيره)
  if (startError) {
    const isSubscription = startError.includes('مشتركين') || startError.includes('المشتركين');
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-2xl text-warning">
          {isSubscription ? '🔒' : '⏳'}
        </div>
        <p className="font-display text-lg font-bold">
          {isSubscription ? 'هذا الامتحان خاص بالمشتركين' : 'تعذر بدء الامتحان'}
        </p>
        <p className="max-w-md text-sm text-muted">{startError}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setRetryKey((k) => k + 1)}>إعادة المحاولة</Button>
          {isSubscription && (
            <Link to="/student/bookings">
              <Button variant="secondary">تفعيل الاشتراك</Button>
            </Link>
          )}
          <Link to="/student/exams">
            <Button variant="secondary">الرجوع للامتحانات</Button>
          </Link>
        </div>
      </Card>
    );
  }

  // فشل تحميل الأسئلة
  if (questionsError) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger/15 text-2xl text-danger">⚠️</div>
        <p className="font-display text-lg font-bold">مش قادرين نحمّل أسئلة الامتحان</p>
        <p className="max-w-md text-sm text-muted">{questionsError}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setRetryKey((k) => k + 1)}>إعادة المحاولة</Button>
          <Link to="/student/exams">
            <Button variant="secondary">الرجوع للامتحانات</Button>
          </Link>
        </div>
      </Card>
    );
  }

  // مش في النافذة الزمنية
  if (!nowOpen) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-2xl text-warning">⏳</div>
        <p className="font-display text-lg font-bold">الامتحان مش متاح حالياً</p>
        <p className="max-w-md text-sm text-muted">
          {exam.start_at && new Date(exam.start_at).getTime() > Date.now()
            ? `هيبدأ يوم ${formatDate(exam.start_at)}`
            : 'انتهى وقت الامتحان أو لسه ميتفتحش.'}
        </p>
        <Link to="/student/exams">
          <Button variant="secondary">الرجوع</Button>
        </Link>
      </Card>
    );
  }

  if (preparing) {
    return <VisionLoader message="جاري تجهيز الامتحان..." />;
  }

  // الامتحان مفيش فيه أسئلة خالص
  if (questions.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-2xl text-warning">📝</div>
        <p className="font-display text-lg font-bold">الامتحان مفيش فيه أسئلة لسه</p>
        <p className="max-w-md text-sm text-muted">رجّع نفسك للمستر، أو راجع صفحة الامتحانات.</p>
        <Link to="/student/exams">
          <Button variant="secondary">الرجوع للامتحانات</Button>
        </Link>
      </Card>
    );
  }

  const question = questions[current];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ExamHeader exam={exam} />

      {/* شريط العد + التقدم — العد مصدره الخادم (نفس موعد الاستقطاع المفروض في التسليم) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {exam.duration_minutes ? (
          remainingSeconds !== null ? (
            <ExamTimer seconds={remainingSeconds} onExpire={doSubmit} />
          ) : (
            <ExamTimer seconds={exam.duration_minutes * 60} onExpire={doSubmit} />
          )
        ) : (
          <Badge color="muted">بدون وقت محدد</Badge>
        )}
        <ExamProgress answeredCount={answerCount} total={questions.length} currentIndex={current} />
      </div>

      {/* السؤال الحالي */}
      <Card key={question.id} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold leading-relaxed">
            <span className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-lens bg-signal/15 font-mono text-sm text-signal">
              {current + 1}
            </span>
            {question.question_text}
          </h2>
          <Badge color="muted">{question.points} نقطة</Badge>
        </div>
        <QuestionRenderer question={question} value={answers[question.id]} onChange={handleChange} />
      </Card>

      {/* تنقل بين الأسئلة */}
      <Card>
        <QuestionNavigation questions={questions} answers={answers} currentIndex={current} onSelect={setCurrent} />
      </Card>

      {/* أزرار */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          السابق
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)}>التالي</Button>
        ) : (
          <Button variant="danger" onClick={() => setModalOpen(true)}>
            تسليم الامتحان نهائياً
          </Button>
        )}
      </div>

      <SubmitExamModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={doSubmit}
        unansweredCount={unansweredCount}
        submitting={submitting}
      />
    </div>
  );
}

/** شاشة عرض تسليم الطالب بعد القفل — قراءة فقط */
function SubmittedView({ exam, submission, questions, answers }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ExamHeader exam={exam} />
      <Card className="space-y-3 border-success/30 bg-success/5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-2xl text-success">✓</span>
          <div>
            <p className="font-display text-lg font-bold">تم تسليم هذا الامتحان نهائياً</p>
            <p className="text-sm text-muted">
              محاولة واحدة لكل امتحان — مسلتك {formatDate(submission?.submitted_at)}.
              {submission?.grade_released
                ? ` درجتك: ${submission.score} نقطة`
                : ' الدرجة هتظهر هنا بعد ما المستر يراجع ويعلنها.'}
            </p>
          </div>
        </div>
      </Card>

      <h2 className="font-display text-xl font-black">مراجعة إجاباتك</h2>
      <div className="space-y-4">
        {questions.map((q, i) => {
          const myAnswer = answers[q.id];
          const isShort = q.type === 'short_answer';
          return (
            <Card key={q.id} className="space-y-2">
              <p className="font-display font-bold">
                <span className="ml-2 text-signal">{i + 1}.</span> {q.question_text}
              </p>
              <div className="rounded-lens bg-ink-900/60 px-3 py-2 text-sm">
                <span className="ml-2 text-muted">إجابتك:</span>
                {myAnswer ? (
                  isShort ? (
                    <span className="text-paper">{myAnswer}</span>
                  ) : (
                    <span className="text-paper">
                      {q.type === 'true_false' ? (myAnswer === 'true' ? 'صح' : 'غلط') : myAnswer}
                    </span>
                  )
                ) : (
                  <span className="text-danger">لم تجب</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Link to="/student/exams">
        <Button variant="secondary">الرجوع للامتحانات</Button>
      </Link>
    </div>
  );
}
