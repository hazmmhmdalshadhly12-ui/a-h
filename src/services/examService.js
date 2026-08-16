import { supabase } from '../lib/supabaseClient.js';
import { safeQuery } from '../lib/database.js';

// ===== واجهة الطالب =====

/** امتحانات منشورة لصف الطالب — مع حالة التسليم لو الطالب عاملها */
export async function fetchExamsForStudent(studentId, grade) {
  let q = supabase
    .from('exams')
    .select('id, title, description, grade, duration_minutes, start_at, end_at, is_published')
    .eq('grade', grade)
    .eq('is_published', true)
    .order('start_at', { ascending: true });

  const { data: exams, error } = await q;
  if (error) return { data: [], error };

  if (!studentId || !Array.isArray(exams) || exams.length === 0) return { data: exams || [], error: null };

  // حالة التسليم بتيجي من Function على السيرفر (مش select مباشر على التسليمات)
  const { data: mySubmissions } = await supabase.rpc('get_my_submissions');

  const submittedIds = new Set((mySubmissions || []).map((s) => s.exam_id));
  const data = exams.map((e) => ({ ...e, submitted: submittedIds.has(e.id) }));
  return { data, error: null };
}

/** جلب الامتحان نفسه (بياناته فقط — من غير الأسئلة الحساسة) */
export async function fetchExamById(examId) {
  return supabase.from('exams').select('*').eq('id', examId).maybeSingle();
}

/**
 * أسئلة الامتحان للطالب — من غير الإجابة الصحيحة إطلاقاً.
 * بتيجي من Function على قاعدة البيانات (security definer) مش select مباشر
 * عشان منع أي وصول للإجابات قبل التسليم.
 */
export async function fetchExamQuestionsForStudent(examId) {
  const { data, error } = await supabase.rpc('get_exam_questions', { p_exam_id: examId });
  if (error) return { data: [], error };
  return { data: data || [], error: null };
}

// ===== واجهة الأدمن =====

export async function fetchAllExams() {
  return supabase.from('exams').select('*').order('created_at', { ascending: false });
}

export async function createExam(exam) {
  return supabase.from('exams').insert(exam).select().single();
}

export async function updateExam(examId, updates) {
  return supabase.from('exams').update(updates).eq('id', examId).select().single();
}

export async function deleteExam(examId) {
  return supabase.from('exams').delete().eq('id', examId);
}

export async function publishExam(examId, isPublished) {
  return supabase.from('exams').update({ is_published: isPublished }).eq('id', examId).select().single();
}

// ===== أسئلة (الأدمن فقط) =====

export async function fetchExamQuestions(examId) {
  return supabase
    .from('exam_questions')
    .select('*')
    .eq('exam_id', examId)
    .order('order_index', { ascending: true });
}

export async function createQuestion(question) {
  return supabase.from('exam_questions').insert(question).select().single();
}

export async function updateQuestion(questionId, updates) {
  return supabase.from('exam_questions').update(updates).eq('id', questionId).select().single();
}

export async function deleteQuestion(questionId) {
  return supabase.from('exam_questions').delete().eq('id', questionId);
}

export async function replaceExamQuestions(examId, questions) {
  const withExam = questions.map((q, i) => ({ ...q, exam_id: examId, order_index: i + 1 }));
  const { error: delError } = await supabase.from('exam_questions').delete().eq('exam_id', examId);
  if (delError) return { data: null, error: delError };
  if (withExam.length === 0) return { data: [], error: null };
  return supabase.from('exam_questions').insert(withExam).select();
}