import MCQQuestion from './MCQQuestion.jsx';
import TrueFalseQuestion from './TrueFalseQuestion.jsx';
import ShortAnswerQuestion from './ShortAnswerQuestion.jsx';

/** بترندر السؤال حسب نوعه */
export default function QuestionRenderer({ question, value, onChange, disabled = false }) {
  if (question.type === 'mcq') {
    return <MCQQuestion question={question} value={value} onChange={onChange} disabled={disabled} />;
  }
  if (question.type === 'true_false') {
    return <TrueFalseQuestion question={question} value={value} onChange={onChange} disabled={disabled} />;
  }
  return <ShortAnswerQuestion question={question} value={value} onChange={onChange} disabled={disabled} />;
}