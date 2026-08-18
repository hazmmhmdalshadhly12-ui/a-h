import { supabase } from '../lib/supabaseClient.js';

// ===== ولي الأمر: ربط أولاده + متابعتهم =====

/** ربط ولي الأمر بطفله برقم موبايل الطالب */
export async function linkStudentToParent(studentPhone) {
  if (!studentPhone) return { data: null, error: { message: 'اكتب رقم الطالب' } };
  return supabase.rpc('link_student_to_parent', { p_student_phone: studentPhone });
}

/** فك ربط طالب من حساب ولي الأمر */
export async function unlinkStudent(studentId) {
  if (!studentId) return { data: null, error: null };
  return supabase.rpc('unlink_student', { p_student_id: studentId });
}

/** كل أبناء ولي الأمر (بيانات الطلاب المرتبطين) */
export async function fetchParentStudents() {
  return supabase.rpc('get_parent_students');
}

/** درجات الطالب (المنشورة بس) */
export async function fetchStudentGradesForParent(studentId) {
  if (!studentId) return { data: [], error: null };
  return supabase.rpc('get_student_grades_for_parent', { p_student_id: studentId });
}

/** حالة امتحانات الطالب: في امتحانات؟ سلم ولا لأ؟ الدرجة ظهرت؟ */
export async function fetchStudentExamStatus(studentId) {
  if (!studentId) return { data: [], error: null };
  return supabase.rpc('get_student_exam_status', { p_student_id: studentId });
}

/** حالة واجبات الطالب: في واجبات؟ سلم ولا لأ؟ النتيجة؟ */
export async function fetchStudentHomeworkStatus(studentId) {
  if (!studentId) return { data: [], error: null };
  return supabase.rpc('get_student_homework_status', { p_student_id: studentId });
}

/** حالة كورسات الطالب: الكورسات المتاحة والمقفولة (كورسات صفه + الاحترافي) */
export async function fetchStudentCourseAccess(studentId) {
  if (!studentId) return { data: [], error: null };
  return supabase.rpc('get_student_course_access', { p_student_id: studentId });
}

/** ملخص وصول الطالب: الأشهر المؤكدة + الكورسات الاحترافية */
export async function fetchStudentAccess(studentId) {
  if (!studentId) return { data: [], error: null };
  return supabase.rpc('get_student_access', { p_student_id: studentId });
}
