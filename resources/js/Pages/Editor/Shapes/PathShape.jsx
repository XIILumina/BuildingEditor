import React from 'react';
import { Path } from 'react-konva';

const PathShape = ({ shape, isActive, isPreview, onSelect, onDragStart, onDragMove, onDragEnd, isDraggable, isListening }) => {
  return (
    <Path
      key={shape.id}
      id={shape.id.toString()}
      data={shape.data || pointsToPath(shape.points)}
      fill={shape.fill || '#9CA3AF'}
      rotation={shape.rotation || 0}
      stroke={isPreview ? '#9CA3AF' : undefined}
      strokeWidth={isPreview ? 2 : undefined}
      dash={isPreview ? [5, 5] : undefined}
      opacity={isActive ? 1 : isPreview ? 0.7 : 0.5}
      draggable={isDraggable}
      listening={isListening}
      onClick={() => isListening && onSelect(shape.id)}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    />
  );
};

function pointsToPath(points) {
  if (!points || points.length < 2) return "";
  let path = `M${points[0]} ${points[1]}`;
  for (let i = 2; i < points.length; i += 2) {
    path += ` L${points[i]} ${points[i + 1]}`;
  }
  path += " Z";
  return path;
}

export default PathShape;