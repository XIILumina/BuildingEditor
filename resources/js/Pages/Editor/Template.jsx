import React, { useState, useRef, useCallback, useEffect } from "react";
import { Stage, Layer, Line, Rect, Transformer } from "react-konva";

export default function Template({
  tool,
  lines,
  material,
  setLines,
  drawColor,
  thickness,
  gridSize,
  units,
  selectedId,
  setSelectedId
}) {
  const stageRef = useRef();
  const trRef = useRef();

  const [stageSize, setStageSize] = useState({ width: 5000, height: 5000 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [selection, setSelection] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // DRAWING LOGIC
  const handleMouseDown = (e) => {
  const stage = e.target.getStage();
  const pointer = stage.getPointerPosition();
  if (!pointer) return;

  // Always transform pointer to stage space
  const transform = stage.getAbsoluteTransform().copy();
  transform.invert();
  const pos = transform.point(pointer);

  if (tool === "select") {
    const shape = e.target;
    if (shape && shape.getAttr("id")) {
      setSelectedId(shape.getAttr("id"));
    } else {
      setSelectedId(null);
    }
  }

  if (tool === "freedraw" || tool === "wall") {
    const newLine = {
      id: Date.now(),
      points: [pos.x, pos.y],
      color: drawColor,
      thickness,
      isWall: tool === "wall",
      material: material || "Brick",
    };
    setLines([...lines, newLine]);
    setIsDrawing(true);
  }
};

  const handleMouseMove = useCallback((e) => {
    const stage = e.target.getStage();
const pointer = stage.getPointerPosition();
if (!pointer) return;

const transform = stage.getAbsoluteTransform().copy();
transform.invert();
const pos = transform.point(pointer);

if (isDrawing && (tool === "freedraw" || tool === "wall")) {
  const lastLine = lines[lines.length - 1];
  if (!lastLine) return;
  if (tool === "wall") {
    const [x0, y0] = lastLine.points;
    lastLine.points = [x0, y0, pos.x, pos.y];
  } else {
    lastLine.points = [...lastLine.points, pos.x, pos.y];
  }
  setLines([...lines]);
}
    // Selection box
    if (selection && tool === "select") {
      setSelection({
        ...selection,
        w: pointer.x - selection.x,
        h: pointer.y - selection.y
      });
    }
  }, [isDrawing, lines, tool, selection, setLines]);

const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    if (selection) {
      // find objects inside selection
      const x1 = Math.min(selection.x, selection.x + selection.w);
      const x2 = Math.max(selection.x, selection.x + selection.w);
      const y1 = Math.min(selection.y, selection.y + selection.h);
      const y2 = Math.max(selection.y, selection.y + selection.h);

      const selected = lines.find(line => {
        for (let i = 0; i < line.points.length; i += 2) {
          const x = line.points[i];
          const y = line.points[i + 1];
          if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
            return true;
          }
        }
        return false;
      });

      if (selected) setSelectedId(selected.id);
      setSelection(null);
    }
}, [selection, lines, setSelectedId]);

  // GRID GENERATOR
  const generateGridLines = () => {
    const visibleMinX = -position.x / scale - gridSize;
    const visibleMaxX = (window.innerWidth - position.x) / scale + gridSize;
    const visibleMinY = -position.y / scale - gridSize;
    const visibleMaxY = (window.innerHeight - position.y) / scale + gridSize;

    const gridLines = [];
    for (let x = Math.floor(visibleMinX / gridSize) * gridSize; x < visibleMaxX; x += gridSize) {
      gridLines.push(<Line key={`v-${x}`} points={[x, visibleMinY, x, visibleMaxY]} stroke="#4b4b4b" strokeWidth={1 / scale} />);
    }
    for (let y = Math.floor(visibleMinY / gridSize) * gridSize; y < visibleMaxY; y += gridSize) {
      gridLines.push(<Line key={`h-${y}`} points={[visibleMinX, y, visibleMaxX, y]} stroke="#4b4b4b" strokeWidth={1 / scale} />);
    }
    return gridLines;
  };

  // PAN & ZOOM
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleDragMove = (e) => {
    setPosition({ x: e.target.x(), y: e.target.y() });
  };

  useEffect(() => {
    if (trRef.current && selectedId) {
      trRef.current.nodes([stageRef.current.findOne(`#${selectedId}`)]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, lines]);

  return (
    <Stage
          width={window.innerWidth - 320}
      height={window.innerHeight - 56}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onDragMove={handleDragMove}
      onMouseUp={handleMouseUp}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      ref={stageRef}
      draggable={false} // disable LMB drag
      onContextMenu={(e) => e.evt.preventDefault()} // block default RMB menu
      onMouseDown={(e) => {
        if (e.evt.button === 2) stageRef.current.startDrag(); // RMB = pan
        else handleMouseDown(e); // normal LMB draw/select
      }}
      style={{ backgroundColor: '#1d1d1d' }}
    >
      <Layer>
        {generateGridLines()}
      </Layer>

      <Layer>
        {lines.map(line => (
          <Line
            key={line.id}
            id={line.id.toString()}
            points={line.points}   // already flat array
            stroke={line.color}
            strokeWidth={line.thickness}
            tension={line.isWall ? 0 : 0.5}
            lineCap="round"
            draggable
            onClick={() => setSelectedId(line.id)}
          />
        ))}
        {selection && (
          <Rect
            x={selection.x}
            y={selection.y}
            width={selection.w}
            height={selection.h}
            stroke="blue"
            dash={[4, 4]}
          />
        )}
        {selectedId && <Transformer ref={trRef} />}
      </Layer>
    </Stage>
  );
}
