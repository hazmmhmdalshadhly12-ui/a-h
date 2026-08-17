import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import SubscriptionGate from '../../components/academy/SubscriptionGate.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { fetchHomeworkQuestionsForStudent, submitHomework } from '../../services/courseService.js';
import { getFriendlyError } from '../../utils/errors.js';
import { cn } from '../../lib/utils.js';

/** حل واجب + تسليم — النتيجة بتظهر فوراً صح/خطأ مع الدرجة */
export default function HomeworkTake() {
  const { homeworkId, courseId } = useParams();
  const toast = useToast();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!homeworkId) return;
    fetchHomeworkQuestionsForStudent(homeworkId).then(({ data, error: e }) => {
      setQuestions(Array.isArray(data) ? data : []);
      setError(e || null);
      setLoading(false);
    });
  }, [homeworkId]);

  const setAnswer = (questionId, value) => setAnswers((a) => ({ ...a, [questionId]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const unanswered = questions.filter((q) => !answers[q.question_id]);
    if (unanswered.length > 0) {
      return toast.error('جاوب على كل الأسئلة الأول');
    }
    setSubmitting(true);
    const { data, error: e } = await submitHomework(homeworkId, answers);
    setSubmitting(false);
    if (e) return toast.error(getFriendlyError(e, 'فشل تسليم الواجب'));
    setResult(data);
    toast.success('تم تسليم الواجب — اتصلح آلياً');
  };

  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 1), 0);

  return (
    <SubscriptionGate>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-black">حل الواجب</h1>
            <p className="mt-1 text-sm text-muted">جاوب على كل الأسئلة وبعدين سلم — النتيجة بتظهر فوراً.</p>
          </div>
          <Link to={`/student/courses/${courseId}`}>
            <Button variant="secondary" size="sm">
              <Icon name="chevronRight" className="h-4 w-4" /> رجوع للدرس
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : error ? (
          <Card className="space-y-3 text-center py-10">
            <p className="text-danger">{getFriendlyError(error, 'مشكلة في تحميل الواجب')}</p>
          </Card>
        ) : questions.length === 0 ? (
          <EmptyStateWrap />
        ) : result ? (
          <Card className="space-y-4 py-10 text-center">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-lens bg-success/15 text-success">
                <Icon name="check" className="h-8 w-8" />
              </div>
            </div>
            <h2 className="font-display text-xl font-black text-paper">تم تسليم الواجب</h2>
            <p className="text-sm text-muted">
              درجتك الآلية: <span className="font-display text-2xl font-black text-signal">{result.score}</span> من{' '}
              <span className="font-display font-bold">{result.total}</span>
            </p>
            <div className="flex justify-center gap-2">
              <Link to={`/student/courses/${courseId}`}>
                <Button>رجوع للدرس</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {questions.map((q, i) => (
              <Card key={q.question_id} className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display font-bold text-paper">
                    <span className="font-mono text-signal">{String(i + 1).padStart(2, '0')}.</span> {q.question_text}
                  </p>
                  <Badge color="muted">{q.points || 1} نقطة</Badge>
                </div>

                {q.type === 'true_false' ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'true', label: 'صح ✓' },
                      { value: 'false', label: 'غلط ✗' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswer(q.question_id, opt.value)}
                        className={cn(
                          'focus-ring rounded-lens border px-4 py-3 text-sm font-bold transition',
                          answers[q.question_id] === opt.value
                            ? 'border-signal bg-signal/15 text-signal'
                            : 'border-ink-600 bg-ink-800 text-muted hover:text-paper'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {Array.isArray(q.options) &&
                      q.options.map((opt, oi) => (
                        <button
                          key={oi}
                          type="button"
                          onClick={() => setAnswer(q.question_id, opt)}
                          className={cn(
                            'focus-ring flex w-full items-center gap-3 rounded-lens border px-4 py-3 text-right text-sm font-semibold transition',
                            answers[q.question_id] === opt
                              ? 'border-signal bg-signal/15 text-signal'
                              : 'border-ink-600 bg-ink-800 text-paper hover:text-signal-light'
                          )}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs">
                            {answers[q.question_id] === opt ? <Icon name="check" className="h-3.5 w-3.5" /> : String.fromCharCode(1571 + oi)}
                          </span>
                          {opt}
                        </button>
                      ))}
                  </div>
                )}
              </Card>
            ))}

            <Card className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">
                إجمالي الدرجات: <span className="font-display font-bold text-paper">{totalPoints}</span>
              </p>
              <Button type="submit" loading={submitting}>
                <Icon name="check" className="h-4 w-4" /> سلم الواجب
              </Button>
            </Card>
          </form>
        )}
      </div>
    </SubscriptionGate>
  );
}

function EmptyStateWrap() {
  return (
    <Card className="flex flex-col items-center gap-4 py-14 text-center">
      <EmptyState icon="edit" title="لا توجد أسئلة" description="المستر لسه ضايفش أسئلة للواجب ده." />
    </Card>
  );
}