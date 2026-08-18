import { Link } from 'react-router-dom';
import { useAcademy } from '../../context/AcademyContext.jsx';
import { SITE } from '../../config/site.js';
import { PUBLIC_NAV } from '../../config/navigation.js';
import VisionCore from '../vision/VisionCore.jsx';
import Icon from '../ui/Icon.jsx';
import { cn } from '../../lib/utils.js';

const PLATFORM_ICONS = {
  whatsapp: 'whatsapp',
  phone: 'phone',
  facebook: 'facebook',
  youtube: 'youtube',
  telegram: 'telegram',
  instagram: 'instagram',
  email: 'mail'
};

function isUrl(v) {
  return /^https?:\/\//.test(v);
}

export default function PublicFooter() {
  const { contactLinks } = useAcademy();

  return (
    <footer className="relative z-10 border-t border-ink-600/70 bg-ink-950/80">
      <div className="container-site py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <VisionCore size={44} />
              <div>
                <p className="font-display text-lg font-black text-paper">{SITE.name}</p>
                <p className="text-xs text-signal">{SITE.tagline}</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{SITE.description}</p>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-paper">روابط سريعة</h3>
            <ul className="mt-4 space-y-2.5">
              {PUBLIC_NAV.map((item) => (
                <li key={item.path}>
                  <Link to={item.path} className="text-sm text-muted transition hover:text-signal">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/register" className="text-sm text-signal transition hover:text-signal-light">
                  سجّل مجاناً
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-bold text-paper">تواصل معنا</h3>
            <ul className="mt-4 space-y-2.5">
              {contactLinks.map((link) => (
                <li key={link.id || link.platform}>
                  <a
                    href={isUrl(link.value) ? link.value : link.platform === 'phone' ? `tel:${link.value}` : `https://wa.me/${link.value.replace(/\D/g, '')}`}
                    target={isUrl(link.value) ? '_blank' : undefined}
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-stream"
                  >
                    <Icon name={PLATFORM_ICONS[link.platform] || 'contacts'} className="h-4 w-4" />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-ink-600/60 pt-6 sm:flex-row">
          <p className={cn('font-mono text-xs text-muted')}>&lt;built_with ❤ /&gt;</p>
          <p className="text-xs text-muted">{SITE.footerNote}</p>
          <p className="font-mono text-xs text-muted">© {new Date().getFullYear()} Vision Academy</p>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 pt-4 text-center">
          <p className="text-xs text-muted">المطور حازم</p>
          <a
            href="https://wa.me/01208839442"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-stream"
          >
            <Icon name="whatsapp" className="h-3.5 w-3.5" />
            <span dir="ltr">01208839442</span> واتساب
          </a>
        </div>
      </div>
    </footer>
  );
}