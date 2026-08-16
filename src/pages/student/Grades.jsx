import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useExams } from '../../hooks/useExams.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Button from '../../components/ui/Button.jsx';
import { formatDate } from '../../utils/formatDate.js';
import { fetchSubmissionForExam } from '../../services/submissionService.js';

export default function Grades() {
  const { profile } = useAuth();
  const { exams, loading } = useExams();

  // ناخد الامتحانات اللي الطالب سلّمها، والدرجات هتقرا من جدول التسليمات
  const submittedIds = exams.filter((e) => e.submitted);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">درجاتي</h1>
        <p className="mt-1 text-sm text-muted">
          الدرجات بتظهر هنا بعد ما المستر يراجع الامتحانات وينشر النتيجة.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <GradesList profileId={profile?.id} exams={submittedIds} />
      )}
    </div>
  );
}

function GradesList({ profileId, exams }) {
  if (exams.length === 0) {
    return (
      <EmptyState
        icon="grades"
        title="لسه منكملش أي امتحان"
        description="سلم امتحان أول ما ينشر المستر — ودرجتك هتظهر هنا."
        action={
          <Link to="/student/exams">
            <Button variant="secondary" size="sm">الذهاب للامتحانات</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {exams.map((e) => (
        <SubmissionRow key={e.id} examId={e.id} examTitle={e.title} profileId={profileId} />
      ))}
    </div>
  );
}

function SubmissionRow({ examId, examTitle, profileId }) {
  const [sub, setSub] = useState(null);

  useEffect(() => {
    if (!profileId) return;
    fetchSubmissionForExam(profileId, examId).then(({ data }) => setSub(data));
  }, [profileId, examId]);

  const score = sub?.score;
  const released = sub?.grade_released;

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-display font-bold text-paper">{examTitle}</p>
        <p className="text-xs text-muted">
          سُلِّم في {formatDate(sub?.submitted_at)}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {released ? (
          <div className="text-left">
            <span className="font-display text-2xl font-black text-signal">{score ?? '—'}</span>
            <span className="text-sm text-muted"> نقطة</span>
          </div>
        ) : (
          <Badge color="warning">قيد المراجعة</Badge>
        )}
      </div>
    </Card>
  );
}