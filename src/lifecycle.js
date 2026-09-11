// Display state is deliberately separate from the authoritative proof verdict.
const expandedPanels = new Set();
document.addEventListener('toggle', event => {
  const key = event.target.dataset?.detailKey;
  if (key) event.target.open ? expandedPanels.add(key) : expandedPanels.delete(key);
}, true);

export function plainLanguageUI({ s, hasNative, actual, partial }) {
  const $ = selector => document.querySelector(selector);
  const page = $('#content .page');
  if (!page) return;
  const controls = [...page.querySelectorAll('[data-cockpit="associate"]')];
  if (controls.length) {
    controls[0].textContent = 'Réglages du suivi';
    page.querySelector('.section-title')?.append(controls[0]);
    controls.slice(1).forEach(button => button.remove());
  }
  for (const panel of [...page.querySelectorAll('.native-panel:not(.quality-panel)')]) {
    const title = panel.querySelector('h2')?.textContent || '';
    if (!/Observation native|Mesures natives attribuées/.test(title)) continue;
    if (!hasNative) { panel.remove(); continue; }
    const details = document.createElement('details');
    const key = JSON.stringify([s.current, s.detail.selectedRelease, s.view, title]);
    details.dataset.detailKey = key;
    details.open = expandedPanels.has(key);
    details.className = 'technical-details';
    const summary = document.createElement('summary'); summary.textContent = 'Détails du suivi';
    panel.before(details); details.append(summary, panel);
    panel.querySelector('h2').textContent = s.view === 'effort' ? 'Relevés de temps' : 'Conversations suivies';
  }
  if (s.view === 'effort') {
    const cards = page.querySelectorAll('.metric');
    cards[2].querySelector('span').textContent = 'TÂCHES SUIVIES';
    cards[2].querySelector('strong').textContent = s.selectedTask ? '1' : String(s.detail.tasks.length);
    cards[2].querySelector('small').textContent = s.selectedTask ? 'Tâche consultée' : s.detail.selectedRelease ? 'Dans cette release' : 'Le cadrage précède les tâches';
    cards[1].querySelector('span').textContent = partial ? 'TEMPS ENREGISTRÉ · PARTIEL' : 'TEMPS ENREGISTRÉ';
    cards[1].querySelector('small').textContent = actual == null ? 'Aucune durée disponible' : partial ? 'Certaines périodes restent non mesurées' : 'Périodes enregistrées';
    const empty = page.querySelector('.effort-state');
    if (empty) {
      if (actual != null && !partial) empty.remove();
      else if (partial) { empty.querySelector('h3').textContent = 'Une partie du temps est enregistrée'; empty.querySelector('p').textContent = 'Les durées connues sont affichées. Les périodes manquantes ne valent pas zéro ; aucun écart avec la prévision complète n’est calculé.'; }
      else { empty.querySelector('h3').textContent = 'Le temps passé reste à enregistrer'; empty.querySelector('p').textContent = 'Les estimations sont conservées. Aucun temps n’est inventé lorsqu’un relevé manque.'; }
    }
    const explanation = page.querySelector('.table-scroll ~ p.muted');
    if (explanation) explanation.textContent = 'Les relevés provisoires ne sont pas additionnés aux durées déjà enregistrées.';
    for (const cell of page.querySelectorAll('tbody td:last-child')) {
      if (cell.textContent === 'effort.json') cell.textContent = 'Enregistré';
      if (cell.textContent === 'Natif · non consolidé') cell.textContent = 'Provisoire';
    }
    const timers = (s.detail.effort?.openTimers || []).filter(t => !s.selectedTask || t.task === s.selectedTask);
    if (timers.length) {
      const notice = document.createElement('div'); notice.className = 'note warning open-timers';
      notice.textContent = `${timers.length} période(s) de mesure en cours : ${timers.map(t => t.task === 'PREPARATION' ? 'préparation du plan' : t.task).join(', ')}. Les durées disponibles s’affichent à titre provisoire, hors veille.`;
      page.querySelector('.metrics').after(notice);
    }
  }
  for (const panel of page.querySelectorAll('.quality-panel')) {
    const empty = panel.querySelector(':scope > .note');
    if (empty) empty.textContent = 'Aucun rapport de test enregistré pour cette release.';
    const explanation = panel.querySelector(':scope > small');
    if (explanation) explanation.textContent = 'Résultats présentés par exécution, sans additionner les relances.';
  }
  for (const card of page.querySelectorAll('.agent-mission')) {
    const diagnostic = [...card.querySelectorAll(':scope > code.path, :scope > .note.warning')];
    if (!diagnostic.length) continue;
    const details = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Informations de suivi';
    details.append(summary, ...diagnostic); card.append(details);
  }
}

