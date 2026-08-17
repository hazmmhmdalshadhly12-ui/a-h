import { supabase } from '../lib/supabaseClient.js';

/** جلب أو إنشاء محادثة الطالب مع المعلم — بيرجع conversation_id */
export async function getOrCreateConversation() {
  return supabase.rpc('get_or_create_conversation');
}

/** رسائل محادثة معينة */
export async function fetchMessages(conversationId) {
  if (!conversationId) return { data: [], error: null };
  return supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
}

/** إرسال رسالة */
export async function sendMessage(conversationId, senderId, body) {
  if (!conversationId || !senderId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select()
    .single();
}

/** حذف رسالة — صاحب الرسالة (الطالب) أو الأدمن */
export async function deleteMessage(messageId) {
  if (!messageId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.from('messages').delete().eq('id', messageId);
}
export async function markConversationRead(conversationId) {
  if (!conversationId) return { data: null, error: null };
  return supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('is_read', false);
}

// ===== الأدمن =====

/** كل المحادثات مع بيانات الطالب والمعلم */
export async function fetchAllConversations() {
  return supabase
    .from('conversations')
    .select('*, student:profiles!conversations_student_id_fkey(id, full_name, phone, grade), teacher:profiles!conversations_teacher_id_fkey(id, full_name)')
    .order('last_message_at', { ascending: false });
}

/** عدد الرسائل غير المقروءة في محادثة (للأدمن — رسائل الطلاب) */
export async function countUnreadMessages(conversationId) {
  if (!conversationId) return { count: 0, error: null };
  return supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('is_read', false);
}