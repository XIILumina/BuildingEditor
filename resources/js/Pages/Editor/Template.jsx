// Template.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect, Transformer, Circle } from "react-konva";

export default function Template({
  tool = "select",
  strokes = [],
  setStrokes,
  erasers = [],
  setErasers,
  shapes = [],
  setShapes,
  drawColor = "#ffffff",
  thickness = 6,
  gridSize = 20,
  material = "Brick",
  selectedId = null,
  setSelectedId = () => {},
  layers = [],
  activeLayerId = 1,
  snapToGrid = true,
  onSave = () => {}
}) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [guides, setGuides] = useState([]);
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // -----------------------
  // Helpers
  // -----------------------
  const getMousePos = (stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    let point = transform.point(pointer);

    if (snapToGrid && tool !== "freedraw") {
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
      setSelectedId(null); // Unselect if erased
    }

    const hitShapeIds = shapes
      .filter((sh) => sh.layer_id === activeLayerId)
      .filter((sh) => {
        if (sh.type === "rect") {
          return world.x >= sh.x &&
                 world.x <= sh.x + (sh.width || 0) &&
                 world.y >= sh.y &&
                 world.y <= sh.y + (sh.height || 0);
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
      setSelectedId(null); // Unselect if erased
    }
  };

  const getSnapPositions = () => {
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
  };

  const handleDragStart = () => {
    setIsDraggingNode(true);
  };

  const handleDragMove = (e) => {
    const node = e.target;
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
      node.getLayer().batchDraw();

      setStrokes((prev) =>
        prev.map((st) =>
          st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st
        )
      );
    } else {
      setShapes((prev) =>
        prev.map((sh) =>
          sh.id === id ? { ...sh, x: node.x(), y: node.y() } : sh
        )
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
        node.getLayer().batchDraw();

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
            } else if (sh.type === "circle") {
              newSh.radius = (node.radius() || 40) * node.scaleX();
            }
            node.scaleX(1);
            node.scaleY(1);
            node.getLayer().batchDraw();
            return newSh;
          })
        );
      }
    });
  };

  const addStroke = (x, y, isWall = false, isEraser = false) => {
    const newStroke = {
      id: Date.now(),
      points: [x, y],
      x: 0,
      y: 0,
      layer_id: activeLayerId,
      color: drawColor,
      thickness,
      isWall,
      isEraser,
      material
    };
    setStrokes((prev) => [...prev, newStroke]);
  };

  const updateLastStroke = (x, y) => {
    setStrokes((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (!last) return prev;
      if (last.isWall) {
        last.points = [last.points[0], last.points[1], x, y];
      } else {
        last.points = [...last.points, x, y];
      }
      return updated;
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

    const pos = getMousePos(stage);
    if (!pos) return;

    if (tool === "select" && !isDraggingNode && e.target === stage) {
      setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      setSelectedId(null);
      return;
    }

    if (tool === "freedraw" || tool === "wall") {
      setIsDrawing(true);
      addStroke(pos.x, pos.y, tool === "wall", false);
    }

    if (tool === "eraser") {
      setIsDrawing(true);
      eraseAtPoint(pos);
    }
  };

  const handleMouseMove = (e) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = getMousePos(stage);
    if (!pos) return;

    if (isPanning) {
      setCamera((c) => ({ ...c, x: c.x + e.evt.movementX, y: c.y + e.evt.movementY }));
      return;
    }

    if (isDrawing && tool === "eraser") {
      eraseAtPoint(pos);
      return;
    }

    if (isDrawing && (tool === "freedraw" || tool === "wall")) {
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
        updateLastStroke(snappedX, snappedY);
      } else {
        updateLastStroke(pos.x, pos.y);
      }
      return;
    }

    if (selectionBox && tool === "select" && !isDraggingNode) {
      setSelectionBox({
        ...selectionBox,
        width: pos.x - selectionBox.x,
        height: pos.y - selectionBox.y
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDrawing) setIsDrawing(false);
    setGuides([]);

    if (selectionBox && tool === "select" && !isDraggingNode) {
      const { x, y, width, height } = selectionBox;
      const x1 = Math.min(x, x + width);
      const x2 = Math.max(x, x + width);
      const y1 = Math.min(y, y + height);
      const y2 = Math.max(y, y + height);

      const hitStrokes = strokes.filter(
        (s) =>
          s.layer_id === activeLayerId &&
          s.points.some(
            (_, i) =>
              i % 2 === 0 &&
              s.points[i] >= x1 &&
              s.points[i] <= x2 &&
              s.points[i + 1] >= y1 &&
              s.points[i + 1] <= y2
          )
      );

      const hitShapes = shapes.filter(
        (sh) => sh.layer_id === activeLayerId
      ).filter((sh) => {
        let left, right, top, bottom;
        if (sh.type === "rect") {
          left = sh.x;
          right = sh.x + (sh.width || 0);
          top = sh.y;
          bottom = sh.y + (sh.height || 0);
        } else if (sh.type === "circle") {
          const r = sh.radius || 0;
          left = sh.x - r;
          right = sh.x + r;
          top = sh.y - r;
          bottom = sh.y + r;
        } else {
          return false;
        }
        return left <= x2 && right >= x1 && top <= y2 && bottom >= y1;
      });

      const hits = [...hitStrokes, ...hitShapes];

      if (hits.length > 1) {
        setSelectedId(hits.map((h) => h.id));
      } else if (hits.length === 1) {
        setSelectedId(hits[0].id);
      } else {
        setSelectedId(null);
      }
      setSelectionBox(null);
    }

    console.log("Autosaving project...");
    onSave();
  };

  const renderGuides = () => {
    const range = 2000;
    return guides.map((guide, i) => {
      if (guide.orientation === 'V') {
        return <Line key={i} points={[guide.position, -range, guide.position, range]} stroke="#0ea5a7" strokeWidth={1} dash={[4, 4]} />;
      } else {
        return <Line key={i} points={[-range, guide.position, range, guide.position]} stroke="#0ea5a7" strokeWidth={1} dash={[4, 4]} />;
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
      y: (pointer.y - stage.y()) / oldScale
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.max(0.2, Math.min(4, newScale));

    const newPos = {
      x: pointer.x - mousePoint.x * clamped,
      y: pointer.y - mousePoint.y * clamped
    };

    setCamera({ x: newPos.x, y: newPos.y, scale: clamped });
  };

  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    tr.off("transformend");

    if (Array.isArray(selectedId)) {
      const nodes = selectedId.map((id) => stage.findOne(`#${id}`)).filter(Boolean);
      tr.nodes(nodes);
      if (nodes.length > 0) {
        tr.on("transformend", handleTransformEnd);
      }
    } else if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) {
        tr.nodes([node]);
        tr.on("transformend", handleTransformEnd);
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
      lines.push(
        <Line key={`v${i}`} points={[i, -2000, i, 2000]} stroke="#2b2b2b" strokeWidth={1 / camera.scale} />,
        <Line key={`h${i}`} points={[-2000, i, 2000, i]} stroke="#2b2b2b" strokeWidth={1 / camera.scale} />
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
        height={window.innerHeight - 56 - 48} // Adjust for bottom bar
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
                points={s.points}
                stroke={s.color}
                strokeWidth={s.thickness}
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
                    x={sh.x}
                    y={sh.y}
                    width={sh.width}
                    height={sh.height}
                    fill={sh.color || "#9CA3AF"}
                    rotation={sh.rotation || 0}
                    opacity={0.5}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              if (sh.type === "circle") {
                return (
                  /* definējam apļa lielumus, ja tas tiek izveidots, kā objekts.*/
                  <Circle
                    key={`bg-${sh.id}`}
                    x={sh.x}
                    y={sh.y}
                    radius={sh.radius}
                    fill={sh.color || "#9CA3AF"}
                    rotation={sh.rotation || 0}
                    opacity={0.5}
                    draggable={false}
                    listening={false}
                  />
                );
              }
              return null;
            })}
        </Layer>
        {/* Active Layer */}
        <Layer>
          {strokes
            .filter((s) => s.layer_id === activeLayerId)
            .map((s) => (
              <Line
                key={s.id}
                id={s.id.toString()}
                x={s.x || 0}
                y={s.y || 0}
                points={s.points}
                stroke={s.color}
                strokeWidth={s.thickness}
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
                    x={sh.x}
                    y={sh.y}
                    width={sh.width}
                    height={sh.height}
                    fill={sh.color || "#9CA3AF"}
                    rotation={sh.rotation || 0}
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
                    x={sh.x}
                    y={sh.y}
                    radius={sh.radius}
                    fill={sh.color || "#9CA3AF"}
                    rotation={sh.rotation || 0}
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