/**
 * تخزين جلسة Supabase في كوكيز بدلاً من localStorage.
 *
 * ليه كوكيز؟
 *   - الجلسة (الـ access token + refresh token) بتتحفظ في الكوكيز،
 *     فمش بتحتاج JavaScript خالصة عشان تسترجعها — والكوكيز شغالة
 *     حتى لو localStorage متقفول (تصفح خاص/برايفسي).
 *   - الكوكيز بتعدي لطلبات النطاق نفسه، والأهم إنها بتفضل محفوظة
 *     بطول عمر أطول وبتتحدد لكل الصفحات (Path=/).
 *
 * ملاحظة حماية: الكوكيز دي مش HttpOnly (لأنها بتتحط من الـ Frontend)،
 * بس قيمتها Session JWT مش أي حاجة حساسة تانية — والـ RLS هو الحارس
 * الحقيقي على قاعدة البيانات.
 */

// اسم كوكيز الجلسة — بيستخدم كـ storageKey في عميل Supabase
const COOKIE_PREFIX = 'sb_vision_auth';

// العمر: 30 يوم — بتتحدث تلقائياً مع كل refresh للتوكن
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// الحد الأقصى لحجم الكوكي الواحدة (~4KB) — الجلسة ممكن تبقى أكبر،
// فبنقسّمها على أكتر من كوكي لو لزم (نفس فكرة @supabase/ssr).
const CHUNK_SIZE = 3200;

function readCookies() {
  const out = {};
  for (const part of document.cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!name) continue;
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

function writeCookie(name, value, maxAge = COOKIE_MAX_AGE) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function deleteCookie(name) {
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getCookieItem(key) {
  const cookies = readCookies();
  if (key in cookies) return cookies[key];

  // جلسة مقسّمة على أكتر من كوكي → جمعها
  let combined = '';
  for (let i = 0; ; i++) {
    const part = cookies[`${key}__${i}`];
    if (part == null) break;
    combined += part;
  }
  return combined || null;
}

export function setCookieItem(key, value) {
  if (value == null) {
    clearCookieItem(key);
    return;
  }

  // مسح أي كوكيات قديمة للجلسة قبل الكتابة (بيتمنع التراكم)
  clearCookieItem(key);

  if (value.length <= CHUNK_SIZE) {
    writeCookie(key, value);
  } else {
    // تقسيم القيمة على أكثر من كوكي
    for (let i = 0, offset = 0; offset < value.length; i++, offset += CHUNK_SIZE) {
      writeCookie(`${key}__${i}`, value.slice(offset, offset + CHUNK_SIZE));
    }
  }
}

export function clearCookieItem(key) {
  deleteCookie(key);
  // تنظيف أي شظايا كوكيز قديمة (حتى 20 جزء)
  for (let i = 0; i < 20; i++) deleteCookie(`${key}__${i}`);
}

/** مخزن جلسة Supabase القابل للتمرير في createClient({ auth: { storage } }) */
export const cookieStorage = {
  getItem: getCookieItem,
  setItem: setCookieItem,
  removeItem: clearCookieItem
};

// عند أول تشغيل بالكوكيز: لو فيه جلسة قديمة محفوظة في localStorage
// (من إصدار قديم)، ننقلها للكوكيز ونمسح القديم — عشان الترقية تبقى سلسة
// من غير ما المستخدم يضطر يسجل دخول تاني.
const LEGACY_STORAGE_KEYS = [
  'sb-vision-auth-token',
  'sb-yvkjqdmitwouluiqkuvv-auth-token'
];

export function migrateLegacySession() {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = window.localStorage?.getItem(key);
      if (legacy && !getCookieItem(COOKIE_PREFIX)) {
        setCookieItem(COOKIE_PREFIX, legacy);
        window.localStorage?.removeItem(key);
      }
    }
  } catch {
    // تجاهل أي خطأ — لو localStorage متقفول أو فاضية
  }
}

export { COOKIE_PREFIX };