// Invocation generation only: neither provider is executed.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { prepareLaunch } = require('../../../electron/provider-launch.cjs');
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'tricorder-invocation-effort-'));
try {
  const results = [];
  for (const provider of ['codex', 'claude']) {
    for (const model of [undefined, 'fixture']) {
      const id = `${provider}-${model || 'default'}`;
      prepareLaunch({ provider, id, folder, backend: path.resolve(__dirname, '../../../backend'), home: folder,
        project: folder, crew: '', prompt: 'Synthetic invocation, never executed.', effort: 'high', model });
      const { argv } = JSON.parse(fs.readFileSync(path.join(folder, id + '.launch.json')));
      const passesEffort = provider === 'codex' ? argv.some(a => a === 'model_reasoning_effort="high"') : argv.includes('--effort') && argv[argv.indexOf('--effort') + 1] === 'high';
      results.push({ provider, model: model || 'provider default', requestedEffort: 'high', passesEffort });
    }
  }
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
} finally { fs.rmSync(folder, { recursive: true, force: true }); }
