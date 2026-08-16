import Icon from '../ui/Icon.jsx';

export default function SearchBar({ value, onChange, placeholder = 'بحث...', className }) {
  return (
    <div className={`relative ${className || ''}`}>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        <Icon name="search" className="h-4 w-4" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pr-10"
      />
    </div>
  );
}