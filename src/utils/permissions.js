/**
 * التحقق من الصلاحيات — الطبقة الأخيرة من الدفاع بتتأكد برضه من الـ RLS
 * على قاعدة البيانات نفسها. الواجهة دي منع الرجوع للصفحات بس.
 */

export function canAccessAdmin(profile) {
  return Boolean(profile?.role === 'admin');
}

export function canAccessStudent(profile) {
  return Boolean(profile?.id && (profile?.role === 'student' || profile?.role === 'admin'));
}

export function requireRole(profile, role) {
  if (role === 'admin') return canAccessAdmin(profile);
  if (role === 'student') return canAccessStudent(profile);
  return Boolean(profile?.id);
}