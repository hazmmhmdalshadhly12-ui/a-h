import { supabase } from '../lib/supabaseClient.js';

/** كل الإعلانات (المثبّت الأول) مع اسم الكاتب */
export async function fetchAnnouncements() {
  return supabase
    .from('announcements')
    .select('*, author:profiles!announcements_created_by_fkey(full_name)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30);
}

export async function createAnnouncement({ title, body, isPinned }) {
  if (!title?.trim()) return { data: null, error: { message: 'اكتب عنوان الإعلان' } };
  return supabase
    .from('announcements')
    .insert({ title: title.trim(), body: body?.trim() || null, is_pinned: Boolean(isPinned) })
    .select()
    .single();
}

export async function updateAnnouncement(id, { title, body, isPinned }) {
  if (!id) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase
    .from('announcements')
    .update({ title: title?.trim(), body: body?.trim() || null, is_pinned: Boolean(isPinned) })
    .eq('id', id)
    .select()
    .single();
}

export async function togglePinAnnouncement(id, isPinned) {
  if (!id) return { data: null, error: null };
  return supabase.from('announcements').update({ is_pinned: Boolean(isPinned) }).eq('id', id).select().single();
}

export async function deleteAnnouncement(id) {
  if (!id) return { data: null, error: null };
  return supabase.from('announcements').delete().eq('id', id);
}
