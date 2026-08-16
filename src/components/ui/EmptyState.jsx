export default function EmptyState({ icon = '◌', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-ink-500 bg-ink-800 text-2xl text-muted">
        {icon}
      </div>
      <div>
        <h3 className="font-display text-lg font-bold text-paper">{title}</h3>
        {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}