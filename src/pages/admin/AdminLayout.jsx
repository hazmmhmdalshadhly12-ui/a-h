import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from '../../components/layout/AdminSidebar.jsx';
import MobileNav from '../../components/layout/MobileNav.jsx';
import VisionAI from '../../components/ai/VisionAI.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { canAccessAdmin } from '../../utils/permissions.js';

export default function AdminLayout() {
  const { profile, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  if (!canAccessAdmin(profile)) {
    return <Navigate to="/403" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <AdminSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav onMenuClick={() => setOpen(true)} title="لوحة تحكم الأدمن" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <VisionAI />
    </div>
  );
}