const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { prepareLaunch } = require('../electron/provider-launch.cjs');
const { wireCockpit } = require('../electron/cockpit.cjs');

test('both provider launch buttons prepare isolated hooks and a separate Crew Stop guard', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-launch-'));
  try {
    const handlers = {}, settings = {};
    fs.mkdirSync(path.join(root, '.odoo19-agents/scripts'), { recursive: true });
    fs.writeFileSync(path.join(root, '.odoo19-agents/scripts/odoo_orchestrate.py'), '# synthetic');
    wireCockpit({ handle: (name, callback) => { handlers[name] = callback; }, settings, save() {}, checkedProject: p => p,
      catalog: async () => ({ selectedRelease: null, tasks: [], flows: [] }), terminal: async () => [{ id: 't', project: root }],
      stateDir: root, backend: '/app/backend', home: root });
    for (const provider of ['claude', 'codex']) {
      const launch = await handlers['prepare-agent']({ provider, project: root, release: null, terminal: 't' });
      assert.ok(launch.command.startsWith(provider + ' '));
      assert.equal(settings.bindings.at(-1).provider, provider + '-hooks');
      assert.equal(settings.bindings.at(-1).terminal, 't');
      assert.equal(settings.bindings.at(-1).nativeId, null);
      assert.ok(!fs.existsSync(path.join(root, '.codex/hooks.json')));
      assert.ok(!fs.existsSync(path.join(root, '.claude/settings.json')));
    }
    assert.equal(settings.bindings.length, 2);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Claude wrapper preserves statusLine command and padding while retaining no other settings', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-launch-'));
  try {
    fs.mkdirSync(path.join(root, '.claude'));
    const original = JSON.stringify({ statusLine: { type: 'command', command: 'printf existing', padding: 3 }, env: { SECRET: 'PRIVATE' }, hooks: { Stop: [{ hooks: [] }] } });
    fs.writeFileSync(path.join(root, '.claude/settings.json'), original);
    const launch = prepareLaunch({ provider: 'claude', id: 'x', folder: path.join(root, 'out'), backend: '/backend', home: root, project: root, crew: root });
    const config = JSON.parse(fs.readFileSync(path.join(root, 'out/x.settings.json')));
    assert.ok(config.statusLine.command.includes('printf existing'));
    assert.equal(config.statusLine.padding, 3);
    assert.ok(!JSON.stringify(config).includes('PRIVATE'));
    assert.equal(fs.readFileSync(path.join(root, '.claude/settings.json'), 'utf8'), original);
    assert.ok(launch.quotaSource.endsWith('x.quota.json'));
    assert.equal(fs.statSync(path.join(root, 'out/x.settings.json')).mode & 0o777, 0o600);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('Codex shell arguments preserve literal paths and one configuration per event', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tricorder-$`'"));
  try {
    const launch = prepareLaunch({ provider: 'codex', id: 'x', folder: path.join(root, 'out'), backend: path.join(root, 'backend'), home: root, project: root, crew: root });
    const script = path.join(root, 'capture.py');
    fs.writeFileSync(script, 'import sys,json\nprint(json.dumps(sys.argv[1:]))\n');
    const shellQuote = x => "'" + x.replace(/'/g, "'\\''") + "'";
    const parsed = JSON.parse(execFileSync('bash', ['-c', 'python3 ' + shellQuote(script) + launch.command.slice('codex'.length)], { encoding: 'utf8' }));
    assert.equal(parsed.length, 20);
    assert.equal(parsed[0], '-c');
    assert.ok(parsed[1].startsWith('hooks.SessionStart='));
    const startCommand = JSON.parse(parsed[1].match(/command=("(?:[^"\\]|\\.)*")/)[1]);
    assert.ok(startCommand.includes("'\\''"));
    assert.ok(startCommand.includes('agent_hook.py'));
    assert.equal(startCommand, launch.hooks.SessionStart[0].hooks[0].command);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('quota scans are global and deduplicate overlapping refreshes', async () => {
  const sources = ['/state/observations/a.quota.json', '/state/observations/b.quota.json'];
  const handlers = {}, settings = { bindings: [{ project: '/a', quotaSource: sources[0] }, { project: '/b', quotaSource: sources[1] },
    { project: '/a', quotaSource: sources[0] }, { project: '/a', quotaSource: '/other/auth.json' }] };
  let reads = 0;
  wireCockpit({ handle: (name, callback) => { handlers[name] = callback; }, settings, save() {}, checkedProject: p => p,
    stateDir: '/state', catalog: async payload => { reads++; assert.equal(payload.action, 'quotas'); assert.deepEqual(payload.sources, sources); return [{ provider: 'codex' }]; } });
  const values = await Promise.all([handlers.quotas(), handlers.quotas(), handlers.quotas()]);
  assert.equal(reads, 1);
  assert.deepEqual(values[0], values[1]);
  await handlers.quotas();
  assert.equal(reads, 1);
});
