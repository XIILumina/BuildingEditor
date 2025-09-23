import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePage, Link as InertiaLink } from "@inertiajs/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Template from "./Template";
import Toolbar from "./Toolbar";
import FileMenu from "./FileMenu";
import Sidepanel from "./Sidepanel/Sidepanel";
import TextInput from '@/Components/TextInput';

let aiRequestInProgress = false;

const askAI = async (prompt) => {
  if (aiRequestInProgress) return;
  aiRequestInProgress = true;
  try {
    const res = await axios.post('/openai/chat', { prompt });
    return res.data.reply;
  } catch (err) {
    console.error("OpenAI error:", err);
    alert("AI request failed.");
  } finally {
    aiRequestInProgress = false;
  }
};

export default function Editor({ projectId }) {
  const page = usePage();
  const auth = page?.props?.auth || { user: null };

  const [tool, setTool] = useState("select");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [thickness, setThickness] = useState(6);
  const [material, setMaterial] = useState("Brick");
  const [gridSize, setGridSize] = useState(10);
  const [units, setUnits] = useState("Metric");
  const [sidepanelMode, setSidepanelMode] = useState("properties");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [strokes, setStrokes] = useState([]);
  const [erasers, setErasers] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [layers, setLayers] = useState([{ id: 1, name: "Layer 1" }]);
  const [activeLayerId, setActiveLayerId] = useState(1);
  

  const saveInProgress = useRef(false);

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
  }, [snapshot]);

  const updateStrokes = (newStrokes) => {
    setStrokes(newStrokes);
  };
  const updateErasers = (newErasers) => {
    setErasers(newErasers);
  };
  const updateShapes = (newShapes) => {
    setShapes(newShapes);
  };

  useEffect(() => {
    if (!projectId) return;
    axios.get(`/projects/${projectId}`)
      .then((res) => {
        const project = res.data?.project;
        if (!project) return;
        const data = project.data || {};
        if (data.strokes) setStrokes(data.strokes);
        if (data.erasers) setErasers(data.erasers);
        if (data.shapes) setShapes(data.shapes);
        if (data.gridSize) setGridSize(data.gridSize);
        if (data.units) setUnits(data.units);
        if (data.drawColor) setDrawColor(data.drawColor);
        if (data.thickness) setThickness(data.thickness);
        if (data.material) setMaterial(data.material);
        if (project.name) setProjectName(project.name);
        if (project.layers && project.layers.length > 0) {
          setLayers(project.layers);
          setActiveLayerId(project.layers[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load project:", err);
      });
  }, [projectId]);

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
          layers,
        },
      });
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
      const newLayer = { id: Date.now(), name: `Layer ${layers.length + 1}` };
      setLayers(prev => [...prev, newLayer]);
      setActiveLayerId(newLayer.id);
    }
  };

  const deleteLayer = useCallback((layerId) => {
    if (layers.length <= 1) return;
    if (!confirm(`Delete layer and all its contents?`)) return;
    const newActiveId = layers.find(l => l.id !== layerId)?.id || layers[0].id;
    setActiveLayerId(newActiveId);
    setLayers(prev => prev.filter(l => l.id !== layerId));
    setStrokes(prev => prev.filter(s => s.layer_id !== layerId));
    setShapes(prev => prev.filter(sh => sh.layer_id !== layerId));
    setErasers(prev => prev.filter(e => e.layer_id !== layerId));
  }, [layers]);

  const snapToGrid = (val) => {
    return Math.round(val / gridSize) * gridSize;
  };

  const selectedObject = useMemo(() => {
    if (!selectedId || Array.isArray(selectedId)) return null;
    return strokes.find(s => s.id === selectedId) || shapes.find(sh => sh.id === selectedId);
  }, [selectedId, strokes, shapes]);

  const updateSelectedProperty = useCallback((property, value) => {
    if (!selectedId || Array.isArray(selectedId)) return;
    pushHistory(`update-${property}`);
    if (strokes.some(s => s.id === selectedId)) {
      setStrokes(prev => prev.map(s => {
        if (s.id !== selectedId) return s;
        let newS = { ...s };
        if (property === 'length' && s.isWall && s.points.length === 4) {
          const [x1, y1, x2, y2] = s.points;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const currentLen = Math.hypot(dx, dy);
          if (currentLen === 0) return s;
          const scale = value / currentLen;
          newS.points = [x1, y1, x1 + dx * scale, y1 + dy * scale];
        }
        return newS;
      }));
    } else if (shapes.some(sh => sh.id === selectedId)) {
      setShapes(prev => prev.map(sh => {
        if (sh.id !== selectedId) return sh;
        let newSh = { ...sh };
        if (property === 'width') newSh.width = value;
        else if (property === 'height') newSh.height = value;
        else if (property === 'radius') newSh.radius = value;
        return newSh;
      }));
    }
  }, [selectedId, strokes, shapes, pushHistory]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
    pushHistory("delete");
    setStrokes((s) => s.filter((x) => !ids.includes(x.id)));
    setShapes((s) => s.filter((x) => !ids.includes(x.id)));
    setErasers((e) => e.filter((x) => !ids.includes(e.id)));
    setSelectedId(null);
  }, [selectedId, pushHistory]);

  useEffect(() => {
    if (tool !== "select") {
      setSelectedId(null);
    }
    // Set eraser thickness to 40 when selected
    if (tool === "eraser") {
      setThickness(40);
    }
  }, [tool]);

  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        return;
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
        return;
      }
      if (e.key.toLowerCase() === "e") {
        setTool("eraser");
        return;
      }
      if (e.key.toLowerCase() === "w") {
        setTool("wall");
        return;
      }
      if (e.key.toLowerCase() === "f") {
        setTool("freedraw");
        return;
      }
      if (e.key.toLowerCase() === "s") {
        setTool("select");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        console.log("Autosaving project...");
        saveProject();
        return;
      }

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
          setLayers(last.layers || [{ id: 1, name: "Layer 1" }]);
          setActiveLayerId(last.activeLayerId || 1);
          return h.slice(0, -1);
        });
        return;
      }

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
          setLayers(next.layers || [{ id: 1, name: "Layer 1" }]);
          setActiveLayerId(next.activeLayerId || 1);
          return r.slice(0, -1);
        });
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        if (!selectedId) return;
        const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
        const items = [];
        ids.forEach((id) => {
          const s = strokes.find(st => st.id === id);
          if (s) items.push({ type: "stroke", data: s });
          const sh = shapes.find(ss => ss.id === id);
          if (sh) items.push({ type: "shape", data: sh });
        });
        window.__editorClipboard = items;
      }

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
            const delta = 10;
            clone.points = clone.points.map((p,i) => p + (i%2===0?delta:delta));
            clone.layer_id = activeLayerId;
            pastedStrokes.push(clone);
          } else if (it.type === "shape") {
            const clone = JSON.parse(JSON.stringify(it.data));
            clone.id = Date.now() + Math.floor(Math.random()*10000);
            clone.x = (clone.x || 0) + 10;
            clone.y = (clone.y || 0) + 10;
            clone.layer_id = activeLayerId;
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
  }, [selectedId, strokes, shapes, pushHistory, snapshot, saveProject, activeLayerId, deleteSelected]);

  const addShape = useCallback((type) => {
    pushHistory("add-shape");
    const base = { 
      id: Date.now(), 
      type, 
      color: "#9CA3AF", 
      rotation: 0,
      layer_id: activeLayerId 
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
    }
    setShapes((s) => [...s, base]);
  }, [pushHistory, activeLayerId]);

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
    snapToGrid: true,
    onSave: saveProject
  };

  return (
    <motion.div
      className="relative h-screen w-screen bg-[#071021] text-white overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center justify-between px-6 bg-[#1e293b] border-b border-[#334155] shadow-md"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="relative flex items-center w-full">
          <div className="flex items-center space-x-4">
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
            <InertiaLink href="/" className="font-bold text-xl text-[#f3f4f6]">
              Blueprint App
            </InertiaLink>
          </div>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <TextInput
              onChange={(e) => setProjectName(e.target.value)}
              className="inline-block px-4 py-2 bg-[#334155] text-[#f3f4f6] font-semibold shadow-md border border-[#06b6d4]"
              value={projectName || "Untitled Project"}
            />
          </div>
          <div className="flex items-center space-x-4 ml-auto">
            {/* right content */}
          </div>
        </div>
      </motion.div>
<motion.div
  className="fixed top-20 left-1/3 transform -translate-x-1/2 z-40"
  initial={{ y: -20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.4, delay: 0.2 }}
>
        <Toolbar
          tool={tool}
          setTool={setTool}
          drawColor={drawColor}
          setDrawColor={setDrawColor}
          thickness={thickness}
          setThickness={setThickness}
        />
      </motion.div>
      <div className="absolute top-16 left-0 right-0 bottom-12 flex">
        <div className="flex-1 relative z-0">
          <Template {...templateProps} />
        </div>
        <motion.div
          className="w-80 z-30 border-l border-[#334155] bg-[#071227]"
          initial={{ x: 300 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.4 }}
        >
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
            selectedObject={selectedObject}
            updateSelectedProperty={updateSelectedProperty}
          />
        </motion.div>
      </div>
      <motion.div
        className="fixed top-20 left-4 z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.button
          onClick={async () => {
            const reply = await askAI("Give me tips for using the editor.");
            alert(reply);
          }}
          className="bg-[#06b6d4] text-[#071021] text-sm px-4 py-2 shadow-md border border-[#334155]"
          whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
          whileTap={{ scale: 0.98 }}
        >
          AI Help
        </motion.button>
      </motion.div>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-30 h-12 bg-[#1e293b] flex items-center px-6 border-t border-[#334155] shadow-md"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center space-x-3 overflow-x-auto flex-1">
          <AnimatePresence>
            {layers.map((layer) => (
              <motion.div
                key={layer.id}
                className="flex items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`px-3 py-2 text-sm font-medium ${
                    activeLayerId === layer.id
                      ? 'bg-[#06b6d4] text-[#071021]'
                      : 'bg-[#334155] text-[#f3f4f6] hover:bg-[#475569]'
                  } shadow-md border border-[#334155]`}
                  whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {layer.name}
                </motion.button>
                {layers.length > 1 && (
                  <motion.button
                    onClick={() => deleteLayer(layer.id)}
                    className="ml-2 px-2 py-1 bg-[#dc2626] text-[#f3f4f6] text-xs shadow-md border border-[#334155]"
                    whileHover={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    X
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <motion.button
          onClick={addLayer}
          className="px-4 py-2 bg-[#06b6d4] text-[#071021] shadow-md border border-[#334155]"
          whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
          whileTap={{ scale: 0.98 }}
        >
          +
        </motion.button>
      </motion.div>
    </motion.div>
  );
}