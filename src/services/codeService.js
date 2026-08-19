import { supabase } from '../lib/supabaseClient.js';

/** تحديات الكود للطالب (بس اللي منشور لصفه — من غير كود الاختبارات والحل) */
export async function fetchCodeChallenges(grade) {
  if (!grade) return { data: [], error: null };
  return supabase.rpc('get_code_challenges', { p_grade: grade });
}

/** محاولات الطالب السابقة (الليدر بورد/متابعة المدرس) */
export async function fetchMyCodeSolutions() {
  return supabase.from('code_solutions').select('*').order('created_at', { ascending: false });
}

/** حفظ محاولة حل (للمتابعة — بيتم بصمت، الخطأ مالوش أثر على الطالب) */
export async function saveCodeSolution({ challengeId, code, passed }) {
  if (!challengeId) return { data: null, error: null };
  const { error } = await supabase.from('code_solutions').insert({
    challenge_id: challengeId,
    code,
    passed: Boolean(passed)
  });
  return { data: null, error };
}

// ===================== الأدمن =====================

/** كل التحديات (كل الصفوف) — فيها الحل وكود الاختبارات */
export async function fetchAllChallenges() {
  let q = supabase.from('code_challenges').select('*').order('order_index', { ascending: true });
  return q;
}

export async function createChallenge(challenge) {
  return supabase.from('code_challenges').insert(challenge).select().single();
}

export async function updateChallenge(challengeId, updates) {
  return supabase.from('code_challenges').update(updates).eq('id', challengeId).select().single();
}

export async function deleteChallenge(challengeId) {
  return supabase.from('code_challenges').delete().eq('id', challengeId);
}

/** حلول الطلاب للتحدي (للمتابعة) */
export async function fetchChallengeSolutions(challengeId) {
  let q = supabase
    .from('code_solutions')
    .select('id, code, passed, created_at, student_id, profiles(full_name)')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: false })
    .limit(100);
  return q;
}