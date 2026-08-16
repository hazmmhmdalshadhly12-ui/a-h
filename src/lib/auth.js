import { supabase } from './supabaseClient.js';

/**
 * تسجيل طالب جديد — ملف البروفايل بيتعمل تلقائياً من Trigger في قاعدة البيانات
 * باستخدام الـ metadata اللي اتبعتت هنا.
 */
export async function signUpStudent({ fullName, email, password, phone, parentPhone, grade }) {
  return supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName,
        phone: phone || null,
        parent_phone: parentPhone || null,
        grade: grade || 'first_secondary'
      }
    }
  });
}

export async function signIn({ email, password }) {
  return supabase.auth.signInWithPassword({ email: email.trim(), password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function resetPassword(email) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`
  });
}

export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword });
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
  return supabase.auth.getSession();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user ?? null;
}