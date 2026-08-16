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
  setManualScore,
  publishGrade,
  publishAllGrades
} from '../../../services/submissionService.js';
import { QUESTION_TYPES } from '../../../config/constants.js';

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

  const handleManualScore = async (submissionId, manualScore) => {
    const { error } = await setManualScore(submissionId, manualScore);
    if (error) return toast.error('فشل حفظ الدرجة اليدوية');
    toast.success('تم حفظ الدرجة اليدوية');
    load();
  };

  const handlePublishOne = async (submissionId) => {
    const { error } = await publishGrade(submissionId);
    if (error) return toast.error('فشل نشر الدرجة');
    toast.success('تم نشر الدرجة للطالب');
    load();
  };

  const handlePublishAll = async () => {
    if (!window.confirm('نشر كل الدرجات للطلاب؟ (الموضوعي + المقالي المُصحح)')) return;
    const { error } = await publishAllGrades(examId);
    if (error) return toast.error('فشل النشر الجماعي');
    toast.success('تم نشر كل الدرجات');
    load();
  };

  // مراجعة إجابة طالب + الإجابة الصحيحة
  const reviewQuestions = review?.answers || {};
  const hasShortAnswer = questions.some((q) => q.type === 'short_answer');
  const publishedCount = submissions.filter((s) => s.grade_released).length;

  return (
    <div className="space-y-6">
      <AdminHeader
        title={`نتائج: ${exam?.title || ''}`}
        subtitle={`${submissions.length} تسليم — ${publishedCount} منشور للطلاب`}
        actions={
          <Button size="sm" variant="success" onClick={handlePublishAll}>
            نشر كل الدرجات دفعة واحدة
          </Button>
        }
      />

      {hasShortAnswer && (
        <p className="rounded-lens border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          في أسئلة مقالية — اكتب درجتها يدوياً في خانة "مقالي" ثم انشر.
        </p>
      )}

      {loading ? (
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      ) : (
        <GradeTable
          submissions={submissions}
          onOpenReview={(s) => setReview(s)}
          onManualScore={handleManualScore}
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
          {questions.map((q, i) => {
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