// ============================================================
// codeRunner.js — محرك تنفيذ Python داخل المتصفح
//
// * بيشغّل Python حقيقي (Pyodide) في Web Worker (Blob) عشان
//   الصفحة مبتجمّدش حتى لو الكود فيه لوب لا نهائي.
// * فيه مهلة (timeout): لو الكود علّق — الـ worker بيتدمر وبيتعمل
//   جديد تلقائياً.
// * كل حاجة من CDN — مفيش حزم npm ولا خادم. آمن تماماً (بيشتغل
//   في متصفح الطالب مش على السيرفر).
// ============================================================

const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

const WORKER_SRC = `
self.onmessage = async function (e) {
  const { id, code } = e.data || {};
  let output = '';
  try {
    if (!self.__pyodideReady) {
      importScripts(${JSON.stringify(PYODIDE_BASE + 'pyodide.js')});
      self.__pyodideReady = loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE)} });
    }
    const pyodide = await self.__pyodideReady;
    pyodide.setStdout({ batched: function (line) { output += line + '\\n'; } });
    let passed = false;
    try {
      pyodide.runPython(code);
      passed = true;
      output += '\\n✅ كل الاختبارات عدّت بنجاح\\n';
    } catch (err) {
      output += String((err && err.message) || err) + '\\n';
    }
    self.postMessage({ id: id, ok: true, passed: passed, output: output });
  } catch (err) {
    self.postMessage({ id: id, ok: false, error: String((err && err.message) || err) });
  }
};
`;

let worker = null;
let nextId = 1;
const pending = new Map();
const readyCallbacks = [];

/** اتصّل لما محرك بايثون يبقى جاهز أول مرة (عشان تظهر "بيتحمّل أول مرة") */
export function onPythonReady(cb) {
  if (typeof cb === 'function') readyCallbacks.push(cb);
}

function ensureWorker() {
  if (worker) return worker;

  const blob = new Blob([WORKER_SRC], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const w = new Worker(url);

  w.onmessage = (e) => {
    const { id, ok, passed, output, error } = e.data || {};
    if (!id) return;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (entry.timer) clearTimeout(entry.timer);
    entry.resolve(ok ? { passed, output: output || '' } : { passed: false, output: '', error });
  };

  w.onerror = () => {
    for (const entry of pending.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.resolve({ passed: false, output: '', error: 'تعذر تشغيل محرك بايثون — اتأكد من اتصالك بالإنترنت' });
    }
    pending.clear();
    worker = null;
  };

  worker = w;
  return w;
}

/**
 * يشغّل كود Python كامل (كود الطالب + كود الاختبارات) ويرجع النتيجة.
 * result: { passed: boolean, output: string, error?: string }
 */
export function runPythonCode(code, { timeout = 10000 } = {}) {
  return new Promise((resolve) => {
    const id = nextId++;
    const entry = { resolve };
    pending.set(id, entry);

    const w = ensureWorker();
    try {
      w.postMessage({ id, code });
    } catch {
      pending.delete(id);
      resolve({ passed: false, output: '', error: 'تعذر إرسال الكود للمحرك' });
      return;
    }

    entry.timer = setTimeout(() => {
      pending.delete(id);
      try {
        w.terminate();
      } catch {
        /* تجاهل */
      }
      worker = null; // العامل الجديد هيتعمل أوتوماتيك المرة الجاية
      resolve({
        passed: false,
        output: '',
        error: '⏱️ انتهت المدة (10 ثواني) — اتأكد إن الكود واصل ومالوش لوب لا نهائي'
      });
    }, timeout);
  });
}

/** بيبني الكود الكامل اللي بيتشغل: كود الطالب + الاختبارات */
export function buildFullCode(studentCode, testCode) {
  return `${studentCode || ''}\n\n# ===== الاختبارات =====\n${testCode || ''}`;
}