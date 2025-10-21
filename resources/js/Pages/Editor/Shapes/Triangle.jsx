import React from 'react';
import { Line } from 'react-konva';

const Triangle = ({
  shape,
  isActive,
  isPreview,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDraggable,
  isListening,
  opacity,
}) => {
  const fill = shape.fill || shape.color || '#9CA3AF';
  const stroke = shape.stroke || undefined;

  return (
    <Line
      id={String(shape.id)}
      x={shape.x ?? 0}
      y={shape.y ?? 0}
      points={shape.points || [0, 0, 100, 0, 50, 80]}
      closed
      fill={fill}
      stroke={stroke}
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

export default Triangle;