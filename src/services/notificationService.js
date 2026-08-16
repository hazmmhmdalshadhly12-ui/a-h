import { supabase } from '../lib/supabaseClient.js';
import { safeQuery } from '../lib/database.js';
import { MOCK_NOTIFICATIONS } from '../lib/mockData.js';

export async function fetchNotifications(studentId) {
  if (!studentId) return { data: MOCK_NOTIFICATIONS, error: null };
  return safeQuery(MOCK_NOTIFICATIONS, () =>
    supabase.from('notifications').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
  );
}

export async function markNotificationRead(notificationId) {
  return supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
}

export async function markAllNotificationsRead(studentId) {
  return supabase.from('notifications').update({ is_read: true }).eq('student_id', studentId).eq('is_read', false);
}

export async function createNotification({ studentId, title, body }) {
  return supabase.from('notifications').insert({ student_id: studentId, title, body }).select().single();
}