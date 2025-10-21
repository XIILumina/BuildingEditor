import { useEffect } from "react";
import { getMousePos, distToSegment, getSnapPositions  } from "./canvasutils";
import { detectRooms, isPointInPolygon, getLineIntersections } from "./drawingUtils";

export function useCanvasEvents({
  stageRef,
  transformerRef,         // added
  tool,
  strokes,
  setStrokes,
  shapes,
  setShapes,
  setDrawColor,
  thickness,
  drawColor = "#ffffff",
  gridSize,
  material,
  layers,                 // added
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
}) {
  // helper inside file
  function pointsToPath(points) {
    if (!points || points.length < 2) return "";
    let path = `M${points[0]} ${points[1]}`;
    for (let i = 2; i < points.length; i += 2) {
      path += ` L${points[i]} ${points[i + 1]}`;
    }
    path += " Z";
    return path;
  }

  const handleMouseDown = (e) => {
    try {
      const stage = stageRef.current;
      if (!stage) return;

      if (e.evt.button === 2) {
        setIsPanning(true);
        return;
      }

      // determine whether to snap this pointer reading
      // selection drag/draw must never snap while user is drawing the selection box
      let forceSnap = !!(snapToGrid && tool !== "freedraw");
      if (tool === "select" && e.target === stage) {
        forceSnap = false;
      }

      let pos = getMousePos(stage, forceSnap, gridSize, snapToGrid);
      if (!pos) return;

      if (tool === "select" && !isDraggingNode && e.target === stage) {
        // start selection box (use unsnapped pos above)
        setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
        setSelectedId(null);
        return;
      }

      // Color picker: never mutate node; just read color safely
      if (tool === "picker") {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const node = stage.getIntersection(pointer);
          let color = "#ffffff";
          if (node) {
            try {
              const f = typeof node.fill === "function" ? node.fill() : node.attrs?.fill;
              const s = typeof node.stroke === "function" ? node.stroke() : node.attrs?.stroke;
              color = f || s || "#ffffff";
            } catch {
              color = node?.attrs?.fill || node?.attrs?.stroke || "#ffffff";
            }
          }
          setDrawColor?.(color);
        }
        return;
      }

      // Fill tool (room fill based on walls) — from your old branch
      if (tool === "fill") {
        const pos = getMousePos(stage, false, gridSize, true);
        if (!pos) return;

        const walls = strokes.filter((s) => s.isWall && Number(s.layer_id) === Number(activeLayerId));

        const intersectionPoints = getLineIntersections(walls);
        let allWallPoints = [];
        walls.forEach((wall) => {
          for (let i = 0; i < wall.points.length; i += 2) {
            allWallPoints.push([wall.points[i], wall.points[i + 1]]);
          }
        });
        allWallPoints = allWallPoints.concat(intersectionPoints);

        const { rooms } = detectRooms(walls, allWallPoints);
        const containingRoom = rooms.find((roomPoints) => isPointInPolygon([pos.x, pos.y], roomPoints));
        if (containingRoom) {
          const newShape = {
            id: Date.now(),
            type: "polygon",
            points: containingRoom.flat(),
            fill: drawColor,
            closed: true,
            layer_id: activeLayerId,
          };
          setShapes((prev) => [...prev, newShape]);
        }
        return;
      }

      if (tool === "freedraw" || tool === "wall") {
        setCurrentStroke({
          points: [pos.x, pos.y],
          color: drawColor,
          thickness,
          isWall: tool === "wall",
          isEraser: false,
        });
        setIsDrawing(true);
        return;
      }

      if (tool === "eraser") {
        setIsDrawing(true);
        eraseAtPoint(pos);
        return;
      }

      if (e.target === stage) {
        setSelectedId(null);
      }
    } catch (err) {
      onError?.(`Error on mouse down: ${err?.message || err}`);
    }
  };

  const handleMouseMove = (e) => {
    try {
      const stage = stageRef.current;
      if (!stage) return;

      // For selection box changes we must NOT snap while the box is being drawn
      if (selectionBox && tool === "select" && !isDraggingNode) {
        const pos = getMousePos(stage, false, gridSize, snapToGrid); // forceSnap = false
        if (!pos) return;
        setSelectionBox({
          ...selectionBox,
          width: pos.x - selectionBox.x,
          height: pos.y - selectionBox.y,
        });
        return;
      }

      // otherwise compute pos with normal snapping rules (freedraw doesn't snap)
      const pos = getMousePos(stage, snapToGrid && tool !== "freedraw", gridSize, snapToGrid);
      if (!pos) return;

      if (isPanning) {
        setCamera((c) => ({ ...c, x: c.x + e.evt.movementX, y: c.y + e.evt.movementY }));
        return;
      }

      if (isDrawing && tool === "eraser") {
        eraseAtPoint(pos);
        return;
      }

      if (isDrawing && currentStroke && (tool === "freedraw" || tool === "wall")) {
        let newPoints = [...currentStroke.points];
        if (tool === "wall") {
          const snaps = getSnapPositions(strokes, shapes);
          const threshold = 5;
          let newGuides = [];
          let snappedX = pos.x;
          let snappedY = pos.y;

          let minDistV = Infinity;
          let bestSv = null;
          for (const sv of snaps.vertical) {
            const dist = Math.abs(sv - pos.x);
            if (dist < threshold && dist < minDistV) {
              minDistV = dist;
              bestSv = sv;
            }
          }
          if (bestSv !== null) {
            snappedX = bestSv;
            newGuides.push({ orientation: "V", position: bestSv });
          }

          let minDistH = Infinity;
          let bestSh = null;
          for (const sh of snaps.horizontal) {
            const dist = Math.abs(sh - pos.y);
            if (dist < threshold && dist < minDistH) {
              minDistH = dist;
              bestSh = sh;
            }
          }
          if (bestSh !== null) {
            snappedY = bestSh;
            newGuides.push({ orientation: "H", position: bestSh });
          }

          setGuides(newGuides);
          newPoints = [newPoints[0], newPoints[1], snappedX, snappedY];
        } else {
          newPoints = [...newPoints, pos.x, pos.y];
        }
        setCurrentStroke({ ...currentStroke, points: newPoints });
        return;
      }
    } catch (err) {
      onError?.(`Error on mouse move: ${err?.message || err}`);
    }
  };

  const handleMouseUp = () => {
    try {
      if (isPanning) setIsPanning(false);
      if (isDrawing) {
        if (tool === "freedraw" || tool === "wall") {
          let pos = getMousePos(stageRef.current, snapToGrid, gridSize, snapToGrid);
          if (pos && snapToGrid) {
            const snappedX = Math.round(pos.x / gridSize) * gridSize;
            const snappedY = Math.round(pos.y / gridSize) * gridSize;
            setCurrentStroke((prev) => {
              if (!prev) return prev;
              let points = [...prev.points];
              if (tool === "wall") {
                points = [points[0], points[1], snappedX, snappedY];
              } else {
                points = [...points.slice(0, -2), snappedX, snappedY];
              }
              return { ...prev, points };
            });
          }
          if (currentStroke && currentStroke.points.length >= 4) {
            const newStroke = {
              id: Date.now(),
              points: currentStroke.points,
              x: 0,
              y: 0,
              layer_id: activeLayerId,
              color: currentStroke.color,
              thickness: currentStroke.thickness,
              isWall: currentStroke.isWall,
              isEraser: currentStroke.isEraser,
              material,
            };
            setStrokes((prev) => [...prev, newStroke]);
          }
          setCurrentStroke(null);
        }
        setIsDrawing(false);
      }
      setGuides([]);

      if (selectionBox && tool === "select" && !isDraggingNode) {
        const { x, y, width, height } = selectionBox;
        const x1 = Math.min(x, x + width);
        const x2 = Math.max(x, x + width);
        const y1 = Math.min(y, y + height);
        const y2 = Math.max(y, y + height);

        // helper: collect hits in the box (returns array of objects: original stroke/shape objects)
        const collectHits = () => {
          const hitStrokes = strokes.filter(
            (s) =>
              s.layer_id === activeLayerId &&
              s.points.some(
                (_, i) =>
                  i % 2 === 0 &&
                  s.points[i] >= x1 &&
                  s.points[i] <= x2 &&
                  s.points[i + 1] >= y1 &&
                  s.points[i + 1] <= y2
              )
          );

          const hitShapes = shapes
            .filter((sh) => sh.layer_id === activeLayerId)
            .filter((sh) => {
              let left, right, top, bottom;
              if (sh.type === "rect") {
                left = sh.x;
                right = sh.x + (sh.width || 0);
                top = sh.y;
                bottom = sh.y + (sh.height || 0);
                return left <= x2 && right >= x1 && top <= y2 && bottom >= y1;
              } else if (sh.type === "circle") {
                const r = sh.radius || 0;
                left = sh.x - r;
                right = sh.x + r;
                top = sh.y - r;
                bottom = sh.y + r;
                return left <= x2 && right >= x1 && top <= y2 && bottom >= y1;
              } else if (sh.type === "path" && Array.isArray(sh.points)) {
                const xs = [];
                const ys = [];
                for (let i = 0; i < sh.points.length; i += 2) {
                  xs.push(sh.points[i]);
                  ys.push(sh.points[i + 1]);
                }
                const leftB = Math.min(...xs);
                const rightB = Math.max(...xs);
                const topB = Math.min(...ys);
                const bottomB = Math.max(...ys);
                return leftB <= x2 && rightB >= x1 && topB <= y2 && bottomB >= y1;
              }
              return false;
            });

          return [...hitStrokes, ...hitShapes];
        };

        const hits = collectHits();

        // If exactly one object is selected and snapToGrid is true, snap that object to the grid
        if (hits.length === 1 && snapToGrid) {
          const hit = hits[0];
          // helper to snap a single numeric value to grid
          const snapVal = (v) => Math.round(v / gridSize) * gridSize;

          if (hit.points && Array.isArray(hit.points)) {
            // stroke/wall/path: snap all points to grid
            setStrokes((prev) =>
              prev.map((st) =>
                st.id === hit.id
                  ? {
                      ...st,
                      points: st.points.map((val, i) =>
                        // snap both X and Y
                        snapVal(val)
                      ),
                    }
                  : st
              )
            );
          } else {
            // shape: snap x/y and for rect/circle also snap dims if desired (we only snap position here)
            setShapes((prev) =>
              prev.map((sh) =>
                sh.id === hit.id
                  ? {
                      ...sh,
                      x: typeof sh.x === "number" ? snapVal(sh.x) : sh.x,
                      y: typeof sh.y === "number" ? snapVal(sh.y) : sh.y,
                    }
                  : sh
              )
            );
          }

          // update selection to the snapped object's id
          setSelectedId(hit.id);
        } else {
          // multiple or zero hits: keep previous behavior (no snapping)
          if (hits.length > 1) {
            setSelectedId(hits.map((h) => h.id));
          } else if (hits.length === 1) {
            setSelectedId(hits[0].id);
          } else {
            setSelectedId(null);
          }
        }

        setSelectionBox(null);
      }
    } catch (err) {
      onError?.(`Error on mouse up: ${err?.message || err}`);
    }
  };

  const handleWheel = (e) => {
    try {
      e.evt.preventDefault();
      const scaleBy = 1.05;
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = camera.scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      const mousePoint = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      const clamped = Math.max(0.2, Math.min(4, newScale));

      const newPos = {
        x: pointer.x - mousePoint.x * clamped,
        y: pointer.y - mousePoint.y * clamped,
      };

      setCamera({ x: newPos.x, y: newPos.y, scale: clamped });
    } catch (err) {
      onError?.(`Error on zoom: ${err?.message || err}`);
    }
  };

  const eraseAtPoint = (world) => {
    try {
      const hitStrokeIds = strokes
        .filter((st) => st.layer_id === activeLayerId)
        .filter((st) => {
          for (let i = 0; i < st.points.length - 2; i += 2) {
            const x1 = st.points[i];
            const y1 = st.points[i + 1];
            const x2 = st.points[i + 2];
            const y2 = st.points[i + 3];
            if (distToSegment(world.x, world.y, x1, y1, x2, y2) <= thickness / 2) {
              return true;
            }
          }
          return false;
        })
        .map((st) => st.id);

      if (hitStrokeIds.length > 0) {
        setStrokes((prev) => prev.filter((st) => !hitStrokeIds.includes(st.id)));
        setSelectedId(null);
      }

      const hitShapeIds = shapes
        .filter((sh) => sh.layer_id === activeLayerId)
        .filter((sh) => {
          if (sh.type === "rect") {
            return (
              world.x >= sh.x &&
              world.x <= sh.x + (sh.width || 0) &&
              world.y >= sh.y &&
              world.y <= sh.y + (sh.height || 0)
            );
          } else if (sh.type === "circle") {
            const dx = world.x - sh.x;
            const dy = world.y - sh.y;
            return Math.hypot(dx, dy) <= (sh.radius || 0);
          } else if (sh.type === "path") {
            const xs = [];
            const ys = [];
            for (let i = 0; i < (sh.points || []).length; i += 2) {
              xs.push(sh.points[i]);
              ys.push(sh.points[i + 1]);
            }
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            return world.x >= minX && world.x <= maxX && world.y >= minY && world.y <= maxY;
          }
          return false;
        })
        .map((sh) => sh.id);

      if (hitShapeIds.length > 0) {
        setShapes((prev) => prev.filter((sh) => !hitShapeIds.includes(sh.id)));
        setSelectedId(null);
      }
    } catch (err) {
      onError?.(`Error during erase: ${err?.message || err}`);
    }
  };

  // --- inserted: handleTransformEnd required by the useEffect below ---
  const handleTransformEnd = () => {
    try {
      const tr = transformerRef.current;
      const nodes = tr?.nodes?.() || [];
      if (!nodes.length) return;

      nodes.forEach((node) => {
        const id = parseInt(node.id && node.id(), 10);
        if (!Number.isFinite(id)) return;

        const className = node.getClassName();
        const shapeObj = shapes.find((sh) => sh.id === id);
        const strokeObj = strokes.find((st) => st.id === id);

        if (className === "Ellipse" && shapeObj) {
          // Ellipse (Oval)
          setShapes((prev) =>
            prev.map((sh) =>
              sh.id === id
                ? {
                    ...sh,
                    x: node.x(),
                    y: node.y(),
                    radiusX: node.radiusX() * node.scaleX(),
                    radiusY: node.radiusY() * node.scaleY(),
                    rotation: node.rotation(),
                  }
                : sh
            )
          );
          node.scaleX(1);
          node.scaleY(1);
        } else if (className === "Circle" && shapeObj) {
          // Circle
          setShapes((prev) =>
            prev.map((sh) =>
              sh.id === id
                ? {
                    ...sh,
                    x: node.x(),
                    y: node.y(),
                    radius: node.radius() * node.scaleX(),
                    rotation: node.rotation(),
                  }
                : sh
            )
          );
          node.scaleX(1);
          node.scaleY(1);
        } else if (className === "Line") {
          // Could be a stroke OR a polygon/triangle shape
          if (shapeObj && (shapeObj.type === "polygon" || shapeObj.type === "triangle")) {
            const baked = bakeLinePoints(node, shapeObj.points || []);
            setShapes((prev) =>
              prev.map((sh) =>
                sh.id === id
                  ? {
                      ...sh,
                      // we store absolute points, so reset node transforms:
                      x: 0,
                      y: 0,
                      rotation: 0,
                      points: baked,
                    }
                  : sh
              )
            );
            node.x(0);
            node.y(0);
            node.rotation(0);
            node.scaleX(1);
            node.scaleY(1);
          } else if (strokeObj) {
            const baked = bakeLinePoints(node, strokeObj.points || []);
            setStrokes((prev) =>
              prev.map((st) => (st.id === id ? { ...st, points: baked } : st))
            );
            node.x(0);
            node.y(0);
            node.rotation(0);
            node.scaleX(1);
            node.scaleY(1);
          }
        }
        node.getLayer()?.batchDraw();
      });
    } catch (err) {
      onError?.(`Error on transform end: ${err?.message || err}`);
    }
  };
  // --- end insertion ---

  useEffect(() => {
    const tr = transformerRef?.current;
    const stage = stageRef?.current;
    if (!tr || !stage) return;

    tr.off("transformend");
    let nodes = [];
    if (Array.isArray(selectedId)) {
      nodes = selectedId
        .map((id) => stage.findOne(`#${id}`))
        .filter(Boolean);
    } else if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      if (node) nodes = [node];
    }

    tr.nodes(nodes);
    if (nodes.length > 0) {
      tr.on("transformend", handleTransformEnd);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();

    return () => tr.off("transformend");
    // including layers ensures selection clears on layer change
  }, [selectedId, strokes, shapes, layers, transformerRef]);

  useEffect(() => {
    setSelectedId(null);
  }, [layers, activeLayerId]);

  useEffect(() => {
    const handler = (event) => {
      try {
        const stage = stageRef.current;
        if (!stage) return;
        const container = stage.container();
        if (!container) return;
        if (!container.contains(event.target)) {
          setSelectedId(null);
        }
      } catch (err) {}
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel };
}

// useDragHandlers: accept optional helpers with safe defaults so ActiveLayer can call it succinctly
export function useDragHandlers({
  strokes,
  setStrokes,
  shapes,
  setShapes,
  selectedId,
  transformerRef,
  setIsDraggingNode = () => {},
  setGuides = () => {},
  onError = () => {},
}) {
  const handleDragStart = () => {
    try {
      setIsDraggingNode(true);
    } catch (err) {
      onError?.(`Error on drag start: ${err?.message || err}`);
    }
  };

  const handleDragMove = (e) => {
    try {
      // Only snap if single selection
      if (Array.isArray(selectedId) && selectedId.length > 1) {
        setGuides([]); // Remove guides for multi-select
        return;
      }

      const node = e.target;
      const snaps = getSnapPositions(strokes, shapes);
      const threshold = 5;

      const bounds = node.getClientRect({ relativeTo: node.getParent() });
      const objVerts = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
      const objHors = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];

      let minDistV = Infinity;
      let bestDeltaV = 0;
      let bestSvV = null;
      for (const ov of objVerts) {
        for (const sv of snaps.vertical) {
          const dist = Math.abs(sv - ov);
          if (dist < threshold && dist < minDistV) {
            minDistV = dist;
            bestDeltaV = sv - ov;
            bestSvV = sv;
          }
        }
      }

      let minDistH = Infinity;
      let bestDeltaH = 0;
      let bestShH = null;
      for (const oh of objHors) {
        for (const sh of snaps.horizontal) {
          const dist = Math.abs(sh - oh);
          if (dist < threshold && dist < minDistH) {
            minDistH = dist;
            bestDeltaH = sh - oh;
            bestShH = sh;
          }
        }
      }

      const newX = node.x() + bestDeltaV;
      const newY = node.y() + bestDeltaH;

      const newGuides = [];
      if (minDistV < threshold) {
        newGuides.push({ orientation: "V", position: bestSvV });
      }
      if (minDistH < threshold) {
        newGuides.push({ orientation: "H", position: bestShH });
      }

      node.x(newX);
      node.y(newY);
      setGuides(newGuides);
    } catch (err) {
      onError?.(`Error during drag move: ${err?.message || err}`);
    }
  };

  const handleDragEnd = (e) => {
    try {
      setIsDraggingNode(false);
      const node = e.target;
      const idRaw = node.id && node.id();
      const id = Number.isFinite(parseInt(idRaw)) ? parseInt(idRaw) : null;
      const className = node.getClassName();

      if (className === "Line" && id !== null) {
        const relTransform = node.getTransform();
        const oldPoints = node.points();
        const newPoints = [];
        for (let i = 0; i < oldPoints.length; i += 2) {
          const local = { x: oldPoints[i], y: oldPoints[i + 1] };
          const world = relTransform.point(local);
          newPoints.push(world.x, world.y);
        }
        node.x(0);
        node.y(0);
        node.points(newPoints);
        node.getLayer().batchDraw();

        setStrokes((prev) =>
          prev.map((st) =>
            st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st
          )
        );
      } else if (id !== null) {
        setShapes((prev) =>
          prev.map((sh) =>
            sh.id === id ? { ...sh, x: node.x(), y: node.y() } : sh
          )
        );
      }
      setGuides([]);
    } catch (err) {
      onError?.(`Error on drag end: ${err?.message || err}`);
    }
  };

  const handleTransformEnd = () => {
    try {
      const nodes = transformerRef.current?.nodes() || [];
      nodes.forEach((node) => {
        const idRaw = node.id && node.id();
        const id = Number.isFinite(parseInt(idRaw)) ? parseInt(idRaw) : null;
        const className = node.getClassName();

        if (className === "Line" && id !== null) {
          const relTransform = node.getTransform();
          const oldPoints = node.points();
          const newPoints = [];
          for (let i = 0; i < oldPoints.length; i += 2) {
            const local = { x: oldPoints[i], y: oldPoints[i + 1] };
            const world = relTransform.point(local);
            newPoints.push(world.x, world.y);
          }
          node.x(0);
          node.y(0);
          node.scaleX(1);
          node.scaleY(1);
          node.rotation(0);
          node.points(newPoints);
          node.getLayer().batchDraw();

          setStrokes((prev) =>
            prev.map((st) =>
              st.id === id ? { ...st, points: newPoints, x: 0, y: 0 } : st
            )
          );
        } else if (id !== null) {
          setShapes((prev) =>
            prev.map((sh) => {
              if (sh.id !== id) return sh;
              let newSh = { ...sh };
              newSh.x = node.x();
              newSh.y = node.y();
              newSh.rotation = node.rotation();

              if (sh.type === "rect" || sh.type === "groupBounding") {
                newSh.width = (node.width() || 80) * node.scaleX();
                newSh.height = (node.height() || 60) * node.scaleY();
              } else if (sh.type === "ellipse") {
                newSh.radiusX = (sh.radiusX || sh.radius || 40) * node.scaleX();
                newSh.radiusY = (sh.radiusY || sh.radius || 40) * node.scaleY();
              } else if (sh.type === "regularPolygon") {
                newSh.radius = (sh.radius || 40) * Math.min(node.scaleX(), node.scaleY());
              } else if (sh.type === "path" && Array.isArray(sh.points)) {
                const relTransform = node.getTransform();
                const oldPoints = sh.points;
                const newPoints = [];
                for (let i = 0; i < oldPoints.length; i += 2) {
                  const local = { x: oldPoints[i], y: oldPoints[i + 1] };
                  const world = relTransform.point(local);
                  newPoints.push(world.x, world.y);
                }
                newSh.points = newPoints;
                newSh.data = pointsToPath(newPoints);
                node.x(0);
                node.y(0);
                node.scaleX(1);
                node.scaleY(1);
                node.rotation(0);
              }

              node.scaleX(1);
              node.scaleY(1);
              node.getLayer().batchDraw();
              return newSh;
            })
          );
        } else if (className === "Ellipse" && id !== null) {
          setShapes((prev) =>
            prev.map((sh) =>
              sh.id === id
                ? {
                    ...sh,
                    x: node.x(),
                    y: node.y(),
                    radiusX: node.radiusX() * node.scaleX(),
                    radiusY: node.radiusY() * node.scaleY(),
                    rotation: node.rotation(),
                  }
                : sh
            )
          );
          node.scaleX(1);
          node.scaleY(1);
          node.getLayer().batchDraw();
        } else if (className === "Circle" && id !== null) {
          setShapes((prev) =>
            prev.map((sh) =>
              sh.id === id
                ? {
                    ...sh,
                    x: node.x(),
                    y: node.y(),
                    radius: node.radius() * node.scaleX(),
                    rotation: node.rotation(),
                  }
                : sh
            )
          );
          node.scaleX(1);
          node.scaleY(1);
          node.getLayer().batchDraw();
        } else if (className === "Triangle" && id !== null) {
          setShapes((prev) =>
            prev.map((sh) =>
              sh.id === id
                ? {
                    ...sh,
                    x: node.x(),
                    y: node.y(),
                    width: node.width() * node.scaleX(),
                    height: node.height() * node.scaleY(),
                    rotation: node.rotation(),
                  }
                : sh
            )
          );
          node.scaleX(1);
          node.scaleY(1);
          node.getLayer().batchDraw();
        }
      });
    } catch (err) {
      onError?.(`Error on transform end: ${err?.message || err}`);
    }
  };

  return { handleDragStart, handleDragMove, handleDragEnd, handleTransformEnd };
}

