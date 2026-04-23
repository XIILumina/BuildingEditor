// utils/drawingUtils.js
export const approxEqual = (a, b, tol = 5) => Math.abs(a - b) < tol; // Tolerance based on gridSize/thickness

export const pointsEqual = (p1, p2, tol = 5) => {
  return approxEqual(p1[0], p2[0], tol) && approxEqual(p1[1], p2[1], tol);
};

const EPS = 1e-6;

const pointKey = (x, y) => `${x.toFixed(4)}|${y.toFixed(4)}`;

const cross2 = (ax, ay, bx, by) => ax * by - ay * bx;

const polygonArea = (poly) => {
  if (!Array.isArray(poly) || poly.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    area += (x1 * y2) - (x2 * y1);
  }
  return area / 2;
};

const normalizeSegments = (input = []) => {
  const out = [];
  input.forEach((item) => {
    if (!item) return;
    if (Array.isArray(item.p1) && Array.isArray(item.p2)) {
      out.push({
        p1: [Number(item.p1[0]), Number(item.p1[1])],
        p2: [Number(item.p2[0]), Number(item.p2[1])],
      });
      return;
    }
    const pts = Array.isArray(item.points) ? item.points : [];
    if (pts.length < 4) return;
    for (let i = 0; i <= pts.length - 4; i += 2) {
      const x1 = Number(pts[i]);
      const y1 = Number(pts[i + 1]);
      const x2 = Number(pts[i + 2]);
      const y2 = Number(pts[i + 3]);
      if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
      if (Math.hypot(x2 - x1, y2 - y1) <= EPS) continue;
      out.push({ p1: [x1, y1], p2: [x2, y2] });
    }
  });
  return out;
};

const intersectionOnSegments = (s1, s2) => {
  const [x1, y1] = s1.p1;
  const [x2, y2] = s1.p2;
  const [x3, y3] = s2.p1;
  const [x4, y4] = s2.p2;
  const rX = x2 - x1;
  const rY = y2 - y1;
  const sX = x4 - x3;
  const sY = y4 - y3;
  const denom = cross2(rX, rY, sX, sY);
  if (Math.abs(denom) < EPS) return null;

  const qmpX = x3 - x1;
  const qmpY = y3 - y1;
  const t = cross2(qmpX, qmpY, sX, sY) / denom;
  const u = cross2(qmpX, qmpY, rX, rY) / denom;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;

  return {
    x: x1 + t * rX,
    y: y1 + t * rY,
    t: Math.max(0, Math.min(1, t)),
    u: Math.max(0, Math.min(1, u)),
  };
};

const splitAtIntersections = (segments) => {
  const params = segments.map(() => [0, 1]);
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const hit = intersectionOnSegments(segments[i], segments[j]);
      if (!hit) continue;
      params[i].push(hit.t);
      params[j].push(hit.u);
    }
  }

  const pieces = [];
  segments.forEach((seg, idx) => {
    const [x1, y1] = seg.p1;
    const [x2, y2] = seg.p2;
    const uniq = Array.from(new Set(params[idx].map((v) => Math.round(v * 1e6) / 1e6))).sort((a, b) => a - b);
    for (let i = 0; i < uniq.length - 1; i++) {
      const t1 = uniq[i];
      const t2 = uniq[i + 1];
      if (t2 - t1 <= EPS) continue;
      const ax = x1 + (x2 - x1) * t1;
      const ay = y1 + (y2 - y1) * t1;
      const bx = x1 + (x2 - x1) * t2;
      const by = y1 + (y2 - y1) * t2;
      if (Math.hypot(bx - ax, by - ay) <= EPS) continue;
      pieces.push({ p1: [ax, ay], p2: [bx, by] });
    }
  });
  return pieces;
};

const buildDirectedGraph = (segments) => {
  const nodes = new Map();
  const ensureNode = (pt) => {
    const k = pointKey(pt[0], pt[1]);
    if (!nodes.has(k)) nodes.set(k, { point: [pt[0], pt[1]], out: [] });
    return k;
  };

  segments.forEach((seg) => {
    const a = ensureNode(seg.p1);
    const b = ensureNode(seg.p2);
    const [ax, ay] = nodes.get(a).point;
    const [bx, by] = nodes.get(b).point;
    const abAngle = Math.atan2(by - ay, bx - ax);
    const baAngle = Math.atan2(ay - by, ax - bx);
    nodes.get(a).out.push({ to: b, angle: abAngle });
    nodes.get(b).out.push({ to: a, angle: baAngle });
  });

  nodes.forEach((n) => n.out.sort((e1, e2) => e1.angle - e2.angle));
  return nodes;
};

