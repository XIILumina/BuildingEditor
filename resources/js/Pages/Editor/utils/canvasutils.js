export function getMousePos(stage, forceSnap = false, gridSize = 20, snapToGrid = true) {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  let point = transform.point(pointer);

  if (snapToGrid && forceSnap) {
    // DEBUG helper (remove when verified)
    // console.debug('getMousePos: snapping to grid', gridSize, 'raw', point);
    point.x = Math.round(point.x / gridSize) * gridSize;
    point.y = Math.round(point.y / gridSize) * gridSize;
  }
  return point;
}

export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - ax, py - ay);
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

export function getSnapPositions(strokes, shapes) {
  const snaps = { vertical: new Set(), horizontal: new Set() };

  shapes.forEach((sh) => {
    if (sh.type === "rect") {
      const w = sh.width || 80;
      const h = sh.height || 60;
      snaps.vertical.add(sh.x);
      snaps.vertical.add(sh.x + w / 2);
      snaps.vertical.add(sh.x + w);
      snaps.horizontal.add(sh.y);
      snaps.horizontal.add(sh.y + h / 2);
      snaps.horizontal.add(sh.y + h);
    } else if (sh.type === "circle") {
      const r = sh.radius || 40;
      snaps.vertical.add(sh.x - r);
      snaps.vertical.add(sh.x);
      snaps.vertical.add(sh.x + r);
      snaps.horizontal.add(sh.y - r);
      snaps.horizontal.add(sh.y);
      snaps.horizontal.add(sh.y + r);
    } else if (sh.type === "path") {
      for (let i = 0; i < sh.points.length; i += 2) {
        snaps.vertical.add(sh.points[i]);
        snaps.horizontal.add(sh.points[i + 1]);
      }
    }
  });

  strokes.forEach((st) => {
    for (let i = 0; i < st.points.length; i += 2) {
      snaps.vertical.add(st.points[i]);
      snaps.horizontal.add(st.points[i + 1]);
    }
    if (st.isWall) {
      for (let i = 0; i < st.points.length - 2; i += 2) {
        const midX = (st.points[i] + st.points[i + 2]) / 2;
        const midY = (st.points[i + 1] + st.points[i + 3]) / 2;
        snaps.vertical.add(midX);
        snaps.horizontal.add(midY);
      }
    }
  });

  return snaps;
}