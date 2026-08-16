import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { PUBLIC_NAV } from '../../config/navigation.js';
import VisionLogo from '../vision/VisionLogo.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import { cn } from '../../lib/utils.js';

export default function PublicNavbar() {
  const { session, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const homePath = profile?.role === 'admin' ? '/admin' : '/student/dashboard';

  return (
    <header className="sticky top-0 z-40 border-b border-ink-600/70 bg-ink/85 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-4">
        <VisionLogo size={38} />

        <nav className="hidden items-center gap-1 md:flex" aria-label="التنقل الرئيسي">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'focus-ring rounded-lens px-3.5 py-2 text-sm font-medium transition hover:text-signal',
                  isActive ? 'text-signal' : 'text-paper/75'
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {session ? (
            <>
              <Link to={homePath} className="focus-ring rounded-lens px-2 text-sm text-muted hover:text-paper">
                رجوع للوحة
              </Link>
              <Link to={homePath}>
                <Button size="sm">لوحتي</Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="focus-ring rounded-lens px-3 py-2 text-sm font-medium text-paper/75 hover:text-signal">
                دخول
              </Link>
              <Link to="/register">
                <Button size="sm">سجّل مجاناً</Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="focus-ring flex h-10 w-10 items-center justify-center rounded-lens text-paper md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={open}
        >
          <Icon name={open ? 'close' : 'menu'} />
        </button>
      </div>

      {open && (
        <nav className="border-t border-ink-600/70 bg-ink/95 px-4 py-3 md:hidden animate-fade-in" aria-label="القائمة الجانبية">
          <div className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn('rounded-lens px-3 py-2.5 text-sm font-medium', isActive ? 'bg-ink-700 text-signal' : 'text-paper/80')
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="mt-2 flex gap-2 border-t border-ink-600/70 pt-3">
              {session ? (
                <Link to={homePath} className="flex-1" onClick={() => setOpen(false)}>
                  <Button className="w-full" size="sm">لوحتي</Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="secondary" className="w-full" size="sm">دخول</Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
                    <Button className="w-full" size="sm">سجّل مجاناً</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}