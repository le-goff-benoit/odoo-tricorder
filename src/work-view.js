export function workView(detail, esc, badge) {
  const tasks = detail.tasks || [], memory = detail.knowledge || {};
  const release = (detail.releases || []).find(r => r.id === detail.selectedRelease);
  const waiting = tasks.filter(t => ['blocked', 'stale', 'interrupted', 'awaiting_receipt', 'unverified'].includes(t.status));
  const active = tasks.filter(t => ['running', 'ready', 'pending'].includes(t.status));
  const questions = [...(memory.questions || []).filter(q => q.status === 'open'), ...(memory.contributions || []).filter(c => c.current && c.kind === 'question').map(c => ({ id: c.id, question: c.statement }))];
  const requests = (detail.intentions?.items || []).filter(i => ['clarify', 'ready'].includes(i.status));
  const last = (detail.releases || []).find(r => r.status === 'close');
  const card = t => `<article class="info-card work-task"><div><h3>${esc(t.title || t.id)}</h3><p>${esc(t.id)} · ${badge(t.status)}</p>${t.reason && !t.reason.startsWith('.odoo-agents/flows/') ? `<p class="muted">${esc(t.reason)}</p>` : ''}</div><div class="work-actions"><button class="secondary" data-task="${esc(t.id)}">Voir les critères</button><button class="primary" data-work-resume="${esc(t.id)}">Reprendre</button></div></article>`;
  return `<div class="page work-page"><div class="section-title"><div><span class="eyebrow">Travail</span><h2>${esc(release?.title || 'Que souhaitez-vous faire avancer ?')}</h2><p class="muted">${release ? `Release ${esc(release.id)} · ${esc(release.status === 'ouverte' ? 'ouverte' : 'clôturée')}` : 'Une demande précise, puis un agent qui poursuit le travail.'}</p></div><button class="primary" data-action="work-request">Nouvelle demande</button></div>
  <div class="knowledge-summary"><span><strong>${tasks.filter(t => t.status === 'validated').length}/${tasks.length}</strong> tâches reçues</span><span><strong>${waiting.length + questions.length}</strong> points à examiner</span><button class="secondary" data-view="knowledge">${Number(memory.feedback?.pending || 0)} retours à qualifier</button></div>
  ${(detail.warnings || []).length ? `<div class="knowledge-alert">${detail.warnings.map(w => `<p>${esc(w)}</p>`).join('')}</div>` : ''}
  ${waiting.length || questions.length ? `<h3>À votre attention</h3><div class="knowledge-list">${waiting.map(card).join('')}${questions.map(q => `<article class="info-card"><h4>${esc(q.question)}</h4><button class="secondary" data-work-question="${esc(q.id)}">Apporter une précision</button></article>`).join('')}</div>` : ''}
  ${requests.length ? `<h3>Demandes à préparer</h3><div class="knowledge-list">${requests.map(i => `<article class="info-card"><h4>${esc(i.title || i.id)}</h4><p>${esc(i.status === 'clarify' ? 'Précision attendue' : 'Prête à planifier')}</p><button class="secondary" data-view="intentions">Voir la demande</button></article>`).join('')}</div>` : ''}
  <h3>À poursuivre</h3><div class="knowledge-list">${active.map(card).join('') || '<p class="muted">Aucune tâche en attente dans le plan sélectionné. Une nouvelle demande permet de préparer la suite.</p>'}</div>
  <div class="work-actions"><button class="secondary" data-view="plan">Voir tout le plan</button>${release?.status === 'ouverte' ? '<button class="secondary" data-action="work-close">Préparer la clôture</button>' : ''}</div>
  ${last ? `<p class="muted">Dernière release clôturée : ${esc(last.title || last.id)}. Le déploiement se vérifie dans les preuves de livraison.</p>` : ''}
  </div>`;
}
