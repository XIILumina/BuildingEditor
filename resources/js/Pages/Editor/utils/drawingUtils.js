export function makeAnchorBlock(objects) {
  if (!objects || objects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  objects.forEach(obj => {
    if (obj.type === 'stroke') {
      for (let i = 0; i < obj.points.length; i += 2) {
        const x = obj.points[i] + (obj.x || 0);
        const y = obj.points[i + 1] + (obj.y || 0);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    } else if (obj.type === 'rect') {
      const x = obj.x || 0;
      const y = obj.y || 0;
      const width = obj.width || 0;
      const height = obj.height || 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + width);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + height);
    } else if (obj.type === 'oval') {
      const x = obj.x || 0;
      const y = obj.y || 0;
      const rx = obj.radiusX || 0;
      const ry = obj.radiusY || 0;
      minX = Math.min(minX, x - rx);
      maxX = Math.max(maxX, x + rx);
      minY = Math.min(minY, y - ry);
      maxY = Math.max(maxY, y + ry);
    } else if (obj.type === 'triangle' || obj.type === 'polygon') {
      const points = obj.points || [];
      for (let i = 0; i < points.length; i += 2) {
        const x = points[i] + (obj.x || 0);
        const y = points[i + 1] + (obj.y || 0);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    } else if (obj.type === 'path') {
      const points = obj.points || [];
      for (let i = 0; i < points.length; i += 2) {
        const x = points[i] + (obj.x || 0);
        const y = points[i + 1] + (obj.y || 0);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const x = minX;
  const y = minY;

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
    rotation: objects[0]?.rotation || 0,
  };
}

export function getLineIntersections(walls) {
  const intersections = [];
  for (let i = 0; i < walls.length; i++) {
    for (let j = i + 1; j < walls.length; j++) {
      const wall1 = walls[i];
      const wall2 = walls[j];
      if (!wall1.points || !wall2.points || wall1.points.length < 4 || wall2.points.length < 4) {
        continue;
      }
      const x1 = wall1.points[0];
      const y1 = wall1.points[1];
      const x2 = wall1.points[2];
      const y2 = wall1.points[3];
      const x3 = wall2.points[0];
      const y3 = wall2.points[1];
      const x4 = wall2.points[2];
      const y4 = wall2.points[3];

      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (denom === 0) continue;

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
        const px = x1 + t * (x2 - x1);
        const py = y1 + t * (y2 - y1);
        intersections.push([px, py]);
      }
    }
  }
  return intersections;
}

export function pointsEqual(a, b, epsilon = 0.001) {
  return Math.abs(a[0] - b[0]) < epsilon && Math.abs(a[1] - b[1]) < epsilon;
}

export function isPointInPolygon(point, polyPoints) {
  if (!polyPoints || polyPoints.length < 6) return false;
  let inside = false;
  const x = point[0];
  const y = point[1];
  for (let i = 0, j = polyPoints.length - 2; i < polyPoints.length; i += 2) {
    const xi = polyPoints[i];
    const yi = polyPoints[i + 1];
    const xj = polyPoints[j];
    const yj = polyPoints[j + 1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi + 0.0000001) + xi);
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

export function detectRooms(walls, allPoints) {
  const edges = [];
  const graph = new Map();
  allPoints.forEach(p => graph.set(p.toString(), []));

  walls.forEach(wall => {
    if (!wall.points || wall.points.length < 4) return;
    const p1 = [wall.points[0], wall.points[1]];
    const p2 = [wall.points[2], wall.points[3]];
    edges.push([p1, p2]);
    graph.get(p1.toString()).push(p2);
    graph.get(p2.toString()).push(p1);
  });

  const visited = new Set();
  const rooms = [];

  const findCycle = (start, current, prev, path) => {
    const currentStr = current.toString();
    if (visited.has(currentStr)) {
      const cycleStartIdx = path.findIndex(p => pointsEqual(p, current));
      if (cycleStartIdx !== -1) {
        const cycle = path.slice(cycleStartIdx);
        if (cycle.length >= 3) {
          rooms.push(cycle);
        }
      }
      return;
    }

    visited.add(currentStr);
    const neighbors = graph.get(currentStr) || [];
    for (const next of neighbors) {
      if (!prev || !pointsEqual(next, prev)) {
        findCycle(start, next, current, [...path, next]);
      }
    }
    visited.delete(currentStr);
  };

  for (const point of allPoints) {
    findCycle(point, point, null, [point]);
  }

  return { rooms };
}