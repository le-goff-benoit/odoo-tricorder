'use strict';
const statusCatalog = require('./workflow-states.json');

function summarize(runs, totals=null) {
  const counts = { running: 0, waiting_input: 0, waiting: 0, returned: 0, blocked: 0 };
  for (const run of runs) {
    if (run.counts) {for (const key of Object.keys(counts)) counts[key] += run.counts[key] || 0;}
    else for (const node of Object.values(run.nodes || {})) if (Object.hasOwn(counts, node.status)) counts[node.status] += 1;
  }
  if (totals) for (const key of Object.keys(counts)) counts[key] = totals[key] || 0;
  const active = runs.filter(r => ['active', 'paused'].includes(r.status));
  const detail = `${counts.waiting_input} question(s) · ${counts.waiting} décision(s) · ${counts.returned} résultat(s) à valider · ${counts.running} étape(s) active(s)`;
  return { ...counts, active, detail, severity: counts.blocked ? 'blocked' : (counts.waiting_input || counts.waiting) ? 'waiting' : counts.returned ? 'returned' : counts.running ? 'running' : 'idle' };
}

function menuItems(runs, navigate, show, quit, fresh = true, schedules = []) {
  const summary = summarize(runs);
  const pending = summary.active.slice().sort((a, b) => Object.values(b.nodes).filter(n => statusCatalog.attention.includes(n.status)).length - Object.values(a.nodes).filter(n => statusCatalog.attention.includes(n.status)).length);
  return [
    { label: 'Ouvrir Tricorder', click: show },
    { label: fresh ? summary.detail : 'Suivi indisponible · activité inconnue', enabled: false },
    { type: 'separator' },
    ...pending.slice(0, 8).map(run => {
      const nodes = Object.values(run.nodes);
      const waiting = nodes.filter(n => n.status === 'waiting').length;
      const questions = nodes.filter(n => n.status === 'waiting_input').length;
      const returned = nodes.filter(n => n.status === 'returned').length;
      const text = questions ? `${questions} question(s)` : waiting ? `${waiting} décision(s)` : returned ? `${returned} à valider` : run.status === 'paused' ? 'Suspendue' : 'En cours';
      return { label: `${run.simulation ? '[Simulation] ' : ''}${run.project_title || ''} · ${run.release || run.definition.title} — ${text}`, click: () => navigate({ route: 'run', run: run.id, project: run.project, node: Object.keys(run.nodes).find(id => statusCatalog.attention.includes(run.nodes[id].status)) }) };
    }),
    ...(!pending.length ? [{ label: 'Aucune exécution en cours', enabled: false }] : []),
    ...(pending.length > 8 ? [{ label: `Voir les ${pending.length} exécutions…`, click: () => navigate({ route: 'projects' }) }] : []),
    { type: 'separator' },
    ...schedules.filter(s => s.enabled).slice(0, 5).map(s => ({ label: `◷ ${s.title} · ${new Date(s.next * 1000).toLocaleString('fr-CH', { timeZone: s.rule.timezone || 'Europe/Zurich', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`, click: () => navigate({ route: 'schedules' }) })),
    { label: 'Workflows récurrents', click: () => navigate({ route: 'schedules' }) },
    { label: 'Workflows globaux', click: () => navigate({ route: 'global' }) },
    { label: 'Projets et releases', click: () => navigate({ route: 'projects' }) },
    { label: 'Bibliothèque de workflows', click: () => navigate({ route: 'library' }) },
    { label: 'Connexions', click: () => navigate({ route: 'connections' }) },
    { type: 'separator' },
    { label: 'Quitter Tricorder', click: quit },
  ];
}

function trayBitmap(severity) {
  // A native 24px symbolic T and three bars, readable on dark/light top panels.
  const size = 24, buffer = Buffer.alloc(size * size * 4);
  const rectangle = (x, y, w, h, rgb) => {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) {
      const i = (row * size + col) * 4; buffer[i] = rgb[2]; buffer[i + 1] = rgb[1]; buffer[i + 2] = rgb[0]; buffer[i + 3] = 255;
    }
  };
  rectangle(2, 3, 18, 18, [72, 89, 204]);
  rectangle(5, 6, 12, 3, [255, 255, 255]); rectangle(5, 8, 3, 10, [255, 255, 255]);
  rectangle(11, 11, 6, 2, [232, 238, 255]); rectangle(11, 15, 6, 2, [232, 238, 255]);
  const colors = { waiting: [246, 184, 63], blocked: [233, 74, 97], returned: [186, 168, 243], running: [90, 190, 254] };
  if (colors[severity]) rectangle(17, 17, 6, 6, colors[severity]);
  return { buffer, size };
}

module.exports = { summarize, menuItems, trayBitmap };
