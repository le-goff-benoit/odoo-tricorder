// Only a newly observed, unique open release can change an unscoped project.
export function newReleaseContext(before, after, selected, sessions, project) {
  if (selected || !before) return null;
  const known = new Set(before.map(r => r.id));
  const added = after.filter(r => r.status === 'ouverte' && !known.has(r.id));
  if (added.length !== 1) return null;
  const eligible = sessions.filter(s => s.project === project && s.alive && s.scopeMode !== 'express'
    && (!s.release || before.some(r => r.id === s.release && r.status === 'close')));
  return { release: added[0].id, session: eligible.length === 1 ? eligible[0] : null, ambiguous: eligible.length > 1 };
}
