import ProtectedRoute from './ProtectedRoute.jsx';

/** حماية مسارات ولي الأمر — role=parent فقط */
export default function ParentRoute({ children }) {
  return <ProtectedRoute role="parent">{children}</ProtectedRoute>;
}
