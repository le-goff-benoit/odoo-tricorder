export const columns = [
  ['todo', 'À faire'], ['working', 'En cours'], ['review', 'À valider'],
  ['blocked', 'Bloqué / à vérifier'], ['done', 'Terminé'],
];
export function columnFor(status) {
  if (['ready', 'pending', 'deferred'].includes(status)) return 'todo';
  if (['running', 'claimed', 'active'].includes(status)) return 'working';
  if (status === 'awaiting_receipt') return 'review';
  if (status === 'validated') return 'done';
  return 'blocked'; // Unknown/legacy declaration must never become verified done.
}
export function boardCards(projects, includeClosed = false) {
  return projects.flatMap(project => (project.board || [])
    .filter(task => includeClosed || task.releaseStatus !== 'close')
    .map(task => ({ ...task, project: project.path, projectName: project.name,
      key: JSON.stringify([project.path, task.release, task.id]), column: columnFor(task.status) })));
}
