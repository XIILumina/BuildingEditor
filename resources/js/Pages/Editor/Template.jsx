import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect, Transformer, Circle, Path, Ellipse } from "react-konva";
import { detectRooms, isPointInPolygon, pointsEqual, getLineIntersections } from './utils/drawingUtils';

function pointsToPath(points) {
  // Coerce to numbers and drop invalids
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
// Helper to coerce numbers safely
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
  previewStrokes = [], // New prop
  previewShapes = [], // New prop
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

  // Clear selection and Transformer when active layer changes
  useEffect(() => {
    setSelectedId(null);
    const tr = transformerRef.current;
    if (tr) tr.nodes([]);
  }, [activeLayerId, setSelectedId]);

  // Sanitize selection if selected ids are no longer present (e.g., layer switch or deletion)
  useEffect(() => {
    const idsInActive = new Set([
      ...strokes.filter((s) => s.layer_id === activeLayerId).map((s) => s.id),
      ...shapes.filter((sh) => sh.layer_id === activeLayerId).map((sh) => sh.id),
    ]);

    if (Array.isArray(selectedId)) {
      const keep = selectedId.filter((id) => idsInActive.has(id));
      if (keep.length !== selectedId.length) {
        setSelectedId(keep.length ? keep : null);
      }
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
  };

  const eraseAtPoint = (world) => {
    const hitStrokeIds = strokes
      .filter((st) => st.layer_id === activeLayerId)
      .filter((st) => {
        for (let i = 0; i < st.points.length - 2; i += 2) {
          const x1 = st.points[i];
          const y1 = st.points[i + 1];
          const x2 = st.points[i + 2];
          const y2 = st.points[i + 3];
          if (distToSegment(world.x, world.y, x1, y1, x2, y2) <= thickness / 2) {
            return true;
          }
        }
        return false;
      })
      .map((st) => st.id);

    if (hitStrokeIds.length > 0) {
      setStrokes((prev) => prev.filter((st) => !hitStrokeIds.includes(st.id)));
      setSelectedId(null);
    }

    const hitShapeIds = shapes
      .filter((sh) => sh.layer_id === activeLayerId)
      .filter((sh) => {
        if (sh.type === "rect") {
          return (
            world.x >= sh.x &&
            world.x <= sh.x + (sh.width || 0) &&
            world.y >= sh.y &&
            world.y <= sh.y + (sh.height || 0)
          );
        } else if (sh.type === "circle") {
          const dx = world.x - sh.x;
          const dy = world.y - sh.y;
          return Math.hypot(dx, dy) <= (sh.radius || 0);
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
      if (sh.layer_id !== activeLayerId) return;
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
      } else if (sh.type === "oval") {
        const rx = sh.radiusX || 40;
        const ry = sh.radiusY || 30;
        snaps.vertical.add((sh.x || 0) - rx);
        snaps.vertical.add(sh.x || 0);
        snaps.vertical.add((sh.x || 0) + rx);
        snaps.horizontal.add((sh.y || 0) - ry);
        snaps.horizontal.add(sh.y || 0);
        snaps.horizontal.add((sh.y || 0) + ry);
      } else if (sh.type === "polygon" && Array.isArray(sh.points)) {
        for (let i = 0; i < sh.points.length; i += 2) {
          snaps.vertical.add(sh.points[i]);
          snaps.horizontal.add(sh.points[i + 1]);
        }
      }
    });

    strokes.forEach((st) => {
      if (st.layer_id !== activeLayerId) return;
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
  };

  const handleDragStart = () => {
    setIsDraggingNode(true);
  };

  const handleDragMove = (e) => {
    const node = e.target;

    // If multiple selected, do NOT snap; let Konva handle the drag naturally.
    if (Array.isArray(selectedId) && selectedId.length > 1) {
      setGuides([]);
      return; // don't override node position
    }

    const snaps = getSnapPositions();
    const threshold = 5;

    const bounds = node.getClientRect({ relativeTo: node.getParent() });
    const objVerts = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
    const objHors = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

    let minDistV = Infinity;
    let bestDeltaV = 0;
    let bestSvV = null;
    for (const ov of objVerts) {
      for (const sv of snaps.vertical) {
        const dist = Math.abs(sv - ov);
        if (dist < threshold && dist < minDistV) {
          minDistV = dist;
          bestDeltaV = sv - ov;
          bestSvV = sv;
        }
      }
    }

    let minDistH = Infinity;
    let bestDeltaH = 0;
    let bestShH = null;
    for (const oh of objHors) {
      for (const sh of snaps.horizontal) {
        const dist = Math.abs(sh - oh);
        if (dist < threshold && dist < minDistH) {
          minDistH = dist;
          bestDeltaH = sh - oh;
          bestShH = sh;
        }
      }
    }

    const newX = node.x() + bestDeltaV;
    const newY = node.y() + bestDeltaH;

    const newGuides = [];
    if (minDistV < threshold) {
      newGuides.push({ orientation: "V", position: bestSvV });
    }
    if (minDistH < threshold) {
      newGuides.push({ orientation: "H", position: bestShH });
    }

    node.x(newX);
    node.y(newY);
    setGuides(newGuides);
  };

  const handleDragEnd = (e) => {
    setIsDraggingNode(false);
    const node = e.target;
    const id = parseInt(node.id());
    const className = node.getClassName();

    if (className === "Line") {
      const relTransform = node.getTransform();
      const oldPoints = node.points();
      const newPoints = [];
      for (let i = 0; i < oldPoints.length; i += 2) {
        const local = { x: oldPoints[i], y: oldPoints[i + 1] };
        const world = relTransform.point(local);
        newPoints.push(world.x, world.y);
      }
      node.x(0);
      node.y(0);
      node.points(newPoints);
      node.getLayer()?.batchDraw(); // safe

      setStrokes((prev) =>
        prev.map((st) =>
          st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st
        )
      );
    } else {
      setShapes((prev) =>
        prev.map((sh) => {
          if (sh.id !== id) return sh;
          if (sh.type === "polygon" && Array.isArray(sh.points)) {
            const dx = node.x() || 0;
            const dy = node.y() || 0;
            const newPoints = sh.points.map((p, i) => p + (i % 2 === 0 ? dx : dy));
            node.x(0);
            node.y(0);
            node.getLayer()?.batchDraw(); // safe
            return { ...sh, points: newPoints, x: 0, y: 0, rotation: 0 };
          }
          return { ...sh, x: node.x(), y: node.y() };
        })
      );
    }
    setGuides([]);
  };

  const handleTransformEnd = () => {
    const nodes = transformerRef.current.nodes() || [];
    nodes.forEach((node) => {
      const id = parseInt(node.id());
      const className = node.getClassName();

      if (className === "Line") {
        const relTransform = node.getTransform();
        const oldPoints = node.points();
        const newPoints = [];
        for (let i = 0; i < oldPoints.length; i += 2) {
          const local = { x: oldPoints[i], y: oldPoints[i + 1] };
          const world = relTransform.point(local);
          newPoints.push(world.x, world.y);
        }
        node.x(0);
        node.y(0);
        node.scaleX(1);
        node.scaleY(1);
        node.rotation(0);
        node.points(newPoints);
        node.getLayer()?.batchDraw(); // safe

        setStrokes((prev) =>
          prev.map((st) =>
            st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st
          )
        );
      } else {
        setShapes((prev) =>
          prev.map((sh) => {
            if (sh.id !== id) return sh;
            let newSh = { ...sh };
            newSh.x = node.x();
            newSh.y = node.y();
            newSh.rotation = node.rotation();
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
              newSh.radiusX = rx * node.scaleX();
              newSh.radiusY = ry * node.scaleY();
              node.scaleX(1); node.scaleY(1);
            } else if (sh.type === "polygon") {
              const relTransform = node.getTransform();
              const oldPoints = sh.points;
              const newPoints = [];
              for (let i = 0; i < oldPoints.length; i += 2) {
                const local = { x: oldPoints[i], y: oldPoints[i + 1] };
                const world = relTransform.point(local);
                newPoints.push(world.x, world.y);
              }
              newSh.points = newPoints;
              newSh.x = 0;
              newSh.y = 0;
              newSh.rotation = 0;

              node.x(0);
              node.y(0);
              node.scaleX(1);
              node.scaleY(1);
              node.rotation(0);
            }
            node.getLayer()?.batchDraw(); // safe
            return newSh;
          })
        );
      }
    });
  };

  // -----------------------
  // Events
  // -----------------------
  const handleMouseDown = (e) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (e.evt.button === 2) {
      setIsPanning(true);
      return;
    }

    let pos = getMousePos(stage);
    if (!pos) return;

    // Start marquee on empty Stage/Layer
    if (tool === "select" && !isDraggingNode && (e.target === stage || e.target.getClassName?.() === "Layer")) {
      setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      setSelectedId(null);
      return;
    }

    // If clicking in select mode on a non-drawable target, clear selection
    if (tool === "select") {
      const cls = e.target?.getClassName?.();
      if (!["Line", "Rect", "Circle", "Ellipse", "Path"].includes(cls)) {
        setSelectedId(null);
      }
    }

    if (tool === "fill") {
      const pos = getMousePos(stage);
      if (!pos) return;

      const walls = strokes.filter((s) => s.isWall && s.layer_id === activeLayerId);

      // Get intersection points
      const intersectionPoints = getLineIntersections(walls);

      // Add intersection points to wall endpoints
      let allWallPoints = [];
      walls.forEach(wall => {
        for (let i = 0; i < wall.points.length; i += 2) {
          allWallPoints.push([wall.points[i], wall.points[i + 1]]);
        }
      });
      allWallPoints = allWallPoints.concat(intersectionPoints);

      // Use allWallPoints in your room detection
      const { rooms } = detectRooms(walls, allWallPoints);

      const containingRoom = rooms.find((roomPoints) => isPointInPolygon([pos.x, pos.y], roomPoints));
      if (containingRoom) {
        const newShape = {
          id: Date.now(),
          type: "polygon",
          points: containingRoom.flat(),
          fill: drawColor,
          color: drawColor, // ensure DB 'color' NOT NULL
          closed: true,
          layer_id: activeLayerId,
        };
        setShapes((prev) => [...prev, newShape]);
      }
      return;
    }

    if (tool === "picker") {
      const pos = getMousePos(stage);
      if (!pos) return;

      const node = stage.getIntersection(pos);
      if (node) {
        const color = node.fill() || node.stroke() || "#ffffff";
        setDrawColor(color);
      }
      return;
    }

    if (tool === "freedraw" || tool === "wall") {
      if (snapToGrid) {
        pos = getMousePos(stage, true);
      }
      setIsDrawing(true);
      setCurrentStroke({
        points: [pos.x, pos.y],
        color: drawColor,
        thickness,
        isWall: tool === "wall",
        isEraser: false,
      });
    }

    if (tool === "eraser") {
      setIsDrawing(true);
      eraseAtPoint(pos);
    }
  };

  const handleMouseMove = (e) => {
    const stage = stageRef.current;
    if (!stage) return;
    let pos = getMousePos(stage);
    if (!pos) return;

    if (isPanning) {
      setCamera((c) => ({ ...c, x: c.x + e.evt.movementX, y: c.y + e.evt.movementY }));
      return;
    }

    if (isDrawing && tool === "eraser") {
      eraseAtPoint(pos);
      return;
    }

    if (isDrawing && currentStroke && (tool === "freedraw" || tool === "wall")) {
      let newPoints = [...currentStroke.points];
      if (tool === "wall") {
        const snaps = getSnapPositions();
        const threshold = 5;
        let newGuides = [];
        let snappedX = pos.x;
        let snappedY = pos.y;

        let minDistV = Infinity;
        let bestSv = null;
        for (const sv of snaps.vertical) {
          const dist = Math.abs(sv - pos.x);
          if (dist < threshold && dist < minDistV) {
            minDistV = dist;
            bestSv = sv;
          }
        }
        if (bestSv !== null) {
          snappedX = bestSv;
          newGuides.push({ orientation: "V", position: bestSv });
        }

        let minDistH = Infinity;
        let bestSh = null;
        for (const sh of snaps.horizontal) {
          const dist = Math.abs(sh - pos.y);
          if (dist < threshold && dist < minDistH) {
            minDistH = dist;
            bestSh = sh;
          }
        }
        if (bestSh !== null) {
          snappedY = bestSh;
          newGuides.push({ orientation: "H", position: bestSh });
        }

        setGuides(newGuides);
        newPoints = [newPoints[0], newPoints[1], snappedX, snappedY];
      } else {
        newPoints = [...newPoints, pos.x, pos.y];
      }
      setCurrentStroke({ ...currentStroke, points: newPoints });
      return;
    }

    if (selectionBox && tool === "select" && !isDraggingNode) {
      setSelectionBox({
        ...selectionBox,
        width: pos.x - selectionBox.x,
        height: pos.y - selectionBox.y,
      });
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
            if (tool === "wall") {
              points = [points[0], points[1], snappedX, snappedY];
            } else {
              points = [...points.slice(0, -2), snappedX, snappedY];
            }
            return { ...prev, points };
          });
        }
        if (currentStroke && currentStroke.points.length >= 4) {
          const newStroke = {
            id: Date.now(),
            points: currentStroke.points,
            x: 0,
            y: 0,
            layer_id: activeLayerId,
            color: currentStroke.color,
            thickness: currentStroke.thickness,
            isWall: currentStroke.isWall,
            isEraser: currentStroke.isEraser,
            material,
          };
          setStrokes((prev) => [...prev, newStroke]);
        }
        setCurrentStroke(null);
      }
      setIsDrawing(false);
    }
    setGuides([]);

    if (selectionBox && tool === "select" && !isDraggingNode) {
      const { x, y, width, height } = selectionBox;
      const x1 = Math.min(x, x + width);
      const x2 = Math.max(x, x + width);
      const y1 = Math.min(y, y + height);
      const y2 = Math.max(y, y + height);

      // Use Konva nodes' client rects (handles rotation/scale)
      const layer = activeLayerRef.current;
      const intersectsRect = (rect) => {
        const L = rect.x, R = rect.x + rect.width, T = rect.y, B = rect.y + rect.height;
        return !(R < x1 || L > x2 || B < y1 || T > y2);
      };
      const nodes = layer
        ? layer.find((n) => {
            const cls = n.getClassName?.();
            // Limit to drawable items only
            return ["Line", "Rect", "Circle", "Ellipse", "Path"].includes(cls) && n.id?.();
          })
        : [];
      const hitIds = nodes
        .filter((n) => intersectsRect(n.getClientRect()))
        .map((n) => parseInt(n.id(), 10))
        .filter((id) => Number.isFinite(id));

      const hits = Array.from(new Set(hitIds)).map((id) => ({ id }));

      if (hits.length > 1) {
        setSelectedId(hits.map((h) => h.id));
      } else if (hits.length === 1) {
        setSelectedId(hits[0].id);
      } else {
        setSelectedId(null);
      }
      setSelectionBox(null);
    }
  };

  const renderGuides = () => {
    const range = 2000;
    return guides.map((guide, i) => {
      if (guide.orientation === "V") {
        return (
          <Line
            key={i}
            points={[guide.position, -range, guide.position, range]}
            stroke="#0ea5a7"
            strokeWidth={1}
            dash={[4, 4]}
          />
        );
      } else {
        return (
          <Line
            key={i}
            points={[-range, guide.position, range, guide.position]}
            stroke="#0ea5a7"
            strokeWidth={1}
            dash={[4, 4]}
          />
        );
      }
    });
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = camera.scale;
    const pointer = stage.getPointerPosition();
    const mousePoint = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.max(0.2, Math.min(4, newScale));

    const newPos = {
      x: pointer.x - mousePoint.x * clamped,
      y: pointer.y - mousePoint.y * clamped,
    };

    setCamera({ x: newPos.x, y: newPos.y, scale: clamped });
  };

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    const hasFiniteRect = (n) => {
      try {
        const r = n.getClientRect();
        return (
          Number.isFinite(r.x) &&
          Number.isFinite(r.y) &&
          Number.isFinite(r.width) &&
          Number.isFinite(r.height)
        );
      } catch (_) {
        return false;
      }
    };

    tr.off("transformend");

    if (Array.isArray(selectedId) && selectedId.length) {
      const nodes = selectedId
        .map((id) => stage.findOne(`#${id}`))
        .filter(Boolean)
        .filter((n) => hasFiniteRect(n));
      if (nodes.length) {
        tr.nodes(nodes);
        tr.on("transformend", handleTransformEnd);
      } else {
        tr.nodes([]);
      }
    } else if (!Array.isArray(selectedId) && selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node && hasFiniteRect(node)) {
        tr.nodes([node]);
        tr.on("transformend", handleTransformEnd);
      } else {
        tr.nodes([]);
      }
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, strokes, shapes]);

