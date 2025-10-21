import React from 'react';
import { Line } from 'react-konva';

const Grid = ({ gridSize, camera, guides }) => {
  const renderGridLines = () => {
    const lines = [];
    const size = gridSize;
    for (let i = -2000; i < 2000; i += size) {
      const isThick = (Math.round(i / size) % 5 === 0);
      lines.push(
        <Line
          key={`v${i}`}
          points={[i, -2000, i, 2000]}
          stroke="#2b2b2b"
          strokeWidth={isThick ? 2.5 / camera.scale : 1 / camera.scale}
          opacity={isThick ? 0.7 : 1}
        />,
        <Line
          key={`h${i}`}
          points={[-2000, i, 2000, i]}
          stroke="#2b2b2b"
          strokeWidth={isThick ? 2.5 / camera.scale : 1 / camera.scale}
          opacity={isThick ? 0.7 : 1}
        />
      );
    }
    return lines;
  };

  const renderGuides = () => {
    const range = 2000;
    return guides.map((guide, i) => {
      if (guide.orientation === "V") {
        return (
          <Line
            key={i}
            points={[guide.position, -range, guide.position, range]}
            stroke="#0ea5a7"
            strokeWidth={1}
            dash={[4, 4]}
          />
        );
      } else {
        return (
          <Line
            key={i}
            points={[-range, guide.position, range, guide.position]}
            stroke="#0ea5a7"
            strokeWidth={1}
            dash={[4, 4]}
          />
        );
      }
    });
  };

  return (
    <>
      {renderGridLines()}
      {renderGuides()}
    </>
  );
};

export default Grid;