import React, { useState, useCallback } from 'react';
import { Stage, Layer, Line } from 'react-konva';

function Template({ tool, lines, setLines, isDrawing, setIsDrawing, scale, setScale, position, setPosition }) {
  const [stageSize, setStageSize] = useState({ width: 5000, height: 5000 }); // Initial "infinite" size

  const handleMouseDown = useCallback((e) => {
    if (tool !== 'freedraw' && tool !== 'wall') return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y], isWall: tool === 'wall', thickness: 10, material: 'Brick' }]);
  }, [tool, lines]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || (tool !== 'freedraw' && tool !== 'wall')) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    if (tool === 'wall') {
      const start = { x: lastLine.points[0], y: lastLine.points[1] };
      lastLine.points = [start.x, start.y, point.x, point.y];
    } else {
      lastLine.points = lastLine.points.concat([point.x, point.y]);
    }
    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);

    // Expand stage if mouse near edge or object placed near edge
    const edgeThreshold = 100;
    if (point.x > stageSize.width - edgeThreshold || point.x < edgeThreshold ||
        point.y > stageSize.height - edgeThreshold || point.y < edgeThreshold) {
      setStageSize({ width: stageSize.width + 1000, height: stageSize.height + 1000 });
    }
  }, [isDrawing, tool, lines, stageSize]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const generateGridLines = () => {
    const lines = [];
    const gridSize = 20; // 1cm by 1cm
    const visibleMinX = -position.x / scale - gridSize;
    const visibleMaxX = (window.innerWidth - position.x) / scale + gridSize;
    const visibleMinY = -position.y / scale - gridSize;
    const visibleMaxY = (window.innerHeight - position.y) / scale + gridSize;

    for (let x = Math.floor(visibleMinX / gridSize) * gridSize; x < visibleMaxX; x += gridSize) {
      lines.push(<Line key={`v-${x}`} points={[x, visibleMinY, x, visibleMaxY]} stroke="#4b4b4bff" strokeWidth={1 / scale} />);
    }
    for (let y = Math.floor(visibleMinY / gridSize) * gridSize; y < visibleMaxY; y += gridSize) {
      lines.push(<Line key={`h-${y}`} points={[visibleMinX, y, visibleMaxX, y]} stroke="#4b4b4bff" strokeWidth={1 / scale} />);
    }
    return lines;
  };

  return (
    <Stage
      width={stageSize.width}
      height={stageSize.height}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{ backgroundColor: '#1d1d1dff' }} // Black background
    >
      <Layer>
        {generateGridLines()}
      </Layer>
      <Layer>
        {lines.map((line, i) => (
          <Line
            key={i}
            points={line.points}
            stroke={line.isWall ? 'rgba(112, 112, 112, 1)' : '#525252ff'}
            strokeWidth={line.isWall ? line.thickness : 5}
            tension={line.isWall ? 0 : 0.5}
            lineCap="round"
            globalCompositeOperation="source-over"
          />
        ))}
      </Layer>
    </Stage>
  );
}

export default Template;