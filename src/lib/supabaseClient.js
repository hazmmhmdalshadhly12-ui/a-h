import { createClient } from '@supabase/supabase-js';
import { cookieStorage, COOKIE_PREFIX } from './cookieStorage.js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Production fallback values (project: yvkjqdmitwouluiqkuvv)
const FALLBACK_URL = 'https://yvkjqdmitwouluiqkuvv.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2a2pxZG1pdHdvdWx1aXFrdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzMwMDAsImV4cCI6MjA3MzI0OTAwMH0.placeholder_key_for_build';

const finalUrl = supabaseUrl || FALLBACK_URL;
const finalKey = supabaseAnonKey || 'placeholder_anon_key_for_build_only';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl?.includes('supabase.co'));

// Create supabase client with fallback for build time
function createSupabaseClient() {
  try {
    return createClient(
      supabaseUrl || 'https://yvkjqdmitwouluiqkuvv.supabase.co',
      supabaseAnonKey || 'placeholder_anon_key_for_build_only',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: cookieStorage,
          storageKey: COOKIE_PREFIX
        }
      }
    );
  } catch (e) {
    // Fallback for build time when env vars not available
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        signOut: () => Promise.resolve({ error: null })
      },
      from: () => ({
        select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
        insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }),
        rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
      },
      rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      storage: { from: () => ({ upload: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
      functions: { invoke: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }
    };
  }
}

export const supabase = createSupabaseClient();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl?.includes('supabase.co'));

export const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://yvkjqdmitwouluiqkuvv.supabase.co/functions/v1';