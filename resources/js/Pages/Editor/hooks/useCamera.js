import { useState, useCallback } from 'react';

/**
 * useCamera — manages stage pan/zoom state and handlers.
 */
export function useCamera() {
  const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });

  const handleWheel = useCallback((e, stageRef) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = camera.scale;
    const pointer = stage.getPointerPosition();
    const mousePoint = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const newScale = Math.max(0.2, Math.min(4, e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy));
    setCamera({
      x: pointer.x - mousePoint.x * newScale,
      y: pointer.y - mousePoint.y * newScale,
      scale: newScale,
    });
  }, [camera.scale]);

  const panBy = useCallback((dx, dy) => {
    setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
  }, []);

  return { camera, setCamera, handleWheel, panBy };
}
