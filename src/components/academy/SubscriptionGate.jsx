import { Link } from 'react-router-dom';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import Skeleton from '../ui/Skeleton.jsx';
import { useAccess } from '../../hooks/useAccess.js';

/**
 * حاجز المحتوى التعليمي: لو الطالب معندهوش حجز مؤكد،
 * بيشوف رسالة "احجز أولاً" بدل المحتوى — الشات والحجز بيظلوا شغالين.
 */
export default function SubscriptionGate({ children }) {
  const { confirmed, loading } = useAccess();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  if (!confirmed) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-black">اشتراكك غير مفعل</h1>
          <p className="mt-1 text-sm text-muted">المحتوى التعليمي متاح للطلاب المشتركين بس.</p>
        </div>
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lens bg-warning/15 text-warning">
            <Icon name="bookings" className="h-7 w-7" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-paper">احجز شهرك علشان تبدأ</h2>
            <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
              بعد ما المستر يؤكد حجزك، هتفضل الكورسات والامتحانات والواجبات متاحة ليك.
              الشات مع المعلم متاح دايماً — اسأل عن أي حاجة.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link to="/student/bookings">
              <Button>
                <Icon name="bookings" className="h-4 w-4" /> اذهب للحجوزات
              </Button>
            </Link>
            <Link to="/student/chat">
              <Button variant="secondary">
                <Icon name="chat" className="h-4 w-4" /> تواصل مع المعلم
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return children;
}