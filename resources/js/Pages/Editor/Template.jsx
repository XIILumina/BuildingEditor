import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect, Transformer } from "react-konva";
import { detectRooms, isPointInPolygon } from "./utils/drawingUtils";
import { num } from "./utils/shapeUtils";
import { useCamera } from "./hooks/useCamera";
import { useDrawing } from "./hooks/useDrawing";
import { usePointEditMode } from "./hooks/usePointEditMode";
import GridLayer from "./components/GridLayer";
import ShapeRenderer from "./components/ShapeRenderer";
import VertexHandles from "./components/VertexHandles";

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
  inactiveLayerOpacity = 0.3,
}) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const activeLayerRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [guides, setGuides] = useState([]);
  const isDraggingNodeRef = useRef(false);
  const lastFillRef = useRef({ sig: "", ts: 0 });

  const { camera, handleWheel, panBy } = useCamera();
  const { isDrawing, setIsDrawing, currentStroke, eraseAtPoint, startStroke, continueStroke, commitStroke } =
    useDrawing({ tool, strokes, setStrokes, shapes, setShapes, setSelectedId, activeLayerId, snapToGrid, gridSize, drawColor, thickness, material });
  const { pointEditMode, editingShapeId, editingPoints, editBtnPos, togglePointEditMode, updateEditingPoint } =
    usePointEditMode({ selectedId, shapes, setShapes, transformerRef, stageRef, activeLayerId, tool, snapToGrid, gridSize });

  const isSameLayer = (lid) => Number(lid) === Number(activeLayerId);
  const strokeNodeId = (id) => `stroke-${id}`;
  const shapeNodeId = (id) => `shape-${id}`;
  const parseEntityId = (rawId) => {
    if (!rawId) return NaN;
    const m = String(rawId).match(/^(?:stroke|shape)-(\d+)$/);
    if (m) return parseInt(m[1], 10);
    return parseInt(String(rawId), 10);
  };
  const findEntityNode = (stage, id) =>
    stage.findOne(`#${strokeNodeId(id)}`) || stage.findOne(`#${shapeNodeId(id)}`);

  const isAnchored = (maybeId) => {
    const id = typeof maybeId === "number" ? maybeId : parseInt(maybeId, 10);
    if (!Number.isFinite(id)) return false;
    const st = strokes.find(s => s.id === id && isSameLayer(s.layer_id));
    if (st && st.anchoredBlockId) return true;
    const sh = shapes.find(s => s.id === id && isSameLayer(s.layer_id));
    if (sh && sh.anchoredBlockId) return true;
    return anchoredBlocks.some(b => isSameLayer(b.layer_id) && (b.memberIds || []).includes(id));
  };

  useEffect(() => {
    setSelectedId(null);
    const tr = transformerRef.current;
    if (tr) tr.nodes([]);
  }, [activeLayerId, setSelectedId]);

  useEffect(() => {
    const idsInActive = new Set([
      ...strokes.filter(s => isSameLayer(s.layer_id) && !s.locked && !s.anchoredBlockId).map(s => s.id),
      ...shapes.filter(sh => isSameLayer(sh.layer_id) && !sh.locked && !sh.anchoredBlockId).map(sh => sh.id),
    ]);
    if (Array.isArray(selectedId)) {
      const keep = selectedId.filter(id => idsInActive.has(id));
      if (keep.length !== selectedId.length) setSelectedId(keep.length ? keep : null);
    } else if (selectedId && !idsInActive.has(selectedId)) {
      setSelectedId(null);
    }
  }, [strokes, shapes, activeLayerId, selectedId, setSelectedId]);

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage || pointEditMode) return;
    const hasFiniteRect = n => {
      try { const r = n.getClientRect(); return Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height); }
      catch { return false; }
    };
    tr.off("transformend");
    const attach = nodes => {
      const valid = nodes.filter(Boolean).filter(hasFiniteRect);
      tr.nodes(valid.length ? valid : []);
      if (valid.length) tr.on("transformend", handleTransformEnd);
    };
    if (Array.isArray(selectedId) && selectedId.length) attach(selectedId.map(id => findEntityNode(stage, id)));
    else if (!Array.isArray(selectedId) && selectedId) attach([findEntityNode(stage, selectedId)]);
    else tr.nodes([]);
    tr.getLayer()?.batchDraw();
  }, [selectedId, strokes, shapes, activeLayerId, pointEditMode]);

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

  const getSnapPositions = () => {
    const snaps = { vertical: new Set(), horizontal: new Set() };
    shapes.forEach(sh => {
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
        for (let i = 0; i < sh.points.length; i += 2) { snaps.vertical.add(sh.points[i]); snaps.horizontal.add(sh.points[i + 1]); }
      }
    });
    strokes.forEach(st => {
      if (!isSameLayer(st.layer_id)) return;
      for (let i = 0; i < st.points.length; i += 2) { snaps.vertical.add(st.points[i]); snaps.horizontal.add(st.points[i + 1]); }
    });
    return snaps;
  };

  const handleDragStart = () => { isDraggingNodeRef.current = true; };
  const handleDragMove = e => {
    const id = parseEntityId(e?.target?.id?.());
    if (isAnchored(id)) { e.target.x(0); e.target.y(0); setGuides([]); return; }
    const node = e.target;
    if (Array.isArray(selectedId) && selectedId.length > 1) { if (guides.length > 0) setGuides([]); return; }
    const snaps = getSnapPositions();
    const threshold = 5;
    const bounds = node.getClientRect({ relativeTo: node.getParent() });
    const objVerts = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
    const objHors = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];
    let minDistV = Infinity, bestDeltaV = 0, bestSvV = null;
    for (const ov of objVerts) for (const sv of snaps.vertical) { const d = Math.abs(sv - ov); if (d < threshold && d < minDistV) { minDistV = d; bestDeltaV = sv - ov; bestSvV = sv; } }
    let minDistH = Infinity, bestDeltaH = 0, bestShH = null;
    for (const oh of objHors) for (const sh of snaps.horizontal) { const d = Math.abs(sh - oh); if (d < threshold && d < minDistH) { minDistH = d; bestDeltaH = sh - oh; bestShH = sh; } }
    node.x(node.x() + bestDeltaV); node.y(node.y() + bestDeltaH);
    const newGuides = [];
    if (minDistV < threshold) newGuides.push({ orientation: "V", position: bestSvV });
    if (minDistH < threshold) newGuides.push({ orientation: "H", position: bestShH });
    setGuides(newGuides);
  };
  const handleDragEnd = e => {
    isDraggingNodeRef.current = false;
    const node = e.target;
    const id = parseEntityId(node.id());
    if (isAnchored(id)) { node.x(0); node.y(0); node.getLayer()?.batchDraw(); setGuides([]); return; }
    if (node.getClassName() === "Line") {
      const relTransform = node.getTransform();
      const newPoints = [];
      for (let i = 0; i < node.points().length; i += 2) { const w = relTransform.point({ x: node.points()[i], y: node.points()[i + 1] }); newPoints.push(w.x, w.y); }
      node.x(0); node.y(0); node.points(newPoints); node.getLayer()?.batchDraw();
      setStrokes(prev => prev.map(st => st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st));
    } else {
      setShapes(prev => prev.map(sh => {
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
    (transformerRef.current?.nodes() || []).forEach(node => {
      const id = parseEntityId(node.id());
      if (isAnchored(id)) { node.x(0); node.y(0); node.scaleX(1); node.scaleY(1); node.rotation(0); node.getLayer()?.batchDraw(); return; }
      if (node.getClassName() === "Line") {
        const relTransform = node.getTransform();
        const newPoints = [];
        for (let i = 0; i < node.points().length; i += 2) { const w = relTransform.point({ x: node.points()[i], y: node.points()[i + 1] }); newPoints.push(w.x, w.y); }
        node.x(0); node.y(0); node.scaleX(1); node.scaleY(1); node.rotation(0); node.points(newPoints); node.getLayer()?.batchDraw();
        setStrokes(prev => prev.map(st => st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st));
      } else {
        setShapes(prev => prev.map(sh => {
          if (sh.id !== id) return sh;
          let newSh = { ...sh, x: node.x(), y: node.y(), rotation: node.rotation() };
          if (sh.type === "rect") { newSh.width = (node.width() || 80) * node.scaleX(); newSh.height = (node.height() || 60) * node.scaleY(); node.scaleX(1); node.scaleY(1); }
          else if (sh.type === "circle") { newSh.radius = (node.radius() || 40) * Math.max(node.scaleX(), node.scaleY()); node.scaleX(1); node.scaleY(1); }
          else if (sh.type === "oval") {
            const rx = typeof node.radiusX === "function" ? node.radiusX() : (sh.radiusX || 0);
            const ry = typeof node.radiusY === "function" ? node.radiusY() : (sh.radiusY || 0);
            newSh.radiusX = rx * node.scaleX(); newSh.radiusY = ry * node.scaleY(); node.scaleX(1); node.scaleY(1);
          } else if (sh.type === "polygon") {
            const relTransform = node.getTransform();
            const newPoints = [];
            for (let i = 0; i < sh.points.length; i += 2) { const w = relTransform.point({ x: sh.points[i], y: sh.points[i + 1] }); newPoints.push(w.x, w.y); }
            newSh.points = newPoints; newSh.x = 0; newSh.y = 0; newSh.rotation = 0;
            node.x(0); node.y(0); node.scaleX(1); node.scaleY(1); node.rotation(0);
          }
          node.getLayer()?.batchDraw();
          return newSh;
        }));
      }
    });
  };

  const handleSelectObject = (id, e) => {
    if (tool !== "select") return;
    // Allow selecting anchored objects by direct click, just not locked ones
    if (strokes.some(s => s.id === id && s.locked) || shapes.some(s => s.id === id && s.locked)) return;
    if (e?.evt?.ctrlKey || e?.evt?.metaKey) {
      setSelectedId(prev => {
        const arr = Array.isArray(prev) ? prev : (prev ? [prev] : []);
        if (arr.includes(id)) return arr.filter(i => i !== id).length ? arr.filter(i => i !== id) : null;
        return [...arr, id];
      });
    } else {
      setSelectedId(id);
    }
  };

  const shapeToBoundarySegments = (sh) => {
    if (!sh) return [];
    if (sh.type === "rect") {
      const x = num(sh.x);
      const y = num(sh.y);
      const w = num(sh.width, 0);
      const h = num(sh.height, 0);
      if (w <= 0 || h <= 0) return [];
      return [
        { p1: [x, y], p2: [x + w, y] },
        { p1: [x + w, y], p2: [x + w, y + h] },
        { p1: [x + w, y + h], p2: [x, y + h] },
        { p1: [x, y + h], p2: [x, y] },
      ];
    }
    if (sh.type === "polygon" && Array.isArray(sh.points) && sh.points.length >= 6) {
      const offX = num(sh.x);
      const offY = num(sh.y);
      const pts = [];
      for (let i = 0; i < sh.points.length; i += 2) {
        pts.push([num(sh.points[i]) + offX, num(sh.points[i + 1]) + offY]);
      }
      const segs = [];
      for (let i = 0; i < pts.length; i++) {
        segs.push({ p1: pts[i], p2: pts[(i + 1) % pts.length] });
      }
      return segs;
    }
    return [];
  };

  const getFillBoundaries = () => {
    const lineSegments = strokes
      .filter(s => isSameLayer(s.layer_id) && Array.isArray(s.points) && s.points.length >= 4)
      .flatMap((s) => {
        const segs = [];
        for (let i = 0; i <= s.points.length - 4; i += 2) {
          const x1 = num(s.points[i]);
          const y1 = num(s.points[i + 1]);
          const x2 = num(s.points[i + 2]);
          const y2 = num(s.points[i + 3]);
          segs.push({ p1: [x1, y1], p2: [x2, y2] });
        }
        return segs;
      });

    const shapeSegments = shapes
      .filter(sh => isSameLayer(sh.layer_id))
      .flatMap(shapeToBoundarySegments);

    return [...lineSegments, ...shapeSegments];
  };

  const handleMouseDown = e => {
    const stage = stageRef.current;
    if (!stage) return;
    if (pointEditMode && (e.target === stage || e.target.getClassName?.() === "Layer")) { togglePointEditMode(); return; }
    if (tool !== "select" && selectedId) { setSelectedId(null); transformerRef.current?.nodes([]); }
    if (e.evt.button === 2) { setIsPanning(true); return; }
    let pos = getMousePos(stage);
    if (!pos) return;
    if (tool === "select" && !isDraggingNodeRef.current && (e.target === stage || e.target.getClassName?.() === "Layer")) {
      if (!e.evt.ctrlKey && !e.evt.metaKey) { setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 }); setSelectedId(null); }
      return;
    }
    if (tool === "select") {
      const cls = e.target?.getClassName?.();
      if (!["Line", "Rect", "Circle", "Ellipse", "Path"].includes(cls) && !e.evt.ctrlKey && !e.evt.metaKey) setSelectedId(null);
    }
    if (tool === "fill") {
      const boundaries = getFillBoundaries();
      const { rooms } = detectRooms(boundaries);
      const containingRoom = rooms.find(roomPoints => isPointInPolygon([pos.x, pos.y], roomPoints));
      if (containingRoom) {
        const pts = containingRoom.flat();
        const sig = `${activeLayerId}|${drawColor}|${pts.map(v => Number(v).toFixed(3)).join(",")}`;
        const now = Date.now();
        // React strict/dev or duplicated pointer events can trigger fill twice.
        // Skip identical fill operations fired almost at the same time.
        if (lastFillRef.current.sig === sig && now - lastFillRef.current.ts < 250) return;
        lastFillRef.current = { sig, ts: now };
        setShapes(prev => [...prev, {
          id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
          type: "polygon",
          points: pts,
          fill: drawColor,
          color: drawColor,
          closed: true,
          layer_id: activeLayerId,
        }]);
      }
      return;
    }
    if (tool === "picker") {
      const p = stage.getPointerPosition();
      if (p) { const node = stage.getIntersection(p); if (node) setDrawColor(node.fill() || node.stroke() || "#ffffff"); }
      return;
    }
    if (tool === "freedraw" || tool === "wall") { if (snapToGrid) pos = getMousePos(stage, true); startStroke(pos); }
    if (tool === "eraser") { setIsDrawing(true); eraseAtPoint(pos); }
  };

  const handleMouseMove = e => {
    const stage = stageRef.current;
    if (!stage) return;
    let pos = getMousePos(stage);
    if (!pos) return;
    if (isPanning) { panBy(e.evt.movementX, e.evt.movementY); return; }
    if (isDrawing && tool === "eraser") { eraseAtPoint(pos); return; }
    if (isDrawing && currentStroke && (tool === "freedraw" || tool === "wall")) { continueStroke(pos, getSnapPositions(), setGuides); return; }
    if (selectionBox && tool === "select" && !isDraggingNodeRef.current) setSelectionBox({ ...selectionBox, width: pos.x - selectionBox.x, height: pos.y - selectionBox.y });
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDrawing) {
      if (tool === "freedraw" || tool === "wall") commitStroke(getMousePos(stageRef.current));
      else setIsDrawing(false);
    }
    setGuides([]);
    if (selectionBox && tool === "select" && !isDraggingNodeRef.current) {
      const { x, y, width, height } = selectionBox;
      const x1 = Math.min(x, x + width), x2 = Math.max(x, x + width);
      const y1 = Math.min(y, y + height), y2 = Math.max(y, y + height);
      const layer = activeLayerRef.current;
      const intersectsRect = rect => !(rect.x + rect.width < x1 || rect.x > x2 || rect.y + rect.height < y1 || rect.y > y2);
      const nodes = layer ? layer.find(n => { const cls = n.getClassName?.(); return ["Line","Rect","Circle","Ellipse","Path"].includes(cls) && n.id?.(); }) : [];
      const hitIds = nodes
        .filter(n => { try { return intersectsRect(n.getClientRect({ relativeTo: layer })); } catch { return false; } })
        .map(n => parseEntityId(n.id())).filter(id => Number.isFinite(id))
        .filter(id => {
          const st = strokes.find(s => s.id === id); if (st && (st.locked || st.anchoredBlockId)) return false;
          const sh = shapes.find(s => s.id === id); if (sh && (sh.locked || sh.anchoredBlockId)) return false;
          return true;
        });
      const hits = Array.from(new Set(hitIds));
      if (hits.length > 1) setSelectedId(hits); else if (hits.length === 1) setSelectedId(hits[0]); else setSelectedId(null);
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

  const shapeEvents = { onSelect: handleSelectObject, onDragStart: handleDragStart, onDragMove: handleDragMove, onDragEnd: handleDragEnd };
  const stageWidth = window.innerWidth - 320;
  const stageHeight = window.innerHeight - 56 - 48;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={camera.scale} scaleY={camera.scale}
        x={camera.x} y={camera.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={e => handleWheel(e, stageRef)}
        style={{ background: "#0f1720" }}
        onContextMenu={e => e.evt.preventDefault()}
      >
        <Layer listening={false}><GridLayer gridSize={gridSize} scale={camera.scale} camera={camera} viewportWidth={stageWidth} viewportHeight={stageHeight} /></Layer>
        <Layer listening={false}>{renderGuides()}</Layer>
        <Layer listening={false}>
          {strokes.filter(s => !isSameLayer(s.layer_id)).map(s => (
            <Line key={`bg-${s.id}`} x={num(s.x)} y={num(s.y)} points={s.points.map(p => num(p))} stroke={s.color} strokeWidth={num(s.thickness, 1)} lineCap="round" lineJoin="round" tension={0.5} opacity={inactiveLayerOpacity} listening={false} />
          ))}
          {shapes.filter(sh => !isSameLayer(sh.layer_id)).map(sh => (
            <ShapeRenderer key={`bg-${sh.id}`} sh={sh} inactive prefix="bg-" inactiveLayerOpacity={inactiveLayerOpacity} tool={tool} />
          ))}
        </Layer>
        <Layer listening={false}>
          {previewStrokes.filter(s => isSameLayer(s.layer_id)).map(s => (
            <Line key={`preview-${s.id}`} x={num(s.x)} y={num(s.y)} points={s.points.map(p => num(p))} stroke={s.color} strokeWidth={num(s.thickness, 1)} lineCap="round" lineJoin="round" tension={0.5} dash={[5, 5]} opacity={0.7} listening={false} />
          ))}
          {previewShapes.filter(sh => isSameLayer(sh.layer_id)).map(sh => (
            <ShapeRenderer key={`preview-${sh.id}`} sh={sh} preview prefix="preview-" inactiveLayerOpacity={inactiveLayerOpacity} tool={tool} />
          ))}
        </Layer>
        <Layer ref={activeLayerRef}>
          {strokes.filter(s => isSameLayer(s.layer_id)).map(s => (
            <Line key={`stroke-${s.id}`} id={strokeNodeId(s.id)} x={num(s.x)} y={num(s.y)} points={s.points.map(p => num(p))} stroke={s.color} strokeWidth={num(s.thickness, 1)} lineCap="round" lineJoin="round" tension={0.5} draggable={tool === "select" && !s.locked && !s.anchoredBlockId} onClick={e => !s.locked && handleSelectObject(s.id, e)} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />
          ))}
          {shapes.filter(sh => isSameLayer(sh.layer_id)).map(sh => (
            <ShapeRenderer key={`shape-${sh.id}`} nodeId={shapeNodeId(sh.id)} sh={sh} tool={tool} inactiveLayerOpacity={inactiveLayerOpacity} {...shapeEvents} />
          ))}
          {pointEditMode && <VertexHandles editingPoints={editingPoints} scale={camera.scale} snapToGrid={snapToGrid} gridSize={gridSize} onUpdate={updateEditingPoint} />}
          {mergedBlocks.filter(b => b.layer_id === activeLayerId).map(b => (
            <Rect key={`block-${b.id}`} x={num(b.x)} y={num(b.y)} width={num(b.width)} height={num(b.height)} fill="rgba(6,182,212,0.08)" stroke="#06b6d4" strokeWidth={1} dash={[6, 6]} listening={true} onClick={e => { e.cancelBubble = true; onUnmergeBlock(b.id); }} draggable={false} />
          ))}
          {anchoredBlocks.filter(b => b.layer_id === activeLayerId).map(b => (
            <Rect key={`anchor-${b.id}`} x={num(b.x)} y={num(b.y)} width={num(b.width)} height={num(b.height)} fill="rgba(234,179,8,0.08)" stroke="#f59e0b" strokeWidth={1.5} dash={[8, 4]} listening={false} draggable={false} />
          ))}
          {currentStroke && <Line points={currentStroke.points.map(p => num(p))} stroke={currentStroke.color} strokeWidth={num(currentStroke.thickness, 1)} lineCap="round" lineJoin="round" tension={0.5} listening={false} />}
          {selectionBox && <Rect x={Math.min(selectionBox.x, selectionBox.x + selectionBox.width)} y={Math.min(selectionBox.y, selectionBox.y + selectionBox.height)} width={Math.abs(selectionBox.width)} height={Math.abs(selectionBox.height)} stroke="cyan" dash={[4, 4]} />}
          <Transformer ref={transformerRef} rotateEnabled={true} />
        </Layer>
      </Stage>

      {!Array.isArray(selectedId) && selectedId && editBtnPos && !pointEditMode && (
        <button style={{ position: "absolute", left: editBtnPos.x, top: editBtnPos.y, zIndex: 100, pointerEvents: "auto" }} onClick={togglePointEditMode} className="flex items-center gap-1 bg-[#1e293b] border border-[#06b6d4] text-[#06b6d4] text-xs px-2 py-1 rounded-lg shadow-lg hover:bg-[#06b6d4] hover:text-[#071021] transition-colors" title="Edit vertices">
          ✦ Edit Points
        </button>
      )}
      {pointEditMode && (
        <button style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 100 }} onClick={togglePointEditMode} className="flex items-center gap-2 bg-[#06b6d4] text-[#071021] text-xs font-bold px-4 py-1.5 rounded-full shadow-lg hover:bg-[#0891b2] transition-colors">
          ✓ Done Editing Points
        </button>
      )}
      {tool !== "select" && (
        <div style={{ position: "absolute", top: 80, right: 20, pointerEvents: "none" }}>
          <svg width="60" height="60"><circle cx="30" cy="30" r={thickness / 2} fill={tool === "eraser" ? "#0f1720" : drawColor} stroke="white" /></svg>
        </div>
      )}
    </div>
  );
}