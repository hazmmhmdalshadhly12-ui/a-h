/** أقسام لوحة الطالب — الطالب يحرّكها ويخفيها زي ما يحب */
export const SECTION_DEFS = [
  {
    id: 'announcements',
    label: 'إعلانات مهمة',
    description: 'آخر إعلانات المنصة من المدرس'
  },
  {
    id: 'stats',
    label: 'إحصائياتي',
    description: 'امتحانات متاحة، مسلّمة، إشعارات، آخر حجز'
  },
  {
    id: 'exams',
    label: 'آخر الامتحانات',
    description: 'أقرب امتحانات صفك وحالتها'
  },
  {
    id: 'bookings',
    label: 'حالة آخر حجز',
    description: 'حالة اشتراكك الشهري'
  }
];

export const DEFAULT_ORDER = SECTION_DEFS.map((s) => s.id);