import React, { useRef, useState } from "react";
import { Stage, Layer, Transformer } from "react-konva";
import Grid from "./Grid";
import BackgroundLayer from "./Layers/BackgroundLayer";
import PreviewLayer from "./Layers/PreviewLayer";
import ActiveLayer from "./Layers/ActiveLayer";
import { useCanvasEvents } from "./utils/CanvasEvents";

export default function Template({
  tool = "select",
  strokes = [],
  setStrokes,
  erasers = [],
  setErasers,
  shapes = [],
  setShapes,
  drawColor = "#ffffff",
  setDrawColor,
  thickness = 6,
  gridSize = 20,
  material = "Brick",
  selectedId = null,
  setSelectedId = () => {},
  layers = [],
  activeLayerId = 1,
  snapToGrid = true,
  previewStrokes = [],
  previewShapes = [],
  onError = () => {},
}) {
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
  const [guides, setGuides] = useState([]);
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel } = useCanvasEvents({
    stageRef,
    transformerRef, 
    tool,
    strokes,
    setStrokes,
    shapes,
    setShapes,
    drawColor,
    setDrawColor,
    thickness,
    gridSize,
    material,
    layers,
    activeLayerId,
    snapToGrid,
    selectedId,
    setSelectedId,
    isDrawing,
    setIsDrawing,
    isPanning,
    setIsPanning,
    selectionBox,
    setSelectionBox,
    camera,
    setCamera,
    guides,
    setGuides,
    isDraggingNode,
    setIsDraggingNode,
    currentStroke,
    setCurrentStroke,
    onError,
  });

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Stage
        ref={stageRef}
        width={window.innerWidth - 320}
        height={window.innerHeight - 56 - 48}
        scaleX={camera.scale}
        scaleY={camera.scale}
        x={camera.x}
        y={camera.y}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{ background: "#0f1720" }}
        onContextMenu={(e) => e.evt.preventDefault()}
      >
        <Layer>
          <Grid gridSize={gridSize} camera={camera} guides={guides} />
        </Layer>

        <Layer>
          <BackgroundLayer strokes={strokes} shapes={shapes} activeLayerId={activeLayerId} />
        </Layer>

        <Layer>
          <PreviewLayer previewStrokes={previewStrokes} previewShapes={previewShapes} activeLayerId={activeLayerId} />
        </Layer>

        <Layer>
          <ActiveLayer
            strokes={strokes}
            shapes={shapes}
            setStrokes={setStrokes}
            setShapes={setShapes}
            tool={tool}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            activeLayerId={activeLayerId}
            currentStroke={currentStroke}
            selectionBox={selectionBox}
            transformerRef={transformerRef}
          />
        </Layer>
      </Stage>
      {tool !== "select" && (
        <div style={{ position: "absolute", top: 80, right: 20, pointerEvents: "none" }}>
          <svg width="60" height="60">
            <circle
              cx="30"
              cy="30"
              r={thickness / 2}
              fill={tool === "eraser" ? "#0f1720" : drawColor}
              stroke="white"
            />
          </svg>
        </div>
      )}
    </div>
  );
}