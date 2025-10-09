// utils/drawingUtils.js
export const approxEqual = (a, b, tol = 5) => Math.abs(a - b) < tol; // Tolerance based on gridSize/thickness

export const pointsEqual = (p1, p2, tol = 5) => {
  return approxEqual(p1[0], p2[0], tol) && approxEqual(p1[1], p2[1], tol);
};

export const buildGraph = (walls) => {
  const graph = new Map();
  const pointToId = new Map();
  const endpoints = new Map();
  let idCounter = 0;

  walls.forEach((wall) => {
    if (wall.points.length !== 4) return; // Walls are lines with 2 points
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
    graph.get(p2Id).push([p1Id, wall]); // Undirected
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

export const detectRooms = (walls) => {
  const { graph, endpoints } = buildGraph(walls);
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