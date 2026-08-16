import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminHeader from '../../components/admin/AdminHeader.jsx';
import AdminStats from '../../components/admin/AdminStats.jsx';
import Card from '../../components/ui/Card.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { fetchAllExams } from '../../services/examService.js';
import { fetchAllBookings } from '../../services/bookingService.js';
import { fetchAllStudents } from '../../services/profileService.js';
import { fetchAllSubmissionsAdmin } from '../../services/submissionService.js';

export default function Dashboard() {
  const [exams, setExams] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [pendingBookings, setPendingBookings] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAllExams(),
      fetchAllBookings(),
      fetchAllStudents(),
      fetchAllSubmissionsAdmin()
    ]).then(([e, b, s, sub]) => {
      if (!active) return;
      setExams(e.data || []);
      setBookings(b.data || []);
      setStudents(s.data || []);
      setSubmissions(sub.data || []);
      setPendingBookings((b.data || []).filter((x) => x.status === 'pending').length);
    });
    return () => {
      active = false;
    };
  }, []);

  const published = exams.filter((x) => x.is_published).length;
  const graded = submissions.filter((x) => x.grade_released).length;

  const stats = [
    { label: 'طلاب مسجلين', value: students.length, icon: 'students', color: 'stream' },
    { label: 'امتحانات منشورة', value: published, icon: 'exams', color: 'signal' },
    { label: 'حجوزات قيد المراجعة', value: pendingBookings, icon: 'bookings', color: 'warning' },
    { label: 'درجات منشورة', value: graded, icon: 'grades', color: 'success' }
  ];

  return (
    <div className="space-y-6">
      <AdminHeader
        title="نظرة عامة"
        subtitle="ملخص سريع عن المنصة"
        actions={
          <Link to="/admin/exams/new">
            <Button size="sm">
              <Icon name="plus" className="h-4 w-4" /> امتحان جديد
            </Button>
          </Link>
        }
      />

      <AdminStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">آخر الحجوزات</h2>
            <Link to="/admin/bookings" className="text-sm text-signal hover:text-signal-light">الكل ←</Link>
          </div>
          {bookings.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">لا توجد حجوزات</p>
          ) : (
            <ul className="divide-y divide-ink-700/60">
              {bookings.slice(0, 4).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-paper">{b.profiles?.full_name || '—'}</p>
                    <p className="text-xs text-muted">{new Date(b.requested_datetime).toLocaleString('ar-EG')}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    b.status === 'pending' ? 'bg-warning/15 text-warning' :
                    b.status === 'confirmed' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                  }`}>
                    {b.status === 'pending' ? 'قيد المراجعة' : b.status === 'confirmed' ? 'مؤكد' : 'مرفوض'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">الامتحانات</h2>
            <Link to="/admin/exams" className="text-sm text-signal hover:text-signal-light">الكل ←</Link>
          </div>
          {exams.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">لا توجد امتحانات</p>
          ) : (
            <ul className="divide-y divide-ink-700/60">
              {exams.slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-paper">{e.title}</p>
                    <p className="text-xs text-muted">{e.grade === 'second_secondary' ? 'ثانية ثانوي' : 'أولى ثانوي'}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    e.is_published ? 'bg-success/15 text-success' : 'bg-muted/15 text-muted'
                  }`}>
                    {e.is_published ? 'منشور' : 'مسودة'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}