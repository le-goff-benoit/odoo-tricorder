import { hours, knownSum, summarizeMeasures } from './measurements.mjs';
export const duration = (value, partial = false) => value == null ? 'À compléter' : hours(value) + (partial ? ' · à compléter' : '');
export const tokens = (value, partial = false) => value == null ? '—' : value.toLocaleString('fr-CH') + (partial ? ' · à compléter' : '');
export function totals(cards) {
  return {initial:knownSum(cards.map(t => t.measures.revised ?? t.measures.initial)), ...summarizeMeasures(cards.map(t => t.measures)),
    tokens:knownSum(cards.map(t => t.measures.tokens).filter(v => v != null)), tokenPartial:cards.some(t => t.measures.tokenPartial || t.measures.tokens == null)};
}
export function timeTable(cards, esc, expand = false, total = true, opened = new Set(), context = '') {
  const row = (title, m, klass = '', agent = '') => `<tr class="${klass}" ${agent ? `data-agent="${esc(agent)}"` : ''}><td>${title}</td><td>${duration(m.revised ?? m.initial)}</td><td>${duration(m.actual, m.partial)}</td><td>${tokens(m.tokens, m.tokenPartial)}</td></tr>`;
  const body = cards.map(t => {
    const key = JSON.stringify([context,t.id]);
    return `<tbody data-time-task="${esc(t.id)}">` + row(`<strong>${esc(t.id)}${t.title ? ' · ' + esc(t.title) : ''}</strong>`, t.measures, '',t.agent || '') + (expand && t.agents?.length ? `<tr><td colspan="4"><details data-agent-detail="${esc(key)}" ${opened.has(key) ? 'open' : ''}><summary>Temps par agent</summary>${timeTable(t.agents.map(a => ({ id: a.label, agent:a.agent,title: '', measures: a })), esc,false,false)}</details></td></tr>` : '') + '</tbody>';
  }).join('');
  return `<div class="table-scroll"><table class="pilotage-times"><thead><tr><th>Tâche / agent</th><th>Prévu</th><th>Réalisé</th><th>Jetons</th></tr></thead>${body || '<tbody><tr><td colspan="4">Aucune mesure pour le moment.</td></tr></tbody>'}${total && cards.length > 1 ? '<tbody>' + row('Total connu', totals(cards), 'total-row') + '</tbody>' : ''}</table></div>`;
}
