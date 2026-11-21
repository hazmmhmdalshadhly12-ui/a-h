import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isExamOpen,
  isExamNotStarted,
  isExamClosed,
  isAnswerCorrect,
  computeAutoScore,
  answerInitialValue,
  validateAnswersComplete
} from '../src/utils/examHelpers.js';

const NOW = 1700000000000;

test('isExamOpen: مفتوح داخل النافذة الزمنية', () => {
  const exam = { is_published: true, start_at: new Date(NOW - 60000).toISOString(), end_at: new Date(NOW + 60000).toISOString() };
  assert.equal(isExamOpen(exam, NOW), true);
});

test('isExamOpen: مغلق قبل البداية وبعد النهاية وغير المنشور', () => {
  const future = { is_published: true, start_at: new Date(NOW + 60000).toISOString() };
  const past = { is_published: true, end_at: new Date(NOW - 60000).toISOString() };
  const unpublished = { is_published: false, start_at: new Date(NOW - 60000).toISOString() };
  assert.equal(isExamOpen(future, NOW), false);
  assert.equal(isExamOpen(past, NOW), false);
  assert.equal(isExamOpen(unpublished, NOW), false);
});

test('isExamOpen: بدون نافذة زمنية = مفتوح دائماً (لو منشور)', () => {
  assert.equal(isExamOpen({ is_published: true }, NOW), true);
});

test('isExamNotStarted / isExamClosed', () => {
  assert.equal(isExamNotStarted({ start_at: new Date(NOW + 1000).toISOString() }, NOW), true);
  assert.equal(isExamNotStarted({ start_at: new Date(NOW - 1000).toISOString() }, NOW), false);
  assert.equal(isExamClosed({ end_at: new Date(NOW - 1000).toISOString() }, NOW), true);
  assert.equal(isExamClosed({ end_at: new Date(NOW + 1000).toISOString() }, NOW), false);
});

test('isAnswerCorrect: مطابقة تامة للموضوعي فقط', () => {
  const mcq = { type: 'mcq', correct_answer: 'def' };
  assert.equal(isAnswerCorrect(mcq, 'def'), true);
  assert.equal(isAnswerCorrect(mcq, 'Def'), false); // حساسة لحالة الأحرف مثل الخادم
  assert.equal(isAnswerCorrect(mcq, null), false);
  const tf = { type: 'true_false', correct_answer: 'true' };
  assert.equal(isAnswerCorrect(tf, 'true'), true);
  assert.equal(isAnswerCorrect(tf, 'false'), false);
  // المقالي لا يصحح آلياً
  assert.equal(isAnswerCorrect({ type: 'short_answer', correct_answer: 'x' }, 'x'), false);
});

test('computeAutoScore: مجموع نقاط الصحيح فقط + تجاهل المقالي وغير المجاب', () => {
  const questions = [
    { id: 'q1', type: 'mcq', correct_answer: 'a', points: 2 },
    { id: 'q2', type: 'mcq', correct_answer: 'b', points: 3 },
    { id: 'q3', type: 'true_false', correct_answer: 'true', points: 1 },
    { id: 'q4', type: 'short_answer', points: 5 },
    { id: 'q5', type: 'mcq', correct_answer: 'c', points: 4, /* بدون إجابة */ }
  ];
  const answers = { q1: 'a', q2: 'x', q3: 'true', q4: 'أي إجابة مقالية' };
  assert.equal(computeAutoScore(questions, answers), 3); // 2 + 1 فقط
});

test('answerInitialValue حسب نوع السؤال', () => {
  assert.equal(answerInitialValue('mcq'), null);
  assert.equal(answerInitialValue('true_false'), null);
  assert.equal(answerInitialValue('short_answer'), '');
});

test('validateAnswersComplete: يرجع قائمة الأسئلة الناقصة فقط', () => {
  const questions = [
    { id: 'q1', type: 'mcq' },
    { id: 'q2', type: 'short_answer' },
    { id: 'q3', type: 'true_false' }
  ];
  const answers = { q1: 'a', q2: '   ' };
  const missing = validateAnswersComplete(questions, answers);
  assert.deepEqual(missing.map((q) => q.id), ['q2', 'q3']);
});
