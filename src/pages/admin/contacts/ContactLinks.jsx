import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import { fetchContactLinks, saveContactLinks } from '../../../services/contactService.js';
import { CONTACT_PLATFORM_OPTIONS } from '../../../config/constants.js';
import { isSupabaseConfigured } from '../../../lib/supabaseClient.js';

/** لوحة تعديل روابط التواصل — بتحفظ في قاعدة البيانات من غير تعديل كود */
export default function ContactLinks() {
  const toast = useToast();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContactLinks().then(({ data }) => {
      const base = CONTACT_PLATFORM_OPTIONS.map((p) => {
        const existing = (data || []).find((l) => l.platform === p.value);
        return {
          id: existing?.id || `new-${p.value}`,
          platform: p.value,
          label: existing?.label || p.label,
          value: existing?.value || ''
        };
      });
      setLinks(base);
      setLoading(false);
    });
  }, []);

  const patch = (index, field, val) =>
    setLinks((list) => list.map((l, i) => (i === index ? { ...l, [field]: val } : l)));

  const handleSave = async () => {
    setSaving(true);
    const { error } = await saveContactLinks(links);
    setSaving(false);
    if (error) return toast.error(error.message || 'فشل الحفظ');
    toast.success('تم تحديث روابط التواصل — الموقع كله اتحدث فوراً');
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="روابط التواصل"
        subtitle="الأرقام والروابط بتظهر في صفحة التواصل والفوتر — تتحكم فيها من هنا من غير كود"
        actions={
          <Button onClick={handleSave} loading={saving} disabled={!isSupabaseConfigured}>
            حفظ كل الروابط
          </Button>
        }
      />

      {!isSupabaseConfigured && (
        <p className="rounded-lens border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-warning">
          Supabase مش متظبط في الـ env — الحفظ هيتفعل لما تضيف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.
        </p>
      )}

      {loading ? (
        <Card className="text-center text-muted">جارٍ التحميل...</Card>
      ) : (
        <div className="space-y-4">
          {links.map((link, i) => (
            <Card key={link.platform} className="space-y-3">
              <p className="font-display font-bold text-paper">{link.label}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  name={`label-${link.platform}`}
                  label="اسم العرض"
                  value={link.label}
                  onChange={(e) => patch(i, 'label', e.target.value)}
                />
                <Input
                  name={`value-${link.platform}`}
                  label="القيمة (رقم أو رابط)"
                  dir="ltr"
                  placeholder={link.platform === 'whatsapp' || link.platform === 'phone' ? '01xxxxxxxxx' : 'https://...'}
                  value={link.value}
                  onChange={(e) => patch(i, 'value', e.target.value)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}