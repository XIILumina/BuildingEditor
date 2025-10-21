import React from 'react';
import { Line } from 'react-konva';
import RectShape from '../Shapes/RectShape';
import CircleShape from '../Shapes/CircleShape';
import Polygon from '../Shapes/Polygon';
import Oval from '../Shapes/Oval';
import Triangle from '../Shapes/Triangle';

const PreviewLayer = ({ previewStrokes, previewShapes, activeLayerId }) => {
  const allowedShapeTypes = new Set(["rect", "circle", "triangle", "polygon", "oval"]);

  return (
    <>
      {previewStrokes
        .filter((s) => s.layer_id === activeLayerId)
        .map((s) => (
          <Line
            key={`preview-${s.id}`}
            points={s.points}
            stroke={s.color}
            strokeWidth={s.thickness}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            dash={[5, 5]}
            opacity={0.7}
            draggable={false}
            listening={false}
          />
        ))}

      {previewShapes
        .filter((sh) => sh.layer_id === activeLayerId && allowedShapeTypes.has(sh.type))
        .map((sh) => {
          if (sh.type === "rect") {
            return (
              <RectShape key={`preview-${sh.id}`} shape={sh} isActive={false} isPreview={true} isDraggable={false} isListening={false} />
            );
          }
          if (sh.type === "circle") {
            return (
              <CircleShape key={`preview-${sh.id}`} shape={sh} isActive={false} isPreview={true} isDraggable={false} isListening={false} />
            );
          }
          if (sh.type === "triangle") {
            return <Triangle key={`preview-${sh.id}`} shape={sh} isActive={false} isPreview={true} isDraggable={false} isListening={false} />;
          }
          if (sh.type === "polygon") {
            return <Polygon key={`preview-${sh.id}`} shape={sh} isActive={false} isPreview={true} isDraggable={false} isListening={false} />;
          }
          if (sh.type === "oval") {
            return <Oval key={`preview-${sh.id}`} shape={sh} isActive={false} isPreview={true} isDraggable={false} isListening={false} />;
          }
          return null;
        })}
    </>
  );
};

export default PreviewLayer;