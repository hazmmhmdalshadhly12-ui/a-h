export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PHONE_RE = /^(01[0125][0-9]{8}|0?1[0125][0-9]{8})$/;

export function validateEmail(email) {
  if (!email) return 'الإيميل مطلوب';
  if (!EMAIL_RE.test(email)) return 'الإيميل غير صحيح';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'الباسورد مطلوب';
  if (password.length < 6) return 'الباسورد لازم يكون 6 أحرف على الأقل';
  return '';
}

export function validatePhone(phone, { required = false, label = 'رقم الموبايل' } = {}) {
  if (!phone) return required ? `${label} مطلوب` : '';
  if (!PHONE_RE.test(phone.replace(/\s|-/g, ''))) return `${label} غير صحيح`;
  return '';
}

export function validateRequired(value, label) {
  if (!value || String(value).trim() === '') return `${label} مطلوب`;
  return '';
}

export function validateName(name) {
  if (!name) return 'الاسم الكامل مطلوب';
  if (name.trim().length < 3) return 'الاسم قصير جداً';
  return '';
}