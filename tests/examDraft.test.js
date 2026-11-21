import { test } from 'node:test';
import assert from 'node:assert/strict';

import { draftKey, saveDraft, loadDraft, clearDraft, DRAFT_MAX_AGE_MS } from '../src/utils/examDraft.js';

class MemStorage {
  constructor() {
    this.m = new Map();
    this.broken = false;
  }
  getItem(k) {
    if (this.broken) throw new Error('quota');
    return this.m.has(k) ? this.m.get(k) : null;
  }
  setItem(k, v) {
    if (this.broken) throw new Error('quota');
    this.m.set(k, String(v));
  }
  removeItem(k) {
    if (this.broken) throw new Error('quota');
    this.m.delete(k);
  }
}

test('draftKey: مفتاح فريد لكل طالب/امتحان — وnull للمدخلات الناقصة', () => {
  assert.equal(draftKey('exam1', 'stud1'), 'vision_exam_draft_v1:stud1:exam1');
  assert.equal(draftKey('exam1', 'stud2'), 'vision_exam_draft_v1:stud2:exam1');
  assert.equal(draftKey(null, 'stud1'), null);
  assert.equal(draftKey('exam1', null), null);
});

test('saveDraft + loadDraft: حفظ واسترجاع الإجابات', () => {
  const s = new MemStorage();
  const answers = { q1: 'a', q2: null, q3: 'إجابة مقالية' };
  assert.equal(saveDraft(s, 'exam1', 'stud1', answers), true);
  assert.deepEqual(loadDraft(s, 'exam1', 'stud1'), answers);
});

test('loadDraft: مسودة طالب آخر لا تتداخل (استقلال الإجابات)', () => {
  const s = new MemStorage();
  saveDraft(s, 'exam1', 'stud1', { q1: 'a' });
  saveDraft(s, 'exam1', 'stud2', { q1: 'b' });
  assert.deepEqual(loadDraft(s, 'exam1', 'stud1'), { q1: 'a' });
  assert.deepEqual(loadDraft(s, 'exam1', 'stud2'), { q1: 'b' });
});

test('loadDraft: المسودة المنتهية (أقدم من 24 ساعة) تهمل وتمسح', () => {
  const s = new MemStorage();
  saveDraft(s, 'exam1', 'stud1', { q1: 'a' });
  const stale = loadDraft(s, 'exam1', 'stud1', Date.now() + DRAFT_MAX_AGE_MS + 1000);
  assert.equal(stale, null);
  // وبعد الإهمال تمسح من التخزين
  assert.equal(s.m.size, 0);
});

test('loadDraft: JSON تالف يرجع null بدون رمي استثناء', () => {
  const s = new MemStorage();
  s.setItem('vision_exam_draft_v1:stud1:exam1', '{{{مش json');
  assert.equal(loadDraft(s, 'exam1', 'stud1'), null);
});

test('loadDraft: بنية مخترقة (مصفوفة/نص) تهمل', () => {
  const s = new MemStorage();
  s.setItem('vision_exam_draft_v1:stud1:exam1', JSON.stringify({ saved_at: Date.now(), answers: ['ليست كائن'] }));
  assert.equal(loadDraft(s, 'exam1', 'stud1'), null);
  s.setItem('vision_exam_draft_v1:stud1:exam1', JSON.stringify({ saved_at: Date.now(), answers: 'نص' }));
  assert.equal(loadDraft(s, 'exam1', 'stud1'), null);
});

test('clearDraft: مسح بعد نجاح التسليم', () => {
  const s = new MemStorage();
  saveDraft(s, 'exam1', 'stud1', { q1: 'a' });
  clearDraft(s, 'exam1', 'stud1');
  assert.equal(loadDraft(s, 'exam1', 'stud1'), null);
});

test('فشل التخزين (وضع خاص/quota) لا يرمي استثناء', () => {
  const s = new MemStorage();
  s.broken = true;
  assert.equal(saveDraft(s, 'exam1', 'stud1', { q1: 'a' }), false);
  assert.equal(loadDraft(s, 'exam1', 'stud1'), null);
  assert.doesNotThrow(() => clearDraft(s, 'exam1', 'stud1'));
});

test('مسودة كبيرة جداً لا تُحفظ (حد أقصى للحجم)', () => {
  const s = new MemStorage();
  const big = { q1: 'x'.repeat(600 * 1024) };
  assert.equal(saveDraft(s, 'exam1', 'stud1', big), false);
  assert.equal(loadDraft(s, 'exam1', 'stud1'), null);
});
