import { supabase } from '../lib/supabaseClient.js';
import { safeQuery } from '../lib/database.js';
import { MOCK_CONTACT_LINKS } from '../lib/mockData.js';

export async function fetchContactLinks() {
  return safeQuery(MOCK_CONTACT_LINKS, () => supabase.from('contact_links').select('*').order('platform', { ascending: true }));
}

export async function saveContactLinks(links) {
  const normalized = links.filter((l) => l.value);
  const { error: delError } = await supabase.from('contact_links').delete().gt('id', '00000000-0000-0000-0000-000000000000');
  if (delError) return { error: delError };
  if (normalized.length === 0) return { data: [], error: null };
  return supabase.from('contact_links').insert(normalized).select();
}

export async function upsertContactLink(link) {
  return supabase.from('contact_links').upsert(link).select().single();
}