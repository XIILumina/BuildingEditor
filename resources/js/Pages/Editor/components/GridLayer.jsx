import React from 'react';
import { Line } from 'react-konva';

/**
 * GridLayer — renders the background grid lines.
 * Should be placed in a Konva Layer with listening={false}.
 */
export default function GridLayer({ gridSize, scale, camera = { x: 0, y: 0 }, viewportWidth = 1200, viewportHeight = 800 }) {
  // Keep the visible grid spacing in a comfortable range, draw.io style.
  const minPixelGap = 18;
  const maxPixelGap = 52;
  let step = Math.max(1, Number(gridSize) || 10);
  let pixelGap = step * scale;

  while (pixelGap < minPixelGap) {
    step *= 2;
    pixelGap = step * scale;
  }
  while (pixelGap > maxPixelGap && step > 0.25) {
    step /= 2;
    pixelGap = step * scale;
  }

  if (pixelGap < 4) return null;

  // Render only what is visible on stage (+padding), instead of a fixed range.
  const worldMinX = (-camera.x) / scale;
  const worldMaxX = (viewportWidth - camera.x) / scale;
  const worldMinY = (-camera.y) / scale;
  const worldMaxY = (viewportHeight - camera.y) / scale;
  const pad = step * 2;
  const startX = Math.floor((worldMinX - pad) / step) * step;
  const endX = Math.ceil((worldMaxX + pad) / step) * step;
  const startY = Math.floor((worldMinY - pad) / step) * step;
  const endY = Math.ceil((worldMaxY + pad) / step) * step;

  const lines = [];
  for (let i = startX; i <= endX; i += step) {
    const idx = Math.round(i / step);
    const isThick = idx % 5 === 0;
    lines.push(
      <Line
        key={`v${i}`}
        points={[i, startY, i, endY]}
        stroke="#2b2b2b"
        strokeWidth={isThick ? 2.5 / scale : 1 / scale}
        opacity={isThick ? 0.9 : 0.55}
      />,
    );
  }

  for (let i = startY; i <= endY; i += step) {
    const idx = Math.round(i / step);
    const isThick = idx % 5 === 0;
    lines.push(
      <Line
        key={`h${i}`}
        points={[startX, i, endX, i]}
        stroke="#2b2b2b"
        strokeWidth={isThick ? 2.5 / scale : 1 / scale}
        opacity={isThick ? 0.9 : 0.55}
      />
    );
  }
  return <>{lines}</>;
}
