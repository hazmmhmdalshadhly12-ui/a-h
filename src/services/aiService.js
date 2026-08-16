import { functionsUrl, supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

/**
 * إرسال رسالة للشات بوت — عن طريق Supabase Edge Function عشان الـ API Key
 * يفضل مخفي على السيرفر وميوصّلش للفرونت أبداً.
 */
export async function sendChatMessage(messages, { studentId, grade } = {}) {
  if (!isSupabaseConfigured) {
    return {
      reply: 'أهلاً بك! عشان أرد بدقة لازم يتم إعداد Supabase والـ Edge Function (راجع README). حالياً أنا في وضع العرض.',
      source: 'offline'
    };
  }

  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;

  const res = await fetch(`${functionsUrl}/vision-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || ''}`
    },
    body: JSON.stringify({ messages, context: { studentId, grade } })
  });

  if (!res.ok) {
    const text = await res.text();
    return { reply: 'حصلت مشكلة في الاتصال بالبوت، جرب كمان شوية.', source: 'error', errorText: text };
  }

  return res.json();
}