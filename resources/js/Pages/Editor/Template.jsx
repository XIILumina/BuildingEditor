import React, { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Line, Rect, Transformer, Circle, Path, Ellipse } from "react-konva";
import { detectRooms, isPointInPolygon, pointsEqual, getLineIntersections } from './utils/drawingUtils';

function pointsToPath(points) {
  if (!Array.isArray(points) || points.length < 2) return "";
  const p = points.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  if (p.length < 2) return "";
  let path = `M${p[0]} ${p[1]}`;
  for (let i = 2; i < p.length; i += 2) {
    if (!Number.isFinite(p[i]) || !Number.isFinite(p[i + 1])) continue;
    path += ` L${p[i]} ${p[i + 1]}`;
  }
  path += " Z";
  return path;
}

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function Template({
  tool = "select",
  strokes = [],
  setStrokes,
  erasers = [],
  setErasers,
  shapes = [],
  setShapes,
  setDrawColor,
  drawColor = "#ffffff",
  thickness = 6,
  gridSize = 20,
  material = "Brick",
  selectedId = null,
  setSelectedId,
  activeLayerId,
  snapToGrid = true,
  onSave = () => {},
  previewStrokes = [],
  previewShapes = [],
  mergedBlocks = [],
  onUnmergeBlock = () => {},
  anchoredBlocks = [],
  // Changed from dimInactiveLayers bool to opacity number (0-1)
  inactiveLayerOpacity = 0.3,
}) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const activeLayerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [guides, setGuides] = useState([]);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);

  // --- Point Edit Mode ---
  const [pointEditMode, setPointEditMode] = useState(false);
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [editingPoints, setEditingPoints] = useState([]);
  const [editBtnPos, setEditBtnPos] = useState(null);

  const isSameLayer = (lid) => Number(lid) === Number(activeLayerId);

  const isAnchored = (maybeId) => {
    const id = typeof maybeId === 'number' ? maybeId : parseInt(maybeId, 10);
    if (!Number.isFinite(id)) return false;
    const st = strokes.find(s => s.id === id && isSameLayer(s.layer_id));
    if (st && st.anchoredBlockId) return true;
    const sh = shapes.find(s => s.id === id && isSameLayer(s.layer_id));
    if (sh && sh.anchoredBlockId) return true;
    return anchoredBlocks.some(b => isSameLayer(b.layer_id) && (b.memberIds || []).includes(id));
  };

  // Update edit button position when selection or camera changes
  useEffect(() => {
    const singleId = Array.isArray(selectedId) ? null : selectedId;
    if (!singleId || pointEditMode) {
      setEditBtnPos(null);
      return;
    }
    const sh = shapes.find(s => s.id === singleId);
    // Only show for rect and polygon (not circle/oval)
    if (!sh || sh.type === 'circle' || sh.type === 'oval') {
      setEditBtnPos(null);
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    const node = stage.findOne(`#${singleId}`);
    if (!node) { setEditBtnPos(null); return; }
    try {
      const box = node.getClientRect(); // relative to stage container
      setEditBtnPos({ x: box.x + box.width + 8, y: box.y - 10 });
    } catch {
      setEditBtnPos(null);
    }
  }, [selectedId, camera, shapes, pointEditMode]);

  // Toggle point edit mode
  const togglePointEditMode = () => {
    if (pointEditMode) {
      // Exit mode — points already saved in real time
      setPointEditMode(false);
      setEditingShapeId(null);
      setEditingPoints([]);
      // Re-attach transformer
      const stage = stageRef.current;
      const tr = transformerRef.current;
      if (stage && tr && editingShapeId) {
        const node = stage.findOne(`#${editingShapeId}`);
        if (node) {
          tr.nodes([node]);
          tr.getLayer()?.batchDraw();
        }
      }
    } else {
      const id = Array.isArray(selectedId) ? null : selectedId;
      if (!id) return;
      const sh = shapes.find(s => s.id === id);
      if (!sh || sh.type === 'circle' || sh.type === 'oval') return;

      let pts = [];

      if (sh.type === 'rect') {
        // Convert rect to polygon immediately
        const x = num(sh.x), y = num(sh.y);
        const w = num(sh.width, 100), h = num(sh.height, 60);
        pts = [x, y, x + w, y, x + w, y + h, x, y + h];
        setShapes(prev => prev.map(s =>
          s.id === id
            ? { ...s, type: 'polygon', points: pts, x: 0, y: 0, rotation: 0, fill: s.fill || s.color, closed: true }
            : s
        ));
      } else if (sh.type === 'polygon') {
        const offX = num(sh.x), offY = num(sh.y);
        pts = (sh.points || []).map((p, i) => p + (i % 2 === 0 ? offX : offY));
        // Normalize polygon to x:0 y:0
        setShapes(prev => prev.map(s =>
          s.id === id ? { ...s, points: pts, x: 0, y: 0, rotation: 0 } : s
        ));
      }

      // Detach transformer while editing points
      const tr = transformerRef.current;
      if (tr) tr.nodes([]);

      setEditingPoints(pts);
      setEditingShapeId(id);
      setPointEditMode(true);
    }
  };

  const updateEditingPoint = (idx, x, y) => {
    setEditingPoints(prev => {
      const next = [...prev];
      next[idx * 2] = x;
      next[idx * 2 + 1] = y;
      // Update shape in real time
      setShapes(sh => sh.map(s =>
        s.id === editingShapeId ? { ...s, points: next } : s
      ));
      return next;
    });
  };

  // Exit point edit mode if tool changes or layer changes
  useEffect(() => {
    if (pointEditMode) {
      setPointEditMode(false);
      setEditingShapeId(null);
      setEditingPoints([]);
    }
  }, [activeLayerId, tool]);

  // Clear selection and Transformer when active layer changes
  useEffect(() => {
    setSelectedId(null);
    const tr = transformerRef.current;
    if (tr) tr.nodes([]);
  }, [activeLayerId, setSelectedId]);

  // Sanitize selection
  useEffect(() => {
    const idsInActive = new Set([
      ...strokes.filter((s) => isSameLayer(s.layer_id) && !s.locked && !s.anchoredBlockId).map((s) => s.id),
      ...shapes.filter((sh) => isSameLayer(sh.layer_id) && !sh.locked && !sh.anchoredBlockId).map((sh) => sh.id),
    ]);
    if (Array.isArray(selectedId)) {
      const keep = selectedId.filter((id) => idsInActive.has(id));
      if (keep.length !== selectedId.length) setSelectedId(keep.length ? keep : null);
    } else if (selectedId && !idsInActive.has(selectedId)) {
      setSelectedId(null);
    }
  }, [strokes, shapes, activeLayerId, selectedId, setSelectedId]);

  // -----------------------
  // Helpers
  // -----------------------
  const getMousePos = (stage, forceSnap = false) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    let point = transform.point(pointer);
    if (snapToGrid && (forceSnap || tool !== "freedraw")) {
      point.x = Math.round(point.x / gridSize) * gridSize;
      point.y = Math.round(point.y / gridSize) * gridSize;
    }
    return point;
  };

  const distToSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay;
    if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };

  const eraseAtPoint = (world) => {
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
        if (sh.type === "rect") return world.x >= sh.x && world.x <= sh.x + sh.width && world.y >= sh.y && world.y <= sh.y + sh.height;
        if (sh.type === "circle") return Math.hypot(world.x - sh.x, world.y - sh.y) <= sh.radius;
        if (sh.type === "oval") {
          const rx = sh.radiusX || 0, ry = sh.radiusY || 0;
          if (rx <= 0 || ry <= 0) return false;
          return ((world.x - sh.x) / rx) ** 2 + ((world.y - sh.y) / ry) ** 2 <= 1;
        }
        if (sh.type === "polygon" && Array.isArray(sh.points)) {
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
  };

  const getSnapPositions = () => {
    const snaps = { vertical: new Set(), horizontal: new Set() };
    shapes.forEach((sh) => {
      if (!isSameLayer(sh.layer_id)) return;
      if (sh.type === "rect") {
        const w = sh.width || 80, h = sh.height || 60;
        [sh.x, sh.x + w / 2, sh.x + w].forEach(v => snaps.vertical.add(v));
        [sh.y, sh.y + h / 2, sh.y + h].forEach(v => snaps.horizontal.add(v));
      } else if (sh.type === "circle") {
        const r = sh.radius || 40;
        [sh.x - r, sh.x, sh.x + r].forEach(v => snaps.vertical.add(v));
        [sh.y - r, sh.y, sh.y + r].forEach(v => snaps.horizontal.add(v));
      } else if (sh.type === "oval") {
        const rx = sh.radiusX || 40, ry = sh.radiusY || 30;
        [sh.x - rx, sh.x, sh.x + rx].forEach(v => snaps.vertical.add(v));
        [sh.y - ry, sh.y, sh.y + ry].forEach(v => snaps.horizontal.add(v));
      } else if (sh.type === "polygon" && Array.isArray(sh.points)) {
        for (let i = 0; i < sh.points.length; i += 2) {
          snaps.vertical.add(sh.points[i]);
          snaps.horizontal.add(sh.points[i + 1]);
        }
      }
    });
    strokes.forEach((st) => {
      if (!isSameLayer(st.layer_id)) return;
      for (let i = 0; i < st.points.length; i += 2) {
        snaps.vertical.add(st.points[i]);
        snaps.horizontal.add(st.points[i + 1]);
      }
    });
    return snaps;
  };

  const handleDragStart = () => setIsDraggingNode(true);

  const handleDragMove = (e) => {
    const id = parseInt(e?.target?.id?.() || 0, 10);
    if (isAnchored(id)) { e.target.x(0); e.target.y(0); setGuides([]); return; }
    const node = e.target;
    if (Array.isArray(selectedId) && selectedId.length > 1) { setGuides([]); return; }

    const snaps = getSnapPositions();
    const threshold = 5;
    const bounds = node.getClientRect({ relativeTo: node.getParent() });
    const objVerts = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
    const objHors = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

    let minDistV = Infinity, bestDeltaV = 0, bestSvV = null;
    for (const ov of objVerts) {
      for (const sv of snaps.vertical) {
        const dist = Math.abs(sv - ov);
        if (dist < threshold && dist < minDistV) { minDistV = dist; bestDeltaV = sv - ov; bestSvV = sv; }
      }
    }
    let minDistH = Infinity, bestDeltaH = 0, bestShH = null;
    for (const oh of objHors) {
      for (const sh of snaps.horizontal) {
        const dist = Math.abs(sh - oh);
        if (dist < threshold && dist < minDistH) { minDistH = dist; bestDeltaH = sh - oh; bestShH = sh; }
      }
    }

    node.x(node.x() + bestDeltaV);
    node.y(node.y() + bestDeltaH);
    const newGuides = [];
    if (minDistV < threshold) newGuides.push({ orientation: "V", position: bestSvV });
    if (minDistH < threshold) newGuides.push({ orientation: "H", position: bestShH });
    setGuides(newGuides);
  };

  const handleDragEnd = (e) => {
    setIsDraggingNode(false);
    const node = e.target;
    const id = parseInt(node.id());
    if (isAnchored(id)) { node.x(0); node.y(0); node.getLayer()?.batchDraw(); setGuides([]); return; }
    const className = node.getClassName();

    if (className === "Line") {
      const relTransform = node.getTransform();
      const oldPoints = node.points();
      const newPoints = [];
      for (let i = 0; i < oldPoints.length; i += 2) {
        const world = relTransform.point({ x: oldPoints[i], y: oldPoints[i + 1] });
        newPoints.push(world.x, world.y);
      }
      node.x(0); node.y(0); node.points(newPoints); node.getLayer()?.batchDraw();
      setStrokes((prev) => prev.map((st) => st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st));
    } else {
      setShapes((prev) => prev.map((sh) => {
        if (sh.id !== id) return sh;
        if (sh.type === "polygon" && Array.isArray(sh.points)) {
          const dx = node.x() || 0, dy = node.y() || 0;
          const newPoints = sh.points.map((p, i) => p + (i % 2 === 0 ? dx : dy));
          node.x(0); node.y(0); node.getLayer()?.batchDraw();
          return { ...sh, points: newPoints, x: 0, y: 0, rotation: 0 };
        }
        return { ...sh, x: node.x(), y: node.y() };
      }));
    }
    setGuides([]);
  };

  const handleTransformEnd = () => {
    const nodes = transformerRef.current.nodes() || [];
    nodes.forEach((node) => {
      const id = parseInt(node.id());
      if (isAnchored(id)) { node.x(0); node.y(0); node.scaleX(1); node.scaleY(1); node.rotation(0); node.getLayer()?.batchDraw(); return; }
      const className = node.getClassName();
      if (className === "Line") {
        const relTransform = node.getTransform();
        const oldPoints = node.points();
        const newPoints = [];
        for (let i = 0; i < oldPoints.length; i += 2) {
          const world = relTransform.point({ x: oldPoints[i], y: oldPoints[i + 1] });
          newPoints.push(world.x, world.y);
        }
        node.x(0); node.y(0); node.scaleX(1); node.scaleY(1); node.rotation(0); node.points(newPoints); node.getLayer()?.batchDraw();
        setStrokes((prev) => prev.map((st) => st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st));
      } else {
        setShapes((prev) => prev.map((sh) => {
          if (sh.id !== id) return sh;
          let newSh = { ...sh, x: node.x(), y: node.y(), rotation: node.rotation() };
          if (sh.type === "rect") {
            newSh.width = (node.width() || 80) * node.scaleX();
            newSh.height = (node.height() || 60) * node.scaleY();
            node.scaleX(1); node.scaleY(1);
          } else if (sh.type === "circle") {
            newSh.radius = (node.radius() || 40) * Math.max(node.scaleX(), node.scaleY());
            node.scaleX(1); node.scaleY(1);
          } else if (sh.type === "oval") {
            const rx = typeof node.radiusX === "function" ? node.radiusX() : (sh.radiusX || 0);
            const ry = typeof node.radiusY === "function" ? node.radiusY() : (sh.radiusY || 0);
            newSh.radiusX = rx * node.scaleX(); newSh.radiusY = ry * node.scaleY();
            node.scaleX(1); node.scaleY(1);
          } else if (sh.type === "polygon") {
            const relTransform = node.getTransform();
            const newPoints = [];
            for (let i = 0; i < sh.points.length; i += 2) {
              const world = relTransform.point({ x: sh.points[i], y: sh.points[i + 1] });
              newPoints.push(world.x, world.y);
            }
            newSh.points = newPoints; newSh.x = 0; newSh.y = 0; newSh.rotation = 0;
            node.x(0); node.y(0); node.scaleX(1); node.scaleY(1); node.rotation(0);
          }
          node.getLayer()?.batchDraw();
          return newSh;
        }));
      }
    });
  };

  // -----------------------
  // Select object — supports Ctrl+Click multi-select
  // -----------------------
  const handleSelectObject = (id, e) => {
    if (tool !== "select") return;
    const blocked =
      strokes.some(s => s.id === id && (s.locked || s.anchoredBlockId)) ||
      shapes.some(s => s.id === id && (s.locked || s.anchoredBlockId));
    if (blocked) return;

    const ctrlHeld = e?.evt?.ctrlKey || e?.evt?.metaKey;
    if (ctrlHeld) {
      setSelectedId(prev => {
        const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
        if (arr.includes(id)) return arr.filter(i => i !== id).length ? arr.filter(i => i !== id) : null;
        return [...arr, id];
      });
    } else {
      setSelectedId(id);
    }
  };

  // -----------------------
  // Events
  // -----------------------
  const handleMouseDown = (e) => {
    const stage = stageRef.current;
    if (!stage) return;

    // Exit point edit mode on stage click
    if (pointEditMode && (e.target === stage || e.target.getClassName?.() === "Layer")) {
      togglePointEditMode();
      return;
    }

    if (tool !== "select" && selectedId) {
      setSelectedId(null);
      transformerRef.current?.nodes([]);
    }

    if (e.evt.button === 2) { setIsPanning(true); return; }

    let pos = getMousePos(stage);
    if (!pos) return;

    if (tool === "select" && !isDraggingNode && (e.target === stage || e.target.getClassName?.() === "Layer")) {
      // Only clear selection if Ctrl not held
      if (!e.evt.ctrlKey && !e.evt.metaKey) {
        setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
        setSelectedId(null);
      }
      return;
    }

    if (tool === "select") {
      const cls = e.target?.getClassName?.();
      if (!["Line", "Rect", "Circle", "Ellipse", "Path"].includes(cls)) {
        if (!e.evt.ctrlKey && !e.evt.metaKey) setSelectedId(null);
      }
    }

    if (tool === "fill") {
      const walls = strokes.filter((s) => s.isWall && s.layer_id === activeLayerId);
      const intersectionPoints = getLineIntersections(walls);
      let allWallPoints = [];
      walls.forEach(wall => {
        for (let i = 0; i < wall.points.length; i += 2)
          allWallPoints.push([wall.points[i], wall.points[i + 1]]);
      });
      allWallPoints = allWallPoints.concat(intersectionPoints);
      const { rooms } = detectRooms(walls, allWallPoints);
      const containingRoom = rooms.find((roomPoints) => isPointInPolygon([pos.x, pos.y], roomPoints));
      if (containingRoom) {
        setShapes((prev) => [...prev, {
          id: Date.now(), type: "polygon", points: containingRoom.flat(),
          fill: drawColor, color: drawColor, closed: true, layer_id: activeLayerId,
        }]);
      }
      return;
    }

    if (tool === "picker") {
      const p = stage.getPointerPosition();
      if (!p) return;
      const node = stage.getIntersection(p);
      if (node) setDrawColor(node.fill() || node.stroke() || "#ffffff");
      return;
    }

    if (tool === "freedraw" || tool === "wall") {
      if (snapToGrid) pos = getMousePos(stage, true);
      setIsDrawing(true);
      setCurrentStroke({ points: [pos.x, pos.y], color: drawColor, thickness, isWall: tool === "wall", isEraser: false });
    }

    if (tool === "eraser") { setIsDrawing(true); eraseAtPoint(pos); }
  };

  const handleMouseMove = (e) => {
    const stage = stageRef.current;
    if (!stage) return;
    let pos = getMousePos(stage);
    if (!pos) return;

    if (isPanning) { setCamera((c) => ({ ...c, x: c.x + e.evt.movementX, y: c.y + e.evt.movementY })); return; }
    if (isDrawing && tool === "eraser") { eraseAtPoint(pos); return; }

    if (isDrawing && currentStroke && (tool === "freedraw" || tool === "wall")) {
      let newPoints = [...currentStroke.points];
      if (tool === "wall") {
        const snaps = getSnapPositions();
        const threshold = 5;
        let newGuides = [], snappedX = pos.x, snappedY = pos.y;
        let minDistV = Infinity, bestSv = null;
        for (const sv of snaps.vertical) { const d = Math.abs(sv - pos.x); if (d < threshold && d < minDistV) { minDistV = d; bestSv = sv; } }
        if (bestSv !== null) { snappedX = bestSv; newGuides.push({ orientation: "V", position: bestSv }); }
        let minDistH = Infinity, bestSh = null;
        for (const sh of snaps.horizontal) { const d = Math.abs(sh - pos.y); if (d < threshold && d < minDistH) { minDistH = d; bestSh = sh; } }
        if (bestSh !== null) { snappedY = bestSh; newGuides.push({ orientation: "H", position: bestSh }); }
        setGuides(newGuides);
        newPoints = [newPoints[0], newPoints[1], snappedX, snappedY];
      } else {
        newPoints = [...newPoints, pos.x, pos.y];
      }
      setCurrentStroke({ ...currentStroke, points: newPoints });
      return;
    }

    if (selectionBox && tool === "select" && !isDraggingNode) {
      setSelectionBox({ ...selectionBox, width: pos.x - selectionBox.x, height: pos.y - selectionBox.y });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDrawing) {
      if (tool === "freedraw" || tool === "wall") {
        let pos = getMousePos(stageRef.current);
        if (pos && snapToGrid) {
          const snappedX = Math.round(pos.x / gridSize) * gridSize;
          const snappedY = Math.round(pos.y / gridSize) * gridSize;
          setCurrentStroke((prev) => {
            let points = [...prev.points];
            points = tool === "wall"
              ? [points[0], points[1], snappedX, snappedY]
              : [...points.slice(0, -2), snappedX, snappedY];
            return { ...prev, points };
          });
        }
        if (currentStroke && currentStroke.points.length >= 4) {
          setStrokes((prev) => [...prev, {
            id: Date.now(), points: currentStroke.points, x: 0, y: 0,
            layer_id: activeLayerId, color: currentStroke.color,
            thickness: currentStroke.thickness, isWall: currentStroke.isWall,
            isEraser: currentStroke.isEraser, material,
          }]);
        }
        setCurrentStroke(null);
      }
      setIsDrawing(false);
    }
    setGuides([]);

    if (selectionBox && tool === "select" && !isDraggingNode) {
      const { x, y, width, height } = selectionBox;
      const x1 = Math.min(x, x + width), x2 = Math.max(x, x + width);
      const y1 = Math.min(y, y + height), y2 = Math.max(y, y + height);
      const layer = activeLayerRef.current;
      const intersectsRect = (rect) => !(rect.x + rect.width < x1 || rect.x > x2 || rect.y + rect.height < y1 || rect.y > y2);
      const nodes = layer ? layer.find((n) => {
        const cls = n.getClassName?.();
        return ["Line", "Rect", "Circle", "Ellipse", "Path"].includes(cls) && n.id?.();
      }) : [];
      const hitIds = nodes
        .filter((n) => { try { return intersectsRect(n.getClientRect({ relativeTo: layer })); } catch { return false; } })
        .map((n) => parseInt(n.id(), 10))
        .filter((id) => Number.isFinite(id))
        .filter((id) => {
          const st = strokes.find(s => s.id === id);
          if (st && (st.locked || st.anchoredBlockId)) return false;
          const sh = shapes.find(s => s.id === id);
          if (sh && (sh.locked || sh.anchoredBlockId)) return false;
          return true;
        });

      const hits = Array.from(new Set(hitIds));
      if (hits.length > 1) setSelectedId(hits);
      else if (hits.length === 1) setSelectedId(hits[0]);
      else setSelectedId(null);
      setSelectionBox(null);
    }
  };

  const renderGuides = () => {
    const range = 2000;
    return guides.map((guide, i) =>
      guide.orientation === "V"
        ? <Line key={i} points={[guide.position, -range, guide.position, range]} stroke="#0ea5a7" strokeWidth={1} dash={[4, 4]} />
        : <Line key={i} points={[-range, guide.position, range, guide.position]} stroke="#0ea5a7" strokeWidth={1} dash={[4, 4]} />
    );
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = camera.scale;
    const pointer = stage.getPointerPosition();
    const mousePoint = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
    const newScale = Math.max(0.2, Math.min(4, e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy));
    setCamera({ x: pointer.x - mousePoint.x * newScale, y: pointer.y - mousePoint.y * newScale, scale: newScale });
  };

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || pointEditMode) return;

    const hasFiniteRect = (n) => {
      try { const r = n.getClientRect(); return Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height); }
      catch { return false; }
    };
    tr.off("transformend");

    if (Array.isArray(selectedId) && selectedId.length) {
      const nodes = selectedId.map((id) => stage.findOne(`#${id}`)).filter(Boolean).filter(hasFiniteRect);
      if (nodes.length) { tr.nodes(nodes); tr.on("transformend", handleTransformEnd); }
      else tr.nodes([]);
    } else if (!Array.isArray(selectedId) && selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node && hasFiniteRect(node)) { tr.nodes([node]); tr.on("transformend", handleTransformEnd); }
      else tr.nodes([]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, strokes, shapes, activeLayerId, pointEditMode]);

  const renderGrid = () => {
    const lines = [];
    for (let i = -2000; i < 2000; i += gridSize) {
      const isThick = Math.round(i / gridSize) % 5 === 0;
      lines.push(
        <Line key={`v${i}`} points={[i, -2000, i, 2000]} stroke="#2b2b2b" strokeWidth={isThick ? 2.5 / camera.scale : 1 / camera.scale} opacity={isThick ? 0.7 : 1} />,
        <Line key={`h${i}`} points={[-2000, i, 2000, i]} stroke="#2b2b2b" strokeWidth={isThick ? 2.5 / camera.scale : 1 / camera.scale} opacity={isThick ? 0.7 : 1} />
      );
    }
    return lines;
  };

  const renderShape = (sh, opts = {}) => {
    const { inactive = false, preview = false, prefix = '' } = opts;
    const fill = sh.color || sh.fill || "#9CA3AF";
    const opacity = inactive ? inactiveLayerOpacity : (preview ? 0.7 : 1);
    const dash = preview ? [5, 5] : undefined;
    const draggable = !inactive && !preview && tool === "select" && !sh.locked && !sh.anchoredBlockId;
    const events = inactive || preview ? {} : {
      onClick: (e) => (!sh.locked && !sh.anchoredBlockId) && handleSelectObject(sh.id, e),
      onDragStart: handleDragStart,
      onDragMove: handleDragMove,
      onDragEnd: handleDragEnd,
    };
    const listening = !inactive && !preview;
    const key = `${prefix}${sh.id}`;
    const id = inactive || preview ? undefined : sh.id.toString();

    const common = { key, id, draggable, listening, opacity, ...events };

    if (sh.type === "rect") return <Rect {...common} x={num(sh.x)} y={num(sh.y)} width={num(sh.width)} height={num(sh.height)} fill={fill} rotation={num(sh.rotation)} dash={dash} />;
    if (sh.type === "circle") {
      if (Number.isFinite(sh.radiusX) && Number.isFinite(sh.radiusY) && (sh.radiusX > 0 || sh.radiusY > 0))
        return <Ellipse {...common} x={num(sh.x)} y={num(sh.y)} radiusX={num(sh.radiusX)} radiusY={num(sh.radiusY)} fill={fill} rotation={num(sh.rotation)} dash={dash} />;
      return <Circle {...common} x={num(sh.x)} y={num(sh.y)} radius={num(sh.radius)} fill={fill} rotation={num(sh.rotation)} dash={dash} />;
    }
    if (sh.type === "oval") return <Ellipse {...common} x={num(sh.x)} y={num(sh.y)} radiusX={num(sh.radiusX)} radiusY={num(sh.radiusY)} fill={fill} rotation={num(sh.rotation)} dash={dash} />;
    if (sh.type === "polygon") return <Path {...common} data={pointsToPath(sh.points)} x={num(sh.x)} y={num(sh.y)} rotation={num(sh.rotation)} fill={sh.fill || sh.color} stroke={sh.stroke} strokeWidth={num(sh.strokeWidth, 0)} hitStrokeWidth={12} dash={dash} />;
    return null;
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Stage
        ref={stageRef}
        width={window.innerWidth - 320}
        height={window.innerHeight - 56 - 48}
        scaleX={camera.scale}
        scaleY={camera.scale}
        x={camera.x}
        y={camera.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ background: "#0f1720" }}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer listening={false}>{renderGrid()}</Layer>
        <Layer listening={false}>{renderGuides()}</Layer>

        {/* Inactive layers */}
        <Layer listening={false}>
          {strokes.filter(s => !isSameLayer(s.layer_id)).map(s => (
            <Line key={`bg-${s.id}`} x={num(s.x)} y={num(s.y)} points={s.points.map(p => num(p))} stroke={s.color} strokeWidth={num(s.thickness, 1)} lineCap="round" lineJoin="round" tension={0.5} opacity={inactiveLayerOpacity} listening={false} />
          ))}
          {shapes.filter(sh => !isSameLayer(sh.layer_id)).map(sh => renderShape(sh, { inactive: true, prefix: 'bg-' }))}
        </Layer>

        {/* Preview Layer */}
        <Layer listening={false}>
          {previewStrokes.filter(s => isSameLayer(s.layer_id)).map(s => (
            <Line key={`preview-${s.id}`} x={num(s.x)} y={num(s.y)} points={s.points.map(p => num(p))} stroke={s.color} strokeWidth={num(s.thickness, 1)} lineCap="round" lineJoin="round" tension={0.5} dash={[5, 5]} opacity={0.7} listening={false} />
          ))}
          {previewShapes.filter(sh => isSameLayer(sh.layer_id)).map(sh => renderShape(sh, { preview: true, prefix: 'preview-' }))}
        </Layer>

        {/* Active Layer */}
        <Layer ref={activeLayerRef}>
          {strokes.filter(s => isSameLayer(s.layer_id)).map(s => (
            <Line
              key={s.id} id={s.id.toString()}
              x={num(s.x)} y={num(s.y)}
              points={s.points.map(p => num(p))}
              stroke={s.color} strokeWidth={num(s.thickness, 1)}
              lineCap="round" lineJoin="round" tension={0.5}
              draggable={tool === "select" && !s.locked && !s.anchoredBlockId}
              onClick={(e) => (!s.locked && !s.anchoredBlockId) && handleSelectObject(s.id, e)}
              onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
            />
          ))}
          {shapes.filter(sh => isSameLayer(sh.layer_id)).map(sh => renderShape(sh))}

          {/* Vertex handles in point edit mode */}
          {pointEditMode && editingPoints.length >= 2 && Array.from({ length: editingPoints.length / 2 }, (_, i) => (
            <Circle
              key={`vertex-${i}`}
              x={editingPoints[i * 2]}
              y={editingPoints[i * 2 + 1]}
              radius={7 / camera.scale}
              fill="#06b6d4"
              stroke="#ffffff"
              strokeWidth={2 / camera.scale}
              draggable
              onDragMove={(e) => updateEditingPoint(i, e.target.x(), e.target.y())}
              onDragEnd={(e) => {
                let x = e.target.x(), y = e.target.y();
                if (snapToGrid) {
                  x = Math.round(x / gridSize) * gridSize;
                  y = Math.round(y / gridSize) * gridSize;
                  e.target.x(x); e.target.y(y);
                }
                updateEditingPoint(i, x, y);
              }}
            />
          ))}

          {/* Block overlays */}
          {mergedBlocks.filter(b => b.layer_id === activeLayerId).map(b => (
            <Rect key={`block-${b.id}`} x={num(b.x)} y={num(b.y)} width={num(b.width)} height={num(b.height)} fill="rgba(6,182,212,0.08)" stroke="#06b6d4" strokeWidth={1} dash={[6, 6]} listening={true} onClick={(e) => { e.cancelBubble = true; onUnmergeBlock(b.id); }} draggable={false} />
          ))}
          {anchoredBlocks.filter(b => b.layer_id === activeLayerId).map(b => (
            <Rect key={`anchor-${b.id}`} x={num(b.x)} y={num(b.y)} width={num(b.width)} height={num(b.height)} fill="rgba(234,179,8,0.08)" stroke="#f59e0b" strokeWidth={1.5} dash={[8, 4]} listening={false} draggable={false} />
          ))}

          {currentStroke && (
            <Line points={currentStroke.points.map(p => num(p))} stroke={currentStroke.color} strokeWidth={num(currentStroke.thickness, 1)} lineCap="round" lineJoin="round" tension={0.5} listening={false} />
          )}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x, selectionBox.x + selectionBox.width)}
              y={Math.min(selectionBox.y, selectionBox.y + selectionBox.height)}
              width={Math.abs(selectionBox.width)} height={Math.abs(selectionBox.height)}
              stroke="cyan" dash={[4, 4]}
            />
          )}
          <Transformer ref={transformerRef} rotateEnabled={true} />
        </Layer>
      </Stage>

      {/* Point Edit Mode toggle button — appears near top-right of selection */}
      {!Array.isArray(selectedId) && selectedId && editBtnPos && !pointEditMode && (
        <button
          style={{
            position: 'absolute',
            left: editBtnPos.x,
            top: editBtnPos.y,
            zIndex: 100,
            pointerEvents: 'auto',
          }}
          onClick={togglePointEditMode}
          className="flex items-center gap-1 bg-[#1e293b] border border-[#06b6d4] text-[#06b6d4] text-xs px-2 py-1 rounded-lg shadow-lg hover:bg-[#06b6d4] hover:text-[#071021] transition-colors"
          title="Edit vertices"
        >
          ✦ Edit Points
        </button>
      )}

      {/* Exit point edit mode button */}
      {pointEditMode && (
        <button
          style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}
          onClick={togglePointEditMode}
          className="flex items-center gap-2 bg-[#06b6d4] text-[#071021] text-xs font-bold px-4 py-1.5 rounded-full shadow-lg hover:bg-[#0891b2] transition-colors"
        >
          ✓ Done Editing Points
        </button>
      )}

      {tool !== "select" && (
        <div style={{ position: "absolute", top: 80, right: 20, pointerEvents: "none" }}>
          <svg width="60" height="60">
            <circle cx="30" cy="30" r={thickness / 2} fill={tool === "eraser" ? "#0f1720" : drawColor} stroke="white" />
          </svg>
        </div>
      )}
    </div>
  );
}