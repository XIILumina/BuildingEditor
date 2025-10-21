import React from 'react';
import { Circle } from 'react-konva';

const CircleShape = ({ shape, isActive, isPreview, onSelect, onDragStart, onDragMove, onDragEnd, isDraggable, isListening, opacity }) => {
  return (
    <Circle
      id={String(shape.id)}
      x={shape.x ?? 0}
      y={shape.y ?? 0}
      radius={shape.radius ?? 40}
      fill={shape.fill || shape.color || '#9CA3AF'}
      stroke={shape.stroke || undefined}
      strokeWidth={shape.strokeWidth ?? 0}
      rotation={shape.rotation ?? 0}
      draggable={!!isDraggable}
      listening={!!isListening}
      onClick={() => isListening && onSelect?.(shape.id)}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      opacity={opacity ?? (isActive ? 1 : isPreview ? 0.7 : 0.5)}
    />
  );
};

export default CircleShape;