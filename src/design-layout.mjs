// Presentation helpers only. No contract, edge or execution state is changed.
export function dagRanks(graph) {
  const incoming = new Map(graph.nodes.map(node => [node.id, 0]));
  const children = new Map(graph.nodes.map(node => [node.id, []]));
  for (const edge of graph.edges) {
    if (!incoming.has(edge.from) || !incoming.has(edge.to)) continue;
    incoming.set(edge.to, incoming.get(edge.to) + 1);
    children.get(edge.from).push(edge.to);
  }
  const queue = graph.nodes.filter(node => !incoming.get(node.id)).map(node => node.id);
  const ranks = new Map(queue.map(id => [id, 0]));
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const child of children.get(id)) {
      ranks.set(child, Math.max(ranks.get(child) || 0, ranks.get(id) + 1));
      incoming.set(child, incoming.get(child) - 1);
      if (!incoming.get(child)) queue.push(child);
    }
  }
  // Invalid/cyclic drafts must still be inspectable without repairing their data.
  const visited = new Set(queue);
  let remainder = Math.max(0, ...ranks.values()) + 1;
  for (const node of graph.nodes) if (!visited.has(node.id)) ranks.set(node.id, remainder++);
  return ranks;
}

export function designLayout(graph, heights = {}) {
  const ranks = dagRanks(graph), columns = new Map();
  for (const node of graph.nodes) {
    const rank = ranks.get(node.id);
    if (!columns.has(rank)) columns.set(rank, []);
    columns.get(rank).push(node);
  }
  const height = nodes => nodes.reduce((sum, node) => sum + (heights[node.id] || 132) + 80, -80);
  const total = Math.max(0, ...[...columns.values()].map(height));
  const positions = new Map();
  for (const [rank, nodes] of columns) {
    let y = 48 + (total - height(nodes)) / 2;
    for (const node of nodes) {
      positions.set(node.id, { x: 32 + rank * 420, y });
      y += (heights[node.id] || 132) + 80;
    }
  }
  return { ...graph, nodes: graph.nodes.map(node => ({ ...node, position: positions.get(node.id) })) };
}

export function rectanglesOverlap(a, b, padding = 0) {
  return a.x < b.x + b.width + padding && a.x + a.width + padding > b.x && a.y < b.y + b.height + padding && a.y + a.height + padding > b.y;
}
export function polylinePath(points) { return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' '); }
export function edgeLabelBox(text = '') {
  const words = String(text).split(/\s+/), lines = [];
  let line = '';
  for (const word of words) {
    // Also wrap user supplied outcomes without spaces.
    for (let offset = 0; offset < word.length || !offset; offset += 24) {
      const part = word.slice(offset, offset + 24);
      if (line && (line + ' ' + part).length > 24) { lines.push(line); line = ''; }
      line += (line ? ' ' : '') + part;
    }
  }
  if (line) lines.push(line);
  return { lines, width: Math.max(28, ...lines.map(value => value.length * 7 + 12)), height: Math.max(24, lines.length * 16 + 8) };
}
function intersectsCard(points, card) {
  return points.slice(1).some((point, i) => {
    const previous = points[i];
    return rectanglesOverlap({ x: Math.min(previous[0], point[0]), y: Math.min(previous[1], point[1]), width: Math.max(1, Math.abs(point[0] - previous[0])), height: Math.max(1, Math.abs(point[1] - previous[1])) }, card, 3);
  });
}

export function designRoutes(graph, heights = {}, labels = {}) {
  const cards = new Map(graph.nodes.map((node, i) => [node.id, { ...(node.position || { x: 50 + i % 4 * 300, y: 60 + Math.floor(i / 4) * 180 }), width: 240, height: heights[node.id] || 132 }]));
  let bottom = Math.max(0, ...[...cards.values()].map(card => card.y + card.height)) + 48;
  const placed = [];
  return graph.edges.flatMap(edge => {
    const from = cards.get(edge.from), to = cards.get(edge.to);
    if (!from || !to) return [];
    const start = [from.x + from.width, from.y + 58], end = [to.x, to.y + 58];
    const middle = (start[0] + end[0]) / 2;
    const label = edgeLabelBox(labels[edge.id]);
    let points = [start, [middle, start[1]], [middle, end[1]], end];
    const obstacles = [...cards.entries()].filter(([id]) => id !== edge.from && id !== edge.to).map(([, card]) => card);
    let x = middle - label.width / 2, y = (start[1] + end[1]) / 2 - label.height - 6;
    const obstructed = () => [...cards.values(), ...placed].some(card => rectanglesOverlap({ x, y, ...label }, card, 5));
    // Long edges on an old, manually drawn line go around intervening cards.
    // Labels have their own lane if a join would otherwise stack them.
    if (end[0] - start[0] < label.width + 24 || obstacles.some(card => intersectsCard(points, card)) || obstructed()) {
      const lane = bottom + label.height;
      points = [start, [start[0] + 18, start[1]], [start[0] + 18, lane], [end[0] - 18, lane], [end[0] - 18, end[1]], end];
      x = Math.max(12, (start[0] + end[0]) / 2 - label.width / 2); y = lane - label.height - 6;
      bottom = lane + 38;
    }
    const box = { x, y, ...label }; placed.push(box);
    return [{ id: edge.id, points, path: polylinePath(points), label: box }];
  });
}
