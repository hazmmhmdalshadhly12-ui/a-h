import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import { isSupabaseConfigured } from '../../../lib/supabaseClient.js';
import { SITE } from '../../../config/site.js';

/** إعدادات عامة — معلومات الأكاديمية وحالة البيئة */
export default function Settings() {
  const rows = [
    { icon: 'dashboard', label: 'اسم الأكاديمية', value: SITE.name },
    { icon: 'eye', label: 'الشعار', value: SITE.tagline },
    { icon: 'user', label: 'المدرس', value: SITE.instructor.title },
    { icon: 'info', label: 'قاعدة البيانات', value: isSupabaseConfigured ? 'Supabase متصل' : 'Supabase غير مظبوط (وضع العرض)' }
  ];

  return (
    <div className="space-y-6">
      <AdminHeader title="الإعدادات" subtitle="معلومات عامة عن الأكاديمية وحالة المنصة" />

      <Card className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 border-b border-ink-700/60 pb-3 last:border-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lens bg-ink-700 text-muted">
                <Icon name={r.icon} className="h-5 w-5" />
              </div>
              <p className="font-medium text-paper">{r.label}</p>
            </div>
            <Badge color={isSupabaseConfigured && r.label.includes('قاعدة') ? 'success' : 'muted'}>{r.value}</Badge>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="mb-2 font-display text-lg font-bold">ملاحظات تقنية</h2>
        <ul className="space-y-2 text-sm text-muted">
          <li>• الاسم والوصف والمدرس بيتظبطوا من <code className="code-chip">src/config/site.js</code></li>
          <li>• روابط التواصل بتتعدل من لوحة الأدمن → روابط التواصل (بتحفظ في قاعدة البيانات)</li>
          <li>• تظبيط الشات بوت: Supabase → Edge Functions → Set secrets (OPENAI_API_KEY)</li>
          <li>• أمان الامتحانات: محاولة واحدة لكل طالب مفروضة بـ unique constraint + RPC على السيرفر</li>
        </ul>
      </Card>
    </div>
  );
}