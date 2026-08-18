import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import ParentSidebar from './ParentSidebar.jsx';
import MobileNav from '../../components/layout/MobileNav.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { canAccessParent } from '../../utils/permissions.js';

export default function ParentLayout() {
  const { profile, loading } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  if (!profile || !canAccessParent(profile)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen">
      <ParentSidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav onMenuClick={() => setOpen(true)} title="بوابة ولي الأمر" />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
