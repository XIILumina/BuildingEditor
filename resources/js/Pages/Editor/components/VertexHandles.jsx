import React from 'react';
import { Circle } from 'react-konva';

/**
 * VertexHandles — renders draggable vertex circles for point-edit mode.
 *
 * Props:
 *  editingPoints — flat [x0,y0, x1,y1, ...] array
 *  scale         — camera.scale (for size compensation)
 *  snapToGrid    — boolean
 *  gridSize      — number
 *  onUpdate      — (index, x, y) => void
 */
export default function VertexHandles({ editingPoints, scale, snapToGrid, gridSize, onUpdate }) {
  if (!editingPoints || editingPoints.length < 2) return null;
  const count = Math.floor(editingPoints.length / 2);

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Circle
          key={`vertex-${i}`}
          x={editingPoints[i * 2]}
          y={editingPoints[i * 2 + 1]}
          radius={7 / scale}
          fill="#06b6d4"
          stroke="#ffffff"
          strokeWidth={2 / scale}
          draggable
          onDragMove={(e) => onUpdate(i, e.target.x(), e.target.y())}
          onDragEnd={(e) => {
            let x = e.target.x(), y = e.target.y();
            if (snapToGrid) {
              x = Math.round(x / gridSize) * gridSize;
              y = Math.round(y / gridSize) * gridSize;
              e.target.x(x);
              e.target.y(y);
            }
            onUpdate(i, x, y);
          }}
        />
      ))}
    </>
  );
}
