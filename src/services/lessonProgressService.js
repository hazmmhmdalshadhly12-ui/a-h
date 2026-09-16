import { supabase } from '../lib/supabaseClient.js';

export async function recordLessonOpen(lessonId) {
  if (!lessonId) return { error: null };
  return supabase.rpc('record_lesson_open', { p_lesson_id: lessonId });
}

export async function recordLessonProgress(lessonId, watchedSeconds, lastPosition) {
  if (!lessonId) return { error: null };
  return supabase.rpc('record_lesson_progress', {
    p_lesson_id: lessonId,
    p_watched_seconds: Math.floor(watchedSeconds || 0),
    p_last_position: Math.floor(lastPosition || 0)
  });
}

export async function fetchCourseProgress(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase.rpc('get_course_progress', { p_course_id: courseId });
}

export async function fetchStudentLessonProgress(courseId, studentId) {
  if (!courseId || !studentId) return { data: [], error: null };
  return supabase.rpc('get_student_lesson_progress', {
    p_course_id: courseId,
    p_student_id: studentId
  });
}
