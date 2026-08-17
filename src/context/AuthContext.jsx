import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import { getSession, onAuthStateChange, signOut as doSignOut } from '../lib/auth.js';
import { fetchProfile } from '../services/profileService.js';
import { supabase } from '../lib/supabaseClient.js';
import { migrateLegacySession } from '../lib/cookieStorage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (opts = {}) => {
    const { data } = await getSession();
    const user = data?.session?.user;
    if (!user) {
      setProfile(null);
      return null;
    }

    // محاولات متكررة لو جلب البروفايل فشل مؤقتاً (شبكة / RLS مش سريع)
    // عشان منطلعش المستخدم على 403 بالخطأ بعد الرفرش.
    const attempts = opts.attempts ?? 3;
    let lastRes = null;
    for (let i = 0; i < attempts; i++) {
      lastRes = await fetchProfile(user.id);
      if (lastRes?.data) break;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 400));
    }

    if (lastRes?.data) setProfile(lastRes.data);
    return lastRes?.data ?? null;
  }, []);

  useEffect(() => {
    let active = true;

    // نستنى الـ profile يكمل تحميله قبل ما نوقف الـ loading
    // عشان الروتور ميشوفش profile=null ويعمل redirect لـ /403 (ممنوع الوصول) بالخطأ
    const finishAuth = async () => {
      // نقل الجلسة القديمة (لو موجودة) من localStorage للكوكيز مرة واحدة
      migrateLegacySession();
      const { data } = await getSession();
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      if (!active) return;
      setLoading(false);
    };

    finishAuth();

    const { data: sub } = onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        await refreshProfile();
      } else {
        setProfile(null);
      }
      if (!active) return;
      setLoading(false);
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await doSignOut();
    setSession(null);
    setProfile(null);
    toast.info('تم تسجيل الخروج');
  }, [toast]);

  const isAdmin = Boolean(profile?.role === 'admin');
  const isStudent = Boolean(session?.user && profile?.role === 'student');

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, refreshProfile, signOut, isAdmin, isStudent }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { supabase };