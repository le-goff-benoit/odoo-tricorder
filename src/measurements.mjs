export const knownSum = values => values.length && values.every(v => Number.isFinite(v) && v >= 0) ? values.reduce((a, b) => a + b, 0) : null;
export function withoutPreparationOverlap(observations, reservations = []) {
  return observations.filter(b => !reservations.some(r => {
    if (r.provider !== b.provider?.split('-')[0] || r.thread !== b.nativeId) return false;
    // Unbounded native histories cannot be safely added to a preparation timer.
    const [since, until, start, end] = [b.since, b.until, r.since, r.until].map(value => value ? Date.parse(value) : NaN);
    return ![since, until, start, end].every(Number.isFinite) || since >= until || start > end || Math.max(since, start) < Math.min(until, end);
  }));
}
export const tokenFields = [
  ['input_tokens', 'Entrées (cache inclus)'], ['output_tokens', 'Sorties'],
  ['cached_input_tokens', 'Dont cache lu'], ['cache_write_input_tokens', 'Dont cache écrit'],
];
export function tokenMeasures(recorded, native) {
  // Use one source per task. Never add a native session to its imported ledger.
  const saved = recorded.some(r => r.tokens && Object.values(r.tokens).some(Number.isFinite));
  const samples = saved ? recorded.map(r => r.tokens) : native.map(b => b.usage?.tokens);
  return { source: saved ? 'Enregistré' : 'Provisoire',
    fields: tokenFields.map(([key, label]) => {
      const values = samples.map(s => s?.[key]);
      return { key, label, value: subtotal(values), partial: values.some(v => !valid(v)) };
    }) };
}
const valid = value => Number.isFinite(value) && value >= 0;
const subtotal = values => knownSum(values.filter(valid));

export function summarizeMeasures(rows) {
  const actual = subtotal(rows.map(r => r.actual));
  return { actual, partial: actual != null && rows.some(r => r.partial || !valid(r.actual)) };
}

export function hours(value) {
  if (!Number.isFinite(value) || value < 0) return 'Non mesuré';
  const seconds = Math.round(value * 60);
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60);
  return `${h} h ${String(m).padStart(2, '0')} min${seconds > 0 && seconds < 60 ? ' ' + seconds + ' s' : ''}`;
}

export function taskMeasures(estimates, native) {
  const initial = knownSum(estimates.map(r => r.initial?.expected_minutes));
  const revised = knownSum(estimates.map(r => r.revised?.expected_minutes));
  const complete = estimates.length > 0 && estimates.every(r => r.time_complete !== false && valid(r.actual_minutes));
  // A zero subtotal on an unmeasured Crew row is not an observed zero.
  const recorded = subtotal(estimates.map(r => valid(r.actual_minutes) ? r.actual_minutes : r.known_minutes > 0 ? r.known_minutes : null));
  const observed = subtotal(native.map(b => valid(b.usage?.active_seconds) ? b.usage.active_seconds / 60 : null));
  const actual = recorded ?? observed;
  const partial = actual != null && (recorded != null ? !complete : estimates.length > 0 || !native.every(b => b.usage?.complete && valid(b.usage?.active_seconds)));
  const comparable = recorded != null && complete && !estimates.some(r => r.scope_changed || r.retrospective);
  const missingRoles = estimates.filter(r => r.time_complete === false || !valid(r.actual_minutes)).map(r => r.agent).filter(Boolean);
  return { initial, revised, actual, partial, missingRoles,
    basis: recorded != null ? 'effort.json' : observed != null ? 'Natif · non consolidé' : 'Non mesuré',
    delta: comparable && actual != null && (revised ?? initial) != null ? actual - (revised ?? initial) : null };
}

export function agentMeasures(estimates, native) {
  // Use the same source for every role as for the task total: never fill missing
  // recorded roles with native time and accidentally double-count a conversation.
  const observations = taskMeasures(estimates, native).basis === 'effort.json' ? [] : native;
  const roles = [...new Set([...estimates.map(r => r.agent || ''), ...observations.map(r => r.role || '')])];
  const labels = { 'odoo-analyst': 'Analyse', 'odoo-developer': 'Développement', 'odoo-tester': 'QA / tests',
    'odoo-studio': 'Studio', 'odoo-support': 'Support', orchestrateur: 'Coordination', orchestrator: 'Coordination' };
  const reasons = { unrecorded: 'Aucun relevé enregistré', running: 'Mesure en cours', interrupted: 'Mesure interrompue, durée inconnue', 'missing-duration': 'Durée indisponible' };
  return roles.map(agent => ({ agent, label: labels[agent] || agent || 'Non attribué',
    reasons: [...new Set(estimates.filter(r => (r.agent || '') === agent).map(r => reasons[r.timeState]).filter(Boolean))],
    ...taskMeasures(estimates.filter(r => (r.agent || '') === agent), observations.filter(r => (r.role || '') === agent)) }));
}

export function timeShare(value, total) {
  return valid(value) && valid(total) && total > 0 && value <= total ? 100 * value / total : null;
}

export function agentAllocation(tasks) {
  const total = summarizeMeasures(tasks).actual, groups = new Map();
  for (const task of tasks) for (const row of task.agents || []) {
    if (!groups.has(row.agent)) groups.set(row.agent, []);
    groups.get(row.agent).push(row);
  }
  return [...groups].map(([agent, rows]) => {
    const summary = summarizeMeasures(rows);
    return { agent, label: rows[0].label, ...summary, share: timeShare(summary.actual, total) };
  });
}
