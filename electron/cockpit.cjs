// Native dialogs are the only way to authorize reading a session or extra folder.
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
const HOOKS = ['SessionStart', 'SessionEnd', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest', 'Notification', 'Elicitation', 'ElicitationResult', 'Stop', 'StopFailure', 'SubagentStart', 'SubagentStop'];
const SKILLS = {
  'odoo-plan': 'Préparer une release et ses critères', 'odoo-start': 'Exécuter ou reprendre le plan',
  'odoo-new': 'Traiter une demande de développement', 'odoo-support': 'Diagnostiquer un ticket',
  'odoo-estimate': 'Estimer et mesurer le travail des agents', 'odoo-env': 'Déclarer ou vérifier un environnement (dialogue sécurisé)',
  'odoo-close': 'Recetter et clôturer la release', 'odoo-feedback': 'Capitaliser une leçon',
};

function wireCockpit({ handle, dialog, shell, window, settings, save, checkedProject, catalog, terminal, stateDir, backend, home }) {
  settings.bindings ||= []; settings.profiles ||= {}; settings.ui ||= {};
  let observing;
  async function observeAll() {
    const bindings = settings.bindings.filter(b => { try { checkedProject(b.project); return true; } catch { return false; } });
    const result = new Array(bindings.length);
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, bindings.length) }, async () => {
      while (cursor < bindings.length) { const index = cursor++; result[index] = await observe(bindings[index]); }
    }));
    return result;
  }
  async function context(request) {
    const project = checkedProject(request.project);
    const data = await catalog({ action: 'project', project, release: request.release || null });
    if (request.task && !data.tasks.some(t => t.id === request.task)) throw new Error('Tâche inconnue');
    if (request.flow && !data.flows.some(f => f.path === request.flow)) throw new Error('Workflow inconnu');
    if (request.terminal && !(await terminal({ action: 'list' })).some(s => s.id === request.terminal && s.project === project)) throw new Error('Terminal d’un autre projet');
    const since = date(request.since), until = date(request.until);
    const role = request.role || 'orchestrator';
    if (typeof role !== 'string' || !/^[a-z][a-z0-9-]{0,63}$/.test(role)) throw new Error('Rôle invalide');
    if (since && until && until <= since) throw new Error('Période invalide');
    return { project, release: data.selectedRelease, task: request.task || null, flow: request.flow || null,
      terminal: request.terminal || null, role, since, until };
  }
  function date(value) {
    if (!value) return null;
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new Error('Date invalide');
    return new Date(value).toISOString();
  }
  function overlap(a, b) {
    // Runtime reads carry no usage period and are never added to measured time.
    if (a.provider === 'codex-runtime' || b.provider === 'codex-runtime') return false;
    return a.provider.split('-')[0] === b.provider.split('-')[0] && a.nativeId === b.nativeId && a.nativeId &&
      (a.until || '9999') > (b.since || '') && (b.until || '9999') > (a.since || '');
  }
  async function observe(binding) {
    try {
      const data = await catalog(binding.provider === 'codex-runtime' ? { action: 'codex-runtime', nativeId: binding.nativeId } :
        { action: 'observation', source: binding.source, provider: binding.provider,
          since: binding.since, until: binding.until, expected: binding.nativeId });
      if (!binding.nativeId) { binding.nativeId = data.nativeId; save(); }
      if (settings.bindings.some(b => b.id !== binding.id && overlap(b, binding))) throw new Error('Période déjà associée ; mesures exclues pour éviter un double compte');
      return { ...binding, ...data };
    } catch (error) {
      return { ...binding, agents: [], usage: null, warnings: [binding.pending && !binding.nativeId ? 'En attente du premier événement Claude.' : error.message] };
    }
  }
  handle('observations', async project => {
    if (project) checkedProject(project);
    // Avoid overlapping periodic scans, including large native histories.
    if (!observing) observing = observeAll().finally(() => { observing = null; });
    return (await observing).filter(b => !project || b.project === project);
  });
  handle('bind-native', async request => {
    const association = await context(request);
    if (!['claude', 'codex'].includes(request.provider)) throw new Error('Fournisseur inconnu');
    const result = await dialog.showOpenDialog(window(), { title: 'Associer explicitement un historique natif JSONL (métadonnées uniquement)',
      defaultPath: path.join(home, request.provider === 'codex' ? '.codex/sessions' : '.claude/projects'),
      properties: ['openFile'], filters: [{ name: 'Événements natifs', extensions: ['jsonl'] }] });
    if (result.canceled) return null;
    const source = fs.realpathSync(result.filePaths[0]);
    const data = await catalog({ action: 'observation', source, provider: request.provider, since: association.since, until: association.until });
    const binding = { ...association, id: randomUUID(), provider: request.provider, source, nativeId: data.nativeId };
    if (settings.bindings.some(b => overlap(b, binding))) throw new Error('Cette session/période est déjà associée. Choisissez des périodes disjointes.');
    settings.bindings.push(binding); save(); return binding;
  });
  handle('bind-codex-runtime', async request => {
    const association = await context(request);
    if (association.since || association.until) throw new Error('Le statut du service est actuel, pas une période historique');
    if (typeof request.nativeId !== 'string' || !/^[\w.-]{1,200}$/.test(request.nativeId)) throw new Error('Identifiant Codex invalide');
    const data = await catalog({ action: 'codex-runtime', nativeId: request.nativeId });
    const binding = { ...association, id: randomUUID(), provider: 'codex-runtime', source: 'Service Codex local (thread/read)', nativeId: data.nativeId };
    if (settings.bindings.some(b => b.provider === 'codex-runtime' && b.nativeId === binding.nativeId)) throw new Error('Cette session est déjà observée par le service local');
    settings.bindings.push(binding); save(); return binding;
  });
  handle('prepare-claude', async request => {
    const association = await context(request);
    const id = randomUUID();
    const folder = path.join(stateDir, 'observations'); fs.mkdirSync(folder, { recursive: true, mode: 0o700 });
    const source = path.join(folder, id + '.jsonl');
    const command = ['python3', path.join(backend, 'agent_hook.py'), source].map(quote).join(' ');
    const config = { hooks: Object.fromEntries(HOOKS.map(name => [name, [{ hooks: [{ type: 'command', command, timeout: 5 }] }]])) };
    const configPath = path.join(folder, id + '.settings.json');
    fs.writeFileSync(configPath, JSON.stringify(config), { mode: 0o600, flag: 'wx' });
    settings.bindings.push({ ...association, id, provider: 'claude-hooks', source, nativeId: null, pending: true }); save();
    return { command: 'claude --settings ' + quote(configPath), note: 'Hooks de cette invocation uniquement ; configuration globale inchangée. Validez les hooks dans Claude. Aucune autorisation automatisée.' };
  });
  handle('forget-native', async id => {
    const binding = settings.bindings.find(b => b.id === id);
    if (!binding) throw new Error('Association inconnue');
    checkedProject(binding.project);
    const { response } = await dialog.showMessageBox(window(), { type: 'question', message: 'Retirer cette association du cockpit ?',
      detail: 'L’historique natif, les journaux collectés et les données Odoo restent intacts.', buttons: ['Conserver', 'Retirer'], defaultId: 0, cancelId: 0 });
    if (response !== 1) return false;
    settings.bindings = settings.bindings.filter(b => b.id !== id); save(); return true;
  });
  handle('profile', async (project, patch) => {
    checkedProject(project);
    const previous = settings.profiles[project] || {};
    const profile = { ...previous };
    if (!['auto', 'module', 'studio', 'online'].includes(patch.kind)) throw new Error('Profil inconnu');
    profile.kind = patch.kind;
    profile.restoredAt = date(patch.restoredAt);
    if (profile.restoredAt && Date.parse(profile.restoredAt) > Date.now()) throw new Error('Restauration dans le futur');
    for (const key of ['communityCommit', 'enterpriseCommit']) {
      if (patch[key] && !/^[a-f0-9]{40}$/.test(patch[key])) throw new Error('Commit attendu : SHA Git complet (40 caractères)');
      profile[key] = patch[key] || null;
    }
    settings.profiles[project] = profile; save(); return profile;
  });
  handle('profile-folder', async (project, kind) => {
    checkedProject(project);
    const titles = { stackRoot: 'Stack locale du projet', ocaRoots: 'Bibliothèque OCA de la série du projet', workingDirectory: 'Dossier de travail des nouveaux terminaux', communityRoot: 'Sources Community exactes du projet', enterpriseRoot: 'Sources Enterprise exactes du projet' };
    if (!titles[kind]) throw new Error('Dossier inconnu');
    const choice = await dialog.showOpenDialog(window(), { title: titles[kind], properties: ['openDirectory'] });
    if (choice.canceled) return null;
    const folder = fs.realpathSync(choice.filePaths[0]);
    const profile = settings.profiles[project] ||= {};
    if (kind === 'ocaRoots') profile.ocaRoots = [...new Set([...(profile.ocaRoots || []), folder])];
    else profile[kind] = folder;
    save(); return profile;
  });
  handle('profile-reset', project => { checkedProject(project); delete settings.profiles[project]; save(); });
  handle('search-documents', (project, query) => catalog({ action: 'search', project: checkedProject(project), query }));
  handle('files', (project, relative) => catalog({ action: 'files', project: checkedProject(project), path: relative }));
  handle('file-preview', async (project, relative) => {
    const value = await catalog({ action: 'file-preview', project: checkedProject(project), path: relative });
    if (value.type === 'pdf') { const error = await shell.openPath(value.path); if (error) throw new Error(error); }
    return value;
  });
  handle('palette', () => Object.entries(SKILLS).map(([name, description]) => ({ name, description })));
  handle('prepare-skill', (name, provider) => {
    if (!SKILLS[name] || !['claude', 'codex'].includes(provider)) throw new Error('Skill ou fournisseur inconnu');
    return { command: (provider === 'codex' ? '$' : '/') + name,
      note: 'À coller dans l’agent ' + provider + ', pas dans le shell. Ajoutez votre demande avant validation.' };
  });
  handle('prepare-usage', async id => {
    const binding = settings.bindings.find(b => b.id === id);
    if (!binding) throw new Error('Association inconnue');
    const observed = await observe(binding);
    if (!observed.usage || !binding.release || !binding.task) throw new Error('Mesure native, release et tâche explicites requises');
    checkedProject(binding.project);
    const script = path.join(process.env.TRICORDER_AGENTS_DIR || path.join(home, '.odoo19-agents'), 'scripts/odoo_effort.py');
    if (!fs.existsSync(script)) throw new Error('Odoo Crew absent');
    const args = ['python3', script, 'import-usage', path.join(binding.project, 'changelog', binding.release),
      '--task', binding.task, '--agent', binding.role || 'orchestrator', '--provider', binding.provider.split('-')[0], '--source', observed.usageSource];
    if (binding.since) args.push('--since', binding.since);
    if (binding.until) args.push('--until', binding.until);
    return { command: args.map(quote).join(' '), note: 'Cette commande écrit les mesures dans effort.json via Odoo Crew. Vérifiez le lot et le rôle avant exécution ; Tricorder ne l’exécute pas.' };
  });
  handle('handoff', async request => {
    const association = await context(request);
    const data = await catalog({ action: 'project', project: association.project, release: association.release });
    const tasks = data.tasks.filter(t => !association.task || t.id === association.task);
    const lines = ['# Reprise de mission — Odoo Tricorder', '', `Projet : ${data.path}`, `Série : ${data.series || 'inconnue'}`,
      `Release : ${data.selectedRelease || 'aucune'}`, '', 'Lire AGENTS.md et lancer le briefing Odoo avant toute intervention.',
      'Cette fiche transmet le contexte, pas une conversation native ni une autorisation de production.', ''];
    for (const t of tasks) lines.push(`## ${t.id} — ${t.title}`, `État : ${t.status} — ${t.reason || ''}`,
      `Dépendances : ${(t.depends_on || []).join(', ') || 'aucune'}`, `Workflow : ${t.flow || 'non associé'}`,
      `Demande : ${t.request || 'non indiquée'}`, ...(t.acceptance || []).map(a => '- ' + a), '');
    lines.push('## Sessions explicitement associées');
    for (const b of settings.bindings.filter(b => b.project === data.path && b.release === data.selectedRelease && (!association.task || b.task === association.task)))
      lines.push(`- ${b.provider} / ${b.nativeId || 'en attente'} / tâche ${b.task || 'non attribuée'} / flow ${b.flow || 'non attribué'}`);
    lines.push('', '## Documents à relire', ...data.documents.map(d => '- ' + d.path));
    return lines.join('\n');
  });
  handle('export-handoff', async text => {
    if (typeof text !== 'string' || text.length > 1024 * 1024) throw new Error('Fiche invalide');
    const choice = await dialog.showSaveDialog(window(), { title: 'Exporter la fiche de reprise', defaultPath: path.join(home, 'tricorder-reprise.md'), filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (choice.canceled) return null;
    fs.writeFileSync(choice.filePath, text, { mode: 0o600 }); return choice.filePath;
  });
}

module.exports = { wireCockpit };
