// بيانات عرض (mock) — بتظهر بس لما Supabase ميكونش متظبط في الـ env
// عشان الموقع يفضل شغال وشكله حي قبل التشغيل الفعلي.

export const MOCK_CONTACT_LINKS = [
  { id: 'c1', platform: 'whatsapp', label: 'واتساب', value: '01000000000' },
  { id: 'c2', platform: 'phone', label: 'تليفون', value: '01000000000' },
  { id: 'c3', platform: 'facebook', label: 'فيسبوك', value: 'https://facebook.com/visionacademy' },
  { id: 'c4', platform: 'youtube', label: 'يوتيوب', value: 'https://youtube.com/@visionacademy' },
  { id: 'c5', platform: 'telegram', label: 'تليجرام', value: 'https://t.me/visionacademy' },
  { id: 'c6', platform: 'instagram', label: 'إنستجرام', value: 'https://instagram.com/visionacademy' }
];

export const MOCK_COURSES = [
  {
    id: 'cr1',
    title: 'مدخل إلى البرمجة — Python',
    description: 'أساسيات البرمجة بلغة Python: المتغيرات، الشروط، الحلقات، والدوال من الصفر.',
    grade: 'first_secondary',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    order_index: 1
  },
  {
    id: 'cr2',
    title: 'بنية الحاسب والمنطق الرقمي',
    description: 'كيف يعمل الحاسب؟ البوابات المنطقية، نظام العد الثنائي، وتحويلات الأنظمة.',
    grade: 'first_secondary',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    order_index: 2
  },
  {
    id: 'cr3',
    title: 'الخوارزميات والتفكير المنطقي',
    description: 'خطوات حل المشكلات، المخططات الانسيابية، وترتيب العمليات.',
    grade: 'second_secondary',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    order_index: 1
  },
  {
    id: 'cr4',
    title: 'قواعد البيانات و SQL',
    description: 'مقدمة لقواعد البيانات العلائقية، لغة SQL، وجداول البيانات.',
    grade: 'second_secondary',
    video_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    order_index: 2
  }
];

export const MOCK_COMPETITIONS = [
  {
    id: 'cmp1',
    title: 'مسابقة البرمجة الصيفية',
    description: 'تحدي برمجي لمدة أسبوع لحل مشكلات برمجية واقعية.',
    grade: 'first_secondary',
    deadline: new Date(Date.now() + 14 * 86400000).toISOString(),
    details: 'تكتب كود بلغة Python تحل به 3 مشكلات، والفائز يحصل على شهادة تقدير.'
  }
];

export const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'أهلاً بك في Vision Academy', body: 'استكشف الكورسات والامتحانات المتاحة لصفك.', is_read: false }
];

export function mockGradeLabel(grade) {
  return grade === 'second_secondary' ? 'الصف الثاني الثانوي' : 'الصف الأول الثانوي';
}