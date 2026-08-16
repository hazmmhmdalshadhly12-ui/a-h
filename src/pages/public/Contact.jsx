import PublicLayout from '../../components/layout/PublicLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { useAcademy } from '../../context/AcademyContext.jsx';
import { CONTACT_PLATFORMS } from '../../config/constants.js';

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

function hrefFor(platform, value) {
  if (isUrl(value)) return value;
  if (platform === 'phone') return `tel:${value}`;
  if (platform === 'whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
  if (platform === 'email') return `mailto:${value}`;
  return value;
}

export default function Contact() {
  const { contactLinks } = useAcademy();

  return (
    <PublicLayout>
      <section className="container-site py-12">
        <div className="mb-10 max-w-2xl">
          <p className="font-mono text-xs text-stream">&lt;contact /&gt;</p>
          <h1 className="mt-2 font-display text-4xl font-black">تواصل معنا</h1>
          <p className="mt-3 text-muted">
            أي استفسار عن الحجز، الامتحانات، أو الكورسات — ابعتلنا على أقرب قناة.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {contactLinks.map((link) => {
            const platform = CONTACT_PLATFORMS[link.platform];
            return (
              <a
                key={link.id || link.platform}
                href={hrefFor(link.platform, link.value)}
                target={isUrl(link.value) ? '_blank' : undefined}
                rel="noreferrer"
                className="focus-ring block"
              >
                <Card hover className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lens bg-signal/15 text-signal">
                    <Icon name={PLATFORM_ICONS[link.platform] || 'contacts'} className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-paper">{link.label}</p>
                    <p className="truncate text-sm text-muted" dir="ltr">
                      {link.value}
                    </p>
                  </div>
                </Card>
              </a>
            );
          })}
        </div>

        {contactLinks.length === 0 && (
          <p className="rounded-lens border border-dashed border-ink-500 py-10 text-center text-sm text-muted">
            لم يتم إضافة روابط تواصل بعد — تواصل مع الأدمن.
          </p>
        )}
      </section>
    </PublicLayout>
  );
}