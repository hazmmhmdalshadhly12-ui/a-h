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

  // مش مسجل دخول → مش هنبعت أصلاً (الدالة محمية بـ JWT)
  if (!token) {
    return {
      reply: 'لازم تسجل دخول أولاً عشان أقدر أرد — سجل من صفحة الدخول أو أنشئ حسابك مجاناً من صفحة التسجيل.',
      source: 'auth'
    };
  }

  const res = await fetch(`${functionsUrl}/vision-ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ messages, context: { studentId, grade } })
  });

  if (!res.ok) {
    // الدالة بترجع { reply } حتى في الأخطاء — نعرضها زي ما هي لو موجودة
    let text = '';
    try {
      text = await res.text();
    } catch {
      text = '';
    }
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    const reply = parsed?.reply || 'حصلت مشكلة في الاتصال بالبوت، جرب كمان شوية.';
    return { reply, source: 'error', status: res.status, errorText: text };
  }

  return res.json();
}