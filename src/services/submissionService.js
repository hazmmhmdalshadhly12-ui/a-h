import { supabase } from '../lib/supabaseClient.js';

/** تسليم الامتحان — بيتم عن طريق RPC على قاعدة البيانات نفسها (security definer).
 * الـ unique constraint (exam_id, student_id) هو اللي بيمنع فعلياً تسليم الامتحان
 * مرتين من السيرفر نفسه، حتى لو حد حاول يتلاعب من الـ Network.
 * التصحيح الآلي للموضوعي بيحصل داخل الـ RPC كمان.
 */
export async function submitExam(examId, answers) {
  return supabase.rpc('submit_exam', {
    p_exam_id: examId,
    p_answers: answers
  });
}

/** تسليمات الطالب + النتيجة (بس لما تكون منشورة) — من Function آمنة على السيرفر */
export async function fetchMySubmissions(studentId) {
  const { data, error } = await supabase.rpc('get_my_submissions');
  if (error) return { data: [], error };

  const examIds = (data || []).map((s) => s.exam_id);
  if (examIds.length === 0) return { data: [], error: null };

  const { data: examRows } = await supabase
    .from('exams')
    .select('id, title, grade, duration_minutes')
    .in('id', examIds);

  const examMap = new Map((examRows || []).map((e) => [e.id, e]));
  const merged = (data || []).map((s) => ({ ...s, exams: examMap.get(s.exam_id) }));
  return { data: merged, error: null };
}

/** تسليم الطالب في امتحان معين (للمراجعة بعد التسليم) — score بيظهر بس لو منشور */
export async function fetchSubmissionForExam(studentId, examId) {
  const { data, error } = await supabase.rpc('get_my_submission', { p_exam_id: examId });
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row || null, error: null };
}

// ===== الأدمن =====

/** كل تسليمات امتحان مع بيانات الطالب */
export async function fetchSubmissionsForExam(examId) {
  return supabase
    .from('exam_submissions')
    .select('*, profiles(id, full_name, phone, grade)')
    .eq('exam_id', examId)
    .order('submitted_at', { ascending: true });
}

/** تصحيح يدوي للدرجات المقالية */
export async function setManualScore(submissionId, manualScore) {
  return supabase
    .from('exam_submissions')
    .update({ manual_score: manualScore })
    .eq('id', submissionId)
    .select()
    .single();
}

/** نشر الدرجات (وإعادة حساب الإجمالي من السيرفر) */
export async function publishGrade(submissionId) {
  return supabase.rpc('publish_grade', { p_submission_id: submissionId });
}

/** نشر درجات كل الامتحان دفعة واحدة */
export async function publishAllGrades(examId) {
  return supabase.rpc('publish_exam_grades', { p_exam_id: examId });
}

export async function fetchAllSubmissionsAdmin() {
  return supabase
    .from('exam_submissions')
    .select('*, profiles(id, full_name, grade), exams(id, title, grade)')
    .order('submitted_at', { ascending: false });
}

/** تسليمات طالب معين (للأدمن من صفحة ملف الطالب) — وصول مباشر لأن RLS بيسمح للأدمن */
export async function fetchSubmissionsForStudent(studentId) {
  return supabase
    .from('exam_submissions')
    .select('*, exams(id, title, grade)')
    .eq('student_id', studentId)
    .order('submitted_at', { ascending: false });
}