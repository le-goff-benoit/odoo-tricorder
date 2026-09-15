import { intentionCards } from './plan-model.mjs';
import { orchestrationCard, activities } from './activity.mjs';
import { taskState } from './task-state.mjs';
export const columns = [
  ['todo', 'À faire'], ['working', 'En cours'], ['review', 'À valider'],
  ['blocked', 'Bloquées'], ['unknown', 'État à vérifier'], ['deferred', 'Reportées'], ['done', 'Réceptionnées'],
];
export function columnFor(value) { return taskState(typeof value === 'string' ? { status: value } : value || {}).column; }
export function boardCards(projects, includeClosed = false, bindings = []) {
  return projects.flatMap(project => {
    const tasks = [...(project.board || [])];
    for (const release of project.releases || []) {
      if (!includeClosed && release.status === 'close') continue;
      const requests = intentionCards({ intentions: release.intentions, tasks: (project.board || []).filter(t => t.release === release.id) });
      tasks.push(...requests.map(card => ({ ...card, release: release.id, releaseTitle: release.title, releaseStatus: release.status })));
      const card = orchestrationCard({ selectedRelease: release.id, orchestration: release.orchestration }, bindings.filter(b => b.project === project.path));
      tasks.push({ ...card, release: release.id, releaseTitle: release.title, releaseStatus: release.status });
    }
    if (project.orchestration && !project.orchestration.release) tasks.push({ ...orchestrationCard({ orchestration: project.orchestration }, bindings.filter(b => b.project === project.path)), release: null, releaseTitle: 'Préparation du projet' });
    return tasks.filter(task => includeClosed || task.releaseStatus !== 'close').map(task => ({ ...task, project: project.path, projectName: project.name,
      activities: task.activities || activities({ selectedRelease: task.release }, bindings.filter(b => b.project === project.path)).filter(a => a.task === task.id),
      key: JSON.stringify([project.path, task.release, task.id]), column: ['orchestration', 'intention'].includes(task.kind) ? task.column : taskState(task).column, presentation: task.kind === 'intention' ? task.presentation : task.kind === 'orchestration' ? { ...taskState(task), label: 'Orchestration', proof: '' } : taskState(task) }));
  });
}
