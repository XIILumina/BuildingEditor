import { useState, useCallback } from 'react';

export function useHistory({
  strokes,
  erasers,
  shapes,
  projectName,
  layers,
  activeLayerId,
  setStrokes,
  setErasers,
  setShapes,
  setProjectName,
  setLayers,
  setActiveLayerId,
  setSaveState,
}) {
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const snapshot = useCallback(() => {
    return {
      strokes: JSON.parse(JSON.stringify(strokes)),
      erasers: JSON.parse(JSON.stringify(erasers)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      projectName,
      layers: JSON.parse(JSON.stringify(layers)),
      activeLayerId,
    };
  }, [strokes, erasers, shapes, projectName, layers, activeLayerId]);

  const pushHistory = useCallback((label) => {
    setHistory((h) => [...h, snapshot()]);
    setRedoStack([]);
    setSaveState('unsaved');
  }, [snapshot, setSaveState]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setRedoStack((r) => [...r, snapshot()]);
      setStrokes(last.strokes || []);
      setErasers(last.erasers || []);
      setShapes(last.shapes || []);
      setProjectName(last.projectName || "Untitled Project");
      setLayers(last.layers || [{ id: 1, name: "Layer 1" }]);
      setActiveLayerId(last.activeLayerId || 1);
      return h.slice(0, -1);
    });
  }, [snapshot, setStrokes, setErasers, setShapes, setProjectName, setLayers, setActiveLayerId]);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setHistory((h) => [...h, snapshot()]);
      setStrokes(next.strokes || []);
      setErasers(next.erasers || []);
      setShapes(next.shapes || []);
      setProjectName(next.projectName || "Untitled Project");
      setLayers(next.layers || [{ id: 1, name: "Layer 1" }]);
      setActiveLayerId(next.activeLayerId || 1);
      return r.slice(0, -1);
    });
  }, [snapshot, setStrokes, setErasers, setShapes, setProjectName, setLayers, setActiveLayerId]);

  // no global hotkeys here — Editor.jsx registers hotkeys centrally

  return { history, redoStack, snapshot, pushHistory, undo, redo };
}