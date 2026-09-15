// Metadata only, confined to registered project release/flow records. No recursive
// repository scan, file contents, provider files or symlink traversal.
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');

async function catalogRevision(projects) {
  const records = [];
  async function stat(file) {
    try {
      const info = await fs.lstat(file, { bigint: true });
      if (info.isSymbolicLink()) return null;
      records.push([file, String(info.ino), String(info.mtimeNs), String(info.ctimeNs), String(info.size)]);
      return info;
    } catch { return null; }
  }
  async function directory(folder) {
    if (!(await stat(folder))?.isDirectory()) return [];
    try { return await fs.readdir(folder, { withFileTypes: true }); } catch { return []; }
  }
  async function references(project, file) {
    const info = await stat(file);
    if (!info?.isFile() || info.size > 4194304n) return;
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'));
      async function visit(value) {
        if (!value || typeof value !== 'object') return;
        if (typeof value.path === 'string' && typeof value.sha256 === 'string') {
          const target = path.resolve(project, value.path);
          if (target.startsWith(project + path.sep) && await fs.realpath(target).catch(() => '') === target) await stat(target);
        }
        for (const child of Object.values(value)) if (child && typeof child === 'object') await visit(child);
      }
      await visit(data);
    } catch { /* A broken catalogue is reported by the read-only Python reader. */ }
  }
  for (const project of [...projects].sort()) {
    const changelog = path.join(project, 'changelog');
    for (const entry of await directory(changelog)) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const folder = path.join(changelog, entry.name);
      if (!(await stat(folder))?.isDirectory()) continue;
      for (const name of ['README.md', 'intentions.json', 'plan.json', 'effort.json', 'orchestration.json', 'consolidation.md']) await stat(path.join(folder, name));
      await references(project, path.join(folder, 'plan.json'));
      for (const entry of await directory(path.join(folder, 'knowledge'))) if (entry.isFile() && entry.name.endsWith('.json')) await references(project, path.join(folder, 'knowledge', entry.name));
    }
    const agents = path.join(project, '.odoo-agents');
    if (!(await stat(agents))?.isDirectory()) continue;
    for (const name of ['PROJECT.md', 'JOURNAL.md', 'DECISIONS.json', 'DOCUMENTS.json', 'SOURCE_INDEX.json']) await stat(path.join(agents, name));
    for (const name of ['DECISIONS.json', 'DOCUMENTS.json']) await references(project, path.join(agents, name));
    await stat(path.join(agents, 'orchestration.json'));
    const flows = path.join(agents, 'flows');
    for (const entry of await directory(flows)) if (entry.isFile() && entry.name.endsWith('.json')) await stat(path.join(flows, entry.name));
  }
  return createHash('sha256').update(JSON.stringify(records.sort((a, b) => a[0].localeCompare(b[0])))).digest('hex');
}
module.exports = { catalogRevision };
