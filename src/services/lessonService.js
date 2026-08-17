import { supabase } from '../lib/supabaseClient.js';

/** محاضرات كورس معين (للأدمن) */
export async function fetchLessons(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
}

export async function createLesson({ courseId, title, videoUrl, orderIndex }) {
  if (!courseId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase
    .from('lessons')
    .insert({ course_id: courseId, title, video_url: videoUrl || null, order_index: orderIndex || 1 })
    .select()
    .single();
}

export async function updateLesson(lessonId, updates) {
  return supabase.from('lessons').update(updates).eq('id', lessonId).select().single();
}

export async function deleteLesson(lessonId) {
  return supabase.from('lessons').delete().eq('id', lessonId);
}