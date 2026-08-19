import { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import CodeEditor from '../../components/code/CodeEditor.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { fetchCodeChallenges, saveCodeSolution } from '../../services/codeService.js';
import { runPythonCode, buildFullCode, onPythonReady } from '../../services/codeRunner.js';

const DIFFICULTY_STYLES = {
  easy: { color: 'success', label: 'سهل' },
  medium: { color: 'signal', label: 'متوسط' },
  hard: { color: 'danger', label: 'متقدم' }
};

/** محرر الكود الاحترافي — تحديات برمجية Python للصف */
export default function CodePlayground() {
  const { profile } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pyReady, setPyReady] = useState(false);
  const [saving, setSaving] = useState(false);

  const selected = challenges.find((c) => c.id === selectedId) || null;

  useEffect(() => {
    if (!profile?.grade) return;
    fetchCodeChallenges(profile.grade)
      .then(({ data, error }) => {
        if (!error && data?.length) {
          setChallenges(data);
          setSelectedId(data[0].id);
          setCode(data[0].starter_code || '');
        } else {
          setChallenges([]);
        }
      })
      .finally(() => setLoading(false));
  }, [profile?.grade]);

  useEffect(() => {
    onPythonReady(() => setPyReady(true));
  }, []);

  const selectChallenge = (c) => {
    setSelectedId(c.id);
    setCode(c.starter_code || '');
    setResult(null);
  };

  const handleRun = async () => {
    if (!selected) return;
    if (!code.trim()) {
      setResult({ passed: false, output: '', error: 'اكتب الكود الأول عشان تشغّله' });
      return;
    }
    setRunning(true);
    setResult(null);

    const fullCode = buildFullCode(code, selected.test_code || '');
    const res = await runPythonCode(fullCode);
    setResult(res);
    setRunning(false);

    // حفظ المحاولة بصمت (متابعة المدرس)
    if (!res.error || res.passed) {
      setSaving(true);
      const { error } = await saveCodeSolution({ challengeId: selected.id, code, passed: res.passed });
      setSaving(false);
      if (error) {
        // مشكلة في حفظ المحاولة مش هتوقف الطالب
        console.error('save code solution error:', error.message);
      } else if (res.passed) {
        setChallenges((prev) => prev.map((c) => (c.id === selected.id ? { ...c, solved: true } : c)));
      }
    }
  };

  const handleReset = () => {
    if (!selected) return;
    setCode(selected.starter_code || '');
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">ممارسة الكود ⌨️</h1>
          <p className="mt-1 text-sm text-muted">
            تحديات برمجية ببايثون من المستر — اكتب الحل وشغّله والاختبارات تتحقق فوراً.
          </p>
        </div>
        {!pyReady && !loading && (
          <Badge color="muted">⏳ بيجهّز محرك بايثون أول مرة...</Badge>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      ) : challenges.length === 0 ? (
        <EmptyState
          icon="⌨️"
          title="مفيش تحديات لصفك لسه"
          description="لما المستر يضيف تحديات برمجية لصفك هتظهر هنا — حل وشغّل وشوف نتيجتك فوراً."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* قائمة التحديات */}
          <div className="space-y-2">
            <p className="px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted/70">
              التحديات ({challenges.length})
            </p>
            {challenges.map((c) => {
              const d = DIFFICULTY_STYLES[c.difficulty] || DIFFICULTY_STYLES.easy;
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  onClick={() => selectChallenge(c)}
                  className={`w-full rounded-lens border px-3.5 py-2.5 text-right transition ${
                    active
                      ? 'border-signal/60 bg-signal/10'
                      : 'border-ink-600 bg-ink-800 hover:border-ink-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-paper">{c.title}</span>
                    {c.solved && <span className="text-emerald-400">✓ حليته</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge color={d.color}>{d.label}</Badge>
                    {!active && c.description && (
                      <span className="truncate text-xs text-muted">{c.description}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* المحرر + النتيجة */}
          {selected && (
            <Card className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-paper">{selected.title}</h2>
                  <Badge color={DIFFICULTY_STYLES[selected.difficulty]?.color}>
                    {DIFFICULTY_STYLES[selected.difficulty]?.label}
                  </Badge>
                </div>
                {selected.description && (
                  <p className="mt-1 text-sm text-muted">{selected.description}</p>
                )}
              </div>

              <CodeEditor value={code} onChange={setCode} language="python" height={300} />

              {selected.test_code && (
                <details className="rounded-lens border border-ink-600 bg-ink-900 p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-muted">
                    👀 شوف الاختبارات (بيتأكد إيه بالظبط)
                  </summary>
                  <pre dir="ltr" className="mt-2 overflow-x-auto font-mono text-xs leading-6 text-paper/90">
                    {selected.test_code}
                  </pre>
                </details>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleRun} loading={running} disabled={saving}>
                  <Icon name="play" className="h-4 w-4" />
                  شغّل الكود
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  إعادة الكود الأصلي
                </Button>
                {!pyReady && (
                  <span className="text-xs text-muted">أول تشغيل بيحمّل محرك بايثون (ثواني)...</span>
                )}
              </div>

              {/* النتيجة */}
              {result && (
                <div
                  className={`rounded-lens border p-4 ${
                    result.passed ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-danger/40 bg-danger/5'
                  }`}
                >
                  <p className={`font-bold ${result.passed ? 'text-emerald-400' : 'text-danger'}`}>
                    {result.passed ? '🎉 مبروك — كل الاختبارات عدّت بنجاح!' : '❌ في مشكلة — جرّب تاني'}
                  </p>
                  {(result.output || result.error) && (
                    <pre
                      dir="ltr"
                      className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lens bg-ink-950 p-3 font-mono text-xs leading-6 text-paper/90"
                    >
                      {result.error || result.output}
                    </pre>
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}