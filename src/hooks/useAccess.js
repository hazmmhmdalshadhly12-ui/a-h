import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { isSupabaseConfigured } from '../lib/supabaseClient.js';

/**
 * حماية المحتوى: الطالب لازم يكون عنده حجز مؤكد علشان يشوف الكورسات والامتحانات وأي محتوى تعليمي.
 * الشات والملف والحجوزات شغالين دايماً.
 */
export function useAccess() {
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setConfirmed(true);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('has_confirmed_booking');
      setConfirmed(!error && data === true);
    } catch {
      setConfirmed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { confirmed, loading, reload: check };
}