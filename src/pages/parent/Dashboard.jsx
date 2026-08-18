import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../components/ui/Toast.jsx';
import { fetchParentStudents, linkStudentToParent, unlinkStudent } from '../../services/parentService.js';
import { getFriendlyError } from '../../utils/errors.js';
import { GRADE_SHORT } from '../../config/site.js';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [linking, setLinking] = useState(false);

  const load = async () => {
    const { data } = await fetchParentStudents();
    setStudents(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleLink = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return toast.error('اكتب رقم موبايل الطالب');
    setLinking(true);
    const { data, error } = await linkStudentToParent(phone.trim());
    setLinking(false);
    if (error) return toast.error(getFriendlyError(error, 'فشل الربط'));
    toast.success('اتربط الطالب بحسابك بنجاح');
    setPhone('');
    load();
  };

  const handleUnlink = async (studentId) => {
    if (!window.confirm('فك ربط هذا الطالب من حسابك؟')) return;
    const { error } = await unlinkStudent(studentId);
    if (error) return toast.error(getFriendlyError(error, 'فشل فك الربط'));
    toast.success('تم فك الربط');
    load();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black">مرحباً {profile?.full_name} 👋</h1>
        <p className="mt-1 text-sm text-muted">
          أضف رقم موبايل ابنك/بنتك علشان تتابع درجاته وحالته في الكورسات والامتحانات والواجبات — وتقدر تكلم المعلم مباشرة.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon name="user" className="h-5 w-5 text-signal" />
          <h2 className="font-display text-lg font-bold">إضافة طالب</h2>
        </div>
        <form onSubmit={handleLink} className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              name="student_phone"
              label="رقم موبايل الطالب"
              placeholder="01xxxxxxxxx"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" loading={linking} className="w-full">
              <Icon name="plus" className="h-4 w-4" /> ربط الطالب
            </Button>
          </div>
        </form>
        <p className="text-xs text-muted">
          الرقم ده لازم يكون نفس الرقم اللي سجّل بيه الطالب في الأكاديمية.
        </p>
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold">أولادي ({students.length})</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon="user"
            title="لسه مضفتش أي طالب"
            description="اكتب رقم موبايل الطالب في الخانة اللي فوق علشان تبدأ متابعته."
          />
        ) : (
          <div className="space-y-3">
            {students.map((s) => (
              <Card key={s.student_id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-signal/15 font-display font-bold text-signal">
                    {(s.full_name || 'ط').slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-display font-bold text-paper">{s.full_name || 'طالب'}</p>
                    <p className="text-xs text-muted">
                      <span dir="ltr">{s.phone}</span>
                      {s.grade && <span> • {GRADE_SHORT[s.grade] || s.grade}</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/parent/students/${s.student_id}`}>
                    <Button size="sm">
                      <Icon name="chevronLeft" className="h-4 w-4" /> متابعة الطالب
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => handleUnlink(s.student_id)} aria-label="فك الربط">
                    <Icon name="trash" className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
