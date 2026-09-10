import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { STUDENT_NAV } from '../../config/navigation.js';
import VisionLogo from '../vision/VisionLogo.jsx';
import SidebarNav from './SidebarNav.jsx';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';
import { cn } from '../../lib/utils.js';
import { supabase } from '../../lib/supabaseClient.js';
import { useEffect, useState } from 'react';

export default function StudentSidebar({ open, onClose }) {
  const { profile, signOut } = useAuth();
  const { courseId } = useParams();
  const [courseLessons, setCourseLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    if (!courseId) {
      setCourseLessons([]);
      return;
    }
    setLoadingLessons(true);
    supabase.rpc('get_course_lessons', { p_course_id: courseId })
      .then(({ data }) => {
        setCourseLessons(data || []);
        setLoadingLessons(false);
      })
      .catch(() => setLoadingLessons(false));
  }, [courseId]);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-72 flex-col border-l border-ink-600/70 bg-ink-900/95 backdrop-blur-md transition-transform duration-300 lg:static lg:translate-x-0 lg:bg-transparent lg:backdrop-blur-none',
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-ink-600/70 px-5">
          <VisionLogo size={34} showText />
          <button className="focus-ring flex h-9 w-9 items-center justify-center rounded-lens text-muted lg:hidden" onClick={onClose} aria-label="إغلاق">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-6">
          <SidebarNav items={[{ section: 'بوابة الطالب', items: STUDENT_NAV }]} onNavigate={onClose} />

          {/* دروس الكورس الحالي - تظهر فقط داخل الكورس/الدرس */}
          {courseId && courseLessons.length > 0 && (
            <div className="mt-6 border-t border-ink-700/60 pt-4">
              <div className="flex items-center justify-between mb-3 px-2">
                <p className="font-display text-xs font-semibold uppercase tracking-wider text-muted/70">دروس الكورس</p>
              </div>
              <ul className="space-y-1" role="list" aria-label="دروس الكورس الحالي">
                {courseLessons.map((l) => {
                  const accessible = l.accessible === true || l.is_free === true;
                  return (
                    <li key={l.lesson_id}>
                      <a
                        href={`/student/courses/${courseId}/lesson/${l.lesson_id}`}
                        className={`focus-ring flex w-full items-center gap-2 rounded-lens px-3 py-2 text-sm text-right transition hover:bg-ink-800/60 ${
                          l.accessible || l.is_free ? 'text-paper' : 'text-muted/70'
                        }`}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink-800 font-mono text-[10px] text-muted">
                          {String(l.order_index).padStart(2, '0')}
                        </span>
                        <span className="min-w-0 truncate font-medium text-sm">{l.title}</span>
                        {!accessible && <Badge color="warning" className="ml-auto text-[10px]">🔒</Badge>}
                        {l.is_free && <Badge color="success" className="ml-auto text-[10px]">🆓</Badge>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-ink-600/70 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lens bg-ink-800 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal/20 font-display font-bold text-signal">
              {(profile?.full_name || 'ط').slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-paper">{profile?.full_name || 'طالب'}</p>
              <p className="truncate text-xs text-muted">{profile?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/student/profile" onClick={onClose} className="flex-1">
              <Button variant="secondary" size="sm" className="w-full">
                <Icon name="user" className="h-4 w-4" /> ملفي
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut} aria-label="تسجيل الخروج">
              <Icon name="logout" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}