const { test } = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../src/editor-gestures.mjs');
test('drag threshold uses screen pixels and displacement uses graph scale, with bounded coordinates', async () => {
  const { movedEnough, dragPosition } = await modulePromise;
  assert.equal(movedEnough({ x: 0, y: 0 }, { x: 3, y: 3 }), false);
  assert.equal(movedEnough({ x: 0, y: 0 }, { x: 3, y: 4 }), true);
  for (const zoom of [.5, 1, 1.5]) assert.deepEqual(dragPosition({ x: 40, y: 60 }, { x: 0, y: 0 }, { x: 150, y: 75 }, zoom), { x: 40 + 150 / zoom, y: 60 + 75 / zoom });
  assert.deepEqual(dragPosition({ x: 0, y: 99999 }, { x: 0, y: 0 }, { x: -100, y: 100 }, 1), { x: 0, y: 100000 });
});
test('zoom preserves the logical viewport center, including deep scroll', async () => {
  const { zoomScroll } = await modulePromise;
  const viewport = { left: 1400, top: 850, width: 600, height: 500 }, after = zoomScroll(viewport, 1, 1.5);
  assert.equal((after.left + 300) / 1.5, viewport.left + 300);
  assert.equal((after.top + 250) / 1.5, viewport.top + 250);
});
test('new items stay visible even when the selection is far away, and avoid nearby cards when possible', async () => {
  const { placement } = await modulePromise;
  const viewport = { left: 1500, top: 900, width: 1000, height: 800 };
  const point = placement(viewport, 1, { x: 0, y: 0, width: 240, height: 132 }, []);
  assert.deepEqual(point, { x: 1880, y: 1234 });
  const next = placement(viewport, 1, { ...point, width: 240, height: 132 }, [{ ...point, width: 240, height: 132 }]);
  assert.ok(next.x >= 1500 && next.x + 240 <= 2500 && next.y >= 900 && next.y + 132 <= 1700);
  assert.ok(next.x >= point.x + 240 || next.y >= point.y + 132 || next.y + 132 <= point.y);
});
test('a dense visible grid finds nearby empty space instead of covering another block', async () => {
  const { placement } = await modulePromise;
  const occupied = Array.from({ length: 80 }, (_, i) => ({ x: 60 + i % 10 * 330, y: 60 + Math.floor(i / 10) * 220, width: 240, height: 132 }));
  const added = placement({ left: 1700, top: 850, width: 1000, height: 650 }, 1, null, occupied, { width: 280, height: 180 });
  assert.ok(occupied.every(box => added.x >= box.x + box.width || added.x + 280 <= box.x || added.y >= box.y + box.height || added.y + 180 <= box.y));
});

test('fit uses the true content bounds and fits both dimensions without moving saved coordinates',async()=>{const {fitViewport}=await import('../src/editor-gestures.mjs');const boxes=[{x:400,y:50,width:260,height:300},{x:400,y:450,width:260,height:450}];const fit=fitViewport(boxes,{width:380,height:450});assert.ok(fit.zoom<1);assert.ok(900*fit.zoom-fit.top<=450);assert.ok(400*fit.zoom-fit.left>=0);assert.ok(660*fit.zoom-fit.left<=380);});
