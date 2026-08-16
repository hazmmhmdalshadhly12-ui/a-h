import { useParams, Link } from 'react-router-dom';
import { fetchCompetitionById } from '../../services/competitionService.js';
import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { GRADE_SHORT } from '../../config/site.js';
import { formatDateTime, daysUntil } from '../../utils/formatDate.js';

export default function CompetitionDetails() {
  const { id } = useParams();
  const [comp, setComp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompetitionById(id).then(({ data }) => {
      setComp(data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!comp) {
    return (
      <Card className="flex flex-col items-center gap-4 py-14 text-center">
        <p className="text-muted">المسابقة مش موجودة.</p>
        <Link to="/student/competitions">
          <Button variant="secondary">الرجوع</Button>
        </Link>
      </Card>
    );
  }

  const days = daysUntil(comp.deadline);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-stream">&lt;competition /&gt; — {GRADE_SHORT[comp.grade]}</p>
          <h1 className="mt-1 font-display text-2xl font-black">{comp.title}</h1>
        </div>
        <Link to="/student/competitions">
          <Button variant="secondary" size="sm">
            <Icon name="chevronRight" className="h-4 w-4" /> الكل
          </Button>
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Badge color="warning">
            <Icon name="clock" className="h-3.5 w-3.5" /> الموعد النهائي: {formatDateTime(comp.deadline)}
          </Badge>
          {days !== null && days >= 0 && (
            <Badge color={days <= 2 ? 'danger' : 'stream'}>متبقي {days} يوم</Badge>
          )}
        </div>
        <p className="leading-relaxed text-paper/90">{comp.description}</p>
        {comp.details && (
          <div className="rounded-lens border border-ink-600 bg-ink-900/50 p-4">
            <h3 className="mb-2 font-display font-bold text-signal">تفاصيل المسابقة</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{comp.details}</p>
          </div>
        )}
      </Card>

      {days !== null && days < 0 && (
        <Card className="border-danger/30 bg-danger/5 text-center">
          <p className="text-sm text-danger">انتهت هذه المسابقة — يلا نشوفك في المسابقة الجاية!</p>
        </Card>
      )}
    </div>
  );
}