/** دمج كلاسات CSS بدون مكتبات خارجية */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/** توليد id محلي مؤقت (للاستخدام في وضع العرض بدون قاعدة بيانات) */
export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('');
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function isObjectEmpty(obj) {
  return !obj || Object.keys(obj).length === 0;
}