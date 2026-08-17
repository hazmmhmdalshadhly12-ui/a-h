export const GRADES_OPTIONS = [
  { value: 'first_secondary', label: 'الصف الأول الثانوي', short: 'أولى ثانوي' },
  { value: 'second_secondary', label: 'الصف الثاني الثانوي', short: 'ثانية ثانوي' }
];

export const QUESTION_TYPES = {
  mcq: { value: 'mcq', label: 'اختيار من متعدد' },
  true_false: { value: 'true_false', label: 'صح / غلط' },
  short_answer: { value: 'short_answer', label: 'سؤال مقالي قصير' }
};

export const QUESTION_TYPE_OPTIONS = Object.values(QUESTION_TYPES);

export const BOOKING_STATUSES = {
  pending: { value: 'pending', label: 'قيد المراجعة', color: 'warning' },
  confirmed: { value: 'confirmed', label: 'مؤكد', color: 'success' },
  rejected: { value: 'rejected', label: 'مرفوض', color: 'danger' }
};

/** بيانات الدفع الشهري — بتظهر للطالب بعد إرسال طلب الحجز */
export const PAYMENT_INFO = {
  amounts: {
    first_secondary: 150,
    second_secondary: 250
  },
  instagramNumber: '01127703810',
  note: 'محفظة كاش غير متوفر الآن'
};

/** أنواع أسئلة الواجب (صح/غلط أو اختيار) */
export const HOMEWORK_QUESTION_TYPES = {
  mcq: { value: 'mcq', label: 'اختيار من متعدد' },
  true_false: { value: 'true_false', label: 'صح / غلط' }
};

export const HOMEWORK_QUESTION_TYPE_OPTIONS = Object.values(HOMEWORK_QUESTION_TYPES);

export const EXAM_STATUS = {
  not_started: { value: 'not_started', label: 'لم يبدأ' },
  open: { value: 'open', label: 'متاح الآن' },
  submitted: { value: 'submitted', label: 'تم التسليم' },
  closed: { value: 'closed', label: 'انتهى' }
};

export const CONTACT_PLATFORMS = {
  whatsapp: { value: 'whatsapp', label: 'واتساب' },
  phone: { value: 'phone', label: 'تليفون' },
  facebook: { value: 'facebook', label: 'فيسبوك' },
  youtube: { value: 'youtube', label: 'يوتيوب' },
  telegram: { value: 'telegram', label: 'تليجرام' },
  instagram: { value: 'instagram', label: 'إنستجرام' },
  email: { value: 'email', label: 'إيميل' }
};

export const CONTACT_PLATFORM_OPTIONS = Object.values(CONTACT_PLATFORMS);