export function lifecycleUI({ s, esc, badge, when }) {
  const $ = selector => document.querySelector(selector);
  const release = s.detail.releases.find(r => r.id === s.detail.selectedRelease);
  const task = s.detail.tasks.find(t => t.id === s.selectedTask);
  if (s.view === 'terminal' && !task) {
    const explanation = $('#inspector .pad > p');
    if (explanation) explanation.textContent = 'Consultez ici les tâches et critères de la release. Vous pouvez dérouler tout le travail dans le même terminal du projet.';
  }
  const quality = $('#content .quality-panel');
  if (quality && s.detail.quality?.declarations?.length) quality.insertAdjacentHTML('beforeend', `<details class="declared-qa"><summary>Tests mentionnés dans les comptes rendus (${s.detail.quality.declarations.length} extraits)</summary><p>Déclarations de la release, pas des compteurs JUnit vérifiés. Les passages peuvent décrire des relances ou se recouper : ne pas les additionner.</p>${s.detail.quality.declarations.map(d => `<blockquote>${esc(d.text)}<br><button class="text-button" data-preview="${esc(d.path)}">${esc(d.path.split('/').at(-1))}:${d.line}</button></blockquote>`).join('')}</details>`);
  if (s.view === 'effort') {
    const warnings = [...new Set((s.detail.effort?.rows || []).filter(r => !s.selectedTask || r.task === s.selectedTask).flatMap(r => r.warnings || []))];
    if (warnings.length) $('#content .page').insertAdjacentHTML('beforeend', `<details class="note"><summary>Limites des mesures et comparaisons (${warnings.length})</summary>${warnings.map(w => `<p>${esc(w)}</p>`).join('')}</details>`);
  }
  const progress = t => t.progress === 'received' ? badge('received', 'Réceptionnée') : badge(t.progress || t.status);
  const validation = t => t.validation === 'not_recorded' ? 'Aucune réception vérifiable enregistrée' : t.validation === 'validated' ? 'Preuves valides dans ce dossier' : 'Preuves à revérifier dans ce dossier';
  const provenance = t => `<details class="task-proof"><summary>${validation(t)}</summary><p>${esc(t.reason)}</p>${t.receiptContext?.origin ? `<small>Origine ${t.receiptContext.location === 'worktree' ? '(worktree du même dépôt)' : ''} : <code>${esc(t.receiptContext.origin)}</code></small>` : ''}${t.receiptAt ? `<small>Réception : ${when(t.receiptAt)}</small>` : ''}${t.flowNote ? `<p>${esc(t.flowNote)}</p>` : ''}</details>`;
  if (s.view === 'plan') {
    const page = $('#content .page');
    if (release) {
      page.querySelector('.section-heading')?.insertAdjacentHTML('beforeend', `<p class="release-state" title="${esc(release.statusReason)}">${badge(release.status, release.status === 'close' ? 'Close' : release.status === 'ouverte' ? 'Ouverte' : release.status)}</p>`);
      const received = s.detail.tasks.filter(t => t.progress === 'received').length;
      page.querySelector('.section-title > .badge')?.replaceWith(Object.assign(document.createElement('span'), {
        className: 'release-counts', textContent: release.hasPlan ? `${s.detail.tasks.length} tâches · ${received} réceptionnées` : `${s.detail.tasks.length} points suivis`,
      }));
      const completed = s.detail.tasks.filter(t => ['received', 'done', 'validated'].includes(t.progress || t.status)).length;
      page.querySelector('.progress-track')?.setAttribute('title', 'Avancement enregistré (réceptions du plan ou points déclarés réalisés), distinct de la validation actuelle des preuves');
      if (page.querySelector('.progress-track > div')) page.querySelector('.progress-track > div').style.width = `${s.detail.tasks.length ? completed / s.detail.tasks.length * 100 : 0}%`;
      page.querySelector('.task-list').insertAdjacentHTML('beforebegin', `<div class="release-links"><button class="secondary" data-document="changelog/${esc(release.id)}/README.md">Lire le bilan de release</button></div>`);
      const empty = page.querySelector('.task-list .empty');
      if (empty) empty.innerHTML = '<h3>Aucune tâche structurée dans cette release</h3><p>Le bilan reste accessible ci-dessus. L’absence de plan ne signifie pas qu’aucun travail n’a été réalisé.</p>';
    }
    for (const card of page.querySelectorAll('.task-card')) {
      const t = s.detail.tasks.find(t => t.id === card.dataset.task);
      if (t.progress === 'received') {
        card.querySelector('.task-topline').insertAdjacentHTML('afterbegin', progress(t));
        card.querySelector('.task-description > p').textContent = 'Travail terminé et réceptionné.';
      } else if (t.source === 'plan') {
        const descriptions = { running: 'Travail en cours.', ready: 'Prête à démarrer.', pending: 'En attente de démarrage ou des tâches précédentes.', awaiting_receipt: 'Travail terminé, réception à confirmer.', interrupted: 'Suivi interrompu, à vérifier.', unverified: 'Suivi incomplet, voir le détail.' };
        if (descriptions[t.status]) card.querySelector('.task-description > p').textContent = descriptions[t.status];
      }
      const dependencies = card.querySelector('.dependencies');
      if (dependencies) dependencies.textContent = t.depends_on?.length ? 'Après ' + t.depends_on.join(', ') : '';
      if (!t.acceptance?.length) card.querySelector('.task-acceptance ul').innerHTML = '<li>Critères non renseignés.</li>';
    }
  }
  if (task && !$('#inspector').hidden) {
    $('#inspector .inspector-task')?.insertAdjacentHTML('beforeend', `${task.progress === 'received' ? progress(task) : ''}${provenance(task)}`);
    $('#inspector .inspector-bottom')?.insertAdjacentHTML('beforeend', `<button class="secondary wide" data-view="agents">Voir les missions de cette tâche</button>`);
    const terminalButton = $('#inspector [data-action="task-terminal"]');
    if (terminalButton) terminalButton.textContent = 'Continuer dans le terminal du projet';
    for (const node of $('#inspector').querySelectorAll('.timeline-node.done small')) node.insertAdjacentHTML('afterend', '<small>Étape parcourue · historique du workflow</small>');
  }
  // Existing shells never change scope as a side effect of navigation.
  $('#terminal-mismatch')?.remove();
  const terminal = s.sessions.find(t => t.id === s.selectedSession.get(s.current));
  if (s.view === 'terminal' && terminal && ((terminal.release || null) !== (s.detail.selectedRelease || null) || (terminal.task || null) !== (s.selectedTask || null))) {
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
    return `<article class="agent-mission ${f.status === 'waiting_human' ? 'awaiting' : ''}"><div class="mission-state"><h3>${esc(title)}</h3>${badge(f.status, f.missing ? 'Historique local absent' : undefined)}</div><code class="path">${esc(f.id)}</code>${f.nodes.filter(n => ['claimed', 'ready'].includes(n.status)).map(n => `<p><strong>${esc(n.owner || n.role)}</strong> · ${esc(n.description)} ${badge(n.status, n.executor === 'human' ? 'Votre décision est attendue' : undefined)}</p>`).join('')}${f.warning ? `<p class="note warning">${esc(f.warning)}</p>` : ''}<p class="muted">${historical ? 'Historique de mission, pas une activité en cours.' : linked.length ? `${linked.length} session(s) associée(s), état observé ci-dessous.` : 'Responsabilité déclarée par le workflow · session native non associée.'}</p><div class="cockpit-actions">${ownerTask ? `<button class="secondary" data-mission-task="${esc(ownerTask.id)}">Voir la tâche ${esc(ownerTask.id)}</button>` : ''}${linked.filter(b => b.terminal).map(b => `<button class="secondary" data-session="${esc(b.terminal)}">Ouvrir le terminal associé</button>`).join('')}</div></article>`;
  }).join('');
  return intro + cards;
}
