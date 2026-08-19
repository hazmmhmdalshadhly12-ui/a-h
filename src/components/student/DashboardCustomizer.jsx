import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Icon from '../ui/Icon.jsx';
import { useStudentPrefs } from '../../context/StudentPrefsContext.jsx';
import { ACCENTS } from '../../services/preferencesService.js';
import { SECTION_DEFS } from './dashboardSections.js';

/** نافذة تخصيص لوحة الطالب: لون اللوحة + ترتيب الأقسام */
export default function DashboardCustomizer({ open, onClose }) {
  const { accent, layout, changeAccent, toggleSection, moveSection, resetLayout } = useStudentPrefs();

  const visible = layout.filter((id) => SECTION_DEFS.some((s) => s.id === id));
  const hidden = SECTION_DEFS.filter((s) => !layout.includes(s.id));

  return (
    <Modal open={open} onClose={onClose} title="تخصيص لوحتك 🎨" size="sm">
      <div className="space-y-6">
        {/* اللون */}
        <div>
          <p className="mb-2 text-sm font-semibold text-paper">لون اللوحة</p>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                onClick={() => changeAccent(a.value)}
                aria-label={a.label}
                title={a.label}
                className={`h-9 w-9 rounded-full transition ${
                  accent === a.value
                    ? 'ring-2 ring-paper ring-offset-2 ring-offset-ink-800 scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ background: a.swatch }}
              />
            ))}
          </div>
          <p className="mt-1.5 text-xs text-muted">
            اللون بيتغير فوراً على كل شاشات بوابة الطالب ويتم الحفظ تلقائياً.
          </p>
        </div>

        {/* الأقسام */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-paper">أقسام اللوحة وترتيبها</p>
            <Button variant="ghost" size="xs" onClick={resetLayout}>
              استعادة الوضع الافتراضي
            </Button>
          </div>
          <div className="space-y-2">
            {visible.map((id, i) => {
              const def = SECTION_DEFS.find((s) => s.id === id);
              if (!def) return null;
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-lens border border-ink-600 bg-ink-900 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-paper">{def.label}</p>
                    <p className="truncate text-xs text-muted">{def.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => moveSection(id, -1)}
                      disabled={i === 0}
                      aria-label="تحريك لأعلى"
                      className="focus-ring rounded-md p-1.5 text-muted hover:bg-ink-700 hover:text-paper disabled:opacity-30"
                    >
                      <Icon name="chevronUp" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => moveSection(id, 1)}
                      disabled={i === visible.length - 1}
                      aria-label="تحريك لأسفل"
                      className="focus-ring rounded-md p-1.5 text-muted hover:bg-ink-700 hover:text-paper disabled:opacity-30"
                    >
                      <Icon name="chevronDown" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => toggleSection(id)}
                      aria-label="إخفاء القسم"
                      className="focus-ring rounded-md p-1.5 text-danger hover:bg-danger/10"
                    >
                      <Icon name="eyeOff" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {hidden.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-muted">أقسام مخفية</p>
              <div className="space-y-2">
                {hidden.map((def) => (
                  <div
                    key={def.id}
                    className="flex items-center justify-between gap-2 rounded-lens border border-dashed border-ink-600 bg-ink-900/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-paper/70">{def.label}</p>
                      <p className="truncate text-xs text-muted/70">{def.description}</p>
                    </div>
                    <button
                      onClick={() => toggleSection(def.id)}
                      aria-label="إظهار القسم"
                      className="focus-ring flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-bold text-signal hover:bg-signal/10"
                    >
                      <Icon name="eye" className="h-4 w-4" />
                      إظهار
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}