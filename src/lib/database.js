import { supabase } from './supabaseClient.js';
import { isSupabaseConfigured } from './supabaseClient.js';

/**
 * أدوات مشتركة للتعامل مع قاعدة البيانات.
 * لما Supabase مش متظبط (الـ env ناقص) بتدّي بيانات وهمية عشان الموقع يفضل شغال
 * للعرض قبل الإعداد — وكل المكالمات الحقيقية بتتبعت للسيرفر لما يتظبط.
 */

/**
 * Query آمن مع Fallback:
 * - لو Supabase مش متظبط → بياخد الـ fallback
 * - لو الجدول مش موجود (الكود 42xx = undefined_table) → fallback
 * - أي خطأ تاني حقيقي → بيترجّع عشان يتعامل معاه
 */
export async function safeQuery(fallback, buildQuery) {
  if (!isSupabaseConfigured) return { data: fallback, error: null };
  try {
    const res = await buildQuery();
    if (res?.error) {
      if (String(res.error.code).startsWith('42')) return { data: fallback, error: null };
      return res;
    }
    return res;
  } catch {
    return { data: fallback, error: null };
  }
}

export { supabase, isSupabaseConfigured };