const walkFaces = (nodes) => {
  const visitedDir = new Set();
  const faces = [];

  const dirKey = (a, b) => `${a}->${b}`;
  const angleNorm = (a) => {
    let x = a;
    while (x < 0) x += Math.PI * 2;
    while (x >= Math.PI * 2) x -= Math.PI * 2;
    return x;
  };

  nodes.forEach((node, startKey) => {
    node.out.forEach((edge) => {
      const startEdgeKey = dirKey(startKey, edge.to);
      if (visitedDir.has(startEdgeKey)) return;

      const face = [];
      let curFrom = startKey;
      let curTo = edge.to;
      let guard = 0;

      while (guard++ < 5000) {
        const k = dirKey(curFrom, curTo);
        if (visitedDir.has(k)) break;
        visitedDir.add(k);

        const p = nodes.get(curFrom)?.point;
        if (!p) break;
        face.push([p[0], p[1]]);

        const atNode = nodes.get(curTo);
        if (!atNode || !atNode.out.length) break;

        const incomingAngle = Math.atan2(
          nodes.get(curFrom).point[1] - atNode.point[1],
          nodes.get(curFrom).point[0] - atNode.point[0],
        );

        let best = null;
        let bestTurn = Infinity;
        atNode.out.forEach((cand) => {
          const turn = angleNorm(cand.angle - incomingAngle);
          if (turn < bestTurn - EPS) {
            bestTurn = turn;
            best = cand;
          }
        });

        if (!best) break;
        const nextFrom = curTo;
        const nextTo = best.to;
        if (nextFrom === startKey && nextTo === edge.to) {
          faces.push(face);
          break;
        }
        curFrom = nextFrom;
        curTo = nextTo;
      }
    });
  });

  return faces;
};

export const detectRooms = (boundaries = [], _extraPoints = []) => {
  const segments = normalizeSegments(boundaries);
  if (!segments.length) return { isRoom: false, rooms: [] };

  const splitSegments = splitAtIntersections(segments);
  if (!splitSegments.length) return { isRoom: false, rooms: [] };

  const nodes = buildDirectedGraph(splitSegments);
  const rawFaces = walkFaces(nodes);

  const seen = new Set();
  const rooms = [];
  rawFaces.forEach((face) => {
    if (!Array.isArray(face) || face.length < 3) return;
    const area = polygonArea(face);
    if (Math.abs(area) < 1) return;
    if (area > 0) return; // skip outer face orientation

    const norm = face.map(([x, y]) => pointKey(x, y)).sort().join('::');
    if (seen.has(norm)) return;
    seen.add(norm);
    rooms.push(face);
  });

  return { isRoom: rooms.length > 0, rooms };
};

// Point-in-polygon (ray casting algorithm)
export const isPointInPolygon = (point, polygon) => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};  
export function getLineIntersections(lines) {
  const segments = normalizeSegments(lines);
  const points = [];
  const uniq = new Set();
  for (let i = 0; i < segments.length; i++) {
    for (let j = i + 1; j < segments.length; j++) {
      const hit = intersectionOnSegments(segments[i], segments[j]);
      if (!hit) continue;
      const k = pointKey(hit.x, hit.y);
      if (uniq.has(k)) continue;
      uniq.add(k);
      points.push([hit.x, hit.y]);
    }
  }
  return points;
}
export function makeAnchorBlock(objects) {
  if (!objects || objects.length === 0) return null;

  let allPoints = [];
  let ids = [];
  objects.forEach(obj => {
    ids.push(obj.id);
    if (obj.type === "rect") {
      allPoints.push([obj.x, obj.y]);
      allPoints.push([obj.x + obj.width, obj.y]);
      allPoints.push([obj.x + obj.width, obj.y + obj.height]);
      allPoints.push([obj.x, obj.y + obj.height]);
    } else if (obj.type === "circle") {
      allPoints.push([obj.x - obj.radius, obj.y - obj.radius]);
      allPoints.push([obj.x + obj.radius, obj.y - obj.radius]);
      allPoints.push([obj.x + obj.radius, obj.y + obj.radius]);
      allPoints.push([obj.x - obj.radius, obj.y + obj.radius]);
    } else if (obj.type === "polygon" && Array.isArray(obj.points)) {
      for (let i = 0; i < obj.points.length; i += 2) {
        allPoints.push([obj.points[i], obj.points[i + 1]]);
      }
    } else if (obj.type === "stroke" && Array.isArray(obj.points)) {
      for (let i = 0; i < obj.points.length; i += 2) {
        allPoints.push([obj.points[i], obj.points[i + 1]]);
      }
    }
  });

  if (allPoints.length === 0) return {
    object_id: ids,
    points: [],
    width: null,
    height: null,
    anchor_x: null,
    anchor_y: null,
  };

  const xs = allPoints.map(p => p[0]);
  const ys = allPoints.map(p => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;
  const anchor_x = minX + width / 2;
  const anchor_y = minY + height / 2;

  return {
    object_id: ids,
    points: allPoints,
    width,
    height,
    anchor_x,
    anchor_y,
  };
}