import { useState, useCallback } from 'react';
import { useAuth } from './useAuth.js';
import { updateProfile } from '../services/profileService.js';
import { useToast } from '../components/ui/Toast.jsx';

export function useProfile() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const saveProfile = useCallback(
    async (updates) => {
      if (!profile) return { error: { message: 'لازم تسجل دخول أولاً' } };
      setSaving(true);
      const { error } = await updateProfile(profile.id, updates);
      setSaving(false);
      if (error) {
        toast.error('فشل تحديث البيانات');
        return { error };
      }
      await refreshProfile();
      toast.success('تم حفظ التعديلات');
      return { error: null };
    },
    [profile, refreshProfile, toast]
  );

  return { profile, saveProfile, saving };
}