import { createShape } from './utils/shapeHandlers';

const addShape = useCallback((type) => {
  pushHistory("add-shape");
  setShapes((s) => [...s, createShape(type, activeLayerId)]);
}, [pushHistory, activeLayerId]);

export function createShape(type, activeLayerId) {
  const base = {
    id: Date.now(),
    type,
    color: "#9CA3AF",
    rotation: 0,
    layer_id: activeLayerId,
    isAnchor: false,
  };
  if (type === "rect") {
    base.x = 150;
    base.y = 150;
    base.width = 100;
    base.height = 60;
  } else if (type === "circle") {
    base.x = 200;
    base.y = 200;
    base.radius = 40;
  } else if (type === "oval") {
    base.x = 200;
    base.y = 200;
    base.radiusX = 60;
    base.radiusY = 40;
  } else if (type === "triangle") {
    base.points = [0, 0, 100, 100, 0, 100];
    base.x = 150;
    base.y = 150;
  } else if (type === "polygon") {
    base.points = [0, 0, 100, 0, 100, 100, 0, 100];
    base.x = 150;
    base.y = 150;
  }
  return base;
}

