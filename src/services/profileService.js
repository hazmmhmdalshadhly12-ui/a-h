import { supabase } from '../lib/supabaseClient.js';

export async function fetchProfile(userId) {
  if (!userId) return { data: null, error: null };
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
}

export async function updateProfile(userId, updates) {
  return supabase.from('profiles').update(updates).eq('id', userId).select().single();
}

export async function fetchAllStudents({ search = '', grade = '' } = {}) {
  let q = supabase.from('profiles').select('*').eq('role', 'student');
  if (search) q = q.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
  if (grade) q = q.eq('grade', grade);
  return q.order('created_at', { ascending: false });
}

export async function fetchStudentById(userId) {
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
}

export async function updateStudentRole(userId, role) {
  return supabase.from('profiles').update({ role }).eq('id', userId).select().single();
}

// ===== منح الوصول (فتح الشهور/الكورسات يدوياً — للأدمن) =====

export async function fetchStudentAccess(studentId) {
  if (!studentId) return { data: [], error: null };
  return supabase.rpc('get_student_access', { p_student_id: studentId });
}

export async function addStudentMonthGrant(studentId, month) {
  if (!studentId || !month) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('add_student_month_grant', { p_student_id: studentId, p_month: month });
}

export async function removeStudentMonthGrant(grantId) {
  if (!grantId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('remove_student_month_grant', { p_grant_id: grantId });
}