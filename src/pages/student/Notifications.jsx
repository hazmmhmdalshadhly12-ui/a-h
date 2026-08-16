import { useNotifications } from '../../hooks/useNotifications.js';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { formatDate } from '../../utils/formatDate.js';
import { cn } from '../../lib/utils.js';

export default function Notifications() {
  const { notifications, loading, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">الإشعارات</h1>
          <p className="mt-1 text-sm text-muted">
            {unreadCount > 0 ? `عندك ${unreadCount} إشعار غير مقروء` : 'مفيش إشعارات جديدة'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications" title="لا توجد إشعارات" description="هنبعتلك إشعارات عند نشر الدرجات وتأكيد الحجز." />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={cn(
                'focus-ring block w-full rounded-lens border px-4 py-3.5 text-right transition',
                n.is_read ? 'border-ink-600 bg-ink-800/60' : 'border-signal/40 bg-signal/5'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-display font-bold text-paper">{n.title}</p>
                {!n.is_read && <Badge color="signal">جديد</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
              <p className="mt-1.5 text-xs text-muted/70">{formatDate(n.created_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}