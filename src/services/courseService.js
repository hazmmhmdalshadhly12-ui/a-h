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

export async function fetchStudentCourses(grade) {
  if (!grade) return { data: [], error: null };
  return supabase.rpc('get_student_courses', { p_grade: grade });
}

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

export async function createCourse(course) {
  return supabase.from('courses').insert(course).select().single();
}

export async function updateCourse(courseId, updates) {
  return supabase.from('courses').update(updates).eq('id', courseId).select().single();
}

export async function deleteCourse(courseId) {
  return supabase.from('courses').delete().eq('id', courseId);
}

export async function fetchCourseLessonsAdmin(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
}

export async function addCourseLesson(courseId, { title, description, videoUrl, videoProvider, durationMinutes, orderIndex, isFree }) {
  return supabase.from('lessons').insert({
    course_id: courseId,
    title,
    description,
    video_url: videoUrl,
    video_provider: videoProvider,
    duration_minutes: durationMinutes,
    order_index: orderIndex,
    is_free: isFree
  }).select().single();
}

export async function updateCourseLesson(lessonId, { title, description, videoUrl, videoProvider, durationMinutes, orderIndex, isFree }) {
  return supabase.from('lessons').update({
    title,
    description,
    video_url: videoUrl,
    video_provider: videoProvider,
    duration_minutes: durationMinutes,
    order_index: orderIndex,
    is_free: isFree
  }).eq('id', lessonId).select().single();
}

export async function deleteCourseLesson(lessonId) {
  return supabase.from('lessons').delete().eq('id', lessonId);
}

export async function reorderLessons(lessonOrders) {
  const updates = lessonOrders.map(({ id, order_index }) =>
    supabase.from('lessons').update({ order_index }).eq('id', id)
  );
  return Promise.all(updates);
}

export async function fetchCourseSectionsWithLessons(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase.rpc('get_course_sections_with_lessons', { p_course_id: courseId });
}

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

const FILES_BUCKET = 'course-files';

const ALLOWED_EXTENSIONS = [
  'pdf', 'png', 'jpg', 'jpeg', 'jfif', 'webp', 'gif',
  'mp4', 'm4v', 'mov', 'zip', 'rar', '7z',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'mp3', 'wav', 'ogg'
];

export async function uploadCourseFile(file, { courseId, studentId }) {
  if (!file || !courseId) return { data: null, error: { message: 'بيانات ناقصة' } };
  const ext = (file.name || '').split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { data: null, error: { message: 'نوع الملف غير مسموح — PDF/صور/فيديو/وثائق/ملفات مضغوطة فقط (ممنوع HTML وSVG لأمان الموقع)' } };
  }
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

export function courseFileDownloadUrl(file) {
  if (!file?.file_url) return '';
  const base = file.file_url;
  if (!base.includes('/storage/v1/object/public/')) return base;
  const name = file.title || base.split('/').pop() || 'file';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}download=${encodeURIComponent(name)}`;
}

export async function downloadCourseFile(file) {
  if (!file?.file_url) return { data: null, error: { message: 'بيانات ناقصة' } };
  const marker = '/object/public/course-files/';
  const idx = file.file_url.indexOf(marker);
  const path = idx >= 0 ? file.file_url.slice(idx + marker.length) : null;
  if (!path) return { data: null, error: { message: 'مسار الملف غير صحيح' } };
  const { data: blob, error } = await supabase.storage.from(FILES_BUCKET).download(path);
  if (error) return { data: null, error };
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.title || 'ملف';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { data: true, error: null };
}
