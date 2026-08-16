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