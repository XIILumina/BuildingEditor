import { useState, useCallback } from 'react';
import { num } from '../utils/shapeUtils';
import { isPointInPolygon } from '../utils/drawingUtils';

/**
 * useDrawing — manages current stroke state and erase-at-point logic.
 */
export function useDrawing({
  tool,
  strokes,
  setStrokes,
  shapes,
  setShapes,
  setSelectedId,
  activeLayerId,
  snapToGrid,
  gridSize,
  drawColor,
  thickness,
  material,
}) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);

  const isSameLayer = (lid) => Number(lid) === Number(activeLayerId);

  const distToSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  const eraseAtPoint = useCallback((world) => {
    const hitStrokeIds = strokes
      .filter((st) => isSameLayer(st.layer_id))
      .filter((st) => {
        for (let i = 0; i < st.points.length - 2; i += 2) {
          if (distToSegment(world.x, world.y, st.points[i], st.points[i + 1], st.points[i + 2], st.points[i + 3]) <= thickness / 2)
            return true;
        }
        return false;
      })
      .map((st) => st.id);

    if (hitStrokeIds.length > 0) {
      setStrokes((prev) => prev.filter((st) => !hitStrokeIds.includes(st.id)));
      setSelectedId(null);
    }

    const hitShapeIds = shapes
      .filter((sh) => isSameLayer(sh.layer_id) && !(sh.locked || sh.anchoredBlockId))
      .filter((sh) => {
        if (sh.type === 'rect') return world.x >= sh.x && world.x <= sh.x + sh.width && world.y >= sh.y && world.y <= sh.y + sh.height;
        if (sh.type === 'circle') return Math.hypot(world.x - sh.x, world.y - sh.y) <= sh.radius;
        if (sh.type === 'oval') {
          const rx = sh.radiusX || 0, ry = sh.radiusY || 0;
          if (rx <= 0 || ry <= 0) return false;
          return ((world.x - sh.x) / rx) ** 2 + ((world.y - sh.y) / ry) ** 2 <= 1;
        }
        if (sh.type === 'polygon' && Array.isArray(sh.points)) {
          const offX = num(sh.x), offY = num(sh.y);
          const pairs = [];
          for (let i = 0; i < sh.points.length; i += 2)
            pairs.push([sh.points[i] + offX, sh.points[i + 1] + offY]);
          return pairs.length >= 3 && isPointInPolygon([world.x, world.y], pairs);
        }
        return false;
      })
      .map((sh) => sh.id);

    if (hitShapeIds.length > 0) {
      setShapes((prev) => prev.filter((sh) => !hitShapeIds.includes(sh.id)));
      setSelectedId(null);
    }
  }, [strokes, shapes, activeLayerId, thickness, setStrokes, setShapes, setSelectedId]);

  const startStroke = useCallback((pos) => {
    setIsDrawing(true);
    setCurrentStroke({
      points: [pos.x, pos.y],
      color: drawColor,
      thickness,
      isEraser: false,
    });
  }, [drawColor, thickness, tool]);

  const continueStroke = useCallback((pos, snapPositions, setGuides) => {
    setCurrentStroke((prev) => {
      if (!prev) return prev;
      let newPoints = [...prev.points];
      if (tool === 'wall') {
        const threshold = 5;
        let newGuides = [], snappedX = pos.x, snappedY = pos.y;
        let minDistV = Infinity, bestSv = null;
        for (const sv of snapPositions.vertical) {
          const d = Math.abs(sv - pos.x);
          if (d < threshold && d < minDistV) { minDistV = d; bestSv = sv; }
        }
        if (bestSv !== null) { snappedX = bestSv; newGuides.push({ orientation: 'V', position: bestSv }); }
        let minDistH = Infinity, bestSh = null;
        for (const sh of snapPositions.horizontal) {
          const d = Math.abs(sh - pos.y);
          if (d < threshold && d < minDistH) { minDistH = d; bestSh = sh; }
        }
        if (bestSh !== null) { snappedY = bestSh; newGuides.push({ orientation: 'H', position: bestSh }); }
        setGuides(newGuides);
        newPoints = [newPoints[0], newPoints[1], snappedX, snappedY];
      } else {
        newPoints = [...newPoints, pos.x, pos.y];
      }
      return { ...prev, points: newPoints };
    });
  }, [tool]);

  const commitStroke = useCallback((pos) => {
    setCurrentStroke((prev) => {
      if (!prev) return prev;
      let points = [...prev.points];
      if (snapToGrid && pos) {
        const snappedX = Math.round(pos.x / gridSize) * gridSize;
        const snappedY = Math.round(pos.y / gridSize) * gridSize;
        points = tool === 'wall'
          ? [points[0], points[1], snappedX, snappedY]
          : [...points.slice(0, -2), snappedX, snappedY];
      }
      if (points.length >= 4) {
        setStrokes((all) => [...all, {
          id: Date.now(),
          points,
          x: 0,
          y: 0,
          layer_id: activeLayerId,
          color: prev.color,
          thickness: prev.thickness,
          isEraser: prev.isEraser,
          material,
        }]);
      }
      return null;
    });
    setIsDrawing(false);
  }, [snapToGrid, gridSize, tool, activeLayerId, material, setStrokes]);

  return {
    isDrawing,
    setIsDrawing,
    currentStroke,
    setCurrentStroke,
    eraseAtPoint,
    startStroke,
    continueStroke,
    commitStroke,
  };
}
