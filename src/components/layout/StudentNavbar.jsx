import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import Icon from '../ui/Icon.jsx';
import { GRADES } from '../../config/site.js';

/** الشريط العلوي لبوابة الطالب — إشعارات + الصف + اسم الطالب */
export default function StudentNavbar() {
  const { profile } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="hidden items-center justify-between gap-4 border-b border-ink-600/70 bg-ink-900/70 px-6 py-3 backdrop-blur-md lg:flex">
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-ink-500 bg-ink-800 px-3 py-1 text-xs font-medium text-muted">
          {profile?.grade ? GRADES[profile.grade] : ''}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/student/notifications')}
          className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-lens text-muted hover:bg-ink-700 hover:text-paper"
          aria-label="الإشعارات"
        >
          <Icon name="notifications" className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -left-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[10px] font-bold text-ink">
              {unreadCount}
            </span>
          )}
        </button>

        <Link
          to="/student/profile"
          className="focus-ring flex items-center gap-2.5 rounded-lens p-1.5 hover:bg-ink-700"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-signal/20 font-display text-sm font-bold text-signal">
            {(profile?.full_name || 'ط').slice(0, 1)}
          </span>
          <span className="hidden text-sm font-semibold text-paper md:block">{profile?.full_name}</span>
        </Link>
      </div>
    </div>
  );
}