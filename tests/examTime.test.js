import { test } from 'node:test';
import assert from 'node:assert/strict';

import { computeRemainingSeconds, SUBMIT_GRACE_SECONDS } from '../src/utils/examTime.js';

test('SUBMIT_GRACE_SECONDS = 60 (نفس مهلة الخادم)', () => {
  assert.equal(SUBMIT_GRACE_SECONDS, 60);
});

test('computeRemainingSeconds: حساب بسيط بدون انحراف', () => {
  const now = Date.now();
  const serverNow = new Date(now).toISOString();
  const deadline = new Date(now + 300000).toISOString(); // بعد 5 دقائق
  assert.equal(computeRemainingSeconds(serverNow, deadline, now), 300);
});

test('computeRemainingSeconds: يصحح تقدم/تأخر ساعة الجهاز', () => {
  const serverNowMs = 1700000000000;
  const serverNow = new Date(serverNowMs).toISOString();
  const deadline = new Date(serverNowMs + 600000).toISOString(); // 10 دقائق بخادم
  // جهاز الطالب متقدم 3 دقائق عن الخادم — المتبقي الحقيقي لا يتأثر
  const clientAdvanced = serverNowMs + 180000;
  assert.equal(computeRemainingSeconds(serverNow, deadline, clientAdvanced), 600);
  // جهاز الطالب متأخر دقيقتين
  const clientBehind = serverNowMs - 120000;
  assert.equal(computeRemainingSeconds(serverNow, deadline, clientBehind), 600);
});

test('computeRemainingSeconds: صفر عند (أو بعد) الموعد النهائي', () => {
  const serverNowMs = 1700000000000;
  const serverNow = new Date(serverNowMs).toISOString();
  const deadline = new Date(serverNowMs).toISOString();
  assert.equal(computeRemainingSeconds(serverNow, deadline, serverNowMs), 0);
  assert.equal(computeRemainingSeconds(serverNow, deadline, serverNowMs + 5000), 0);
});

test('computeRemainingSeconds: مدخلات غير صالحة ترجع null', () => {
  assert.equal(computeRemainingSeconds(null, new Date().toISOString()), null);
  assert.equal(computeRemainingSeconds(new Date().toISOString(), null), null);
  assert.equal(computeRemainingSeconds('مش وقت', 'ولا ده'), null);
});

test('computeRemainingSeconds: تحديث الصفحة لا يصفّر المؤقت (نفس الموعد من الخادم)', () => {
  const serverNowMs = 1700000000000;
  const deadline = new Date(serverNowMs + 600000).toISOString();
  // أول تحميل: استجابة الخادم كانت عند serverNowMs
  const first = computeRemainingSeconds(new Date(serverNowMs).toISOString(), deadline, serverNowMs);
  // تحديث الصفحة بعد 4 دقائق: استجابة خادم جديدة عند serverNowMs+240s
  const second = computeRemainingSeconds(
    new Date(serverNowMs + 240000).toISOString(),
    deadline,
    serverNowMs + 240000
  );
  assert.equal(first, 600);
  assert.equal(second, 360); // نفس الـ 10 دقائق نقصت منها 4 — لا تصفير
});
