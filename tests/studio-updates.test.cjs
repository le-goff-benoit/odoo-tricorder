const { test } = require('node:test');
const assert = require('node:assert/strict');
const { newer, releaseInfo, check } = require('../electron/studio-updates.cjs');
test('stable release comparison never proposes a downgrade or a prerelease', () => {
  assert.equal(newer('v0.10.0', '0.9.0'), true);
  assert.equal(newer('v0.6.0', '0.6.0-preview.1'), true);
  assert.equal(newer('v0.5.1', '0.6.0-preview.1'), false);
  assert.equal(newer('v0.6.0', '0.6.0'), false);
  assert.equal(newer('v1.0.0-beta', '0.6.0'), false);
  assert.equal(newer('arbitrary', '0.6.0'), false);
});
test('only the fixed repository release and exact Debian asset may be opened', () => {
  const release = { tag_name: 'v0.7.0', draft: false, prerelease: false, html_url: 'https://evil.test', assets: [{ name: 'odoo-tricorder_0.7.0_amd64.deb', state: 'uploaded', browser_download_url: 'https://evil.test/payload' }] };
  const info = releaseInfo(release, '0.6.0');
  assert.equal(info.status, 'available');
  assert.equal(info.download, undefined);
  assert.equal(info.url, 'https://github.com/le-goff-benoit/odoo-tricorder/releases/tag/v0.7.0');
  release.assets[0].browser_download_url = 'https://github.com/le-goff-benoit/odoo-tricorder/releases/download/v0.7.0/odoo-tricorder_0.7.0_amd64.deb';
  assert.ok(releaseInfo(release, '0.6.0').download);
});
test('offline/rate-limited/malformed responses are unknown, not up-to-date', async () => {
  for (const fetcher of [async () => { throw new Error('offline'); }, async () => ({ ok: false }), async () => ({ ok: true, text: async () => 'invalid' })]) {
    assert.equal((await check('0.6.0', fetcher)).status, 'unavailable');
  }
  const result = await check('0.6.0', async (url, options) => {
    assert.equal(new URL(url).hostname, 'api.github.com');
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, text: async () => JSON.stringify({ tag_name: 'v0.7.0', assets: [] }) };
  });
  assert.equal(result.status, 'available');
});
