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
  for (const project of [...projects].sort()) {
    const changelog = path.join(project, 'changelog');
    for (const entry of await directory(changelog)) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const folder = path.join(changelog, entry.name);
      if (!(await stat(folder))?.isDirectory()) continue;
      for (const name of ['README.md', 'intentions.json', 'plan.json', 'effort.json', 'orchestration.json']) await stat(path.join(folder, name));
    }
    const agents = path.join(project, '.odoo-agents');
    if (!(await stat(agents))?.isDirectory()) continue;
    await stat(path.join(agents, 'orchestration.json'));
    const flows = path.join(agents, 'flows');
    for (const entry of await directory(flows)) if (entry.isFile() && entry.name.endsWith('.json')) await stat(path.join(flows, entry.name));
  }
  return createHash('sha256').update(JSON.stringify(records.sort((a, b) => a[0].localeCompare(b[0])))).digest('hex');
}
module.exports = { catalogRevision };
