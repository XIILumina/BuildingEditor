import React from 'react';
import { Rect, Circle, Ellipse, Path } from 'react-konva';
import { num, pointsToPath } from '../utils/shapeUtils';

/**
 * ShapeRenderer — renders a single shape based on its type.
 *
 * Props:
 *  sh           — shape data object
 *  inactive     — render with reduced opacity, no events
 *  preview      — render with dashed stroke, reduced opacity, no events
 *  prefix       — key prefix string
 *  tool         — current tool string
 *  inactiveLayerOpacity — opacity for inactive layers
 *  onSelect     — (id, e) => void
 *  onDragStart  — Konva drag event handler
 *  onDragMove   — Konva drag event handler
 *  onDragEnd    — Konva drag event handler
 */
export default function ShapeRenderer({
  sh,
  inactive = false,
  preview = false,
  prefix = '',
  nodeId,
  tool,
  inactiveLayerOpacity = 0.3,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const fill = sh.color || sh.fill || '#9CA3AF';
  const opacity = inactive ? inactiveLayerOpacity : (preview ? 0.7 : 1);
  const dash = preview ? [5, 5] : undefined;
  const draggable = !inactive && !preview && tool === 'select' && !sh.locked && !sh.anchoredBlockId;
  const listening = !inactive && !preview;
  const key = `${prefix}${sh.id}`;
  const id = (inactive || preview) ? undefined : (nodeId || sh.id.toString());

  const events = listening ? {
    onClick: (e) => (!sh.locked && !sh.anchoredBlockId) && onSelect?.(sh.id, e),
    onDragStart,
    onDragMove,
    onDragEnd,
  } : {};

  const common = { id, draggable, listening, opacity, ...events };

  if (sh.type === 'rect') {
    return (
      <Rect
        key={key}
        {...common}
        x={num(sh.x)} y={num(sh.y)}
        width={num(sh.width)} height={num(sh.height)}
        fill={fill}
        rotation={num(sh.rotation)}
        dash={dash}
      />
    );
  }

  if (sh.type === 'circle') {
    if (Number.isFinite(sh.radiusX) && Number.isFinite(sh.radiusY) && (sh.radiusX > 0 || sh.radiusY > 0)) {
      return (
        <Ellipse
          key={key}
          {...common}
          x={num(sh.x)} y={num(sh.y)}
          radiusX={num(sh.radiusX)} radiusY={num(sh.radiusY)}
          fill={fill}
          rotation={num(sh.rotation)}
          dash={dash}
        />
      );
    }
    return (
      <Circle
        key={key}
        {...common}
        x={num(sh.x)} y={num(sh.y)}
        radius={num(sh.radius)}
        fill={fill}
        rotation={num(sh.rotation)}
        dash={dash}
      />
    );
  }

  if (sh.type === 'oval') {
    return (
      <Ellipse
        key={key}
        {...common}
        x={num(sh.x)} y={num(sh.y)}
        radiusX={num(sh.radiusX)} radiusY={num(sh.radiusY)}
        fill={fill}
        rotation={num(sh.rotation)}
        dash={dash}
      />
    );
  }

  if (sh.type === 'polygon') {
    return (
      <Path
        key={key}
        {...common}
        data={pointsToPath(sh.points)}
        x={num(sh.x)} y={num(sh.y)}
        rotation={num(sh.rotation)}
        fill={sh.fill || sh.color}
        stroke={sh.stroke}
        strokeWidth={num(sh.strokeWidth, 0)}
        hitStrokeWidth={12}
        dash={dash}
      />
    );
  }

  return null;
}
