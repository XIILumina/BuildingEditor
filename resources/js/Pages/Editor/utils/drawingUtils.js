// utils/drawingUtils.js
export const approxEqual = (a, b, tol = 5) => Math.abs(a - b) < tol; // Tolerance based on gridSize/thickness

export const pointsEqual = (p1, p2, tol = 5) => {
  return approxEqual(p1[0], p2[0], tol) && approxEqual(p1[1], p2[1], tol);
};

export const buildGraph = (walls, extraPoints = []) => {
  const graph = new Map();
  const pointToId = new Map();
  const endpoints = new Map();
  let idCounter = 0;

  // Add all endpoints from walls
  walls.forEach((wall) => {
    if (wall.points.length !== 4) return;
    const p1 = [wall.points[0], wall.points[1]];
    const p2 = [wall.points[2], wall.points[3]];

    let p1Id = [...endpoints].find(([_, v]) => pointsEqual(v, p1))?.[0];
    if (p1Id === undefined) {
      p1Id = idCounter++;
      endpoints.set(p1Id, p1);
    }

    let p2Id = [...endpoints].find(([_, v]) => pointsEqual(v, p2))?.[0];
    if (p2Id === undefined) {
      p2Id = idCounter++;
      endpoints.set(p2Id, p2);
    }

    if (!graph.has(p1Id)) graph.set(p1Id, []);
    if (!graph.has(p2Id)) graph.set(p2Id, []);
    graph.get(p1Id).push([p2Id, wall]);
    graph.get(p2Id).push([p1Id, wall]);
  });

  // Add intersection points as endpoints
  extraPoints.forEach((pt) => {
    let ptId = [...endpoints].find(([_, v]) => pointsEqual(v, pt))?.[0];
    if (ptId === undefined) {
      ptId = idCounter++;
      endpoints.set(ptId, pt);
      graph.set(ptId, []);
    }
  });

  return { graph, endpoints };
};

const findCycles = (graph, start, visited, path, cycles) => {
  visited.add(start);
  path.push(start);

  graph.get(start)?.forEach(([neighbor]) => {
    if (!visited.has(neighbor)) {
      findCycles(graph, neighbor, new Set(visited), [...path], cycles);
    } else if (neighbor === path[0] && path.length > 2) {
      cycles.push([...path, neighbor]);
    }
  });

  path.pop();
};

export const detectRooms = (walls, extraPoints = []) => {
  const { graph, endpoints } = buildGraph(walls, extraPoints);
  const allCycles = [];
  const visited = new Set();

  [...graph.keys()].forEach((node) => {
    if (!visited.has(node)) {
      const cycles = [];
      findCycles(graph, node, new Set(), [], cycles);
      allCycles.push(...cycles);
    }
  });

  // Deduplicate cycles
  const uniqueCycles = [];
  allCycles.forEach((cycle) => {
    const cycleSet = new Set(cycle);
    if (!uniqueCycles.some((c) => {
      if (c.length !== cycle.length) return false;
      return [...cycleSet].every((n) => c.includes(n));
    })) {
      uniqueCycles.push(cycle);
    }
  });

  const rooms = uniqueCycles.map((cycle) => {
    return cycle.slice(0, -1).map((node) => endpoints.get(node)); // Remove duplicate last point
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
  const points = [];
  for (let i = 0; i < lines.length; i++) {
    const [x1, y1, x2, y2] = lines[i].points;
    for (let j = i + 1; j < lines.length; j++) {
      const [x3, y3, x4, y4] = lines[j].points;
      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (denom === 0) continue; // Parallel
      const px = ((x1*y2 - y1*x2)*(x3 - x4) - (x1 - x2)*(x3*y4 - y3*x4)) / denom;
      const py = ((x1*y2 - y1*x2)*(y3 - y4) - (y1 - y2)*(x3*y4 - y3*x4)) / denom;
      // Check if intersection is within both segments
      if (
        Math.min(x1, x2) <= px && px <= Math.max(x1, x2) &&
        Math.min(y1, y2) <= py && py <= Math.max(y1, y2) &&
        Math.min(x3, x4) <= px && px <= Math.max(x3, x4) &&
        Math.min(y3, y4) <= py && py <= Math.max(y3, y4)
      ) {
        points.push([px, py]);
      }
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