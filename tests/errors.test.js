import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getFriendlyError } from '../src/utils/errors.js';

test('الرسائل العربية المقصودة من الخادم تمر كما هي', () => {
  const cases = [
    'محاولة واحدة فقط لكل امتحان — تم تسليم هذا الامتحان مسبقاً',
    'هذا الامتحان خاص بالمشتركين المؤكدين — فعّل اشتراكك أولاً من صفحة الحجوزات',
    'لا يمكن حذف امتحان له نتائج طلاب — استخدم إلغاء النشر بدلاً من الحذف',
    'هذا الامتحان ليس لصفك',
    'انتهى وقت الامتحان',
    'لم يبدأ وقت الامتحان بعد',
    'هذا الامتحان غير منشور',
    'أضف سؤالاً واحداً على الأقل قبل الحفظ',
    'كل سؤال موضوعي لازم يكون ليه إجابة صحيحة',
    'عنوان الامتحان مطلوب',
    'تعذر بدء الامتحان حالياً، حاول مرة أخرى',
    'السؤال المطلوب تعديله غير موجود — أعد تحميل الصفحة وحاول مرة أخرى',
    'غير مصرح — صلاحية أدمن مطلوبة'
  ];
  for (const msg of cases) {
    assert.equal(getFriendlyError({ message: msg }, 'fallback'), msg, `الرسالة لازم تمر: ${msg}`);
  }
});

test('الرسائل الخام من قاعدة البيانات تُحجب ويظهر البديل العام', () => {
  const leaked = {
    message: 'relation "public.exam_attempts" does not exist policy exams_read (uuid) = auth.uid()'
  };
  assert.equal(getFriendlyError(leaked, 'رسالة عامة آمنة'), 'رسالة عامة آمنة');
});

test('خطأ بدون رسالة يرجع fallback', () => {
  assert.equal(getFriendlyError(null, 'fallback'), 'fallback');
  assert.equal(getFriendlyError({}, 'fallback'), 'fallback');
});

test('التوافق مع الرسائل القديمة القائمة (لا كسر للأنظمة الأخرى)', () => {
  assert.equal(getFriendlyError({ message: 'الامتحان غير موجود' }, 'f'), 'الامتحان غير موجود');
  assert.equal(getFriendlyError({ message: 'اختر شهر الحجز' }, 'f'), 'اختر شهر الحجز');
  assert.equal(getFriendlyError({ message: 'بيانات الدخول غير صحيحة' }, 'f'), 'بيانات الدخول غير صحيحة');
});
