import { supabase } from '../lib/supabaseClient.js';
import { safeQuery } from '../lib/database.js';
import { MOCK_COURSES } from '../lib/mockData.js';

export async function fetchCourses({ grade } = {}) {
  return safeQuery(MOCK_COURSES, () => {
    let q = supabase.from('courses').select('*').order('order_index', { ascending: true });
    if (grade) q = q.eq('grade', grade);
    return q;
  });
}

/** للصفحات العامة بس — view من غير video_url (الفيديوهات للمسجلين فقط) */
export async function fetchPublicCourses() {
  return safeQuery(MOCK_COURSES, () =>
    supabase.from('courses_public').select('*').order('order_index', { ascending: true })
  );
}

export async function fetchCourseById(courseId) {
  return safeQuery(MOCK_COURSES.find((c) => c.id === courseId) || null, () =>
    supabase.from('courses').select('*').eq('id', courseId).maybeSingle()
  );
}

// ===== عمليات الأدمن =====

export async function createCourse(course) {
  return supabase.from('courses').insert(course).select().single();
}

export async function updateCourse(courseId, updates) {
  return supabase.from('courses').update(updates).eq('id', courseId).select().single();
}

export async function deleteCourse(courseId) {
  return supabase.from('courses').delete().eq('id', courseId);
}