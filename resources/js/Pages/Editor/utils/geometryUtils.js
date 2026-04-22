import { num } from './shapeUtils';
import { isPointInPolygon } from './drawingUtils';

/**
 * convexHull — returns the convex hull of a set of [x,y] points (Graham scan).
 */
export function convexHull(points) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/**
 * shapeToPoints — extract corner/sample points from a shape as [[x,y], ...].
 */
export function shapeToPoints(sh) {
  if (sh.type === 'rect') {
    const x = num(sh.x), y = num(sh.y), w = num(sh.width, 80), h = num(sh.height, 60);
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  }
  if (sh.type === 'polygon' && Array.isArray(sh.points)) {
    const offX = num(sh.x), offY = num(sh.y);
    const pts = [];
    for (let i = 0; i < sh.points.length; i += 2)
      pts.push([sh.points[i] + offX, sh.points[i + 1] + offY]);
    return pts;
  }
  if (sh.type === 'circle') {
    const cx = num(sh.x), cy = num(sh.y), r = num(sh.radius, 40);
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
    });
  }
  if (sh.type === 'oval') {
    const cx = num(sh.x), cy = num(sh.y), rx = num(sh.radiusX, 40), ry = num(sh.radiusY, 30);
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
    });
  }
  return [];
}

/**
 * mergeShapes — merge multiple shapes into a single polygon using convex hull of all their points.
 * Returns a new polygon shape object.
 */
export function mergeShapes(selectedShapes, newId, layerId) {
  const allPoints = selectedShapes.flatMap(shapeToPoints);
  if (allPoints.length < 3) return null;
  const hull = convexHull(allPoints);
  const points = hull.flat();
  // Bounding box for fill color fallback
  const fill = selectedShapes[0]?.fill || selectedShapes[0]?.color || '#9CA3AF';
  return {
    id: newId,
    type: 'polygon',
    points,
    x: 0,
    y: 0,
    rotation: 0,
    fill,
    color: fill,
    closed: true,
    layer_id: layerId,
  };
}
