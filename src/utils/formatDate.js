export function formatDate(value, { withTime = false } = {}) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const datePart = new Intl.DateTimeFormat('ar-EG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);

  if (!withTime) return datePart;

  const timePart = new Intl.DateTimeFormat('ar-EG', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);

  return `${datePart} - ${timePart}`;
}

export function formatDateTime(value) {
  return formatDate(value, { withTime: true });
}

export function isPast(value) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}

export function isFuture(value) {
  if (!value) return false;
  return new Date(value).getTime() > Date.now();
}

export function daysUntil(value) {
  if (!value) return null;
  const diff = new Date(value).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}