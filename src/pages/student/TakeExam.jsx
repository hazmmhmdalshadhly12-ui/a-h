import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useExam } from '../../hooks/useExams.js';
import { fetchExamQuestionsForStudent } from '../../services/examService.js';
import { submitExam } from '../../services/submissionService.js';
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
import { formatDate } from '../../utils/formatDate.js';

export default function TakeExam() {
  const { examId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const { exam, submission, loading } = useExam(examId);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparing, setPreparing] = useState(true);

  useEffect(() => {
    if (!examId) return;

    let active = true;

    if (exam) {
      setPreparing(true);
      fetchExamQuestionsForStudent(examId)
        .then((data) => {
          if (!active) return;
          setQuestions(data || []);

          const init = {};
          (data || []).forEach((q) => {
            init[q.id] = q.type === 'short_answer' ? '' : null;
          });
          setAnswers(init);
        })
        .catch((err) => {
          console.error("Error fetching questions:", err);
        })
        .finally(() => {
          if (active) setPreparing(false);
        });
    } else if (!loading && !exam) {
      if (active) setPreparing(false);
    }

    return () => {
      active = false;
    };
  }, [examId, exam, loading]);

  const alreadySubmitted = Boolean(submission);

  const nowOpen = useMemo(() => {
    if (!exam) return false;
    const start = exam.start_at ? new Date(exam.start_at).getTime() : -Infinity;
    const end = exam.end_at ? new Date(exam.end_at).getTime() : Infinity;
    return Date.now() >= start && Date.now() <= end;
  }, [exam]);

  const unansweredCount = questions.filter((q) => {
    const v = answers[q.id];
    return v === null || v === undefined || String(v).trim() === '';
  }).length;

  const answerCount = questions.length - unansweredCount;

  const handleChange = useCallback((qid, value) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }, []);

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    const { data, error } = await submitExam(examId, answers);
    setSubmitting(false);
    setModalOpen(false);

    if (error) {
      if (error.code === '23505' || error.message?.includes('already submitted')) {
        toast.error('أنت سلمت هذا الامتحان من قبل - محاولة واحدة فقط');
      } else {
        toast.error(error.message || 'فشل التسليم، حاول مرة أخرى');
      }
      navigate('/student/exams', { replace: true });
      return;
    }

    toast.success('تم تسليم الامتحان بنجاح! 🎯');
    navigate(`/student/exams/${examId}`, { replace: true });
  }, [answers, examId, navigate, toast]);

  if (loading) return <VisionLoader />;

  if (!exam) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <p className="text-muted">الامتحان غير موجود</p>
        <Link to="/student/exams">
          <Button variant="secondary">الرجوع للائمتحانات</Button>
        </Link>
      </Card>
    );
  }

  if (alreadySubmitted) {
    if (preparing) return <VisionLoader message="جاري تحميل مراجعتك..." />;
    return <SubmittedView exam={exam} submission={submission} questions={questions} answers={answers} />;
  }

  if (!nowOpen) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper">⏳</div>
        <p className="font-display text-lg font-bold">الامتحان مش متاح حالياً</p>
        <p className="max-w-md text-sm text-muted">
          {exam.start_at && new Date(exam.start_at).getTime() > Date.now()
            ? `يبدأ يوم ${formatDate(exam.start_at)}`
            : 'انتهى وقت الامتحان أو لم يفتح بعد'}
        </p>
        <Link to="/student/exams">
          <Button variant="secondary">رجوع</Button>
        </Link>
      </Card>
    );
  }

  if (preparing || questions.length === 0) {
    return <VisionLoader message="جاري تجهيز الامتحان..." />;
  }

  const question = questions[current];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ExamHeader exam={exam} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        {exam.duration_minutes ? (
          <ExamTimer seconds={exam.duration_minutes * 60} onExpire={doSubmit} />
        ) : (
          <Badge color="muted">بدون وقت محدد</Badge>
        )}
        <ExamProgress answeredCount={answerCount} total={questions.length} />
      </div>

      <Card key={question.id} className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-lg font-bold leading-relaxed">
            <span className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper text-sm">
              {current + 1}
            </span>
            {question.question_text}
          </h2>
          <Badge color="muted">{question.points} نقاط</Badge>
        </div>
        <QuestionRenderer question={question} value={answers[question.id]} onChange={(v) => handleChange(question.id, v)} />
      </Card>

      <Card>
        <QuestionNavigation questions={questions} answers={answers} current={current} onSelect={setCurrent} />
      </Card>

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

function SubmittedView({ exam, submission, questions, answers }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <ExamHeader exam={exam} />
      <Card className="space-y-3 border-success/30 bg-success/5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-xl">✅</span>
          <div>
            <p className="font-display text-lg font-bold">تم تسليم هذا الامتحان نهائياً</p>
            <p className="text-sm text-muted">
              مسجل بتاريخ {formatDate(submission?.submitted_at)}
              {submission?.grade_released
                ? ` | درجتك: ${submission.score}`
                : ' | الدرجة ستظهر بعد التصحيح.'}
            </p>
          </div>
        </div>
      </Card>

      <h2 className="font-display text-xl font-black">مراجعة إجاباتك</h2>
      <div className="space-y-4">
        {questions.map((q, i) => {
          const myAnswer = answers ? answers[q.id] : null;
          return (
            <Card key={q.id} className="space-y-2">
              <p className="font-display font-bold">
                <span className="ml-2 text-signal">{i + 1}.</span>
                {q.question_text}
              </p>
              <div className="rounded-lens bg-ink-900/60 px-3 py-2 text-sm">
                <span className="ml-2 text-muted">إجابتك:</span>
                {myAnswer ? (
                  <span className="text-paper">{String(myAnswer)}</span>
                ) : (
                  <span className="text-danger">لم تجب</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Link to="/student/exams">
        <Button variant="secondary">الرجوع للائمتحانات</Button>
      </Link>
    </div>
  );
}
