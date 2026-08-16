import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar.jsx';
import PublicFooter from './PublicFooter.jsx';
import VisionBackground from '../vision/VisionBackground.jsx';
import VisionAI from '../ai/VisionAI.jsx';

/** تخطيط الصفحات العامة — نافبار + فوتر + الشات العائم */
export default function PublicLayout({ children }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <VisionBackground />
      <PublicNavbar />
      <main className="relative z-10 flex-1">{children ?? <Outlet />}</main>
      <PublicFooter />
      <VisionAI />
    </div>
  );
}