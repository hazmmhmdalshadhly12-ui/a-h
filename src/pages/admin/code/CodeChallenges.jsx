import { useEffect, useState } from 'react';
import AdminHeader from '../../../components/admin/AdminHeader.jsx';
import Card from '../../../components/ui/Card.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Icon from '../../../components/ui/Icon.jsx';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import CodeEditor from '../../../components/code/CodeEditor.jsx';
import { useToast } from '../../../components/ui/Toast.jsx';
import {
  fetchAllChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  fetchChallengeSolutions
} from '../../../services/codeService.js';
import { GRADES_OPTIONS } from '../../../config/constants.js';
import { formatDate } from '../../../utils/formatDate.js';
import { getFriendlyError } from '../../../utils/errors.js';

const DIFFICULTY = [
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'متقدم' }
];

const EMPTY_FORM = {
  title: '',
  description: '',
  grade: GRADES_OPTIONS[0].value,
  difficulty: 'easy',
  order_index: 1,
  is_published: true,
  starter_code: '',
  test_code: '',
  solution_code: ''
};

/** تحديات الكود — إدارة تمارين البرمجة لكل صف */
export default function CodeChallenges() {
  const toast = useToast();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [solutionsFor, setSolutionsFor] = useState(null);
  const [solutions, setSolutions] = useState([]);

  const load = () =>
    fetchAllChallenges().then(({ data }) => {
      setChallenges(data || []);
      setLoading(false);
    });

  useEffect(() => {
    load();
  }, []);

  const patch = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const startCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({
      title: c.title || '',
      description: c.description || '',
      grade: c.grade,
      difficulty: c.difficulty,
      order_index: c.order_index ?? 1,
      is_published: c.is_published ?? true,
      starter_code: c.starter_code || '',
      test_code: c.test_code || '',
      solution_code: c.solution_code || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title?.trim()) return toast.error('اكتب عنوان التحدي');
    if (!form.test_code?.trim()) return toast.error('كود الاختبارات إلزامي — لازم يكون في assert يتحقق من الحل');

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      grade: form.grade,
      difficulty: form.difficulty,
      order_index: Number(form.order_index) || 0,
      is_published: form.is_published,
      starter_code: form.starter_code,
      test_code: form.test_code,
      solution_code: form.solution_code || null
    };

    const { error } = editingId
      ? await updateChallenge(editingId, payload)
      : await createChallenge(payload);
    setSaving(false);

    if (error) return toast.error(getFriendlyError(error, editingId ? 'فشل الحفظ' : 'فشل الإضافة'));
    toast.success(editingId ? 'تم تحديث التحدي' : 'تمت إضافة التحدي');
    startCreate();
    load();
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`متأكد تمسح التحدي "${c.title}"؟ كل حلول الطلاب ليه هتتمسح.`)) return;
    const { error } = await deleteChallenge(c.id);
    if (error) return toast.error(getFriendlyError(error, 'فشل الحذف'));
    toast.success('تم حذف التحدي');
    if (editingId === c.id) startCreate();
    load();
  };

  const toggleSolutions = async (c) => {
    if (solutionsFor === c.id) {
      setSolutionsFor(null);
      return;
    }
    setSolutionsFor(c.id);
    setSolutions([]);
    const { data, error } = await fetchChallengeSolutions(c.id);
    if (error) return toast.error(getFriendlyError(error, 'فشل جلب الحلول'));
    setSolutions(data || []);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="تحديات الكود"
        subtitle="تمارين برمجية Python لكل صف — الطالب يكتب الحل ويشغّله في المتصفح ونتيجته تظهر فوراً"
      />

      {/* نموذج إضافة/تعديل */}
      <Card>
        <h2 className="mb-4 font-display text-lg font-bold text-paper">
          {editingId ? 'تعديل التحدي' : 'إضافة تحدي جديد'}
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              name="title"
              label="عنوان التحدي"
              placeholder="مثال: دالة الجمع"
              value={form.title}
              onChange={(e) => patch('title', e.target.value)}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-paper">الصف</label>
              <select
                name="grade"
                value={form.grade}
                onChange={(e) => patch('grade', e.target.value)}
                className="w-full rounded-lens border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm text-paper outline-none transition focus:border-signal/70 focus:ring-2 focus:ring-signal/20"
              >
                {GRADES_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-paper">المستوى</label>
              <select
                name="difficulty"
                value={form.difficulty}
                onChange={(e) => patch('difficulty', e.target.value)}
                className="w-full rounded-lens border border-ink-600 bg-ink-800 px-3.5 py-2.5 text-sm text-paper outline-none transition focus:border-signal/70 focus:ring-2 focus:ring-signal/20"
              >
                {DIFFICULTY.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              name="order_index"
              label="الترتيب"
              type="number"
              value={form.order_index}
              onChange={(e) => patch('order_index', e.target.value)}
            />
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold text-paper">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => patch('is_published', e.target.checked)}
                className="h-4 w-4 accent-signal"
              />
              منشور للطلاب
            </label>
          </div>

          <Input
            name="description"
            label="شرح المطلوب (بيظهر للطالب)"
            placeholder="مثال: اكتب دالة add(a, b) ترجع مجموع العددين"
            value={form.description}
            onChange={(e) => patch('description', e.target.value)}
          />

          <div className="space-y-4">
            <CodeEditor
              label="كود البداية (بيظهر للطالب — اختياري)"
              value={form.starter_code}
              onChange={(v) => patch('starter_code', v)}
              height={140}
            />
            <CodeEditor
              label="كود الاختبارات (إلزامي — assert يتحقق من الحل)"
              value={form.test_code}
              onChange={(v) => patch('test_code', v)}
              height={160}
            />
            <CodeEditor
              label="الحل النهائي (مخفي عن الطلاب — اختياري)"
              value={form.solution_code}
              onChange={(v) => patch('solution_code', v)}
              height={140}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={saving}>
              {editingId ? 'حفظ التغييرات' : 'إضافة التحدي'}
            </Button>
            {editingId && (
              <Button variant="ghost" onClick={startCreate}>
                إلغاء التعديل
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* قائمة التحديات */}
      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-paper">التحديات ({challenges.length})</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : challenges.length === 0 ? (
          <Card className="py-8 text-center text-sm text-muted">مفيش تحديات — أضف أول تحدي من فوق.</Card>
        ) : (
          <div className="space-y-3">
            {challenges.map((c) => (
              <Card key={c.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display font-bold text-paper">{c.title}</p>
                      <Badge color={DIFFICULTY.find((d) => d.value === c.difficulty)?.value === 'hard' ? 'danger' : c.difficulty === 'medium' ? 'signal' : 'success'}>
                        {DIFFICULTY.find((d) => d.value === c.difficulty)?.label}
                      </Badge>
                      <Badge color={c.is_published ? 'success' : 'muted'}>
                        {c.is_published ? 'منشور' : 'مسودّة'}
                      </Badge>
                    </div>
                    {c.description && <p className="mt-0.5 text-sm text-muted">{c.description}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted/80">
                      <span>{GRADES_OPTIONS.find((g) => g.value === c.grade)?.label || c.grade}</span>
                      <span>• ترتيب {c.order_index}</span>
                      <span>• {formatDate(c.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleSolutions(c)}>
                      <Icon name="eye" className="h-4 w-4" />
                      {solutionsFor === c.id ? 'إخفاء الحلول' : 'حلول الطلاب'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => startEdit(c)}>
                      <Icon name="edit" className="h-4 w-4" />
                      تعديل
                    </Button>
                    <Button variant="ghost" size="sm" className="text-danger" onClick={() => handleDelete(c)}>
                      حذف
                    </Button>
                  </div>
                </div>

                {solutionsFor === c.id && (
                  <div className="max-h-80 space-y-2 overflow-auto rounded-lens border border-ink-600 bg-ink-900 p-3">
                    {solutions.length === 0 ? (
                      <p className="text-sm text-muted">مفيش حلول متسجلة لسه.</p>
                    ) : (
                      solutions.map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lens border border-ink-700 bg-ink-800 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-paper">
                              {s.profiles?.full_name || 'طالب'}
                            </span>
                            <span className="text-muted">{formatDate(s.created_at)}</span>
                            <Badge color={s.passed ? 'success' : 'danger'}>
                              {s.passed ? 'نجح ✓' : 'فشل ✗'}
                            </Badge>
                          </div>
                          <pre dir="ltr" className="mt-2 overflow-x-auto font-mono text-xs leading-6 text-paper/80">
                            {s.code}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}