import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { fetchPreferences, savePreferences, DEFAULT_LAYOUT } from '../services/preferencesService.js';

const StudentPrefsContext = createContext(null);

/**
 * تفضيلات الطالب (لون اللوحة + ترتيب الأقسام).
 * بيحمّل أول ما يدخل بوابة الطالب، وأي تغيير بيتحفظ تلقائياً.
 */
export function StudentPrefsProvider({ studentId, children }) {
  const [accent, setAccent] = useState('amber');
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef(null);
  const pendingSave = useRef(null);
  const loaded = useRef(false);

  // تحميل التفضيلات أول مرة
  useEffect(() => {
    let active = true;
    if (!studentId || loaded.current) return;
    loaded.current = true;
    fetchPreferences(studentId)
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          if (data.accent) setAccent(data.accent);
          if (Array.isArray(data.dashboard_layout) && data.dashboard_layout.length) {
            setLayout(data.dashboard_layout);
          }
        }
        setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [studentId]);

  // الحفظ التلقائي (بعد ثانية من آخر تغيير — عشان منكترش الطلبات)
  const scheduleSave = useCallback(
    (next) => {
      if (!studentId) return;
      pendingSave.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        pendingSave.current = null;
        savePreferences(studentId, next).catch(() => {});
      }, 1000);
    },
    [studentId]
  );

  useEffect(() => {
    if (!ready) return;
    scheduleSave({ accent, dashboardLayout: layout });
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // لو الطالب غيّر وساب الصفحة قبل ما الحفظ يتنفذ — نحفظ فوراً
      if (pendingSave.current) savePreferences(studentId, pendingSave.current).catch(() => {});
      pendingSave.current = null;
    };
  }, [accent, layout, ready, scheduleSave, studentId]);

  const changeAccent = useCallback((a) => setAccent(a), []);

  /** إظهار/إخفاء قسم — الـ layout فيه الأقسام المرئية فقط بالترتيب */
  const toggleSection = useCallback((id) => {
    setLayout((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  /** نقل قسم لأعلى/لأسفل في ترتيب العرض */
  const moveSection = useCallback((id, dir) => {
    setLayout((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) return prev;
      const to = idx + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[to]] = [next[to], next[idx]];
      return next;
    });
  }, []);

  /** إعادة الترتيب للوضع الافتراضي */
  const resetLayout = useCallback(() => setLayout(DEFAULT_LAYOUT), []);

  return (
    <StudentPrefsContext.Provider
      value={{ accent, layout, ready, changeAccent, toggleSection, moveSection, resetLayout }}
    >
      {children}
    </StudentPrefsContext.Provider>
  );
}

export function useStudentPrefs() {
  const ctx = useContext(StudentPrefsContext);
  if (!ctx) throw new Error('useStudentPrefs must be used within StudentPrefsProvider');
  return ctx;
}