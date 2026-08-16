import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useToast } from '../components/ui/Toast.jsx';
import { getSession, onAuthStateChange, signOut as doSignOut } from '../lib/auth.js';
import { fetchProfile } from '../services/profileService.js';
import { supabase } from '../lib/supabaseClient.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data } = await getSession();
    const user = data?.session?.user;
    if (!user) {
      setProfile(null);
      return null;
    }
    const res = await fetchProfile(user.id);
    if (res?.data) setProfile(res.data);
    return res?.data ?? null;
  }, []);

  useEffect(() => {
    let active = true;
    getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) refreshProfile();
      setLoading(false);
    });

    const { data: sub } = onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        refreshProfile();
      } else {
        setProfile(null);
      }
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