import ProtectedRoute from './ProtectedRoute.jsx';

/** حماية مسارات الطالب — student أو admin (الأدمن بيدخل عادي) */
export default function StudentRoute({ children }) {
  return <ProtectedRoute role="student">{children}</ProtectedRoute>;
}