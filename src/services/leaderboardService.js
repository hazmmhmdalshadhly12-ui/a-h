import { supabase } from '../lib/supabaseClient.js';

/** لوحة التفوق لصف معين — أول 20 طالب بترتيب النقاط */
export async function fetchLeaderboard(grade) {
  if (!grade) return { data: [], error: null };
  return supabase.rpc('get_leaderboard', { p_grade: grade });
}
