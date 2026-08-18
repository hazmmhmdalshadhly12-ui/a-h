import { supabase } from '../lib/supabaseClient.js';

const BUCKET = 'materials';

/** كل ملفات مكتبة المذكرات (بترتيب الأحدث أولاً) — اختياري فلتر بالصف */
export async function fetchMaterials(grade) {
  let q = supabase.from('materials').select('*').order('created_at', { ascending: false });
  if (grade) q = q.eq('grade', grade);
  return q;
}

/** رابط تحميل الملف من السلة (بينزّل مباشرة بدل فتح نافذة العرض) */
export function materialUrl(filePath, downloadName) {
  if (!filePath) return '';
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  const base = data?.publicUrl || '';
  if (!base) return '';
  const name = downloadName || filePath.split('/').pop() || 'file';
  return `${base}?download=${encodeURIComponent(name)}`;
}

/** تحميل الملف كملف مباشرة في نفس الصفحة — من غير فتح صفحة تانية (بيبعد عن حظر المتصفح للروابط الخارجية) */
export async function downloadMaterial(item) {
  if (!item?.file_path) return { data: null, error: { message: 'بيانات ناقصة' } };
  const { data: blob, error } = await supabase.storage.from(BUCKET).download(item.file_path);
  if (error) return { data: null, error };
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = item.file_name || 'ملف';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { data: true, error: null };
}

/** رفع ملف جديد مع بياناته */
export async function uploadMaterial({ title, description, grade, file }) {
  if (!title?.trim() || !grade || !file) return { data: null, error: { message: 'اكتب العنوان واختار الصف والملف' } };

  const ext = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeExt = ext ? `.${ext}` : '';
  const path = `${grade}/${Date.now()}_${Math.random().toString(36).slice(2)}${safeExt}`;

  const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
  if (up.error) return { data: null, error: up.error };

  return supabase
    .from('materials')
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      grade,
      file_name: file.name,
      file_path: up.data.path,
      file_size: file.size
    })
    .select()
    .single();
}

/** حذف ملف (من السلة + الجدول) */
export async function deleteMaterial(item) {
  if (!item?.id) return { data: null, error: null };
  await supabase.storage.from(BUCKET).remove([item.file_path]);
  return supabase.from('materials').delete().eq('id', item.id);
}

/** حجم الملف بشكل مقروء */
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} ك.ب`;
  return `${(bytes / 1024 / 1024).toFixed(1)} م.ب`;
}