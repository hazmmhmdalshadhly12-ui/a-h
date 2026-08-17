import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../hooks/useAuth.js';

export default function Unauthorized() {
  const { profile } = useAuth();
  // زر الرئيسية يوديك للوحة بتاعتك حسب الدور — مش للـ 403 تاني
  const homePath = profile?.role === 'admin' ? '/admin' : '/student/dashboard';

  return (
    <PageContainer className="items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-danger/40 bg-danger/10 text-5xl text-danger">!</div>
        <h1 className="mt-5 font-display text-2xl font-black">ممنوع الوصول</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          الصفحة دي محمية بصلاحية معينة (أدمن أو طالب) — الحساب الحالي مش مسموح له بالدخول.
          الصلاحيات بتتأكد من قاعدة البيانات نفسها، مش من الواجهة بس.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {profile ? (
            <Link to={homePath}>
              <Button>لوحتي</Button>
            </Link>
          ) : (
            <Link to="/">
              <Button>الرئيسية</Button>
            </Link>
          )}
          <Link to="/login">
            <Button variant="secondary">تسجيل دخول مختلف</Button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}