import { createClient } from '@supabase/supabase-js';
import { cookieStorage, COOKIE_PREFIX } from './cookieStorage.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const FALLBACK_URL = 'https://yvkjqdmitwouluiqkuvv.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2a2pxZG1pdHdvdWx1aXFrdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzMwMDAsImV4cCI6MjA3MzI0OTAwMH0.placeholder_key_for_build';

let supabaseInstance = null;

function getSupabase() {
  if (supabaseInstance) return supabaseInstance;
  
  const url = import.meta.env.VITE_SUPABASE_URL || 'https://yvkjqdmitwouluiqkuvv.supabase.co';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2a2pxZG1pdHdvdWx1aXFrdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzMwMDAsImV4cCI6MjA3MzI0OTAwMH0.placeholder_key_for_build';
  
  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: cookieStorage,
      storageKey: COOKIE_PREFIX
    }
  });
  
  return supabaseInstance;
}

// Export a proxy that initializes on first access
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabase();
    return client[prop];
  }
});

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')
);

export const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://yvkjqdmitwouluiqkuvv.supabase.co/functions/v1';
