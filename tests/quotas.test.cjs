const test = require('node:test');
const assert = require('node:assert/strict');

test('quotas distinguish unknown, zero and a reset without a fresh response', async () => {
  const { quotaPresentation } = await import('../src/quotas.mjs');
  const now = Date.parse('2026-09-15T12:00:00Z');
  const base = { provider: 'codex', observedAt: '2026-09-15T11:59:00Z', windows: [{ id: 'p', label: '5 h', usedPercent: 0, resetsAt: '2026-09-15T12:01:00Z' }] };
  assert.equal(quotaPresentation(base, now).windows[0].text, '0 %');
  assert.equal(quotaPresentation(base, now + 61000).windows[0].text, 'À actualiser');
  assert.equal(quotaPresentation({ provider: 'claude' }, now).summary, 'Quotas non disponibles');
  assert.equal(quotaPresentation({ ...base, windows: [{ ...base.windows[0], usedPercent: null }] }, now).windows[0].text, 'Non disponible');
});

test('quota thresholds do not switch models and provider labels are escaped', async () => {
  const { quotaPresentation, quotaPanel } = await import('../src/quotas.mjs');
  const now = Date.now();
  const data = { provider: 'claude', observedAt: new Date(now).toISOString(), windows: [79, 80, 95].map(p => ({ id: String(p), label: '<script>', usedPercent: p })) };
  assert.deepEqual(quotaPresentation(data, now).windows.map(w => w.severity), ['normal', 'warning', 'danger']);
  const html = quotaPanel([data], undefined, now);
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Codex'));
});
