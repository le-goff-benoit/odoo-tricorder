import { releaseCards, effortCards } from './release-kanban.mjs';
import { taskMeasures, knownSum } from './measurements.mjs';
import { duration, totals } from './pilotage.mjs';
export function workView(detail, esc, badge, observations = []) {
  const tasks = releaseCards(detail, observations), memory = detail.knowledge || {};
  const release = (detail.releases || []).find(r => r.id === detail.selectedRelease);
  const active = tasks.filter(t => ['working', 'review', 'blocked'].includes(t.column));
  const questions = [...(memory.questions || []).filter(q => q.status === 'open'), ...(memory.contributions || []).filter(q => q.kind === 'question' && q.current && q.freshness === 'verified').map(q => ({id:q.id,question:q.statement}))];
  const estimates = detail.effort?.rows || [];
  const measures = totals(effortCards(detail,observations));
  const waiting = tasks.filter(t => t.waiting);
  const next = active.length ? active : tasks.filter(t => t.column === 'todo').slice(0, 3);
  const card = t => `<article class="info-card work-task"><div><h3>${esc(t.title)}</h3><p>${badge(t.status, t.presentation.label)}</p><p>Prévu ${duration(t.measures.revised ?? t.measures.initial)} · Réalisé ${duration(t.measures.actual, t.measures.partial)}</p></div><div class="work-actions"><button class="secondary" data-task="${esc(t.id)}">Voir la tâche</button><button class="primary" data-work-resume="${esc(t.id)}">${t.column === 'review' ? 'Poursuivre les tests' : 'Poursuivre'}</button></div></article>`;
  return `<div class="page work-page"><div class="section-title"><div><span class="eyebrow">Statut</span><h2>${esc(release?.title || 'Votre projet')}</h2></div><button class="primary" data-action="work-request">Nouvelle demande</button></div>
    <div class="metrics"><div class="metric"><span>Temps prévu</span><strong>${duration(measures.revised ?? measures.initial)}</strong></div><div class="metric"><span>Temps réalisé</span><strong>${duration(measures.actual, measures.partial)}</strong></div><div class="metric"><span>À déployer</span><strong>${tasks.filter(t => t.column === 'done').length}</strong></div><div class="metric"><span>Déployées</span><strong>${tasks.filter(t => t.column === 'deployed').length} / ${tasks.length}</strong></div></div>
    ${questions.length || waiting.length ? `<h3>Votre décision est attendue</h3>${questions.map(q => `<article class="info-card"><p>${esc(q.question)}</p><button class="secondary" data-work-question="${esc(q.id)}" data-question-text="${esc(q.question)}">Répondre à cette question</button></article>`).join('')}${waiting.filter(t => !next.includes(t)).map(card).join('')}` : ''}
    <h3>${active.length ? 'Travail à suivre' : 'Prochaines tâches'}</h3><div class="knowledge-list">${next.map(card).join('') || '<p>Aucune tâche en cours. Consultez le plan pour les travaux à déployer ou déjà livrés.</p>'}</div>
    <div class="work-actions"><button class="secondary" data-view="plan">Ouvrir le plan</button>${release?.status === 'ouverte' ? '<button class="secondary" data-action="work-close">Préparer la livraison</button>' : ''}</div>
    <details class="technical-details"><summary>Outils du projet</summary><button class="secondary" data-view="documents">Fichiers</button><button class="secondary" data-view="sources">Sources</button><button class="secondary" data-view="environments">Environnements</button></details>
    ${(detail.warnings || []).length ? `<details class="technical-details"><summary>Informations de lecture</summary>${detail.warnings.map(w => `<p>${esc(w)}</p>`).join('')}</details>` : ''}</div>`;
}
