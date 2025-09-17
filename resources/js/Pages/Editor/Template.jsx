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
  snapToGrid = true
}) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });

  // -----------------------
  // Helpers
  // -----------------------
  const getMousePos = (stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    let point = transform.point(pointer);

    // Snap to grid if enabled and not free draw
    if (snapToGrid && tool !== "freedraw") {
      point.x = Math.round(point.x / gridSize) * gridSize;
      point.y = Math.round(point.y / gridSize) * gridSize;
    }
    return point;
  };

  const addStroke = (x, y, isWall = false, isEraser = false) => {
    const newStroke = {
      id: Date.now(),
      points: [x, y],
      layer_id: activeLayerId,
      color: drawColor,
      thickness,
      isWall,
      isEraser,
      material
    };
    if (isEraser) {
      setErasers((prev) => [...prev, newStroke]);
    } else {
      setStrokes((prev) => [...prev, newStroke]);
    }
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

    if (tool === "select") {
      setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    if (tool === "freedraw" || tool === "wall") {
      setIsDrawing(true);
      addStroke(pos.x, pos.y, tool === "wall", false);
    }

    if (tool === "eraser") {
      setIsDrawing(true);
      addStroke(pos.x, pos.y, false, true);
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

    if (isDrawing && (tool === "freedraw" || tool === "wall")) {
      updateLastStroke(pos.x, pos.y);
      return;
    }

    if (selectionBox && tool === "select") {
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

    if (selectionBox && tool === "select") {
      const { x, y, width, height } = selectionBox;
      const x1 = Math.min(x, x + width);
      const x2 = Math.max(x, x + width);
      const y1 = Math.min(y, y + height);
      const y2 = Math.max(y, y + height);

      const hits = [
        ...strokes.filter(
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
        ),
        ...shapes.filter(
          (sh) =>
            sh.layer_id === activeLayerId &&
            sh.x >= x1 &&
            sh.x <= x2 &&
            sh.y >= y1 &&
            sh.y <= y2
        )
      ];

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

  // -----------------------
  // Transformer
  // -----------------------
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;

    if (Array.isArray(selectedId)) {
      const nodes = selectedId.map((id) => stage.findOne(`#${id}`)).filter(Boolean);
      tr.nodes(nodes);
    } else if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, strokes, shapes]);

  // -----------------------
  // Grid
  // -----------------------
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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ background: "#0f1720" }}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        {/* Grid Layer */}
        <Layer>{renderGrid()}</Layer>

        {/* Drawing Layer */}
        <Layer>
          {strokes
            .filter((s) => s.layer_id === activeLayerId)
            .map((s) => (
              <Line
                key={s.id}
                id={s.id.toString()}
                points={s.points}
                stroke={s.isEraser ? "white" : s.color}
                strokeWidth={s.thickness}
                globalCompositeOperation={s.isEraser ? "destination-out" : "source-over"}
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                draggable={tool === "select"}
                onClick={() => setSelectedId(s.id)}
              />
            ))}

          {erasers
            .filter((e) => e.layer_id === activeLayerId)
            .map((e) => (
              <Line
                key={e.id}
                id={e.id.toString()}
                points={e.points}
                stroke="white"
                strokeWidth={e.thickness}
                globalCompositeOperation="destination-out"
                lineCap="round"
                lineJoin="round"
                tension={0.5}
                draggable={false}
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
                    draggable={tool === "select"}
                    onClick={() => setSelectedId(sh.id)}
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
                    draggable={tool === "select"}
                    onClick={() => setSelectedId(sh.id)}
                  />
                );
              }
              return null;
            })}

          {/* Selection Box */}
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

      {/* Thickness Preview */}
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
