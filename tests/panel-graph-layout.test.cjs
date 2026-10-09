const { test, before } = require('node:test');
const assert = require('node:assert/strict');
let executionLayout, designLayout, designRoutes, overlap;
before(async () => {
  ({ executionLayout } = await import('../src/execution-layout.mjs'));
  ({ designLayout, designRoutes, rectanglesOverlap: overlap } = await import('../src/design-layout.mjs'));
});
const support = () => ({
  id: 'support-fixture', parameters: { request: 'Fixture seulement' },
  nodes: ['diagnosis', 'urgent', 'normal', 'clarify', 'reassess', 'unresolved'].map((id, i) => ({ id, kind: 'agent', title: id, inputs: { finding: 'string' }, position: { x: 40 + i * 310, y: 70 } })),
  edges: [['diagnosis', 'urgent', 'critical'], ['diagnosis', 'normal', 'normal'], ['diagnosis', 'clarify', 'unknown'], ['clarify', 'reassess', 'done'], ['reassess', 'urgent', 'critical'], ['reassess', 'normal', 'normal'], ['reassess', 'unresolved', 'unknown']].map(([from, to, outcome], i) => ({ id: 'edge-' + i, from, to, outcome, mapping: { finding: 'finding', next_action: 'next_action' } })),
});
const labelsFor = graph => Object.fromEntries(graph.edges.map(edge => [edge.id, (edge.outcome === 'critical' ? 'Critique' : edge.outcome === 'normal' ? 'Normale' : 'Indéterminée') + ' · 2 données']));
function verifyLabels(routes, cards) {
  for (let i = 0; i < routes.length; i++) {
    for (const card of cards) assert.equal(overlap(routes[i].label, card), false, `Label ${routes[i].id} intersects card ${card.id}`);
    for (let j = i + 1; j < routes.length; j++) assert.equal(overlap(routes[i].label, routes[j].label), false, `Labels ${routes[i].id}/${routes[j].id} overlap`);
  }
}
function verifyRoutes(routes, cards) {
  for (const route of routes) for (let i = 1; i < route.points.length; i++) {
    const [x, y] = route.points[i - 1], [endX, endY] = route.points[i];
    // Open segment excludes the attachment to its source/destination boundary.
    const line = { x: Math.min(x, endX) + 0.01, y: Math.min(y, endY) + 0.01, width: Math.max(0, Math.abs(x - endX) - 0.02), height: Math.max(0, Math.abs(y - endY) - 0.02) };
    for (const card of cards) assert.equal(overlap(line, card), false, `Route ${route.id} crosses ${card.id}`);
  }
}

test('Support skip edges and joins reserve readable labels and never cross cards at split width', () => {
  const graph = support(), before = structuredClone(graph), heights = { diagnosis: 163, reassess: 156, clarify: 142 };
  const layout = executionLayout(graph, 520, heights, labelsFor(graph));
  const cards = layout.nodes.map(node => ({ id: node.id, ...node.position, width: layout.nodeWidth, height: heights[node.id] || 132 }));
  assert.equal(layout.nodeWidth, 240);
  verifyLabels(layout.routes, cards); verifyRoutes(layout.routes, cards);
  assert.deepEqual(graph, before); assert.deepEqual(layout.edges, graph.edges);
  assert.ok(layout.routes.flatMap(route => route.points).every(([x, y]) => x >= 0 && x <= layout.layoutWidth && y >= 0 && y <= layout.layoutHeight));
});

test('explicit design layout separates alternatives, places join after both, and changes positions only', () => {
  const graph = { ...support(), nodes: ['collect', 'condition', 'normal', 'urgent', 'join'].map((id, i) => ({ id, kind: 'task', title: id, position: { x: i * 300 + 40, y: 80 }, sample_outputs: { report: 'kept' } })), edges: [['collect', 'condition'], ['condition', 'normal'], ['condition', 'urgent'], ['normal', 'join'], ['urgent', 'join']].map(([from, to], i) => ({ id: 'e' + i, from, to, outcome: i === 2 ? 'urgente' : 'done', mapping: {} })) };
  const before = structuredClone(graph), layout = designLayout(graph), cards = layout.nodes.map(node => ({ id: node.id, ...node.position, width: 240, height: 132 }));
  const node = id => layout.nodes.find(node => node.id === id);
  assert.equal(node('normal').position.x, node('urgent').position.x);
  assert.notEqual(node('normal').position.y, node('urgent').position.y);
  assert.ok(node('join').position.x > node('urgent').position.x);
  verifyLabels(designRoutes(layout, {}, labelsFor(graph)), cards);
  verifyRoutes(designRoutes(layout, {}, labelsFor(graph)), cards);
  assert.deepEqual(designLayout(layout), layout); assert.deepEqual(graph, before);
  assert.deepEqual(layout.nodes.map(({ position, ...node }) => node), graph.nodes.map(({ position, ...node }) => node));
  assert.strictEqual(layout.edges, graph.edges); assert.strictEqual(layout.parameters, graph.parameters);
});

test('a branch in the saved single-line drawing goes around the intervening card without changing positions', () => {
  const graph = { nodes: ['condition', 'normal', 'urgent'].map((id, i) => ({ id, position: { x: 40 + i * 300, y: 80 } })), edges: [{ id: 'urgent', from: 'condition', to: 'urgent', outcome: 'urgente' }] };
  const before = structuredClone(graph), routes = designRoutes(graph, {}, { urgent: 'urgente' });
  const cards = graph.nodes.map(node => ({ id: node.id, ...node.position, width: 240, height: 132 }));
  verifyLabels(routes, cards); verifyRoutes(routes, cards); assert.deepEqual(graph, before);
});

test('long branch names wrap in the allocated band and malformed drafts remain inspectable', () => {
  const graph = { nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], edges: [{ id: 'long', from: 'a', to: 'b' }, { id: 'missing', from: 'absent', to: 'c' }] };
  const text = 'Attendre la réception des informations complémentaires avant de poursuivre';
  const layout = executionLayout(graph, 400, {}, { long: text });
  assert.equal(layout.routes[0].label.lines.join(' '), text);
  assert.ok(layout.routes[0].label.lines.length > 1);
  verifyLabels(layout.routes, layout.nodes.map(node => ({ ...node.position, width: layout.nodeWidth, height: 132 })));
  graph.edges.push({ id: 'back', from: 'b', to: 'a' });
  assert.ok(executionLayout(graph).nodes.every(node => Number.isFinite(node.position.y)));
});
