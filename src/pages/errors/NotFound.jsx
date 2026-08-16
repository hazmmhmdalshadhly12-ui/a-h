import { Link } from 'react-router-dom';
import PageContainer from '../../components/layout/PageContainer.jsx';
import Button from '../../components/ui/Button.jsx';
import VisionCore from '../../components/vision/VisionCore.jsx';

export default function NotFound() {
  return (
    <PageContainer className="items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center opacity-70">
          <VisionCore size={140} />
        </div>
        <p className="font-mono text-7xl font-black text-signal/40">404</p>
        <h1 className="mt-3 font-display text-2xl font-black">الصفحة دي خارج نطاق الرؤية</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">الرابط اللي دخلت عليه مش موجود — خد جولة في الصفحات الرئيسية.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/">
            <Button>الرئيسية</Button>
          </Link>
          <Link to="/courses">
            <Button variant="secondary">الكورسات</Button>
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}