import { useState, useEffect, useCallback, useRef } from 'react';
import { num } from '../utils/shapeUtils';

/**
 * usePointEditMode — manages vertex point editing for polygon/rect shapes.
 */
export function usePointEditMode({
  selectedId,
  shapes,
  setShapes,
  transformerRef,
  stageRef,
  activeLayerId,
  tool,
  snapToGrid,
  gridSize,
}) {
  const [pointEditMode, setPointEditMode] = useState(false);
  const [editingShapeId, setEditingShapeId] = useState(null);
  const [editingPoints, setEditingPoints] = useState([]);
  const [editBtnPos, setEditBtnPos] = useState(null);
  // Tracks whether the current shapes update was triggered by our own updateEditingPoint
  // so we don't re-sync editingPoints unnecessarily.
  const selfUpdateRef = useRef(false);

  // Keep editingPoints in sync if the shape is mutated externally while in point edit mode
  // (e.g. undo/redo, AI operations). Skips the cycle caused by updateEditingPoint itself.
  useEffect(() => {
    if (!pointEditMode || !editingShapeId) return;
    if (selfUpdateRef.current) { selfUpdateRef.current = false; return; }
    const sh = shapes.find(s => s.id === editingShapeId);
    if (!sh || !Array.isArray(sh.points)) return;
    const offX = num(sh.x) || 0;
    const offY = num(sh.y) || 0;
    const pts = sh.points.map((p, i) => p + (i % 2 === 0 ? offX : offY));
    // Only update if values actually differ to avoid unnecessary renders
    setEditingPoints(prev => {
      if (prev.length === pts.length && prev.every((v, i) => v === pts[i])) return prev;
      return pts;
    });
  }, [shapes, pointEditMode, editingShapeId]);

  const findShapeNode = useCallback((stage, id) => {
    if (!stage || !id) return null;
    // Active shape nodes use the `shape-<id>` convention in Template.jsx.
    return stage.findOne(`#shape-${id}`) || stage.findOne(`#${id}`);
  }, []);

  // Compute the "Edit Points" button position near the selection
  useEffect(() => {
    const singleId = Array.isArray(selectedId) ? null : selectedId;
    if (!singleId || pointEditMode) { setEditBtnPos(null); return; }
    const sh = shapes.find(s => s.id === singleId);
    if (!sh || sh.type === 'circle' || sh.type === 'oval') { setEditBtnPos(null); return; }
    const stage = stageRef.current;
    if (!stage) return;
    const node = findShapeNode(stage, singleId);
    if (!node) { setEditBtnPos(null); return; }
    try {
      const box = node.getClientRect();
      setEditBtnPos({ x: box.x + box.width + 8, y: box.y - 10 });
    } catch {
      setEditBtnPos(null);
    }
  }, [selectedId, shapes, pointEditMode, stageRef, findShapeNode]);

  // Exit point edit mode when tool or layer changes
  useEffect(() => {
    if (pointEditMode) {
      setPointEditMode(false);
      setEditingShapeId(null);
      setEditingPoints([]);
    }
  }, [activeLayerId, tool]);

  const enterPointEditMode = useCallback(() => {
    const id = Array.isArray(selectedId) ? null : selectedId;
    if (!id) return;
    const sh = shapes.find(s => s.id === id);
    if (!sh || sh.type === 'circle' || sh.type === 'oval') return;

    let pts = [];
    if (sh.type === 'rect') {
      // Rects are converted to 4-point polygon so every corner becomes independently draggable
      const x = num(sh.x), y = num(sh.y);
      const w = num(sh.width, 100), h = num(sh.height, 60);
      pts = [x, y, x + w, y, x + w, y + h, x, y + h];
      setShapes(prev => prev.map(s =>
        s.id === id
          ? { ...s, type: 'polygon', points: pts, x: 0, y: 0, rotation: 0, fill: s.fill || s.color, closed: true }
          : s
      ));
    } else if (sh.type === 'polygon') {
      // Flatten any existing x/y offset into the absolute point coords
      const offX = num(sh.x), offY = num(sh.y);
      pts = (sh.points || []).map((p, i) => p + (i % 2 === 0 ? offX : offY));
      setShapes(prev => prev.map(s =>
        s.id === id ? { ...s, points: pts, x: 0, y: 0, rotation: 0 } : s
      ));
    }

    // Detach transformer while editing
    const tr = transformerRef.current;
    if (tr) tr.nodes([]);

    setEditingPoints(pts);
    setEditingShapeId(id);
    setPointEditMode(true);
  }, [selectedId, shapes, setShapes, transformerRef]);

  const exitPointEditMode = useCallback(() => {
    setPointEditMode(false);
    // Re-attach the Konva Transformer so the shape can be scaled/rotated again
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (stage && tr && editingShapeId) {
      const node = findShapeNode(stage, editingShapeId);
      if (node) { tr.nodes([node]); tr.getLayer()?.batchDraw(); }
    }
    setEditingShapeId(null);
    setEditingPoints([]);
  }, [editingShapeId, stageRef, transformerRef, findShapeNode]);

  const togglePointEditMode = useCallback(() => {
    if (pointEditMode) exitPointEditMode();
    else enterPointEditMode();
  }, [pointEditMode, enterPointEditMode, exitPointEditMode]);

  const updateEditingPoint = useCallback((idx, x, y) => {
    // Mark this as a self-driven update so the sync effect below doesn't needlessly re-sync
    selfUpdateRef.current = true;
    setEditingPoints(prev => {
      const next = [...prev];
      next[idx * 2] = x;
      next[idx * 2 + 1] = y;
      setShapes(sh => sh.map(s =>
        s.id === editingShapeId ? { ...s, points: next } : s
      ));
      return next;
    });
  }, [editingShapeId, setShapes]);

  return {
    pointEditMode,
    editingShapeId,
    editingPoints,
    editBtnPos,
    togglePointEditMode,
    updateEditingPoint,
    snapToGrid,
    gridSize,
  };
}
