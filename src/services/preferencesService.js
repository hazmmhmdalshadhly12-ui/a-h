import { supabase } from '../lib/supabaseClient.js';

export const ACCENTS = [
  { value: 'amber', label: 'كهرماني', swatch: 'rgb(245 183 65)' },
  { value: 'violet', label: 'بنفسجي', swatch: 'rgb(167 139 250)' },
  { value: 'emerald', label: 'زمردي', swatch: 'rgb(52 211 153)' },
  { value: 'sky', label: 'سماوي', swatch: 'rgb(56 189 248)' },
  { value: 'rose', label: 'وردي', swatch: 'rgb(251 113 133)' },
  { value: 'teal', label: 'تركوازي', swatch: 'rgb(94 234 212)' }
];

export const DEFAULT_LAYOUT = ['announcements', 'stats', 'exams', 'bookings'];

/** جلب تفضيلات الطالب (بترجع افتراضيات لو مفيش صف مسجل) */
export async function fetchPreferences(studentId) {
  if (!studentId) return { data: null, error: null };
  const { data, error } = await supabase
    .from('user_preferences')
    .select('accent, dashboard_layout')
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) return { data: null, error };
  return { data, error: null };
}

/** حفظ التفضيلات (upsert — بيتعمل كذا مرة والطالب مالوش قلق) */
export async function savePreferences(studentId, { accent, dashboardLayout }) {
  if (!studentId) return { error: null };
  const payload = {
    student_id: studentId,
    accent,
    dashboard_layout: dashboardLayout
  };
  const { error } = await supabase.from('user_preferences').upsert(payload);
  return { error };
}