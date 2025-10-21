import React from 'react';
import { Rect } from 'react-konva';

const RectShape = ({ shape, isActive, isPreview, onSelect, onDragStart, onDragMove, onDragEnd, isDraggable, isListening, opacity }) => {
  return (
    <Rect
      key={shape.id}
      id={shape.id.toString()}
      x={shape.x}
      y={shape.y}
      width={shape.width || 80}
      height={shape.height || 60}
      fill={shape.color || '#9CA3AF'}
      rotation={shape.rotation || 0}
      stroke={isPreview ? '#9CA3AF' : undefined}
      strokeWidth={isPreview ? 2 : undefined}
      dash={isPreview ? [5, 5] : undefined}
      opacity={opacity ?? (isActive ? 1 : isPreview ? 0.7 : 0.5)}
      draggable={isDraggable}
      listening={isListening}
      onClick={() => isListening && onSelect(shape.id)}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
    />
  );
};

export default RectShape;