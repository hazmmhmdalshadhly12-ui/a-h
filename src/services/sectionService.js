import { supabase } from '../lib/supabaseClient.js';
import { safeQuery } from '../lib/database.js';
import { MOCK_SECTIONS } from '../lib/mockData.js';

/** جلب كل الأقسام (مرتبة) */
export async function fetchSections() {
  return safeQuery(MOCK_SECTIONS, () =>
    supabase.from('course_sections').select('*').order('order_index', { ascending: true })
  );
}

/** قسم واحد */
export async function fetchSectionById(sectionId) {
  if (!sectionId) return { data: null, error: null };
  return safeQuery(MOCK_SECTIONS.find((s) => s.id === sectionId) || null, () =>
    supabase.from('course_sections').select('*').eq('id', sectionId).maybeSingle()
  );
}

// ===== الأدمن =====

export async function createSection({ title, grade, orderIndex }) {
  return supabase
    .from('course_sections')
    .insert({ title, grade: grade || 'first_secondary', order_index: orderIndex || 1 })
    .select()
    .single();
}

export async function updateSection(sectionId, updates) {
  return supabase.from('course_sections').update(updates).eq('id', sectionId).select().single();
}

export async function deleteSection(sectionId) {
  return supabase.from('course_sections').delete().eq('id', sectionId);
}