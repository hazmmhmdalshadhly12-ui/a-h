// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { cookieStorage, COOKIE_PREFIX } from './cookieStorage.js';

// قراءة متغيرات البيئة مع fallback آمن
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yvkjqdmitwouluiqkuvv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2a2pxZG1pdHdvdWx1aXFrdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzMwMDAsImV4cCI6MjA3MzI0OTAwMH0.placeholder_key_for_build';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://yvkjqdmitwouluiqkuvv.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2a2pxZG1pdHdvdWx1aXFrdXZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NzMwMDAsImV4cCI6MjA3MzI0OTAwMH0.placeholder_key_for_build',
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

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')
);

export const functionsUrl = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL || 'https://yvkjqdmitwouluiqkuvv.supabase.co/functions/v1';
