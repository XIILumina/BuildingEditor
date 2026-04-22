import React from 'react';
import { Line } from 'react-konva';

/**
 * GridLayer — renders the background grid lines.
 * Should be placed in a Konva Layer with listening={false}.
 */
export default function GridLayer({ gridSize, scale }) {
  // Skip rendering lines that would be < 4px apart (prevents lag at low zoom)
  const pixelGap = gridSize * scale;
  if (pixelGap < 4) return null;

  const lines = [];
  for (let i = -2000; i < 2000; i += gridSize) {
    const isThick = Math.round(i / gridSize) % 5 === 0;
    lines.push(
      <Line
        key={`v${i}`}
        points={[i, -2000, i, 2000]}
        stroke="#2b2b2b"
        strokeWidth={isThick ? 2.5 / scale : 1 / scale}
        opacity={isThick ? 0.7 : 1}
      />,
      <Line
        key={`h${i}`}
        points={[-2000, i, 2000, i]}
        stroke="#2b2b2b"
        strokeWidth={isThick ? 2.5 / scale : 1 / scale}
        opacity={isThick ? 0.7 : 1}
      />
    );
  }
  return <>{lines}</>;
}
