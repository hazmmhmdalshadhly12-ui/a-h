import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';

/** تاكيد التسليم النهائي — بمجرد التأكيد بيتقفل الامتحان من قاعدة البيانات نفسها */
export default function SubmitExamModal({ open, onClose, onConfirm, unansweredCount, submitting }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تسليم الامتحان نهائياً؟"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            رجوع
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={submitting}>
            نعم، سلّم نهائياً
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p className="flex items-start gap-2 text-paper/90">
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-signal" />
          بعد التسليم لا يمكنك الدخول للامتحان أو تعديل الإجابات مرة أخرى — القفل
          مطبّق من قاعدة البيانات نفسها (محاولة واحدة لكل امتحان).
        </p>
        {unansweredCount > 0 && (
          <p className="rounded-lens border border-warning/40 bg-warning/10 px-3 py-2 text-warning">
            لسه في {unansweredCount} سؤال بدون إجابة — هيتم تسليمهم فارغين.
          </p>
        )}
      </div>
    </Modal>
  );
}