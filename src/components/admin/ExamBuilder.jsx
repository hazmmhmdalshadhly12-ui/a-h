import { useState } from 'react';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import QuestionBuilder from './QuestionBuilder.jsx';
import { GRADES_OPTIONS } from '../../config/constants.js';
import { toLocalInputValue } from '../../utils/formatTime.js';

/** فورم امتحان كامل: البيانات + الأسئلة — بيستخدم في الإنشاء والتعديل */
export default function ExamBuilder({ initial, onSubmit, submitting }) {
  const [exam, setExam] = useState({
    title: '',
    description: '',
    grade: 'first_secondary',
    duration_minutes: 60,
    start_at: toLocalInputValue(new Date()),
    end_at: '',
    is_published: false,
    ...initial
  });
  const [questions, setQuestions] = useState(initial?.questions || []);

  const patch = (fields) => setExam((e) => ({ ...e, ...fields }));

  const addQuestion = () =>
    setQuestions((q) => [...q, { question_text: '', type: 'mcq', options: ['', ''], correct_answer: '', points: 1 }]);

  const updateQuestion = (i, q) => setQuestions((list) => list.map((x, j) => (j === i ? q : x)));
  const removeQuestion = (i) => setQuestions((list) => list.filter((_, j) => j !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    const validQuestions = questions.filter((q) => q.question_text && q.question_text.trim());
    if (validQuestions.length === 0) {
      alert('أضف سؤال واحد على الأقل');
      return;
    }
    // تأكد أن كل سؤال موضوعي ليه إجابة صحيحة
    const missing = validQuestions.some((q) => q.type !== 'short_answer' && !q.correct_answer);
    if (missing) {
      alert('كل سؤال موضوعي لازم يكون ليه إجابة صحيحة');
      return;
    }
    onSubmit({
      ...exam,
      start_at: exam.start_at ? new Date(exam.start_at).toISOString() : null,
      end_at: exam.end_at ? new Date(exam.end_at).toISOString() : null,
      questions: validQuestions
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="card-panel space-y-4 rounded-lens p-5">
        <h2 className="font-display text-lg font-bold text-paper">بيانات الامتحان</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="title" label="عنوان الامتحان" required value={exam.title} onChange={(e) => patch({ title: e.target.value })} />
          <Select
            name="grade"
            label="الصف"
            required
            value={exam.grade}
            onChange={(e) => patch({ grade: e.target.value })}
            options={GRADES_OPTIONS}
          />
        </div>
        <Textarea name="description" label="الوصف" rows={2} value={exam.description} onChange={(e) => patch({ description: e.target.value })} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            name="duration"
            label="المدة (بالدقائق)"
            type="number"
            min="1"
            value={exam.duration_minutes}
            onChange={(e) => patch({ duration_minutes: Number(e.target.value) || 0 })}
          />
          <Input
            name="start_at"
            label="تاريخ البدء"
            type="datetime-local"
            value={exam.start_at ? toLocalInputValue(exam.start_at) : ''}
            onChange={(e) => patch({ start_at: e.target.value })}
          />
          <Input
            name="end_at"
            label="تاريخ الانتهاء (اختياري)"
            type="datetime-local"
            value={exam.end_at ? toLocalInputValue(exam.end_at) : ''}
            onChange={(e) => patch({ end_at: e.target.value })}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-paper/90">
          <input
            type="checkbox"
            checked={exam.is_published}
            onChange={(e) => patch({ is_published: e.target.checked })}
            className="h-4 w-4 accent-signal"
          />
          نشر الامتحان فوراً للطلاب
        </label>
      </div>

      <div className="card-panel space-y-4 rounded-lens p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-paper">الأسئلة ({questions.length})</h2>
          <Button type="button" variant="secondary" size="sm" onClick={addQuestion}>
            <Icon name="plus" className="h-4 w-4" /> إضافة سؤال
          </Button>
        </div>
        {questions.length === 0 ? (
          <p className="rounded-lens border border-dashed border-ink-500 py-8 text-center text-sm text-muted">
            لسه مفيش أسئلة — اضغط "إضافة سؤال"
          </p>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionBuilder
                key={i}
                index={i}
                question={q}
                onChange={(next) => updateQuestion(i, next)}
                onRemove={() => removeQuestion(i)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" loading={submitting}>
          حفظ الامتحان
        </Button>
      </div>
    </form>
  );
}