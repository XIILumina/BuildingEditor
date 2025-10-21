import React from 'react';
import { Line } from 'react-konva';
import RectShape from '../Shapes/RectShape';
import CircleShape from '../Shapes/CircleShape';
import PathShape from '../Shapes/PathShape';
import Oval from '../Shapes/Oval';
import Triangle from '../Shapes/Triangle';
import Polygon from '../Shapes/Polygon';

const BackgroundLayer = ({ strokes, shapes, activeLayerId }) => {
  // render all supported shape types in inactive layers
  const allowedShapeTypes = new Set(["rect", "circle", "oval", "triangle", "polygon", "path"]);

  return (
    <>
      {strokes
        .filter((s) => Number(s.layer_id) !== Number(activeLayerId))
        .map((s) => (
          <Line
            key={`bg-${s.id}`}
            points={s.points}
            stroke={s.color}
            strokeWidth={s.thickness}
            lineCap="round"
            lineJoin="round"
            tension={0.5}
            opacity={0.5}
            draggable={false}
            listening={false}
          />
        ))}
      {shapes
        .filter((sh) => Number(sh.layer_id) !== Number(activeLayerId) && allowedShapeTypes.has(sh.type))
        .map((sh) => {
          if (sh.type === "rect") {
            return (
              <RectShape
                key={`bg-${sh.id}`}
                shape={sh}
                isActive={false}
                isPreview={false}
                isDraggable={false}
                isListening={false}
                opacity={0.5}
              />
            );
          }
          if (sh.type === "circle") {
            return (
              <CircleShape
                key={`bg-${sh.id}`}
                shape={sh}
                isActive={false}
                isPreview={false}
                isDraggable={false}
                isListening={false}
                opacity={0.5}
              />
            );
          }
          if (sh.type === "oval") {
            return (
              <Oval
                key={`bg-${sh.id}`}
                shape={sh}
                isActive={false}
                isPreview={false}
                isDraggable={false}
                isListening={false}
                opacity={0.5}
              />
            );
          }
          if (sh.type === "triangle") {
            return (
              <Triangle
                key={`bg-${sh.id}`}
                shape={sh}
                isActive={false}
                isPreview={false}
                isDraggable={false}
                isListening={false}
                opacity={0.5}
              />
            );
          }
          if (sh.type === "polygon") {
            return (
              <Polygon
                key={`bg-${sh.id}`}
                shape={sh}
                isActive={false}
                isPreview={false}
                isDraggable={false}
                isListening={false}
                opacity={0.5}
              />
            );
          }
          if (sh.type === "path") {
            return (
              <PathShape
                key={`bg-${sh.id}`}
                shape={sh}
                isActive={false}
                isPreview={false}
                isDraggable={false}
                isListening={false}
                opacity={0.5}
              />
            );
          }
          return null;
        })}
    </>
  );
};

export default BackgroundLayer;