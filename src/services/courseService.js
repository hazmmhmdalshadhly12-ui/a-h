import { supabase } from '../lib/supabaseClient.js';
import { safeQuery } from '../lib/database.js';
import { MOCK_COURSES } from '../lib/mockData.js';

export async function fetchCourses({ grade } = {}) {
  return safeQuery(MOCK_COURSES, () => {
    let q = supabase
      .from('courses')
      .select('*, section:course_sections!courses_section_id_fkey(id, title, grade)')
      .order('order_index', { ascending: true });
    if (grade) q = q.eq('grade', grade);
    return q;
  });
}

/** كورسات الطالب كاملة — متاحة ومقفولة بصرياً (القفل حسب شهر الاشتراك المؤكد) */
export async function fetchStudentCourses(grade) {
  if (!grade) return { data: [], error: null };
  return supabase.rpc('get_student_courses', { p_grade: grade });
}

/** للصفحات العامة بس — view من غير video_url (الفيديوهات للمسجلين فقط) */
export async function fetchPublicCourses() {
  return safeQuery(MOCK_COURSES, () =>
    supabase.from('courses_public').select('*').order('order_index', { ascending: true })
  );
}

export async function fetchCourseById(courseId) {
  return safeQuery(MOCK_COURSES.find((c) => c.id === courseId) || null, () =>
    supabase
      .from('courses')
      .select('*, section:course_sections!courses_section_id_fkey(id, title, grade)')
      .eq('id', courseId)
      .maybeSingle()
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

// ===== للطلاب (عبر دوال آمنة) =====

export async function fetchCourseLessons(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase.rpc('get_course_lessons', { p_course_id: courseId });
}

export async function fetchCourseHomeworks(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase.rpc('get_course_homeworks', { p_course_id: courseId });
}

export async function fetchHomeworkQuestionsForStudent(homeworkId) {
  if (!homeworkId) return { data: [], error: null };
  return supabase.rpc('get_homework_questions', { p_homework_id: homeworkId });
}

export async function submitHomework(homeworkId, answers) {
  if (!homeworkId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('submit_homework', { p_homework_id: homeworkId, p_answers: answers });
}