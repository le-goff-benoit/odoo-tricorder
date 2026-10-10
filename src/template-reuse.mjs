import { reusableWorkflow } from './workflow-design.mjs';
export function templateDefinition(source) {
  const graph=reusableWorkflow(source,{keepSimulationExamples:true});
  for(const key of ['id','revision','_project','summary','archived'])delete graph[key];
  return graph;
}
export function stableDefinition(value) {
  if(Array.isArray(value))return '['+value.map(stableDefinition).join(',')+']';
  if(value && typeof value==='object')return '{'+Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>JSON.stringify(key)+':'+stableDefinition(value[key])).join(',')+'}';
  return JSON.stringify(value);
}
export function sameTemplate(source,existing) { return !existing.archived && stableDefinition(templateDefinition(source))===stableDefinition(templateDefinition(existing)); }
