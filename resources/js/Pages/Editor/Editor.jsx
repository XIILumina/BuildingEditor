// Editor.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { usePage, Link as InertiaLink } from "@inertiajs/react";
import axios from "axios";

import Template from "./Template";
import Toolbar from "./Toolbar";
import FileMenu from "./FileMenu";
import Sidepanel from "./Sidepanel/Sidepanel";
import TextInput from '@/Components/TextInput';

export default function Editor({ projectId }) {
  const page = usePage();
  const auth = page?.props?.auth || { user: null };

  // Tools / visual props
  const [tool, setTool] = useState("select"); // 'select' | 'freedraw' | 'wall' | 'eraser'
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [thickness, setThickness] = useState(6);
  const [material, setMaterial] = useState("Brick");
  const [gridSize, setGridSize] = useState(10); // was 20 -> smaller grid
  
  const [units, setUnits] = useState("Metric");
  const [sidepanelMode, setSidepanelMode] = useState("properties"); // properties | settings | shapes

  // Project metadata
  const [projectName, setProjectName] = useState("Untitled Project");

  // Data layers
  const [strokes, setStrokes] = useState([]);     // drawing strokes and walls
  const [erasers, setErasers] = useState([]);     // eraser strokes (destination-out)
  const [shapes, setShapes] = useState([]);       // inserted shapes (rect/circle/etc)

  // Selection and history
  const [selectedId, setSelectedId] = useState(null); // single id or array for multiple
  const [history, setHistory] = useState([]); // array of snapshots
  const [redoStack, setRedoStack] = useState([]);

  // Layers (UI only): simple layer list to demonstrate layering
  const [layers, setLayers] = useState([{ id: 1, name: "Layer 1" }]);
  const [activeLayerId, setActiveLayerId] = useState(1);

  // local refs
  const saveInProgress = useRef(false);

  // Helper: snapshot state for history
  const snapshot = useCallback(() => {
    return {
      strokes: JSON.parse(JSON.stringify(strokes)),
      erasers: JSON.parse(JSON.stringify(erasers)),
      shapes: JSON.parse(JSON.stringify(shapes)),
      projectName,
    };
  }, [strokes, erasers, shapes, projectName]);

  const pushHistory = useCallback((label) => {
    setHistory((h) => [...h, snapshot()]);
    setRedoStack([]); // clear redo on new changea
  }, [snapshot]);

  // Basic CRUD helpers for layers' data
  const updateStrokes = (newStrokes) => {
    setStrokes(newStrokes);
  };
  const updateErasers = (newErasers) => {
    setErasers(newErasers);
  };
  const updateShapes = (newShapes) => {
    setShapes(newShapes);
  };

  // Load project on mount
  useEffect(() => {
    if (!projectId) return;
    axios.get(`/projects/${projectId}`)
      .then((res) => {
        const data = res.data?.project?.data || {};
        if (data.strokes) setStrokes(data.strokes);
        if (data.erasers) setErasers(data.erasers);
        if (data.shapes) setShapes(data.shapes);
        if (data.gridSize) setGridSize(data.gridSize);
        if (data.units) setUnits(data.units);
        if (data.drawColor) setDrawColor(data.drawColor);
        if (data.thickness) setThickness(data.thickness);
        if (data.material) setMaterial(data.material);
        if (data.projectName) setProjectName(data.projectName);
      })
      .catch((err) => {
        // silent fail
        console.error("Failed to load project:", err);
      });
  }, [projectId]);

  // Save function (used by FileMenu and Ctrl+S)
const saveProject = async () => {
  if (!projectId) return;
  if (saveInProgress.current) return;
  saveInProgress.current = true;
  try {
    await axios.post(`/projects/${projectId}/save`, {
      data: {
        strokes,
        erasers,
        shapes,
        gridSize,
        units,
        drawColor,
        thickness,
        material,
        projectName,
        // send layers so backend can create layer records if needed
        layers,
      },
    });
    // optional toast
  } catch (err) {
    console.error("Save failed:", err);
    alert("Save failed.");
  } finally {
    saveInProgress.current = false;
  }
};

const addLayer = async () => {
  try {
    const res = await axios.post(`/projects/${projectId}/layers`, { name: `Layer ${layers.length + 1}` });
    const newLayer = res.data?.layer ?? { id: Date.now(), name: `Layer ${layers.length + 1}` };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  } catch (err) {
    console.error("Failed to create layer:", err);
    // fallback to local-only
    const newLayer = { id: Date.now(), name: `Layer ${layers.length + 1}` };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }
};

  const snapToGrid = (val) => {
  return Math.round(val / gridSize) * gridSize;
};

  // Keyboard shortcuts: undo/redo/copy/paste/save
  useEffect(() => {
    const handler = (e) => {
      // Ignore if input focused
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }

      if (e.key === "Delete") {
        deleteSelected();
        return;
      }
      if (e.key === "Backspace") {
        deleteSelected();
        return;
      }
      if (e.key === "E" || e.key === "e") {
        setTool("eraser");
        return;
      }
      if (e.key === "W" || e.key === "w") {
        setTool("wall");
        return;
      }
      if (e.key === "F" || e.key === "f") {
        setTool("freedraw");
        return;
      }
      if (e.key === "S" || e.key === "s") {
        setTool("select");
        return;
      }
      // Ctrl+S = save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProject();
        return;
      }

      // Ctrl+Z = undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        setHistory((h) => {
          if (h.length === 0) return h;
          const last = h[h.length - 1];
          setRedoStack((r) => [...r, snapshot()]);
          setStrokes(last.strokes || []);
          setErasers(last.erasers || []);
          setShapes(last.shapes || []);
          setProjectName(last.projectName || "Untitled Project");
          return h.slice(0, -1);
        });
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z = redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        setRedoStack((r) => {
          if (r.length === 0) return r;
          const next = r[r.length - 1];
          setHistory((h) => [...h, snapshot()]);
          setStrokes(next.strokes || []);
          setErasers(next.erasers || []);
          setShapes(next.shapes || []);
          setProjectName(next.projectName || "Untitled Project");
          return r.slice(0, -1);
        });
        return;
      }

      // Ctrl+C copy (store selected items)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (!selectedId) return;
        // prepare clipboard on editor (store as JSON in hidden variable)
        const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
        const items = [];
        // strokes
        ids.forEach((id) => {
          const s = strokes.find(st => st.id === id);
          if (s) items.push({ type: "stroke", data: s });
          const sh = shapes.find(ss => ss.id === id);
          if (sh) items.push({ type: "shape", data: sh });
        });
        // store in DOM clipboard (not permanent) and in-memory
        window.__editorClipboard = items;
      }

      // Ctrl+V paste
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        e.preventDefault();
        const items = window.__editorClipboard;
        if (!items || items.length === 0) return;
        pushHistory("paste");
        const pastedStrokes = [...strokes];
        const pastedShapes = [...shapes];
        items.forEach((it) => {
          if (it.type === "stroke") {
            const clone = JSON.parse(JSON.stringify(it.data));
            clone.id = Date.now() + Math.floor(Math.random()*10000);
            // offset pasted copy so it doesn't overlap exactly
            const delta = 10;
            clone.points = clone.points.map((p,i) => p + (i%2===0?delta:delta));
            pastedStrokes.push(clone);
          } else if (it.type === "shape") {
            const clone = JSON.parse(JSON.stringify(it.data));
            clone.id = Date.now() + Math.floor(Math.random()*10000);
            clone.x = (clone.x || 0) + 10;
            clone.y = (clone.y || 0) + 10;
            pastedShapes.push(clone);
          }
        });
        setStrokes(pastedStrokes);
        setShapes(pastedShapes);
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, strokes, shapes, pushHistory, snapshot, saveProject]);

  // Add shape helper used by Sidepanel
  const addShape = useCallback((type) => {
    pushHistory("add-shape");
    const base = { id: Date.now(), type, color: "#9CA3AF", rotation: 0 };
    if (type === "rect") {
      base.x = 150; base.y = 150; base.width = 100; base.height = 60;
    } else if (type === "circle") {
      base.x = 200; base.y = 200; base.radius = 40;
    }
    setShapes((s) => [...s, base]);
  }, [pushHistory]);

  // Called by Template when strokes/erasers/shapes changed
  const onStrokesChange = (newStrokes) => {
    pushHistory("strokes-change");
    setStrokes(newStrokes);
  };
  const onErasersChange = (newErasers) => {
    pushHistory("erasers-change");
    setErasers(newErasers);
  };
  const onShapesChange = (newShapes) => {
    pushHistory("shapes-change");
    setShapes(newShapes);
  };

  // delete selected helper
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
    pushHistory("delete");
    setStrokes((s) => s.filter((x) => !ids.includes(x.id)));
    setShapes((s) => s.filter((x) => !ids.includes(x.id)));
    setErasers((e) => e.filter((x) => !ids.includes(x.id)));
    setSelectedId(null);
  }, [selectedId, pushHistory]);

  // expose some functions to child via props
  const templateProps = {
 tool,
  strokes,
  setStrokes: onStrokesChange,
  erasers,
  setErasers: onErasersChange,
  shapes,
  setShapes: onShapesChange,
  drawColor,
  thickness,
  gridSize,
  material,
  selectedId,
  setSelectedId,
  layers,
  setLayers,
  activeLayerId,
  setActiveLayerId,
  snapToGrid: true, // pass the snap helper
  };

  return (
    <div className="relative h-screen w-screen bg-[#071021] text-white overflow-hidden">
      {/* top navbar */}
      <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4 bg-gradient-to-b from-[#07101b]/95 to-[#071426]/90 border-b border-gray-800">
        <div className="flex items-center space-x-3">
          <FileMenu
            projectId={projectId}
            strokes={strokes}
            erasers={erasers}
            shapes={shapes}
            gridSize={gridSize}
            units={units}
            drawColor={drawColor}
            thickness={thickness}
            material={material}
            projectName={projectName}
            onSave={saveProject}
          />
          <InertiaLink href="/" className="font-bold text-lg">Blueprint App</InertiaLink>
        </div>

        <div className="text-center">
          <TextInput
            onChange={(e) => setProjectName(e.target.value)}
            className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-[#06b6d4] to-[#7c3aed] text-black font-semibold"
            value={projectName || "Untitled Project"}
          />
        </div>

        <div className="flex items-center space-x-4">
          <Toolbar
            tool={tool}
            setTool={setTool}
            drawColor={drawColor}
            setDrawColor={setDrawColor}
            thickness={thickness}
            setThickness={setThickness}
          />
        </div>
      </div>

      {/* main */}
      <div className="absolute top-14 left-0 right-0 bottom-0 flex">
        <div className="flex-1 relative z-0">
          <Template {...templateProps} />
          
        </div>

        {/* sidepanel */}
        <div className="w-80 z-30 border-l border-gray-800">
            <Sidepanel
              sidepanelMode={sidepanelMode}
              setSidepanelMode={setSidepanelMode}
              projectId={projectId}
              thickness={thickness}
              setThickness={setThickness}
              material={material}
              setMaterial={setMaterial}
              gridSize={gridSize}
              setGridSize={setGridSize}
              units={units}
              setUnits={setUnits}
              drawColor={drawColor}
              setDrawColor={setDrawColor}
              addShape={addShape}
            />
        </div>
      </div>
    </div>
  );
}