/**
 * منطق الامتحانات المشترك — تقييم الإجابات والتحقق من النوافذ الزمنية.
 * الملف ده بيتحط على الفرونت عشان العرض فقط؛ التقييم النهائي والفرض الواحد
 * بيتطبقوا من قاعدة البيانات نفسها (انظر RPC submit_exam).
 */

export function isExamOpen(exam, now = Date.now()) {
  if (!exam) return false;
  if (exam.is_published === false) return false;
  const start = exam.start_at ? new Date(exam.start_at).getTime() : -Infinity;
  const end = exam.end_at ? new Date(exam.end_at).getTime() : Infinity;
  return now >= start && now <= end;
}

export function isExamNotStarted(exam, now = Date.now()) {
  if (!exam || !exam.start_at) return false;
  return new Date(exam.start_at).getTime() > now;
}

export function isExamClosed(exam, now = Date.now()) {
  if (!exam || !exam.end_at) return false;
  return new Date(exam.end_at).getTime() < now;
}

/** مقارنة الإجابات — للعرض/المراجعة بس */
export function isAnswerCorrect(question, answer) {
  if (question.type === 'true_false') {
    return String(answer) === String(question.correct_answer);
  }
  if (question.type === 'mcq') {
    return String(answer) === String(question.correct_answer);
  }
  return false; // المقالي بيتصحيح يدوياً
}

/** حساب درجة الموضوعي — للعرض بس (التقييم الفعلي جوه RPC submit_exam) */
export function computeAutoScore(questions, answers = {}) {
  return questions.reduce((sum, q) => {
    if (q.type === 'short_answer') return sum;
    return sum + (isAnswerCorrect(q, answers[q.id]) ? Number(q.points || 0) : 0);
  }, 0);
}

export function answerInitialValue(type) {
  if (type === 'mcq') return null;
  if (type === 'true_false') return null;
  return '';
}

export function validateAnswersComplete(questions, answers) {
  const missing = questions.filter((q) => {
    const v = answers[q.id];
    if (q.type === 'short_answer') return !v || String(v).trim() === '';
    return v === null || v === undefined || v === '';
  });
  return missing;
}