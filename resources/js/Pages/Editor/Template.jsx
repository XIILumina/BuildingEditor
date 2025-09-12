// Template.jsx
import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect, Circle, Ellipse, Transformer } from "react-konva";

export default function Template({
  tool = "select",
  strokes = [],
  setStrokes = () => {},
  shapes = [],
  setShapes = () => {},
  drawColor = "#fff",
  thickness = 6,
  gridSize = 20,           // Adjustable default; 0 disables
  snapEnabled = false,     // Toggle from sidepanel
  material = "Brick",
  selectedId = null,
  setSelectedId = () => {}
}) {
  const stageRef = useRef();
  const trRef = useRef();

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [selectionBox, setSelectionBox] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);
  const [guides, setGuides] = useState([]);

  const snap = (val, size) => (size > 0 ? Math.round(val / size) * size : val);
  const maybeSnap = (pos) => {
    if (!pos) return null;
    if (tool === "wall" || snapEnabled) {
      return { x: snap(pos.x, gridSize), y: snap(pos.y, gridSize) };
    }
    return pos;
  };

  // Convert pointer to world coordinates
  const pointerToWorld = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getPointerPosition();
    if (!p) return null;
    const tr = stage.getAbsoluteTransform().copy();
    tr.invert();
    return tr.point(p);
  };

  // Save handler
  const saveProject = (skipLog = false) => {
    if (!skipLog) console.log("Auto-saving project...");
    // TODO: implement API/localStorage save
  };
  useEffect(() => {
    const int = setInterval(() => saveProject(true), 15000); // fallback save every 15s
    return () => clearInterval(int);
  }, []);
  useEffect(() => {
    if (!isDrawing) saveProject(); // save on change except while drawing
  }, [strokes, shapes]);

  // Helper: distance from point to line segment
  const distToSegment = (px, py, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.hypot(px - projX, py - projY);
  };

  // Eraser helper: remove objects at point
  const eraseAtPoint = (world) => {
    const hitStrokeIds = strokes
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

    const hitShapeIds = shapes
      .filter((sh) => {
        if (sh.type === "rect") {
          return (
            world.x >= sh.x &&
            world.x <= sh.x + sh.width &&
            world.y >= sh.y &&
            world.y <= sh.y + sh.height
          );
        } else if (sh.type === "circle") {
          const dx = world.x - sh.x;
          const dy = world.y - sh.y;
          return Math.sqrt(dx * dx + dy * dy) <= sh.radius;
        } else if (sh.type === "ellipse") {
          const dx = (world.x - sh.x) / (sh.radiusX || 40);
          const dy = (world.y - sh.y) / (sh.radiusY || 20);
          return dx * dx + dy * dy <= 1;
        } else if (sh.type === "triangle") {
          return (
            world.x >= sh.x &&
            world.x <= sh.x + sh.size &&
            world.y >= sh.y &&
            world.y <= sh.y + sh.size
          );
        }
        return false;
      })
      .map((sh) => sh.id);

    if (hitStrokeIds.length || hitShapeIds.length) {
      setStrokes((s) => s.filter((st) => !hitStrokeIds.includes(st.id)));
      setShapes((s) => s.filter((sh) => !hitShapeIds.includes(sh.id)));
    }
  };

  // Mouse down
  const onMouseDown = (e) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (e.evt.button === 2) {
      setIsPanning(true);
      panStart.current = stage.getPointerPosition();
      return;
    }

    const world = maybeSnap(pointerToWorld());
    if (!world) return;

    if (tool === "select") {
      setSelectionBox({ x: world.x, y: world.y, w: 0, h: 0 });
      setSelectedId(null);
      return;
    }

    if (tool === "eraser") {
      eraseAtPoint(world);
      setIsDrawing(true);
      return;
    }

    if (tool === "freedraw" || tool === "wall") {
      setIsDrawing(true);
      const id = Date.now() + Math.floor(Math.random() * 10000);
      const newS = {
        id,
        points: [world.x, world.y],
        color: drawColor,
        thickness,
        isWall: tool === "wall",
        material,
      };
      setStrokes((s) => [...s, newS]);
      return;
    }
  };

  // Mouse move
  const onMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const world = maybeSnap(pointerToWorld());
    setCursorPos(world);

    if (isPanning) {
      const ptr = stage.getPointerPosition();
      const dx = ptr.x - panStart.current.x;
      const dy = ptr.y - panStart.current.y;
      setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
      panStart.current = ptr;
      return;
    }

    if (isDrawing) {
      if (tool === "eraser") {
        eraseAtPoint(world);
        return;
      }
      setStrokes((prev) => {
        const arr = [...prev];
        const last = arr[arr.length - 1];
        if (!last) return prev;
        if (last.isWall) {
          const [x0, y0] = [last.points[0], last.points[1]];
          last.points = [x0, y0, world.x, world.y];
        } else {
          last.points = [...last.points, world.x, world.y];
        }
        return arr;
      });
      return;
    }

    if (selectionBox && tool === "select" && world) {
      setSelectionBox((s) => ({ ...s, w: world.x - s.x, h: world.y - s.y }));
    }
  };

  // Mouse up
  const onMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (isDrawing) {
      setIsDrawing(false);
      saveProject(); // Ensure save after drawing completes
    }

    if (selectionBox && tool === "select") {
      const sx = Math.min(selectionBox.x, selectionBox.x + selectionBox.w);
      const ex = Math.max(selectionBox.x, selectionBox.x + selectionBox.w);
      const sy = Math.min(selectionBox.y, selectionBox.y + selectionBox.h);
      const ey = Math.max(selectionBox.y, selectionBox.y + selectionBox.h);

      const hitsStrokes = strokes.filter((st) =>
        st.points.some((p, idx) =>
          idx % 2 === 0 &&
          p >= sx && p <= ex &&
          st.points[idx + 1] >= sy &&
          st.points[idx + 1] <= ey
        )
      );
      const hitsShapes = shapes.filter(
        (sh) => sh.x >= sx && sh.x <= ex && sh.y >= sy && sh.y <= ey
      );

      const ids = [...hitsStrokes.map((s) => s.id), ...hitsShapes.map((s) => s.id)];
      if (ids.length === 0) setSelectedId(null);
      else if (ids.length === 1) setSelectedId(ids[0]);
      else setSelectedId(ids);
      setSelectionBox(null);
    }
  };

  // Wheel zoom
  const onWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = camera.scale;
    const scaleBy = 1.05;
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.max(0.2, Math.min(4, newScale));
    const newX = pointer.x - mousePointTo.x * clamped;
    const newY = pointer.y - mousePointTo.y * clamped;
    setCamera({ x: newX, y: newY, scale: clamped });
  };

  // Transformer attach (only in select mode)
  useEffect(() => {
    const tr = trRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (tool !== "select") {
      tr.nodes([]);
      return;
    }

    let nodes = [];
    if (Array.isArray(selectedId)) {
      nodes = selectedId.map((id) => stage.findOne(`#${id}`)).filter(Boolean);
    } else if (selectedId) {
      const n = stage.findOne(`#${selectedId}`);
      if (n) nodes = [n];
    }
    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedId, strokes, shapes, tool]);

  // Shape transform handler
  const handleShapeTransformEnd = (e, shape) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    const newX = snap(node.x(), gridSize);
    const newY = snap(node.y(), gridSize);

    let newShape;
    if (shape.type === "rect") {
      newShape = {
        ...shape,
        x: newX,
        y: newY,
        width: Math.max(5, (shape.width || 80) * scaleX),
        height: Math.max(5, (shape.height || 60) * scaleY),
        rotation,
      };
    } else if (shape.type === "circle") {
      newShape = {
        ...shape,
        x: newX,
        y: newY,
        radius: Math.max(5, (shape.radius || 40) * Math.max(scaleX, scaleY)),
        rotation,
      };
    } else if (shape.type === "ellipse") {
      newShape = {
        ...shape,
        x: newX,
        y: newY,
        radiusX: Math.max(5, (shape.radiusX || 40) * scaleX),
        radiusY: Math.max(5, (shape.radiusY || 20) * scaleY),
        rotation,
      };
    } else if (shape.type === "triangle") {
      const avgScale = (scaleX + scaleY) / 2;
      newShape = {
        ...shape,
        x: newX,
        y: newY,
        size: Math.max(5, (shape.size || 80) * avgScale),
        rotation,
      };
    }

    if (newShape) {
      setShapes((s) => s.map((sh) => (sh.id === shape.id ? newShape : sh)));
    }

    node.position({ x: 0, y: 0 });
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);
  };

  // Stroke transform handler (drag, scale, rotate)
  const handleStrokeTransformEnd = (e, stroke) => {
    const node = e.target;
    const transform = node.getAbsoluteTransform();

    const pts = [];
    for (let i = 0; i < stroke.points.length; i += 2) {
      pts.push({ x: stroke.points[i], y: stroke.points[i + 1] });
    }

    const newPts = pts.map((pt) => transform.point(pt));
    let flat = newPts.flatMap((p) => [p.x, p.y]);

    // Snap each point if snapEnabled
    if (snapEnabled) {
      flat = flat.map((val) => snap(val, gridSize));
    }

    node.position({ x: 0, y: 0 });
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);

    setStrokes((s) =>
      s.map((st) => (st.id === stroke.id ? { ...st, points: flat } : st))
    );
  };

  // Collect snap lines from all objects
  const getSnapPositions = () => {
    const snaps = { vertical: new Set(), horizontal: new Set() };

    // From shapes
    shapes.forEach((sh) => {
      if (sh.type === "rect") {
        snaps.vertical.add(sh.x);
        snaps.vertical.add(sh.x + (sh.width || 80) / 2);
        snaps.vertical.add(sh.x + (sh.width || 80));
        snaps.horizontal.add(sh.y);
        snaps.horizontal.add(sh.y + (sh.height || 60) / 2);
        snaps.horizontal.add(sh.y + (sh.height || 60));
      } else if (sh.type === "circle") {
        snaps.vertical.add(sh.x - (sh.radius || 40));
        snaps.vertical.add(sh.x);
        snaps.vertical.add(sh.x + (sh.radius || 40));
        snaps.horizontal.add(sh.y - (sh.radius || 40));
        snaps.horizontal.add(sh.y);
        snaps.horizontal.add(sh.y + (sh.radius || 40));
      } else if (sh.type === "ellipse") {
        snaps.vertical.add(sh.x - (sh.radiusX || 40));
        snaps.vertical.add(sh.x);
        snaps.vertical.add(sh.x + (sh.radiusX || 40));
        snaps.horizontal.add(sh.y - (sh.radiusY || 20));
        snaps.horizontal.add(sh.y);
        snaps.horizontal.add(sh.y + (sh.radiusY || 20));
      } else if (sh.type === "triangle") {
        const size = sh.size || 80;
        snaps.vertical.add(sh.x);
        snaps.vertical.add(sh.x + size / 2);
        snaps.vertical.add(sh.x + size);
        snaps.horizontal.add(sh.y - size);
        snaps.horizontal.add(sh.y - size / 2);
        snaps.horizontal.add(sh.y);
      }
    });

    // From strokes (endpoints and midpoints)
    strokes.forEach((st) => {
      for (let i = 0; i < st.points.length; i += 2) {
        snaps.vertical.add(st.points[i]);
        snaps.horizontal.add(st.points[i + 1]);
      }
      for (let i = 0; i < st.points.length - 2; i += 2) {
        const midX = (st.points[i] + st.points[i + 2]) / 2;
        const midY = (st.points[i + 1] + st.points[i + 3]) / 2;
        snaps.vertical.add(midX);
        snaps.horizontal.add(midY);
      }
    });

    return snaps;
  };

  // Handle drag move for alignment
  const handleDragMove = (e, isStroke = false) => {
    const node = e.target;
    const snaps = getSnapPositions();
    const threshold = 5; // snap threshold in world units

    const bounds = node.getClientRect({ relativeTo: node.getParent() });
    const pos = node.position();

    // Possible align positions for this object
    const objVerts = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
    const objHors = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

    let newX = pos.x;
    let newY = pos.y;
    const newGuides = [];

    // Check vertical alignment (x)
    for (const ov of objVerts) {
      for (const sv of snaps.vertical) {
        const delta = sv - ov;
        if (Math.abs(delta) < threshold) {
          newX += delta;
          newGuides.push({ orientation: 'V', position: sv });
          break;
        }
      }
    }

    // Check horizontal alignment (y)
    for (const oh of objHors) {
      for (const sh of snaps.horizontal) {
        const delta = sh - oh;
        if (Math.abs(delta) < threshold) {
          newY += delta;
          newGuides.push({ orientation: 'H', position: sh });
          break;
        }
      }
    }

    node.position({ x: newX, y: newY });
    setGuides(newGuides);
  };

  // Clear guides on drag end
  const handleDragEnd = (e, obj, isStroke = false) => {
    setGuides([]);
    if (isStroke) {
      handleStrokeTransformEnd(e, obj);
    } else {
      handleShapeTransformEnd(e, obj);
    }
  };

  // Grid rendering
  const renderGrid = () => {
    if (gridSize <= 0) return null;
    const g = [];
    const size = gridSize;
    const range = 2000;
    for (let i = -range; i < range; i += size) {
      g.push(
        <Line key={`gv${i}`} points={[i, -range, i, range]} stroke="#232323" strokeWidth={1 / camera.scale} />
      );
      g.push(
        <Line key={`gh${i}`} points={[-range, i, range, i]} stroke="#232323" strokeWidth={1 / camera.scale} />
      );
    }
    return g;
  };

  // Render guides
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

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Stage
        ref={stageRef}
        width={window.innerWidth - 320}
        height={window.innerHeight - 56}
        scaleX={camera.scale}
        scaleY={camera.scale}
        x={camera.x}
        y={camera.y}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onWheel={onWheel}
        style={{ background: "#0f1720", cursor: tool === "select" ? "default" : "none" }}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>{renderGrid()}</Layer>

        {/* STROKES */}
        <Layer>
          {strokes.map((st) => (
            <Line
              key={st.id}
              id={st.id.toString()}
              points={st.points}
              stroke={st.color}
              strokeWidth={st.thickness}
              tension={st.isWall ? 0 : 0.5}
              lineCap="round"
              lineJoin="round"
              draggable={tool === "select"}
              onClick={(e) => { e.cancelBubble = true; setSelectedId(st.id); }}
              onDragMove={(e) => handleDragMove(e, true)}
              onDragEnd={(e) => handleDragEnd(e, st, true)}
              onTransformEnd={(e) => handleStrokeTransformEnd(e, st)}
            />
          ))}
        </Layer>

        {/* SHAPES */}
        <Layer>
          {shapes.map((s) =>
            s.type === "rect" ? (
              <Rect
                key={s.id}
                id={s.id.toString()}
                x={s.x}
                y={s.y}
                width={s.width || 80}
                height={s.height || 60}
                fill={s.color || "#9CA3AF"}
                draggable={tool === "select"}
                onClick={(e) => { e.cancelBubble = true; setSelectedId(s.id); }}
                onDragMove={(e) => handleDragMove(e)}
                onDragEnd={(e) => handleDragEnd(e, s)}
                onTransformEnd={(e) => handleShapeTransformEnd(e, s)}
              />
            ) : s.type === "circle" ? (
              <Circle
                key={s.id}
                id={s.id.toString()}
                x={s.x}
                y={s.y}
                radius={s.radius || 40}
                fill={s.color || "#9CA3AF"}
                draggable={tool === "select"}
                onClick={(e) => { e.cancelBubble = true; setSelectedId(s.id); }}
                onDragMove={(e) => handleDragMove(e)}
                onDragEnd={(e) => handleDragEnd(e, s)}
                onTransformEnd={(e) => handleShapeTransformEnd(e, s)}
              />
            ) : s.type === "ellipse" ? (
              <Ellipse
                key={s.id}
                id={s.id.toString()}
                x={s.x}
                y={s.y}
                radiusX={s.radiusX || 40}
                radiusY={s.radiusY || 20}
                fill={s.color || "#9CA3AF"}
                draggable={tool === "select"}
                onClick={(e) => { e.cancelBubble = true; setSelectedId(s.id); }}
                onDragMove={(e) => handleDragMove(e)}
                onDragEnd={(e) => handleDragEnd(e, s)}
                onTransformEnd={(e) => handleShapeTransformEnd(e, s)}
              />
            ) : s.type === "triangle" ? (
              <Line
                key={s.id}
                id={s.id.toString()}
                points={[
                  s.x,
                  s.y,
                  s.x + (s.size || 80),
                  s.y,
                  s.x + (s.size || 40),
                  s.y - (s.size || 80),
                ]}
                closed
                fill={s.color || "#f59e0b"}
                draggable={tool === "select"}
                onClick={(e) => { e.cancelBubble = true; setSelectedId(s.id); }}
                onDragMove={(e) => handleDragMove(e)}
                onDragEnd={(e) => handleDragEnd(e, s)}
                onTransformEnd={(e) => handleShapeTransformEnd(e, s)}
              />
            ) : null
          )}
        </Layer>

        {/* Selection box & transformer & guides */}
        <Layer>
          {selectionBox && (
            <Rect
              x={Math.min(selectionBox.x, selectionBox.x + selectionBox.w)}
              y={Math.min(selectionBox.y, selectionBox.y + selectionBox.h)}
              width={Math.abs(selectionBox.w)}
              height={Math.abs(selectionBox.h)}
              stroke="#0ea5a7"
              dash={[6, 6]}
              strokeWidth={1 / camera.scale}
            />
          )}
          <Transformer
            ref={trRef}
            rotateEnabled={true}
            resizeEnabled={true}
            anchorFill="#0ea5a7"
            anchorStroke="#002"
            anchorSize={8}
            borderStroke="#0ea5a7"
            enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
            keepRatio={false}
          />
          {renderGuides()}
        </Layer>

        {/* Cursor preview */}
        <Layer listening={false}>
          {cursorPos && tool !== "select" && (
            <Circle
              x={cursorPos.x}
              y={cursorPos.y}
              radius={thickness / 2}
              stroke="#fff"
              strokeWidth={1}
              fill={tool === "eraser" ? "#0f1720" : drawColor}
              opacity={0.9}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}