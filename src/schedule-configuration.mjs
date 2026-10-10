const workdays = [0, 1, 2, 3, 4];
const weekdays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function scheduleFrequency(rule) {
  if (rule.kind === 'interval') return `Toutes les ${rule.minutes} minutes`;
  if (rule.kind === 'daily') return `Chaque jour à ${rule.time || '09:00'}`;
  const days = [...new Set(rule.weekdays || workdays)].sort((a, b) => a - b);
  const label = JSON.stringify(days) === JSON.stringify(workdays) ? 'Du lundi au vendredi' : days.map(day => weekdays[day]).join(', ');
  return `${label} à ${rule.time || '09:00'}`;
}

// Preserve the recurrence, never the old permission or an earlier activation.
// Simulation is a safe starting mode even when replacing a real schedule.
export function replacementScheduleDraft(schedule) {
  const rule = schedule.rule;
  return { kind: rule.kind, time: rule.time || '09:00', minutes: rule.minutes || 30,
    timezone: rule.timezone || 'Europe/Zurich', weekdays: JSON.stringify(rule.weekdays || workdays), simulation: true, ...(schedule.parameters ? {values:structuredClone(schedule.parameters)} : {}) };
}
