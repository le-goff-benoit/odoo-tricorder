const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { jsonRequest, workflowCatalogRequest, MAX_REQUEST_BYTES } = require('../electron/backend-request.cjs');

function fixture(t, code) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-transport-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const script = path.join(dir, 'backend.py'); fs.writeFileSync(script, code);
  return script;
}

test('catalog registration keeps project identity without copying release history', () => {
  const project = { path: '/sample', name: 'Projet', series: '18.0', releases: [{ detail: 'x'.repeat(4500000) }] };
  const result = workflowCatalogRequest([project], '/pack');
  assert.deepEqual(result, { action: 'project.configure-catalog', projects: [{ path: '/sample', name: 'Projet', series: '18.0' }], pack: '/pack' });
  assert.equal(project.releases[0].detail.length, 4500000);
});

test('bridge delivers the entire Unicode payload and returns backend result', async t => {
  const script = fixture(t, 'import sys,json\np=json.load(sys.stdin)\nprint(json.dumps({"ok":True,"result":{"length":len(p["text"]),"tail":p["text"][-3:]}}))\n');
  assert.deepEqual(await jsonRequest(script, [], { text: 'é'.repeat(1000000) + 'fin' }), { length: 1000003, tail: 'fin' });
});

test('oversize check counts UTF-8 bytes and runs before starting backend', async t => {
  const script = fixture(t, 'from pathlib import Path\nPath(__file__+".started").touch()\n');
  await assert.rejects(jsonRequest(script, [], { text: 'é'.repeat(MAX_REQUEST_BYTES / 2) }), /Requête trop volumineuse/);
  assert.equal(fs.existsSync(script + '.started'), false);
});

test('early stdin closure preserves backend rejection without uncaught EPIPE', async t => {
  const script = fixture(t, 'import os,json\nos.close(0)\nprint(json.dumps({"ok":False,"error":"Demande refusée par le moteur"}))\n');
  await assert.rejects(jsonRequest(script, [], { text: 'x'.repeat(3000000) }), /Demande refusée par le moteur/);
});

test('early backend exit without response becomes a recoverable transport error', async t => {
  const script = fixture(t, 'import os\nos.close(0)\nraise SystemExit(1)\n');
  await assert.rejects(jsonRequest(script, [], { text: 'x'.repeat(3000000) }), /moteur local ne répond pas/);
});

test('timeout during input delivery rejects without crashing the process', async t => {
  const script = fixture(t, 'import time\ntime.sleep(5)\n');
  await assert.rejects(jsonRequest(script, [], { text: 'x'.repeat(3000000) }, { timeout: 100 }), /moteur local ne répond pas/);
});

test('malformed backend output is a transport error without leaking raw content', async t => {
  const script = fixture(t, 'import sys\nsys.stdin.read()\nprint("private diagnostic")\n');
  await assert.rejects(jsonRequest(script, [], {}), error => /moteur local ne répond pas/.test(error.message) && !error.message.includes('private'));
});
