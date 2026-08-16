import ProtectedRoute from './ProtectedRoute.jsx';

/** حماية مسارات الأدمن — role=admin فقط (مستوى الحماية النهائي جوه RLS) */
export default function AdminRoute({ children }) {
  return <ProtectedRoute role="admin">{children}</ProtectedRoute>;
}