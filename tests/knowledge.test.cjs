const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { catalogRevision } = require('../electron/catalog-revision.cjs');

test('knowledge source edits refresh the view; external references stay outside the watcher', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-memory-'));
  try {
    const project = path.join(tmp, 'project'); const agents = path.join(project, '.odoo-agents');
    fs.mkdirSync(agents, { recursive: true });
    const original = path.join(project, 'piece.md'); fs.writeFileSync(original, 'v1');
    const outside = path.join(tmp, 'outside.md'); fs.writeFileSync(outside, 'private');
    fs.writeFileSync(path.join(agents, 'DOCUMENTS.json'), JSON.stringify({ documents: [
      { original: { path: 'piece.md', sha256: 'hash' } },
      { original: { path: '../outside.md', sha256: 'hash' } },
    ] }));
    const before = await catalogRevision([project]);
    fs.writeFileSync(original, 'v2 extended');
    const after = await catalogRevision([project]); assert.notEqual(after, before);
    fs.writeFileSync(outside, 'private extended');
    assert.equal(await catalogRevision([project]), after);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('project memory remains inert text in the UI', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/knowledge-view.js'), 'utf8');
  const { knowledgeView } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
  const esc = text => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const html = knowledgeView({ contributions: [{ id: 'K1', current: true, state: 'proposed',
    statement: '<img src=x onerror=alert(1)>', sources: [{ path: '<script>evil</script>' }] }] }, esc);
  assert.ok(html.includes('&lt;img')); assert.ok(html.includes('À confirmer'));
  assert.ok(!html.includes('<img src=x')); assert.ok(!html.includes('<script>'));
});
