import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import Button from '../../components/ui/Button.jsx';

export default function ServerError() {
  return (
    <PageContainer className="items-center justify-center px-4">
      <div className="text-center">
        <p className="font-mono text-7xl font-black text-stream/40">500</p>
        <h1 className="mt-3 font-display text-2xl font-black">خطأ في الخادم</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          حصلت مشكلة على الخادم — ممكن تكون مشكلة اتصال بـ Supabase أو الـ Edge Functions.
          اتأكد من ضبط الـ Environment Variables في ملف .env.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/">
            <Button>الرئيسية</Button>
          </Link>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            إعادة تحميل
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}