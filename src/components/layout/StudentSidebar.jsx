import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { STUDENT_NAV } from '../../config/navigation.js';
import VisionLogo from '../vision/VisionLogo.jsx';
import SidebarNav from './SidebarNav.jsx';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button.jsx';
import { cn } from '../../lib/utils.js';

export default function StudentSidebar({ open, onClose }) {
  const { profile, signOut } = useAuth();

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