export function isStrokeHit(stroke, box) {
  const { x1, x2, y1, y2 } = box;
  return stroke.points.some(
    (_, i) =>
      i % 2 === 0 &&
      stroke.points[i] >= x1 &&
      stroke.points[i] <= x2 &&
      stroke.points[i + 1] >= y1 &&
      stroke.points[i + 1] <= y2
  );
}

export function isShapeHit(shape, box) {
  const { x1, x2, y1, y2 } = box;
  let left, right, top, bottom;
  if (shape.type === "rect") {
    left = shape.x;
    right = shape.x + (shape.width || 0);
    top = shape.y;
    bottom = shape.y + (shape.height || 0);
    return left <= x2 && right >= x1 && top <= y2 && bottom >= y1;
  }
  // ...other shape types...
  return false;
}

export function collectHitsInBox(strokes, shapes, box, activeLayerId) {
  const hitStrokes = strokes.filter(
    (s) => s.layer_id === activeLayerId && isStrokeHit(s, box)
  );
  const hitShapes = shapes
    .filter((sh) => sh.layer_id === activeLayerId)
    .filter((sh) => isShapeHit(sh, box));
  return [...hitStrokes, ...hitShapes];
}

export function applyTransformToShape(shape, node) {
  let newSh = { ...shape };
  newSh.x = node.x();
  newSh.y = node.y();
  newSh.rotation = node.rotation();
  if (shape.type === "rect") {
    newSh.width = (node.width() || 80) * node.scaleX();
    newSh.height = (node.height() || 60) * node.scaleY();
  }
  // ...other shape types...
  node.scaleX(1);
  node.scaleY(1);
  node.getLayer().batchDraw();
  return newSh;
}

// helper: bake transform into points for a Konva.Line node
function bakeLinePoints(node, originalPoints) {
  const t = node.getTransform();
  const out = [];
  for (let i = 0; i < originalPoints.length; i += 2) {
    const p = t.point({ x: originalPoints[i], y: originalPoints[i + 1] });
    out.push(p.x, p.y);
  }
  return out;
}

// --- ensure multi-select disables snapping in drag move (if you use a dedicated handler, apply same check) ---
const disableSnapForMultiSelect = (selectedId) => Array.isArray(selectedId) && selectedId.length > 1;