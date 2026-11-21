/**
 * حسابات وقت الامتحان — مصدر واحد للعد التنازلي المتوافق مع الخادم.
 *
 * الخادم هو المرجع الوحيد للموعد النهائي (deadline) ويرجعه start_exam_attempt،
 * والواجهة تحسب المتبقي من نفس الموعد حتى لا يختلف العداد عن قاعدة البيانات
 * ولا يُصفَّر بمجرد تحديث الصفحة.
 */

/** مهلة التسليم بعد انتهاء العد (ثوانٍ) — نفس قيمة الخادم في exam_attempt_deadline */
export const SUBMIT_GRACE_SECONDS = 60;

/**
 * المتبقي بالثواني حتى الموعد النهائي حسب ساعة الخادم (وليس ساعة الجهاز).
 *
 * @param {string} serverNowIso وقت الخادم لحظة الاستجابة (ISO)
 * @param {string} deadlineIso الموعد النهائي من الخادم (ISO)
 * @param {number} clientNowMs وقت الجهاز الحالي (لحساب فرق الساعة) — للاختبارات
 * @returns {number|null} الثواني المتبقية (0 كأدنى)، أو null لو المدخلات غير صالحة
 */
export function computeRemainingSeconds(serverNowIso, deadlineIso, clientNowMs = Date.now()) {
  if (!serverNowIso || !deadlineIso) return null;
  const serverNow = Date.parse(serverNowIso);
  const deadline = Date.parse(deadlineIso);
  if (!Number.isFinite(serverNow) || !Number.isFinite(deadline)) return null;

  // فرق ساعة الجهاز عن الخادم (يصحح تأخر/تقدم ساعة الطالب)
  const driftMs = clientNowMs - serverNow;
  const remainingMs = deadline - clientNowMs + driftMs;
  return Math.max(0, Math.round(remainingMs / 1000));
}
