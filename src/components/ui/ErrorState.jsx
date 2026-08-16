import Button from './Button.jsx';

export default function ErrorState({ message = 'حصلت مشكلة غير متوقعة', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-2xl text-danger">
        !
      </div>
      <p className="max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}