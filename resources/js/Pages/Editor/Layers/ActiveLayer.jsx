import React from 'react';
import { Line, Rect, Transformer } from 'react-konva';
import RectShape from '../Shapes/RectShape';
import CircleShape from '../Shapes/CircleShape';
import PathShape from '../Shapes/PathShape';
import Polygon from '../Shapes/Polygon';
import Oval from '../Shapes/Oval';
import Triangle from '../Shapes/Triangle';
import { useDragHandlers } from '../utils/CanvasEvents';

const ActiveLayer = ({
  strokes,
  shapes,
  setStrokes,
  setShapes,
  tool,
  selectedId,
  setSelectedId,
  activeLayerId,
  currentStroke,
  selectionBox,
  transformerRef,
}) => {
  // include additional supported shapes, exclude 'path' as a top-level rendered shape
  const allowedShapeTypes = new Set(["rect", "circle", "triangle", "polygon", "oval"]);

  const { handleDragStart, handleDragMove, handleDragEnd, handleTransformEnd } = useDragHandlers({
    strokes,
    setStrokes,
    shapes,
    setShapes,
    selectedId,
    transformerRef,
  });

  const handleSelectObject = (id) => {
    if (tool === "select") {
      setSelectedId(id);
    }
  };

  return (
    <>
      {strokes
        .filter((s) => Number(s.layer_id) === Number(activeLayerId))
        .map((s) => (
          <Line
            key={s.id}
            id={s.id.toString()}
            x={s.x || 0}
            y={s.y || 0}
            points={s.points}
            stroke={s.color}
            strokeWidth={s.thickness}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            draggable={tool === "select"}
            onClick={() => handleSelectObject(s.id)}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            opacity={1}
          />
        ))}

      {shapes
        .filter((sh) => Number(sh.layer_id) === Number(activeLayerId) && allowedShapeTypes.has(sh.type))
        .map((sh) => {
          const isActive = selectedId === sh.id || (Array.isArray(selectedId) && selectedId.includes(sh.id));
          if (sh.type === "rect") {
            return (
              <RectShape
                key={sh.id}
                shape={sh}
                isActive={isActive}
                isPreview={false}
                onSelect={handleSelectObject}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDraggable={tool === "select"}
                isListening={true}
                opacity={1}
              />
            );
          }
          if (sh.type === "circle") {
            return (
              <CircleShape
                key={sh.id}
                shape={sh}
                isActive={isActive}
                isPreview={false}
                onSelect={handleSelectObject}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDraggable={tool === "select"}
                isListening={true}
                opacity={1}
              />
            );
          }
          if (sh.type === "triangle") {
            return (
              <Triangle
                key={sh.id}
                shape={sh}
                isActive={isActive}
                isPreview={false}
                onSelect={handleSelectObject}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDraggable={tool === "select"}
                isListening={true}
                opacity={1}
              />
            );
          }
          if (sh.type === "polygon") {
            return (
              <Polygon
                key={sh.id}
                shape={sh}
                isActive={isActive}
                isPreview={false}
                onSelect={handleSelectObject}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDraggable={tool === "select"}
                isListening={true}
                opacity={1}
              />
            );
          }
          if (sh.type === "oval") {
            return (
              <Oval
                key={sh.id}
                shape={sh}
                isActive={isActive}
                isPreview={false}
                onSelect={handleSelectObject}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDraggable={tool === "select"}
                isListening={true}
                opacity={1}
              />
            );
          }
          return null;
        })}

      {currentStroke && (
        <Line
          points={currentStroke.points}
          stroke={currentStroke.color}
          strokeWidth={currentStroke.thickness}
          lineCap="round"
          lineJoin="round"
          tension={0.5}
          listening={false}
        />
      )}

      {selectionBox && (
        <Rect
          x={Math.min(selectionBox.x, selectionBox.x + selectionBox.width)}
          y={Math.min(selectionBox.y, selectionBox.y + selectionBox.height)}
          width={Math.abs(selectionBox.width)}
          height={Math.abs(selectionBox.height)}
          stroke="cyan"
          dash={[4, 4]}
        />
      )}

      <Transformer ref={transformerRef} rotateEnabled={true} />
    </>
  );
};

export default ActiveLayer;