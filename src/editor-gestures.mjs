// Pure geometry for editor gestures. Screen pixels and graph coordinates are
// intentionally separate: zoom must not change how far a gesture travels.
export const DRAG_THRESHOLD = 5;
export function movedEnough(origin, pointer) {
  return Math.hypot(pointer.x - origin.x, pointer.y - origin.y) >= DRAG_THRESHOLD;
}
export function dragPosition(position, origin, pointer, zoom) {
  const bound = value => Math.max(0, Math.min(100000, Math.round(value)));
  return { x: bound(position.x + (pointer.x - origin.x) / zoom), y: bound(position.y + (pointer.y - origin.y) / zoom) };
}
export function zoomScroll(viewport, previous, next) {
  return { left: Math.max(0, (viewport.left + viewport.width / 2) / previous * next - viewport.width / 2),
    top: Math.max(0, (viewport.top + viewport.height / 2) / previous * next - viewport.height / 2) };
}
export function placement(viewport, zoom, selected, occupied, size = { width: 240, height: 132 }) {
  const visible = { x: viewport.left / zoom, y: viewport.top / zoom, width: viewport.width / zoom, height: viewport.height / zoom };
  const intersects = (a, b, gap = 0) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
  const clamp = (value, origin, extent, length) => Math.max(0, Math.round(Math.max(origin + 16, Math.min(value, origin + extent - length - 16))));
  const center = { x: visible.x + (visible.width - size.width) / 2, y: visible.y + (visible.height - size.height) / 2 };
  const near = selected && intersects(selected, visible) ? { x: selected.x + selected.width + 64, y: selected.y } : center;
  const base = { x: clamp(near.x, visible.x, visible.width, size.width), y: clamp(near.y, visible.y, visible.height, size.height) };
  // Search inside the visible area first. If full, use the closest free space
  // around the drawn objects; the caller then reveals it. Never bury the new
  // block or a note's editing handle beneath an existing card.
  const candidates = [base];
  for (let y = visible.y + 16; y + size.height < visible.y + visible.height; y += 40)
    for (let x = visible.x + 16; x + size.width < visible.x + visible.width; x += 40) candidates.push({ x: Math.round(x), y: Math.round(y) });
  candidates.sort((a, b) => Math.hypot(a.x - base.x, a.y - base.y) - Math.hypot(b.x - base.x, b.y - base.y));
  const free = point => !occupied.some(box => intersects({ ...point, ...size }, box, 16));
  const visiblePoint = candidates.find(free);
  if (visiblePoint) return visiblePoint;
  const nearby = occupied.flatMap(box => [
    { x: box.x + box.width + 16, y: base.y }, { x: box.x - size.width - 16, y: base.y },
    { x: base.x, y: box.y + box.height + 16 }, { x: base.x, y: box.y - size.height - 16 },
    { x: box.x + box.width + 16, y: box.y }, { x: box.x - size.width - 16, y: box.y },
    { x: box.x, y: box.y + box.height + 16 }, { x: box.x, y: box.y - size.height - 16 },
  ]).filter(point => point.x >= 0 && point.y >= 0 && point.x <= 100000 && point.y <= 100000);
  nearby.sort((a,b) => Math.hypot(a.x-base.x,a.y-base.y) - Math.hypot(b.x-base.x,b.y-base.y));
  return nearby.find(free) || base;
}

// An explicit overview uses the actual drawn content, not an arbitrary canvas size.
export function fitViewport(boxes, viewport) {
  if(!boxes.length)return {zoom:1,left:0,top:0};
  const left=Math.min(...boxes.map(box=>box.x)),top=Math.min(...boxes.map(box=>box.y));
  const right=Math.max(...boxes.map(box=>box.x+box.width)),bottom=Math.max(...boxes.map(box=>box.y+box.height));
  const zoom=Math.max(.01,Math.min(1,Math.max(40,viewport.width-32)/(right-left+16),Math.max(40,viewport.height-32)/(bottom-top+16)));
  return {zoom,left:Math.max(0,(left+right)/2*zoom-viewport.width/2),top:Math.max(0,(top+bottom)/2*zoom-viewport.height/2)};
}
