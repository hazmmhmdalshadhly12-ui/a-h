import { supabase } from '../lib/supabaseClient.js';

// ===== واجبات (للأدمن) =====

export async function fetchHomeworks(courseId) {
  if (!courseId) return { data: [], error: null };
  return supabase
    .from('homeworks')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });
}

export async function createHomework({ courseId, title, description, orderIndex }) {
  if (!courseId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase
    .from('homeworks')
    .insert({ course_id: courseId, title, description: description || null, order_index: orderIndex || 1 })
    .select()
    .single();
}

export async function updateHomework(homeworkId, updates) {
  return supabase.from('homeworks').update(updates).eq('id', homeworkId).select().single();
}

export async function deleteHomework(homeworkId) {
  return supabase.from('homeworks').delete().eq('id', homeworkId);
}

// ===== أسئلة الواجب (للأدمن) =====

export async function fetchHomeworkQuestions(homeworkId) {
  if (!homeworkId) return { data: [], error: null };
  return supabase
    .from('homework_questions')
    .select('*')
    .eq('homework_id', homeworkId)
    .order('order_index', { ascending: true });
}

export async function createHomeworkQuestion({ homeworkId, questionText, type, options, correctAnswer, points, orderIndex }) {
  if (!homeworkId) return { data: null, error: { message: 'بيانات ناقصة' } };
  return supabase
    .from('homework_questions')
    .insert({
      homework_id: homeworkId,
      question_text: questionText,
      type: type || 'mcq',
      options: options || null,
      correct_answer: correctAnswer || null,
      points: points || 1,
      order_index: orderIndex || 1
    })
    .select()
    .single();
}

export async function updateHomeworkQuestion(questionId, updates) {
  return supabase.from('homework_questions').update(updates).eq('id', questionId).select().single();
}

export async function deleteHomeworkQuestion(questionId) {
  return supabase.from('homework_questions').delete().eq('id', questionId);
}

// ===== تسليمات (للأدمن — مراجعة) =====

export async function fetchSubmissions(homeworkId) {
  if (!homeworkId) return { data: [], error: null };
  return supabase
    .from('homework_submissions')
    .select('*, student:profiles!homework_submissions_student_id_fkey(id, full_name, phone)')
    .eq('homework_id', homeworkId)
    .order('submitted_at', { ascending: false });
}