import { supabase } from '../lib/supabaseClient.js';
import { safeQuery } from '../lib/database.js';
import { MOCK_COMPETITIONS } from '../lib/mockData.js';

export async function fetchCompetitions({ grade } = {}) {
  return safeQuery(MOCK_COMPETITIONS, () => {
    let q = supabase.from('competitions').select('*').order('deadline', { ascending: true });
    if (grade) q = q.eq('grade', grade);
    return q;
  });
}

export async function fetchCompetitionById(id) {
  return safeQuery(MOCK_COMPETITIONS.find((c) => c.id === id) || null, () =>
    supabase.from('competitions').select('*').eq('id', id).maybeSingle()
  );
}

export async function createCompetition(comp) {
  return supabase.from('competitions').insert(comp).select().single();
}

export async function updateCompetition(id, updates) {
  return supabase.from('competitions').update(updates).eq('id', id).select().single();
}

export async function deleteCompetition(id) {
  return supabase.from('competitions').delete().eq('id', id);
}