const renderGrid = () => {
  const lines = [];
  const size = gridSize;
  for (let i = -2000; i < 2000; i += size) {
    const isThick = (Math.round(i / size) % 5 === 0);
    lines.push(
      <Line
        key={`v${i}`}
        points={[i, -2000, i, 2000]}
        stroke="#2b2b2b"
        strokeWidth={isThick ? 2.5 / camera.scale : 1 / camera.scale}
        opacity={isThick ? 0.7 : 1}
      />,
      <Line
        key={`h${i}`}
        points={[-2000, i, 2000, i]}
        stroke="#2b2b2b"
        strokeWidth={isThick ? 2.5 / camera.scale : 1 / camera.scale}
        opacity={isThick ? 0.7 : 1}
      />
    );
  }
  return lines;
};

  const handleSelectObject = (id) => {
    if (tool === "select") {
      setSelectedId(id);
    }
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
        <Layer>{renderGrid()}</Layer>
        <Layer>{renderGuides()}</Layer>
        {/* Background Layer for inactive layers */}
        <Layer>
          {strokes
            .filter((s) => s.layer_id !== activeLayerId)
            .map((s) => (
              <Line
                key={`bg-${s.id}`}
                x={num(s.x)}
                y={num(s.y)}
                points={Array.isArray(s.points) ? s.points.map((p) => num(p)) : []}
                stroke={s.color}
                strokeWidth={num(s.thickness, 1)}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                opacity={0.5}
                draggable={false}
                listening={false}
              />
            ))}
          {shapes
            .filter((sh) => sh.layer_id !== activeLayerId)
            .map((sh) => {
              if (sh.type === "rect") {
                return (
                  <Rect
                    key={`bg-${sh.id}`}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    width={num(sh.width)}
                    height={num(sh.height)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    opacity={0.5}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              if (sh.type === "circle") {
                return (
                  <Circle
                    key={`bg-${sh.id}`}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    radius={num(sh.radius)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    opacity={0.5}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              if (sh.type === "oval") {
                return (
                  <Ellipse
                    key={`bg-${sh.id}`}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    radiusX={num(sh.radiusX)}
                    radiusY={num(sh.radiusY)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    opacity={0.5}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              if (sh.type === "polygon") {
                return (
                  <Path
                    key={`bg-${sh.id}`}
                    data={pointsToPath(sh.points)}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    rotation={num(sh.rotation)}
                    fill={sh.fill}
                    opacity={0.5}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              return null;
            })}
        </Layer>

        {/* Preview Layer */}
        <Layer>
          {previewStrokes
            .filter((s) => s.layer_id === activeLayerId)
            .map((s) => (
              <Line
                key={`preview-${s.id}`}
                x={num(s.x)}
                y={num(s.y)}
                points={Array.isArray(s.points) ? s.points.map((p) => num(p)) : []}
                stroke={s.color}
                strokeWidth={num(s.thickness, 1)}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                dash={[5, 5]}
                opacity={0.7}
                draggable={false}
                listening={false}
              />
            ))}
          {previewShapes
            .filter((sh) => sh.layer_id === activeLayerId)
            .map((sh) => {
              if (sh.type === "rect") {
                return (
                  <Rect
                    key={`preview-${sh.id}`}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    width={num(sh.width)}
                    height={num(sh.height)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    opacity={0.7}
                    dash={[5, 5]}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              if (sh.type === "circle") {
                return (
                  <Circle
                    key={`preview-${sh.id}`}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    radius={num(sh.radius)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    opacity={0.7}
                    dash={[5, 5]}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              if (sh.type === "oval") {
                return (
                  <Ellipse
                    key={`preview-${sh.id}`}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    radiusX={num(sh.radiusX)}
                    radiusY={num(sh.radiusY)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    opacity={0.7}
                    dash={[5, 5]}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              if (sh.type === "polygon") {
                return (
                  <Path
                    key={`preview-${sh.id}`}
                    data={pointsToPath(sh.points)}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    rotation={num(sh.rotation)}
                    fill={sh.fill}
                    opacity={0.7}
                    dash={[5, 5]}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              return null;
            })}
        </Layer>

        {/* Active Layer */}
        <Layer ref={activeLayerRef}>
          {strokes
            .filter((s) => s.layer_id === activeLayerId)
            .map((s) => (
              <Line
                key={s.id}
                id={s.id.toString()}
                x={num(s.x)}
                y={num(s.y)}
                points={Array.isArray(s.points) ? s.points.map((p) => num(p)) : []}
                stroke={s.color}
                strokeWidth={num(s.thickness, 1)}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                draggable={tool === "select"}
                onClick={() => handleSelectObject(s.id)}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            ))}
          {shapes
            .filter((sh) => sh.layer_id === activeLayerId)
            .map((sh) => {
              if (sh.type === "rect") {
                return (
                  <Rect
                    key={sh.id}
                    id={sh.id.toString()}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    width={num(sh.width)}
                    height={num(sh.height)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    draggable={tool === "select"}
                    onClick={() => handleSelectObject(sh.id)}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                );
              }
              if (sh.type === "circle") {
                return (
                  <Circle
                    key={sh.id}
                    id={sh.id.toString()}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    radius={num(sh.radius)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    draggable={tool === "select"}
                    onClick={() => handleSelectObject(sh.id)}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                );
              }
              if (sh.type === "oval") {
                return (
                  <Ellipse
                    key={sh.id}
                    id={sh.id.toString()}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    radiusX={num(sh.radiusX)}
                    radiusY={num(sh.radiusY)}
                    fill={sh.color || "#9CA3AF"}
                    rotation={num(sh.rotation)}
                    draggable={tool === "select"}
                    onClick={() => handleSelectObject(sh.id)}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                );
              }
              if (sh.type === "polygon") {
                return (
                  <Path
                    key={sh.id}
                    id={sh.id.toString()}
                    data={pointsToPath(sh.points)}
                    x={num(sh.x)}
                    y={num(sh.y)}
                    rotation={num(sh.rotation)}
                    fill={sh.fill}
                    stroke={sh.stroke || undefined}
                    strokeWidth={num(sh.strokeWidth, 0)}
                    hitStrokeWidth={12} // improve hit area for selection
                    draggable={tool === "select"}
                    onClick={() => handleSelectObject(sh.id)}
                    onDragStart={handleDragStart}
                    onDragMove={handleDragMove}
                    onDragEnd={handleDragEnd}
                  />
                );
              }
              return null;
            })}
          {currentStroke && (
            <Line
              points={Array.isArray(currentStroke.points) ? currentStroke.points.map((p) => num(p)) : []}
              stroke={currentStroke.color}
              strokeWidth={num(currentStroke.thickness, 1)}
              lineCap="round"
              lineJoin="round"
              tension={0.5}
              listening={false}
            />
          )}
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x, selectionBox.x + selectionBox.width)}
              y={Math.min(selectionBox.y, selectionBox.y + selectionBox.height)}
              width={Math.abs(selectionBox.width)}
              height={Math.abs(selectionBox.height)}
              stroke="cyan"
              dash={[4, 4]}
            />
          )}
          <Transformer ref={transformerRef} rotateEnabled={true} />
        </Layer>
      </Stage>
      {tool !== "select" && (
        <div style={{ position: "absolute", top: 80, right: 20, pointerEvents: "none" }}>
          <svg width="60" height="60">
            <circle
              cx="30"
              cy="30"
              r={thickness / 2}
              fill={tool === "eraser" ? "#0f1720" : drawColor}
              stroke="white"
            />
          </svg>
        </div>
      )}
    </div>
  );
}