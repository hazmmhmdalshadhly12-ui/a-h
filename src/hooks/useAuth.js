import { useAuth as useAuthContext } from '../context/AuthContext.jsx';

/** استخدام حالة المصادقة من الـ AuthContext */
export function useAuth() {
  return useAuthContext();
}