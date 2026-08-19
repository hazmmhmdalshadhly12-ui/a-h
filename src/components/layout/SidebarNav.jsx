import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils.js';
import Icon from '../ui/Icon.jsx';

export default function SidebarNav({ items, onNavigate }) {
  return (
    <nav className="space-y-6" aria-label="تنقل الحساب">
      {items.map((section) => (
        <div key={section.section}>
          <p className="mb-2 px-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted/70">
            {section.section}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'focus-ring flex items-center gap-3 rounded-lens px-3 py-2.5 text-sm font-medium transition',
                      isActive
                        ? 'bg-signal/15 text-signal shadow-[inset_2px_0_0_0_rgb(var(--c-signal-rgb))]'
                        : 'text-muted hover:bg-ink-700/50 hover:text-paper'
                    )
                  }
                >
                  <IconNav name={item.icon} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function IconNav({ name }) {
  return <Icon name={name} className="h-[18px] w-[18px]" />;
}