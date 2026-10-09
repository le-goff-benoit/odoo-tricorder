// Read-only presentation of the graph: following a workflow does not move its
// saved blocks. Top-to-bottom ranks keep adjacent steps legible beside a terminal.
export function executionLayout(graph, availableWidth = 600) {
  const ids = new Set(graph.nodes.map(n => n.id));
  const incoming = new Map(graph.nodes.map(n => [n.id, 0]));
  const children = new Map(graph.nodes.map(n => [n.id, []]));
  for (const edge of graph.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to)) continue;
    incoming.set(edge.to, incoming.get(edge.to) + 1);
    children.get(edge.from).push(edge.to);
  }
  const queue = graph.nodes.filter(n => !incoming.get(n.id)).map(n => n.id);
  const ranks = new Map(queue.map(id => [id, 0]));
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const child of children.get(id)) {
      ranks.set(child, Math.max(ranks.get(child) || 0, ranks.get(id) + 1));
      incoming.set(child, incoming.get(child) - 1);
      if (!incoming.get(child)) queue.push(child);
    }
  }
  // A malformed or cyclic graph still remains inspectable; layout never edits it.
  let remainder = Math.max(0, ...ranks.values()) + 1;
  for (const n of graph.nodes) if (!queue.includes(n.id)) ranks.set(n.id, remainder++);
  const rows = new Map();
  for (const n of graph.nodes) { const rank = ranks.get(n.id); if (!rows.has(rank)) rows.set(rank, []); rows.get(rank).push(n.id); }
  const lanes = Math.max(1, ...[...rows.values()].map(row => row.length));
  const nodeWidth = Math.max(180, Math.min(260, (availableWidth - 48 - (lanes - 1) * 32) / lanes));
  const width = Math.max(availableWidth, nodeWidth + 48, lanes * (nodeWidth + 32) + 16);
  return { ...graph, nodeWidth, layoutWidth: width, nodes: graph.nodes.map(n => {
    const rank = ranks.get(n.id), row = rows.get(rank), index = row.indexOf(n.id);
    return { ...n, position: { x: (width - row.length * nodeWidth - (row.length - 1) * 32) / 2 + index * (nodeWidth + 32), y: 28 + rank * 164 } };
  }) };
}
