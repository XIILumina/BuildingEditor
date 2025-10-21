import React from 'react';
import { Ellipse } from 'react-konva';

const Oval = ({
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
    <Ellipse
      id={String(shape.id)}
      x={shape.x ?? 0}
      y={shape.y ?? 0}
      radiusX={shape.radiusX ?? 60}
      radiusY={shape.radiusY ?? 40}
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

export default Oval;