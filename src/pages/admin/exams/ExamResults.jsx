import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import GradeTable from '../../../components/admin/GradeTable.jsx';
import Card from '../../../components/ui/Card.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchExamById, fetchExamQuestions } from '../../../services/examService.js';
import {
  fetchSubmissionsForExam,
  gradeExamSubmission,
  publishGrade,
  publishAllGrades
} from '../../../services/submissionService.js';
import { QUESTION_TYPES } from '../../../config/constants.js';
import { getSubmissionGradingInfo } from '../../../utils/examHelpers.js';
import { getFriendlyError } from '../../../utils/errors.js';

export default function ExamResults() {
  const { examId } = useParams();
  const toast = useToast();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [eRes, qRes, sRes] = await Promise.all([
      fetchExamById(examId),
      fetchExamQuestions(examId),
      fetchSubmissionsForExam(examId)
    ]);
    setExam(eRes.data);
    setQuestions(qRes.data || []);
    setSubmissions(sRes.data || []);
    setLoading(false);
  }, [examId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGrade = async (submissionId, totalScore) => {
    const { data, error } = await gradeExamSubmission(submissionId, totalScore);
    if (error) return toast.error(getFriendlyError(error, 'فشل حفظ الدرجة النهائية'));
    toast.success(
      data?.grade_released
        ? `تم تعديل الدرجة: ${data.score} من ${data.total_points} — الطالب يشوفها فورًا`
        : `تم حفظ الدرجة النهائية: ${data.score} من ${data.total_points} — انشرها وقت ما تجهز`
    );
    load();
  };

  const handlePublishOne = async (submissionId) => {
    const { error } = await publishGrade(submissionId);
    if (error) return toast.error(getFriendlyError(error, 'فشل نشر الدرجة'));
    toast.success('تم نشر الدرجة للطالب');
    load();
  };

  const handlePublishAll = async () => {
    const pending = submissions.filter((s) => getSubmissionGradingInfo(s, questions).essayPending).length;
    const msg = pending > 0
      ? `نشر الدرجات المصححة فقط؟ (${pending} تسليم فيه مقالي لسه مش مصحح — هيستنى تصحيحك وما هيتنشرش دلوقتي)`
      : 'نشر كل الدرجات للطلاب؟';
    if (!window.confirm(msg)) return;
    const { error } = await publishAllGrades(examId);
    if (error) return toast.error(getFriendlyError(error, 'فشل النشر الجماعي'));
    toast.success(
      pending > 0
        ? `تم نشر الدرجات المصححة — ${pending} تسليم بيستنى تصحيح المقالي`
        : 'تم نشر كل الدرجات'
    );
    load();
  };

  // مراجعة إجابة طالب + الإجابة الصحيحة
  // الأسئلة من Snapshot التسليم لو موجودة (النسخة اللي جاوب عنها الطالب فعلاً)،
  // وإلا الأسئلة الحية — كده تعديل الأسئلة بعد التسليم لا يفسد المراجعة.
  const reviewQuestions = review?.answers || {};
  const snapshotQuestions = Array.isArray(review?.question_snapshot?.questions)
    ? review.question_snapshot.questions
    : null;
  const effectiveQuestions = snapshotQuestions && snapshotQuestions.length > 0 ? snapshotQuestions : questions;
  const hasShortAnswer = effectiveQuestions.some((q) => q.type === 'short_answer');
  const publishedCount = submissions.filter((s) => s.grade_released).length;
  const pendingCount = submissions.filter((s) => getSubmissionGradingInfo(s, questions).essayPending).length;
  const examTotalPoints = (questions || []).reduce((n, q) => n + Number(q.points || 0), 0);

  return (
    <div className="space-y-6">
      <AdminHeader
        title={`نتائج: ${exam?.title || ''}`}
        subtitle={
          `${submissions.length} تسليم — ${publishedCount} منشور` +
          (pendingCount > 0 ? ` — ${pendingCount} بانتظار تصحيح المقالي` : '') +
          (examTotalPoints > 0 ? ` — الامتحان من ${examTotalPoints} نقطة` : '')
        }
        actions={
          <Button size="sm" variant="success" onClick={handlePublishAll}>
            نشر الدرجات المصححة دفعة واحدة
          </Button>
        }
      />

      {hasShortAnswer && (
        <p className="rounded-lens border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm leading-relaxed text-warning">
          في أسئلة مقالية — راجع إجابات الطالب من «مراجعة» ثم اكتب الدرجة النهائية من {examTotalPoints || 'إجمالي'}
          (تقدر تعدلها في أي وقت حتى بعد النشر). النشر بياخد الموضوعي والمقالي مع بعض، وغير المصحح بيستنى تصحيحك.
        </p>
      )}

      {loading ? (
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      ) : (
        <GradeTable
          submissions={submissions}
          questions={questions}
          onOpenReview={(s) => setReview(s)}
          onGrade={handleGrade}
          onPublishOne={handlePublishOne}
        />
      )}

      {/* مودال مراجعة إجابة طالب */}
      <Modal
        open={Boolean(review)}
        onClose={() => setReview(null)}
        title={`مراجعة: ${review?.profiles?.full_name || ''}`}
        size="lg"
      >
        <div className="space-y-4">
          {snapshotQuestions && snapshotQuestions.length > 0 && (
            <p className="rounded-lens border border-stream/30 bg-stream/10 px-3 py-2 text-xs text-stream">
              بتعرض النسخة الأصلية للأسئلة وقت تسليم الطالب (Snapshot) — حتى لو الامتحان اتعدل بعدين.
            </p>
          )}
          {effectiveQuestions.map((q, i) => {
            const myAnswer = reviewQuestions[q.id];
            const correct = q.correct_answer;
            const isShort = q.type === 'short_answer';
            const isCorrect = !isShort && String(myAnswer) === String(correct);

            return (
              <div key={q.id} className="rounded-lens border border-ink-600 bg-ink-900/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display font-bold text-paper">
                    {i + 1}. {q.question_text}
                  </p>
                  <Badge color="muted">{q.points} نقطة</Badge>
                </div>
                <div className="mt-2 text-sm">
                  <p className="text-muted">
                    نوع السؤال: {QUESTION_TYPES[q.type]?.label}
                  </p>
                  {!isShort && (
                    <p className={isCorrect ? 'mt-1 text-success' : 'mt-1 text-danger'}>
                      إجابة الطالب: {myAnswer || 'لم يجب'} {isCorrect ? '✓' : '✗'}
                    </p>
                  )}
                  {isShort && <p className="mt-1 text-paper">إجابة الطالب: {myAnswer || 'لم يجب'}</p>}
                  {!isShort && (
                    <p className="mt-1 text-stream">الإجابة الصحيحة: {q.type === 'true_false' ? (correct === 'true' ? 'صح' : 'غلط') : correct}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}