import Textarea from '../ui/Textarea.jsx';

export default function ShortAnswerQuestion({ question, value, onChange, disabled }) {
  return (
    <Textarea
      name={`q-${question.id}`}
      placeholder="اكتب إجابتك هنا..."
      rows={4}
      value={value || ''}
      onChange={(e) => onChange(question.id, e.target.value)}
      disabled={disabled}
    />
  );
}