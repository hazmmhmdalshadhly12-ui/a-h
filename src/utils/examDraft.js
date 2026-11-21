/**
 * حفظ محلي آمن لمسودة إجابات الامتحان (localStorage).
 *
 * الهدف: إجابات الطالب لا تضيع أبدًا بسبب خطأ مؤقت أو انقطاع اتصال أثناء التسليم —
 * تبقى محفوظة محليًا حتى يتم تأكيد نجاح التسليم من الخادم، وتُمسح بعدها.
 *
 * الدوال نقية (نمرر لها storage) حتى يمكن اختبارها بدون متصفح.
 */

const PREFIX = 'vision_exam_draft_v1';
/** نحتفظ بالمسودة 24 ساعة كحد أقصى ثم نهملها */
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** حد أقصى للحجم حتى لا نكسر حصة التخزين */
const MAX_SIZE = 512 * 1024;

/** مفتاح التخزين لامتحان/طالب — أو null لو المدخلات ناقصة */
export function draftKey(examId, studentId) {
  if (!examId || !studentId) return null;
  return `${PREFIX}:${studentId}:${examId}`;
}

/** حفظ المسودة — يرجع true لو تم الحفظ فعلاً */
export function saveDraft(storage, examId, studentId, answers) {
  const key = draftKey(examId, studentId);
  if (!key || !storage) return false;
  try {
    const payload = JSON.stringify({ answers: answers || {}, saved_at: Date.now() });
    if (payload.length > MAX_SIZE) return false;
    storage.setItem(key, payload);
    return true;
  } catch {
    return false;
  }
}

/**
 * تحميل المسودة — يرجع كائن الإجابات أو null.
 * المسودة منتهية الصلاحية أو التالفة تُمسح ولا تُرجع.
 */
export function loadDraft(storage, examId, studentId, nowMs = Date.now()) {
  const key = draftKey(examId, studentId);
  if (!key || !storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      storage.removeItem(key);
      return null;
    }
    if (typeof parsed.saved_at !== 'number' || nowMs - parsed.saved_at > DRAFT_MAX_AGE_MS) {
      storage.removeItem(key);
      return null;
    }
    const answers = parsed.answers;
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      storage.removeItem(key);
      return null;
    }
    return answers;
  } catch {
    return null;
  }
}

/** مسح المسودة بعد نجاح التسليم (أو عند عدم الحاجة) */
export function clearDraft(storage, examId, studentId) {
  const key = draftKey(examId, studentId);
  if (!key || !storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // تجاهل — مسح المسودة ليس حرجًا
  }
}
