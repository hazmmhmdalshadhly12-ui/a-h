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

// ===== تعليقات الكورس =====

export async function fetchCourseComments(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase.rpc('get_course_comments', { p_course_id: courseId });
}

export async function addCourseComment(courseId, body) {
  if (!courseId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('add_course_comment', { p_course_id: courseId, p_body: body });
}

export async function deleteCourseComment(commentId) {
  if (!commentId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('delete_course_comment', { p_comment_id: commentId });
}

export async function togglePinComment(commentId) {
  if (!commentId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('toggle_pin_comment', { p_comment_id: commentId });
}

// ===== ملفات الكورس =====

export async function fetchCourseFiles(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase.rpc('get_course_files', { p_course_id: courseId });
}

export async function addCourseFile(courseId, { title, fileUrl, fileType }) {
  if (!courseId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('add_course_file', {
    p_course_id: courseId,
    p_title: title,
    p_file_url: fileUrl,
    p_file_type: fileType || 'file'
  });
}

export async function deleteCourseFile(fileId) {
  if (!fileId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase.rpc('delete_course_file', { p_file_id: fileId });
}

// ===== رفع ملف للكورس (Supabase Storage) =====

const FILES_BUCKET = 'course-files';

/** يرفع ملف لـ Storage ويرجع الـ public URL */
export async function uploadCourseFile(file, { courseId, studentId }) {
  if (!file || !courseId) return { data: null, error: { message: 'بيانات ناقصة' } };
  const ext = (file.name || '').split('.').pop()?.toLowerCase();
  const isPdf = ext === 'pdf';
  const isZip = ext === 'zip';
  const fileType = isPdf ? 'pdf' : isZip ? 'zip' : 'file';
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${courseId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) return { data: null, error };
  const { data: urlData } = supabase.storage.from(FILES_BUCKET).getPublicUrl(path);
  return { data: { fileUrl: urlData?.publicUrl, fileType, fileName: safeName }, error: null };
}