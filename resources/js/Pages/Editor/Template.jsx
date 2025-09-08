import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';

export default function Template({
  tool = 'select',
  lines = [],
  setLines,
  drawColor = '#fff',
  thickness = 6,
  gridSize = 20,
  units = 'Metric'
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const measure = () => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setStageSize({ width: Math.floor(r.width), height: Math.floor(r.height) });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // prevent context menu on stage
  useEffect(() => {
    const el = stageRef.current?.container();
    if (!el) return;
    const prevent = (ev) => ev.preventDefault();
    el.addEventListener('contextmenu', prevent);
    return () => el.removeEventListener('contextmenu', prevent);
  }, []);

  const handleMouseDown = useCallback((e) => {
    const evt = e.evt || {};
    const pointer = e.target.getStage().getPointerPosition();
    if (!pointer) return;

    // right or middle = pan
    if (evt.button === 2 || evt.button === 1) {
      setIsPanning(true);
      panStart.current = { x: pointer.x - position.x, y: pointer.y - position.y };
      return;
    }

    if (tool === 'freedraw' || tool === 'wall') {
      setIsDrawing(true);
      const snapX = Math.round((pointer.x - position.x) / gridSize) * gridSize;
      const snapY = Math.round((pointer.y - position.y) / gridSize) * gridSize;
      setLines(prev => [...prev, { points: [snapX, snapY], isWall: tool === 'wall', thickness, color: drawColor }]);
    }
  }, [tool, position, gridSize, thickness, drawColor, setLines]);

  const handleMouseMove = useCallback((e) => {
    const pointer = e.target.getStage().getPointerPosition();
    if (!pointer) return;

    if (isPanning) {
      setPosition({ x: pointer.x - panStart.current.x, y: pointer.y - panStart.current.y });
      return;
    }

    if (!isDrawing) return;
    setLines(prev => {
      const arr = [...prev];
      const last = arr[arr.length - 1];
      if (!last) return arr;
      if (last.isWall) {
        const snapX = Math.round((pointer.x - position.x) / gridSize) * gridSize;
        const snapY = Math.round((pointer.y - position.y) / gridSize) * gridSize;
        last.points = [last.points[0], last.points[1], snapX, snapY];
      } else {
        last.points = last.points.concat([pointer.x - position.x, pointer.y - position.y]);
      }
      arr.splice(arr.length - 1, 1, last);
      return arr;
    });
  }, [isDrawing, isPanning, setLines, position, gridSize]);

  const handleMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
    if (isDrawing) setIsDrawing(false);
  }, [isDrawing, isPanning]);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.08;
    const direction = e.evt.deltaY > 0 ? 1 : -1;
    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clamped = Math.max(0.2, Math.min(4, newScale));

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    const newPos = {
      x: pointer.x - mousePointTo.x * clamped,
      y: pointer.y - mousePointTo.y * clamped,
    };

    setScale(clamped);
    setPosition(newPos);
  }, [scale, position]);

  const renderGrid = () => {
    const safeScale = scale || 1;
    const safePos = position || { x: 0, y: 0 };
    const visibleMinX = Math.floor((-safePos.x) / safeScale / gridSize) * gridSize - gridSize * 2;
    const visibleMaxX = Math.ceil((stageSize.width - safePos.x) / safeScale / gridSize) * gridSize + gridSize * 2;
    const visibleMinY = Math.floor((-safePos.y) / safeScale / gridSize) * gridSize - gridSize * 2;
    const visibleMaxY = Math.ceil((stageSize.height - safePos.y) / safeScale / gridSize) * gridSize + gridSize * 2;

    const out = [];
    for (let x = visibleMinX; x <= visibleMaxX; x += gridSize) {
      out.push(<Line key={`gx-${x}`} points={[x, visibleMinY, x, visibleMaxY]} stroke="#1f2937" strokeWidth={1 / safeScale} />);
    }
    for (let y = visibleMinY; y <= visibleMaxY; y += gridSize) {
      out.push(<Line key={`gy-${y}`} points={[visibleMinX, y, visibleMaxX, y]} stroke="#1f2937" strokeWidth={1 / safeScale} />);
    }
    return out;
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ background: 'linear-gradient(180deg,#071026 0%, #081426 100%)', touchAction: 'none' }}
      >
        <Layer>{renderGrid()}</Layer>
        <Layer>
          {lines.map((ln, i) => (
            <Line
              key={i}
              points={ln.points}
              stroke={ln.color || '#e6e6e6'}
              strokeWidth={ln.isWall ? ln.thickness : (ln.thickness || thickness)}
              tension={ln.isWall ? 0 : 0.3}
              lineCap="round"
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
