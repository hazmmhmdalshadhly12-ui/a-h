import Select from '../ui/Select.jsx';

export default function FilterBar({ filters = [], onReset, className }) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className || ''}`}>
      {filters.map((f) => (
        <div key={f.key} className="min-w-40">
          <Select
            name={`filter-${f.key}`}
            label={f.label}
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
            options={f.options}
            placeholder={f.placeholder}
          />
        </div>
      ))}
      {onReset && (
        <button onClick={onReset} className="focus-ring rounded-lens px-3 py-2 text-sm text-muted hover:text-paper">
          مسح الفلاتر
        </button>
      )}
    </div>
  );
}