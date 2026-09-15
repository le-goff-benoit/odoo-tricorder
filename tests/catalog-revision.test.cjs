const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { catalogRevision } = require('../electron/catalog-revision.cjs');

test('release changes, atomic replacements and deletions change revision without following links', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tri-revision-'));
  try {
    const project = path.join(root, 'project'); fs.mkdirSync(project);
    const initial = await catalogRevision([project]);
    const release = path.join(project, 'changelog/new'); fs.mkdirSync(release, { recursive: true });
    fs.writeFileSync(path.join(release, 'README.md'), '# Release');
    const created = await catalogRevision([project]); assert.notEqual(created, initial);
    const file = path.join(release, 'intentions.json'); fs.writeFileSync(file, '{"items":[]}');
    const added = await catalogRevision([project]); assert.notEqual(added, created);
    assert.equal(await catalogRevision([project]), added);
    fs.writeFileSync(file + '.tmp', '{"items":[1]}'); fs.renameSync(file + '.tmp', file);
    const replaced = await catalogRevision([project]); assert.notEqual(replaced, added);
    fs.unlinkSync(file); assert.notEqual(await catalogRevision([project]), replaced);
    const outside = path.join(root, 'outside'); fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(project, 'changelog/linked'));
    const linked = await catalogRevision([project]);
    fs.writeFileSync(path.join(outside, 'intentions.json'), 'not read');
    assert.equal(await catalogRevision([project]), linked);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
