export const PUBLIC_NAV = [
  { label: 'الرئيسية', path: '/' },
  { label: 'الكورسات', path: '/courses' },
  { label: 'عن الأكاديمية', path: '/about' },
  { label: 'التواصل', path: '/contact' }
];

export const STUDENT_NAV = [
  { label: 'لوحة الطالب', path: '/student/dashboard', icon: 'dashboard' },
  { label: 'الكورسات', path: '/student/courses', icon: 'courses' },
  { label: 'الامتحانات', path: '/student/exams', icon: 'exams' },
  { label: 'درجاتي', path: '/student/grades', icon: 'grades' },
  { label: 'الحجوزات', path: '/student/bookings', icon: 'bookings' },
  { label: 'المسابقات', path: '/student/competitions', icon: 'competitions' },
  { label: 'لوحة التفوق', path: '/student/leaderboard', icon: 'grades' },
  { label: 'المذكرات', path: '/student/materials', icon: 'download' },
  { label: 'التواصل مع المعلم', path: '/student/chat', icon: 'chat' },
  { label: 'الإشعارات', path: '/student/notifications', icon: 'notifications' }
];

export const PARENT_NAV = [
  { label: 'أولادي', path: '/parent/dashboard', icon: 'dashboard' },
  { label: 'تواصل مع المعلم', path: '/parent/chat', icon: 'chat' }
];

export const ADMIN_NAV = [
  {
    section: 'الإدارة',
    items: [
      { label: 'نظرة عامة', path: '/admin', icon: 'dashboard', end: true },
      { label: 'الامتحانات', path: '/admin/exams', icon: 'exams' },
      { label: 'الكورسات', path: '/admin/courses', icon: 'courses' },
      { label: 'أقسام الكورسات', path: '/admin/sections', icon: 'courses' },
      { label: 'المذكرات والملفات', path: '/admin/materials', icon: 'download' },
      { label: 'الحجوزات', path: '/admin/bookings', icon: 'bookings' },
      { label: 'المسابقات', path: '/admin/competitions', icon: 'competitions' },
      { label: 'الإعلانات', path: '/admin/announcements', icon: 'notifications' },
      { label: 'الشات مع الطلاب', path: '/admin/chat', icon: 'chat' }
    ]
  },
  {
    section: 'المنصة',
    items: [
      { label: 'الطلاب', path: '/admin/students', icon: 'students' },
      { label: 'روابط التواصل', path: '/admin/contacts', icon: 'contacts' },
      { label: 'الإعدادات', path: '/admin/settings', icon: 'settings' }
    ]
  }
];