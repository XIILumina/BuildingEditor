import React, { useState, useRef } from "react";
import { Stage, Layer, Line } from "react-konva";

export default function App() {
  // Zoom & pan
  const [scale, setScale] = useState(1);
  const stageRef = useRef();

  // Walls state
  const [walls, setWalls] = useState([
    { id: 1, points: [50, 50, 200, 50], stroke: "white" },
  ]);

  const [selectedWall, setSelectedWall] = useState(null);

  // Handle zoom with mouse wheel
  const handleWheel = (e) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const oldScale = scale;
    const mousePointTo = {
      x: stageRef.current.getPointerPosition().x / oldScale,
      y: stageRef.current.getPointerPosition().y / oldScale,
    };
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    setScale(newScale);

    const newPos = {
      x: -(mousePointTo.x - stageRef.current.getPointerPosition().x / newScale) * newScale,
      y: -(mousePointTo.y - stageRef.current.getPointerPosition().y / newScale) * newScale,
    };
    stageRef.current.position(newPos);
    stageRef.current.batchDraw();
  };

  // Save walls to backend
  const saveWalls = async () => {
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Project", data: walls }),
    });
    alert("Walls saved!");
  };

  return (
    <div className="w-screen h-screen relative bg-[#111]">
      {/* Floating UI */}
      <div className="absolute top-4 left-4 bg-[#222] text-white p-3 rounded-lg shadow-lg space-x-2">
        <button
          className="px-3 py-1 bg-blue-600 rounded"
          onClick={() => saveWalls()}
        >
          Save
        </button>
        {selectedWall && (
          <button
            className="px-3 py-1 bg-green-600 rounded"
            onClick={() => {
              setWalls((prev) =>
                prev.map((w) =>
                  w.id === selectedWall.id
                    ? { ...w, stroke: w.stroke === "white" ? "red" : "white" }
                    : w
                )
              );
            }}
          >
            Toggle Color
          </button>
        )}
      </div>

      {/* Canvas */}
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={scale}
        scaleY={scale}
        onWheel={handleWheel}
      >
        <Layer>
          {/* Grid */}
          {Array.from({ length: 200 }).map((_, i) => (
            <Line
              key={`v-${i}`}
              points={[i * 10, 0, i * 10, window.innerHeight]}
              stroke="#333"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 200 }).map((_, i) => (
            <Line
              key={`h-${i}`}
              points={[0, i * 10, window.innerWidth, i * 10]}
              stroke="#333"
              strokeWidth={1}
            />
          ))}

          {/* Walls */}
          {walls.map((wall) => (
            <Line
              key={wall.id}
              points={wall.points}
              stroke={wall.stroke}
              strokeWidth={4}
              onClick={() => setSelectedWall(wall)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
