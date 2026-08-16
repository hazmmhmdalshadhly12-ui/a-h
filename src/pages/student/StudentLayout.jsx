import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import StudentSidebar from '../../components/layout/StudentSidebar.jsx';
import StudentNavbar from '../../components/layout/StudentNavbar.jsx';
import MobileNav from '../../components/layout/MobileNav.jsx';
import VisionAI from '../../components/ai/VisionAI.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { Navigate } from 'react-router-dom';
import { canAccessStudent } from '../../utils/permissions.js';

export default function StudentLayout() {
  const { profile, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  if (!profile || !canAccessStudent(profile)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <StudentSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav onMenuClick={() => setOpen(true)} title="بوابة الطالب" />
        <StudentNavbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <VisionAI />
    </div>
  );
}