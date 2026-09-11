const test = require('node:test');
const assert = require('node:assert/strict');
const { wireCockpit } = require('../electron/cockpit.cjs');

test('native observation respects explicit no-release and cancelled connection writes nothing', async () => {
  const handlers = {}, settings = {}, reads = [];
  let saves = 0, dialogs = 0;
  wireCockpit({ handle: (name, fn) => { handlers[name] = fn; },
    dialog: { showOpenDialog: async () => { dialogs++; return { canceled: true }; } },
    window: () => null, settings, save: () => { saves++; }, checkedProject: p => p,
    catalog: async request => { reads.push(request); return {
      selectedRelease: request.release === '' ? null : 'default', tasks: [], flows: [],
    }; }, terminal: async () => [], home: '/synthetic' });
  for (const release of [null, '', 'chosen', undefined]) {
    assert.equal(await handlers['bind-native']({ project: '/p', release, provider: 'codex' }), null);
    assert.equal(reads.at(-1).release, release === null ? '' : release);
  }
  await assert.rejects(handlers['bind-native']({ project: '/p', release: null, task: 'old-task', provider: 'codex' }), /Tâche inconnue/);
  assert.equal(dialogs, 4); assert.equal(saves, 0); assert.deepEqual(settings.bindings, []);
});
