// Mirror the public data-contract rules for immediate editor feedback. The
// engine remains authoritative when saving, linking or validating a result.
export const typeNames = { string: 'Texte', number: 'Nombre', boolean: 'Oui / non', object: 'Objet structuré', array: 'Liste', any: 'Toute donnée' };
export const portType = port => typeof port === 'string' ? port : port?.type;
export const portRequired = (port, direction = 'outputs') => typeof port === 'string' ? direction === 'outputs' : port?.required !== false;
export function normalizedPort(port, direction = 'outputs') { return typeof port === 'string' ? { type: port, required: direction === 'outputs' } : { required: true, ...port }; }
export function portDescription(port, direction = 'outputs') {
  const value = normalizedPort(port, direction), count = value.type === 'array' ? `liste de ${typeNames[value.items || 'any'].toLocaleLowerCase('fr')}${value.minItems || value.maxItems != null ? ` · ${value.minItems || 0}…${value.maxItems ?? 'N'} éléments` : ''}` : `${typeNames[value.type] || 'Donnée'} · un élément`;
  return count + (value.required ? ' · requis' : ' · facultatif');
}
export function incompatibleReason(source, target, schema = 2) {
  const s = normalizedPort(source), t = normalizedPort(target, 'inputs');
  if (schema === 1) return s.type === t.type || [s.type,t.type].includes('any') ? '' : 'Les types des données sont différents.';
  if (t.required && !s.required) return 'Cette entrée est requise mais la sortie peut être absente. Rendez la sortie requise ou gérez son absence.';
  if (t.type === 'any') return '';
  if (s.type !== t.type) return s.type === 'array' ? 'Une liste ne peut pas alimenter un élément unique. Ajoutez un traitement par élément ou une transformation.' : 'Le type de la sortie ne correspond pas à celui de l’entrée.';
  if (s.type === 'array') {
    if ((t.items || 'any') !== 'any' && (s.items || 'any') !== t.items) return 'Le type des éléments de la liste ne correspond pas à celui attendu.';
    if ((s.minItems || 0) < (t.minItems || 0)) return `La sortie ne garantit pas les ${t.minItems} éléments minimum attendus.`;
    if ((s.maxItems ?? Infinity) > (t.maxItems ?? Infinity)) return `La sortie peut dépasser les ${t.maxItems} éléments maximum acceptés.`;
  }
  return '';
}
export function convertWorkflow(graph) {
  const converted = structuredClone(graph); converted.schema = 2;
  for (const node of converted.nodes) for (const direction of ['inputs','outputs']) if (node[direction]) node[direction] = Object.fromEntries(Object.entries(node[direction]).map(([name, port]) => [name, normalizedPort(port, direction)]));
  return converted;
}
export const collectionPort = (min = 0) => ({ type: 'array', items: 'object', required: true, minItems: min, maxItems: 100 });
export function basicChildWorkflow(title = 'Traiter un élément') {
  return { schema: 2, id: 'item-work', title, nodes: [{ id: 'work', kind: 'agent', title, prompt: 'Traiter uniquement l’élément reçu dans item. Produire un résultat documenté. Ne pas modifier de code si le besoin est documentaire.', inputs: { item: { type: 'object', required: true } }, outputs: { result: { type: 'string', required: true } }, validation: 'contract', max_attempts: 2 }], edges: [] };
}
export function advancedNode(kind) {
  if (kind === 'input') return { outputs: { intentions: collectionPort(1) } };
  if (kind === 'foreach') return { inputs: { items: collectionPort() }, outputs: { results: collectionPort(), contributions: collectionPort() }, collection: 'items', concurrency: 2, workflow: basicChildWorkflow() };
  if (kind === 'integrate') return { inputs: { contributions: collectionPort(1) }, outputs: { candidate: { type: 'object', required: true } }, validation: 'automatic' };
  return {};
}
export function descriptorFromFields(fields) {
  const port = { type: fields.type, required: fields.required === 'on' };
  if (port.type === 'array') {
    port.items = fields.items || 'any';
    for (const [key, name] of [['minItems','minimum'],['maxItems','maximum']]) if (fields[name] !== '') port[key] = Number(fields[name]);
    if ((port.maxItems ?? Infinity) < (port.minItems || 0)) throw new Error('Le maximum de la liste doit être supérieur ou égal au minimum.');
  }
  return port;
}
