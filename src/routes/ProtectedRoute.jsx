import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { requireRole } from '../utils/permissions.js';
import VisionLoader from '../components/vision/VisionLoader.jsx';

/** يحمي مسارات الحساب — لازم يكون في Session ومن البروفايل يظهر */
export default function ProtectedRoute({ children, role }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <VisionLoader />;
  if (!session?.user) return <Navigate to="/login" replace />;
  if (role && !requireRole(profile, role)) {
    return <Navigate to={role === 'admin' ? '/403' : '/403'} replace />;
  }
  return children;
}