import { createClient } from '@supabase/supabase-js';
import { cookieStorage, COOKIE_PREFIX } from './cookieStorage.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — راجع .env.example');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: cookieStorage,
    storageKey: COOKIE_PREFIX
  }
});

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')
);

export const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://yvkjqdmitwouluiqkuvv.supabase.co/functions/v1';