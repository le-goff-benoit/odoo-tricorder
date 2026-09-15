// Invocation settings only. Never change provider settings, project files or auth.
const fs = require('node:fs');
const path = require('node:path');
const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
const CLAUDE_HOOKS = ['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest', 'Notification', 'Elicitation', 'ElicitationResult', 'Stop', 'StopFailure', 'SubagentStart', 'SubagentStop'];
const CODEX_HOOKS = ['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PermissionRequest', 'Stop', 'Interrupt', 'SubagentStart', 'SubagentStop'];

function existingStatusLine(home, project) {
  const ancestors = [];
  for (let current = path.resolve(project); ; current = path.dirname(current)) {
    ancestors.unshift(current);
    if (path.dirname(current) === current) break;
  }
  const sources = [path.join(home, '.claude/settings.json'), ...ancestors.flatMap(p => ['settings.json', 'settings.local.json'].map(n => path.join(p, '.claude', n)))];
  let statusLine = {};
  for (const file of [...new Set(sources)]) {
    try {
      const info = fs.lstatSync(file);
      if (!info.isFile() || info.size > 1024 * 1024) continue;
      // Only the statusLine projection is retained. No environment/auth field
      // enters the collector, IPC, command line, persisted settings or logs.
      const settings = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Object.hasOwn(settings, 'statusLine')) continue;
      const value = settings.statusLine;
      statusLine = {};
      if (value?.type === 'command' && typeof value.command === 'string') {
        statusLine = { type: 'command', command: value.command };
        if (Number.isFinite(value.padding)) statusLine.padding = value.padding;
      }
    } catch { /* Missing settings do not prevent a normal launch. */ }
  }
  return statusLine;
}

function prepareLaunch({ provider, id, folder, backend, home, project, crew }) {
  if (!['claude', 'codex'].includes(provider)) throw new Error('Fournisseur inconnu');
  fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
  const source = path.join(folder, id + '.jsonl');
  const quotaSource = provider === 'claude' ? path.join(folder, id + '.quota.json') : null;
  const observer = ['python3', path.join(backend, 'agent_hook.py'), source].map(quote).join(' ');
  const hooks = Object.fromEntries((provider === 'claude' ? CLAUDE_HOOKS : CODEX_HOOKS).map(name => [name, [{ hooks: [{ type: 'command', command: observer, timeout: name === 'Interrupt' ? 1 : 5 }] }]]));
  const guard = path.join(crew, 'scripts/odoo_orchestrate.py');
  if (fs.existsSync(guard)) {
    hooks.Stop[0].hooks.push({ type: 'command', command: ['python3', guard, 'hook', '--project', project, '--events', source].map(quote).join(' '), timeout: 5 });
  }
  let command;
  if (provider === 'claude') {
    const previous = existingStatusLine(home, project);
    const statusLine = { ...previous, type: 'command', command: ['python3', path.join(backend, 'statusline.py'), quotaSource, previous.command || ''].map(quote).join(' ') };
    const configPath = path.join(folder, id + '.settings.json');
    fs.writeFileSync(configPath, JSON.stringify({ hooks, statusLine }), { mode: 0o600, flag: 'wx' });
    command = 'claude --settings ' + quote(configPath);
  } else {
    // Inline TOML passed as a session configuration layer. Codex merges hooks
    // from its other layers; no global/project hooks.json is edited.
    const toml = value => Array.isArray(value) ? '[' + value.map(toml).join(',') + ']' : value && typeof value === 'object' ? '{' + Object.entries(value).map(([k, v]) => `${k}=${toml(v)}`).join(',') + '}' : JSON.stringify(value);
    command = 'codex ' + Object.entries(hooks).map(([name, value]) => '-c ' + quote(`hooks.${name}=${toml(value)}`)).join(' ');
  }
  return { command, source, quotaSource, note: 'Suivi de cette invocation ; configuration existante conservée. Les politiques et la validation native des hooks restent applicables.', hooks };
}

module.exports = { prepareLaunch, existingStatusLine };
