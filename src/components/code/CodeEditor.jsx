import { useEffect, useRef, useState } from 'react';

// ============================================================
// CodeEditor.jsx — محرر الكود الاحترافي (Monaco = محرر VS Code)
// بيتحمّل من CDN تلقائياً (مفيش حزم npm) — ولو وقع الـ CDN
// بينزل لمحرر بسيط (textarea) عشان الموقع يفضل شغال.
// ============================================================

const MONACO_VERSION = '0.52.2';
const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;

let monacoPromise = null;

function loadMonaco() {
  if (monacoPromise) return monacoPromise;
  monacoPromise = new Promise((resolve, reject) => {
    if (window.monaco && window.monaco.editor) {
      resolve(window.monaco);
      return;
    }
    const loader = document.createElement('script');
    loader.src = `${MONACO_BASE}/loader.js`;
    loader.async = true;
    loader.onload = () => {
      try {
        window.require.config({ paths: { vs: MONACO_BASE } });
        window.require(['vs/editor/editor.main'], () => resolve(window.monaco), (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    };
    loader.onerror = () => reject(new Error('فشل تحميل المحرر'));
    document.body.appendChild(loader);
  });
  return monacoPromise;
}

export default function CodeEditor({
  value = '',
  onChange,
  language = 'python',
  height = 320,
  readOnly = false,
  label = 'الكود'
}) {
  const hostRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [mode, setMode] = useState('loading'); // loading | monaco | fallback

  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    let disposed = false;
    let editor = null;

    loadMonaco()
      .then((monaco) => {
        if (disposed || !hostRef.current) return;
        editor = monaco.editor.create(hostRef.current, {
          value: valueRef.current ?? '',
          language,
          theme: 'vs-dark',
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Cairo', monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          readOnly,
          padding: { top: 12, bottom: 12 },
          tabSize: 4,
          roundedSelection: false,
          renderLineHighlight: 'gutter',
          lineNumbersMinChars: 3
        });
        editor.onDidChangeModelContent(() => {
          if (onChangeRef.current) onChangeRef.current(editor.getValue());
        });
        editorRef.current = editor;
        setMode('monaco');
      })
      .catch(() => {
        if (disposed) return;
        setMode('fallback');
      });

    return () => {
      disposed = true;
      if (editor) {
        editor.dispose();
        editorRef.current = null;
      }
    };
  }, [language, readOnly]);

  // تحديث قيمة المحرر لما تتغير من بره (اختيار تحدي تاني)
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() !== valueRef.current) {
      editor.setValue(valueRef.current ?? '');
    }
  }, [value]);

  if (mode === 'fallback') {
    return (
      <div>
        {label && (
          <p className="mb-1.5 text-sm font-semibold text-paper">{label}</p>
        )}
        <textarea
          dir="ltr"
          readOnly={readOnly}
          value={value ?? ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          rows={Math.max(8, Math.round(height / 22))}
          className="w-full rounded-lens border border-ink-600 bg-ink-900 px-3.5 py-3 font-mono text-sm text-paper outline-none transition focus:border-signal/70 focus:ring-2 focus:ring-signal/20"
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div>
      {label && (
        <p className="mb-1.5 text-sm font-semibold text-paper">{label}</p>
      )}
      <div
        ref={hostRef}
        dir="ltr"
        style={{
          height,
          borderRadius: 12,
          overflow: 'hidden',
          border: '1px solid rgba(148,163,184,0.2)',
          background: '#1e1e2e'
        }}
      />
      {mode === 'loading' && (
        <p className="mt-1.5 text-xs text-muted">جارٍ تحميل المحرر الاحترافي أول مرة...</p>
      )}
    </div>
  );
}