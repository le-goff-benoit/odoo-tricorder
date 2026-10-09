import { dagRanks, edgeLabelBox, polylinePath } from './design-layout.mjs';

// Read-only presentation: following a workflow never moves its saved blocks.
// Rank bands reserve space for labels, including paths that skip several rows.
export function executionLayout(graph, availableWidth = 600, heights = {}, labels = {}) {
  const ranks = dagRanks(graph), rows = new Map();
  for (const node of graph.nodes) {
    const rank = ranks.get(node.id);
    if (!rows.has(rank)) rows.set(rank, []);
    rows.get(rank).push(node);
  }
  const lanes = Math.max(1, ...[...rows.values()].map(row => row.length));
  const nodeWidth = Math.max(240, Math.min(260, (availableWidth - 48 - (lanes - 1) * 32) / lanes));
  const contentWidth = Math.max(availableWidth, lanes * nodeWidth + (lanes - 1) * 32 + 48);
  const positions = new Map(), tracks = new Map(), rowBottoms = new Map();
  let y = 28;
  for (const [rank, row] of [...rows].sort(([a], [b]) => a - b)) {
    const incoming = graph.edges.filter(edge => ranks.get(edge.to) === rank && ranks.has(edge.from));
    const slots = new Map(), levels = [];
    for (const edge of incoming) {
      const level = slots.get(edge.to) || 0;
      slots.set(edge.to, level + 1);
      (levels[level] ||= []).push(edge);
    }
    // Different destination columns can share a band. Multiple labels entering
    // the same card get separate tracks, without stretching every other branch.
    for (const level of levels) {
      y += Math.max(...level.map(edge => edgeLabelBox(labels[edge.id]).height)) + 12;
      for (const edge of level) tracks.set(edge, y);
    }
    if (incoming.length) y += 22;
    row.forEach((node, i) => positions.set(node.id, { x: (contentWidth - row.length * nodeWidth - (row.length - 1) * 32) / 2 + i * (nodeWidth + 32), y }));
    rowBottoms.set(rank, y + Math.max(132, ...row.map(node => heights[node.id] || 132)));
    y = rowBottoms.get(rank) + 24;
  }
  const nodes = graph.nodes.map(node => ({ ...node, position: positions.get(node.id) }));
  let gutter = contentWidth - 16;
  const routes = graph.edges.flatMap(edge => {
    const from = positions.get(edge.from), to = positions.get(edge.to);
    if (!from || !to) return [];
    const start = [from.x + nodeWidth / 2, from.y + (heights[edge.from] || 132)], end = [to.x + nodeWidth / 2, to.y];
    const track = tracks.get(edge), label = edgeLabelBox(labels[edge.id]);
    let points;
    if (ranks.get(edge.to) === ranks.get(edge.from) + 1) points = [start, [start[0], track], [end[0], track], end];
    else {
      gutter += 20;
      const exitY = rowBottoms.get(ranks.get(edge.from)) + 14;
      points = [start, [start[0], exitY], [gutter, exitY], [gutter, track], [end[0], track], end];
    }
    return [{ id: edge.id, points, path: polylinePath(points), label: { x: end[0] - label.width / 2, y: track - label.height - 4, ...label } }];
  });
  return { ...graph, nodeWidth, layoutWidth: Math.max(contentWidth, gutter + 16), layoutHeight: y, nodes, routes };
}
