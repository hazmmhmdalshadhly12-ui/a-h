import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { requireRole } from '../utils/permissions.js';
import VisionLoader from '../components/vision/VisionLoader.jsx';
import Button from '../components/ui/Button.jsx';
import { Link } from 'react-router-dom';

/**
 * يحمي مسارات الحساب — لازم يكون في Session + البروفايل ظاهر.
 * لو في Session لكن البروفايل لسه مش متحمّل (بعد الرفرش مثلًا) → نعرض اللودر
 * مش 403، لأن البروفايل هو اللي بيحدد الدور. (فيه حماية إضافية من الـ AuthContext
 * بيعيد المحاولة قبل ما يوقف الـ loading.)
 */
export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <VisionLoader />;
  if (!session?.user) return <Navigate to="/login" replace />;
  // Session موجود لكن البروفايل مش متحمّل → شاشة بديلة بدل التعليق للأبد
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-2xl text-warning">⚠️</div>
        <p className="font-display text-lg font-bold text-paper">تعذر تحميل بياناتك</p>
        <p className="max-w-sm text-sm text-muted">
          حصلت مشكلة في تحميل ملفك الشخصي. جرّب تحديث الصفحة، أو سجّل الدخول من جديد.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()}>تحديث الصفحة</Button>
          <Link to="/login">
            <Button variant="secondary">تسجيل دخول</Button>
          </Link>
        </div>
      </div>
    );
  }
  if (role && !requireRole(profile, role)) {
    return <Navigate to="/403" replace />;
  }
  return children;
}