export function lifecycleUI({ s, esc, when }) {
  const $ = selector => document.querySelector(selector);
  const release = s.detail.releases.find(r => r.id === s.detail.selectedRelease);
  const task = s.detail.tasks.find(t => t.id === s.selectedTask);
  const quality = $('#content .quality-panel');
  if (quality && s.detail.quality?.declarations?.length) quality.insertAdjacentHTML('beforeend', `<details class="declared-qa"><summary>Tests mentionnés dans les comptes rendus (${s.detail.quality.declarations.length} extraits)</summary><p>Déclarations de la release, pas des compteurs JUnit vérifiés. Les passages peuvent décrire des relances ou se recouper : ne pas les additionner.</p>${s.detail.quality.declarations.map(d => `<blockquote>${esc(d.text)}<br><button class="text-button" data-preview="${esc(d.path)}">${esc(d.path.split('/').at(-1))}:${d.line}</button></blockquote>`).join('')}</details>`);
  // Existing shells never change scope as a side effect of navigation.
  $('#terminal-mismatch')?.remove();
  const terminal = s.sessions.find(t => t.id === s.selectedSession.get(s.current));
  if (s.view === 'terminal' && terminal && ((terminal.release || null) !== (s.detail.selectedRelease || null))) {
    $('#terminal-context').insertAdjacentHTML('afterend', `<div id="terminal-mismatch" class="note" role="status"><strong>Terminal partagé du projet.</strong> Vous consultez ${esc(s.detail.selectedRelease || 'le projet sans release')}${s.detail.selectedRelease ? ' / ' + esc(s.selectedTask || 'release complète') : ''}. Changer de vue ne change pas les instructions de votre agent.<button class="text-button" data-follow-session="${esc(terminal.id)}">Revoir le contexte du terminal</button></div>`);
  }
}

export function missionCards({ s, rows, esc, badge }) {
  const task = s.detail.tasks.find(t => t.id === s.selectedTask);
  const flows = s.detail.flows.filter(f => !task || task.flowPaths?.includes(f.path));
  const taskRows = task ? [task] : s.detail.tasks;
  const intro = taskRows.map(t => `<article class="mission-task-summary"><button class="text-button" data-mission-task="${esc(t.id)}"><strong>${esc(t.id)} · ${esc(t.title)}</strong></button> ${badge(t.progress === 'received' ? 'received' : t.status, t.progress === 'received' ? 'Réceptionnée' : undefined)}<p>${t.source === 'readme' ? 'Point historique du README.' : t.progress === 'received' ? 'Réception enregistrée ; la validation actuelle des preuves est indiquée dans le plan.' : 'Avancement selon le plan.'} ${(t.flowPaths || []).length} workflow(s) lié(s).</p></article>`).join('');
  const cards = flows.map(f => {
    const ownerTask = s.detail.tasks.find(t => t.flowPaths?.includes(f.path));
    const linked = rows.filter(b => b.flow === f.path);
    const historical = ['complete', 'cancelled'].includes(f.status) || f.missing;
    const title = ownerTask ? `Tâche ${ownerTask.id}` : f.scope === 'project' ? 'Projet · sans release attribuée' : 'Release complète';
    return `<article class="agent-mission ${f.status === 'waiting_human' ? 'awaiting' : ''}"><div class="mission-state"><h3>${esc(title)}</h3>${badge(f.status, f.missing ? 'Historique local absent' : undefined)}</div>${f.nodes.filter(n => ['claimed', 'ready'].includes(n.status)).map(n => `<p><strong>${esc(n.owner || n.role)}</strong> · ${esc(n.description)} ${badge(n.status, n.executor === 'human' ? 'Votre décision est attendue' : undefined)}</p>`).join('')}<p class="muted">${historical ? 'Historique de mission, pas une activité en cours.' : linked.length ? `${linked.length} session(s) associée(s), état observé ci-dessous.` : 'Responsabilité déclarée par le workflow · session native non associée.'}</p><div class="cockpit-actions">${ownerTask ? `<button class="secondary" data-mission-task="${esc(ownerTask.id)}">Voir la tâche ${esc(ownerTask.id)}</button>` : ''}${linked.filter(b => b.terminal).map(b => `<button class="secondary" data-session="${esc(b.terminal)}">Ouvrir le terminal associé</button>`).join('')}</div><details><summary>Informations de suivi</summary><code class="path">${esc(f.id)}</code>${f.warning ? `<p class="note warning">${esc(f.warning)}</p>` : ''}</details></article>`;
  }).join('');
  return intro + cards;
}
