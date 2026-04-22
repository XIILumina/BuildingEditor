import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePage, Link as InertiaLink } from "@inertiajs/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import Template from "./Template";
import { makeAnchorBlock, detectRooms } from "./utils/drawingUtils";
import Toolbar from "./Toolbar";
import FileMenu from "./FileMenu";
import Sidepanel from "./Sidepanel/Sidepanel";
import TextInput from '@/Components/TextInput';

let aiRequestInProgress = false;

const askAI = async (prompt) => {
  if (aiRequestInProgress) return { success: false, data: "Request already in progress" };
  aiRequestInProgress = true;
  try {
    const res = await axios.post('/openai/chat', { prompt });
    return { success: true, data: res.data.reply };
  } catch (err) {
    console.error("OpenAI error:", err);
    return { success: false, data: "AI request failed: " + err.message };
  } finally {
    aiRequestInProgress = false;
  }
};

const askAIDraw = async (prompt, projectData) => {
  if (aiRequestInProgress) return { success: false, data: "Request already in progress" };
  aiRequestInProgress = true;
  try {
    const res = await axios.post('/openai/aidrawsuggestion', {
      prompt,
      projectData: JSON.stringify(projectData),
    });
    return res.data;
  } catch (err) {
    console.error("OpenAI draw error:", err);
    return { success: false, data: "AI draw request failed: " + err.message };
  } finally {
    aiRequestInProgress = false;
  }
};

// Round helpers
const roundTo = (n, step = 0.1) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return n;
  return Math.round(x / step) * step;
};

// Deeply round all numeric values; integers remain integers
const deepRound = (val, step = 0.1) => {
  if (Array.isArray(val)) return val.map((v) => deepRound(v, step));
  if (val && typeof val === "object") {
    const out = {};
    for (const k in val) out[k] = deepRound(val[k], step);
    return out;
  }
  if (typeof val === "number") return roundTo(val, step);
  return val;
};

// Create a compact version of project data for AI (reduces token size)
const compactProjectData = (data) => {
  const d = JSON.parse(JSON.stringify(data || {}));
  d.strokes = (d.strokes || []).map((s) => ({
    ...s,
    points: Array.isArray(s.points) ? s.points.map((p) => roundTo(p, 0.1)) : [],
    thickness: roundTo(s.thickness ?? 0, 0.1),
    rotation: roundTo(s.rotation ?? 0, 0.1),
  }));
  d.shapes = (d.shapes || []).map((sh) => {
    const base = { ...sh };
    base.x = roundTo(base.x ?? 0, 0.1);
    base.y = roundTo(base.y ?? 0, 0.1);
    if (base.width != null) base.width = roundTo(base.width, 0.1);
    if (base.height != null) base.height = roundTo(base.height, 0.1);
    if (base.radius != null) base.radius = roundTo(base.radius, 0.1);
    if (base.radiusX != null) base.radiusX = roundTo(base.radiusX, 0.1);
    if (base.radiusY != null) base.radiusY = roundTo(base.radiusY, 0.1);
    base.rotation = roundTo(base.rotation ?? 0, 0.1);
    if (Array.isArray(base.points)) base.points = base.points.map((p) => roundTo(p, 0.1));
    return base;
  });
  return d;
};

// Generate stable integer IDs (avoid floats so selection works immediately)
const newId = () => Date.now() + Math.floor(Math.random() * 10000);

export default function Editor({ projectId }) {
  const page = usePage();
  const auth = page?.props?.auth || { user: null };

  const [tool, setTool] = useState("select");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [thickness, setThickness] = useState(6);
  const [material, setMaterial] = useState("Brick");
  const [gridSize, setGridSize] = useState(10);
  const [units, setUnits] = useState("Metric");
  const [pxPerMeter, setPxPerMeter] = useState(100); // default 100px = 1 meter
  const [sidepanelMode, setSidepanelMode] = useState("properties");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [strokes, setStrokes] = useState([]);
  const [erasers, setErasers] = useState([]);
  const [shapes, setShapes] = useState([]);
  const [previewStrokes, setPreviewStrokes] = useState([]); // New state for preview
  const [previewShapes, setPreviewShapes] = useState([]); // New state for preview
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [layers, setLayers] = useState([{ id: 1, name: "Layer 1" }]);
  const [activeLayerId, setActiveLayerId] = useState(1);
  const [saveState, setSaveState] = useState('saved');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [mergedBlocks, setMergedBlocks] = useState([]);
  const [anchoredBlocks, setAnchoredBlocks] = useState([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [dimInactiveLayers, setDimInactiveLayers] = useState(true);

  const chatContainerRef = useRef(null);

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
    setSaveState('unsaved');
  }, [snapshot]);

  // Example: In Editor.jsx or Template.jsx
const handleCreateAnchorBlock = () => {
  // Get selected objects (shapes and strokes)
  const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
  const selectedObjects = [
    ...strokes.filter(s => ids.includes(s.id)),
    ...shapes.filter(sh => ids.includes(sh.id))
  ];
  if (selectedObjects.length === 0) return;

  const blockData = makeAnchorBlock(selectedObjects);
  // Round everything to 0.1 before sending to BE
  const rounded = deepRound({ layer_id: activeLayerId, ...blockData }, 0.1);

  axios.post('/editor/anchor-block/store', rounded).then(res => {
    // Optionally update frontend state with new block
    // ...
  });
};

const confirmPreview = useCallback(() => {
  pushHistory("confirm-ai-draw");

  const validatedStrokes = (previewStrokes || [])
    .filter((stroke) => {
      const isValid =
        stroke &&
        Array.isArray(stroke.points) &&
        typeof stroke.color === "string" &&
        typeof stroke.thickness === "number" &&
        typeof stroke.isWall === "boolean";
      return isValid;
    })
    .map((stroke) => ({
      id: newId(),
      ...stroke,
      layer_id: Number.isFinite(stroke.layer_id) ? stroke.layer_id : activeLayerId,
      rotation: Number.isFinite(stroke.rotation) ? stroke.rotation : 0,
    }));

  const isFiniteNum = (v) => typeof v === "number" && Number.isFinite(v);
  const normalizeEllipseType = (t) => (t === "ellipse" ? "oval" : t);

  function normalizeShape(shape) {
    if (!shape || typeof shape !== "object") return null;
    const type = normalizeEllipseType(String(shape.type || "").toLowerCase());
    const out = {
      id: newId(),
      type,
      rotation: isFiniteNum(shape.rotation) ? shape.rotation : 0,
      layer_id: Number.isFinite(shape.layer_id) ? shape.layer_id : activeLayerId,
    };

    if (type === "rect") {
      if (!(isFiniteNum(shape.x) && isFiniteNum(shape.y) && isFiniteNum(shape.width) && isFiniteNum(shape.height))) return null;
      return { ...out, x: shape.x, y: shape.y, width: shape.width, height: shape.height, color: typeof shape.color === "string" ? shape.color : "#9CA3AF" };
    }
    if (type === "circle") {
      if (!(isFiniteNum(shape.x) && isFiniteNum(shape.y) && isFiniteNum(shape.radius))) return null;
      return { ...out, x: shape.x, y: shape.y, radius: shape.radius, color: typeof shape.color === "string" ? shape.color : "#9CA3AF" };
    }
    if (type === "oval") {
      const x = isFiniteNum(shape.x) ? shape.x : null;
      const y = isFiniteNum(shape.y) ? shape.y : null;
      const rx = isFiniteNum(shape.radiusX) ? shape.radiusX : null;
      const ry = isFiniteNum(shape.radiusY) ? shape.radiusY : null;
      if (x === null || y === null || rx === null || ry === null) return null;
      return { ...out, x, y, radiusX: rx, radiusY: ry, color: typeof shape.color === "string" ? shape.color : "#9CA3AF" };
    }
    if (type === "polygon") {
      const pts = Array.isArray(shape.points) ? shape.points : [];
      if (pts.length < 6 || pts.length % 2 !== 0 || !pts.every((n) => isFiniteNum(n))) return null;
      const fill = typeof shape.fill === "string" ? shape.fill : (typeof shape.color === "string" ? shape.color : "#9CA3AF");
      return { ...out, points: pts, fill, closed: typeof shape.closed === "boolean" ? shape.closed : true, x: Number.isFinite(shape.x) ? shape.x : 0, y: Number.isFinite(shape.y) ? shape.y : 0 };
    }
    return null;
  }

  const validatedShapes = (previewShapes || []).map(normalizeShape).filter(Boolean);

  setStrokes((prev) => [...prev, ...validatedStrokes]);
  setShapes((prev) => [...prev, ...validatedShapes]);
  setPreviewStrokes([]);
  setPreviewShapes([]);
  setSaveState("unsaved");
}, [previewStrokes, previewShapes, pushHistory, activeLayerId]);

  const clearPreview = useCallback(() => {
    setPreviewStrokes([]);
    setPreviewShapes([]);
  }, []);

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
        if (data.pxPerMeter) setPxPerMeter(data.pxPerMeter);
        if (data.drawColor) setDrawColor(data.drawColor);
        if (data.thickness) setThickness(data.thickness);
        if (data.material) setMaterial(data.material);
        if (project.name) setProjectName(project.name);
        if (project.layers && project.layers.length > 0) {
          setLayers(project.layers);
          let nextActive = Number.isFinite(data.activeLayerId) ? Number(data.activeLayerId) : null;
          if (!Number.isFinite(nextActive)) {
            const layerIds = [];
            if (Array.isArray(data.shapes)) layerIds.push(...data.shapes.map(s => Number(s.layer_id)).filter(Number.isFinite));
            if (Array.isArray(data.strokes)) layerIds.push(...data.strokes.map(s => Number(s.layer_id)).filter(Number.isFinite));
            if (layerIds.length) {
              const counts = layerIds.reduce((acc, id) => (acc[id] = (acc[id] || 0) + 1, acc), {});
              const sorted = Object.entries(counts).sort((a, b) => (b[1] - a[1]) || (Number(b[0]) - Number(a[0])));
              nextActive = Number(sorted[0][0]);
            } else {
              nextActive = project.layers[project.layers.length - 1].id;
            }
          }
          setActiveLayerId(nextActive);
        }
      })
      .catch((err) => {
        console.error("Failed to load project:", err);
      });
  }, [projectId]);

  const saveProject = useCallback(async () => {
    if (!projectId) return;
    if (saveInProgress.current) return;
    saveInProgress.current = true;
    setSaveState('saving');
    try {
      await axios.post(`/projects/${projectId}/save`, {
        data: {
          strokes,
          erasers,
          shapes,
          gridSize,
          units,
          pxPerMeter,
          drawColor,
          thickness,
          material,
          projectName,
          layers,
          activeLayerId, // persist current active layer so it restores next load
        },
      });
      setSaveState('saved');
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed.");
      setSaveState('unsaved');
    } finally {
      saveInProgress.current = false;
    }
  }, [projectId, strokes, erasers, shapes, gridSize, units, pxPerMeter, drawColor, thickness, material, projectName, layers, activeLayerId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveState === 'unsaved') {
        saveProject();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [saveState, saveProject]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveState !== 'saved') {
        saveProject();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveState, saveProject]);

  const addLayer = async () => {
    try {
      const res = await axios.post(`/projects/${projectId}/layers`, { name: `Layer ${layers.length + 1}` });
      const newLayer = res.data?.layer ?? { id: Date.now(), name: `Layer ${layers.length + 1}` };
      setLayers(prev => [...prev, newLayer]);
      setSelectedId(null);
      setActiveLayerId(newLayer.id);
      setSaveState('unsaved');
    } catch (err) {
      console.error("Failed to create layer:", err);
      const newLayer = { id: Date.now(), name: `Layer ${layers.length + 1}` };
      setLayers(prev => [...prev, newLayer]);
      setSelectedId(null);
      setActiveLayerId(newLayer.id);
      setSaveState('unsaved');
    }
  };

  const deleteLayer = useCallback((layerId) => {
    if (layers.length <= 1) return;
    if (!confirm(`Delete layer and all its contents?`)) return;
    const newActiveId = layers.find(l => l.id !== layerId)?.id || layers[0].id;
    setSelectedId(null);
    setActiveLayerId(newActiveId);
    setLayers(prev => prev.filter(l => l.id !== layerId));
    setStrokes(prev => prev.filter(s => s.layer_id !== layerId));
    setShapes(prev => prev.filter(sh => sh.layer_id !== layerId));
    setErasers(prev => prev.filter(e => e.layer_id !== layerId));
    setSaveState('unsaved');
  }, [layers]);

  const snapToGrid = (val) => {
    return Math.round(val / gridSize) * gridSize;
  };

const selectedObject = useMemo(() => {
    if (!selectedId || Array.isArray(selectedId)) {
        return null;
    }
    const selectedStroke = strokes.find(stroke => stroke.id === selectedId);
    const selectedShape = shapes.find(shape => shape.id === selectedId);
    const result = selectedStroke || selectedShape || null;
    return result;
}, [selectedId, strokes, shapes]);


  const updateSelectedProperty = useCallback((property, value) => {
    if (!selectedId || Array.isArray(selectedId)) return;
    pushHistory(`update-${property}`);

    if (strokes.some(s => s.id === selectedId)) {
      setStrokes(prev => prev.map(s => {
        if (s.id !== selectedId) return s;
        let newS = { ...s };
        
        // Handle X/Y updates for strokes
        if (property === 'x' || property === 'y') {
          // If stroke has explicit x/y, update it
          if (Number.isFinite(s.x) && Number.isFinite(s.y)) {
            newS[property] = value;
          } else if (Array.isArray(s.points) && s.points.length >= 2) {
            // Otherwise shift all points
            const delta = property === 'x' ? value - s.points[0] : value - s.points[1];
            const idx = property === 'x' ? 0 : 1;
            newS.points = s.points.map((p, i) => (i % 2 === idx) ? p + delta : p);
          }
          return newS;
        }

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
      setSaveState('unsaved');
    } else if (shapes.some(sh => sh.id === selectedId)) {
      setShapes(prev => prev.map(sh => {
        if (sh.id !== selectedId) return sh;
        let newSh = { ...sh };
        if (property === 'x') newSh.x = value;
        else if (property === 'y') newSh.y = value;
        else if (property === 'rotation') newSh.rotation = value;
        if (property === 'width') newSh.width = value;
        else if (property === 'height') newSh.height = value;
        else if (property === 'radius') newSh.radius = value;
        else if (property === 'radiusX') newSh.radiusX = value;
        else if (property === 'radiusY') newSh.radiusY = value;
        return newSh;
      }));
      setSaveState('unsaved');
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

  const handleAIPromptSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!aiPrompt.trim() || aiRequestInProgress) return;
    const userMessage = { id: Date.now(), role: 'user', content: aiPrompt };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiPrompt("");
    setAiBusy(true);

    // Check if the prompt is a draw request (e.g., contains "draw", "add", "create")
    const drawKeywords = ['draw', 'add', 'create', 'place', 'room', 'wall', 'shape', 'furniture'];
    const isDrawRequest = drawKeywords.some(keyword => aiPrompt.toLowerCase().includes(keyword));

    try {
      if (isDrawRequest) {
        // Use compact project data to reduce JSON tokens
        const projectData = compactProjectData({ strokes, shapes, layers, activeLayerId, gridSize });
        const result = await askAIDraw(aiPrompt, projectData);
        if (result.success) {
          setPreviewStrokes(result.data.strokes || []);
          setPreviewShapes(result.data.shapes || []);
          const aiMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: 'Generated drawing preview. Click "Confirm Save" to add to project, or "Clear Preview" to discard.',
          };
          setAiMessages((prev) => [...prev, aiMessage]);
        } else {
          const errorMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: `Error: ${result.error || result.data}`,
          };
          setAiMessages((prev) => [...prev, errorMessage]);
        }
      } else {
        const result = await askAI(aiPrompt);
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: result.success ? result.data : `Error: ${result.data}`,
        };
        setAiMessages((prev) => [...prev, aiMessage]);
      }
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    } catch (err) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Error: Could not get response from AI.',
      };
      setAiMessages((prev) => [...prev, errorMessage]);
    } finally {
      setAiBusy(false);
    }
  }, [aiPrompt, strokes, shapes, layers, activeLayerId, gridSize]);

  const clearAiMessages = useCallback(() => {
    setAiMessages([]);
    clearPreview();
  }, [clearPreview]);

  useEffect(() => {
    if (tool !== "select") {
      setSelectedId(null);
    }
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
        console.log("Saving project...");
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
    } else if (type === "oval") {
      base.x = 200;
      base.y = 200;
      base.radiusX = 60;
      base.radiusY = 40;
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

  const handleProjectNameChange = (e) => {
    setProjectName(e.target.value);
    setSaveState('unsaved');
  };

  // Bounding box helpers
const bboxOfStroke = (st) => {
  const pts = Array.isArray(st.points) ? st.points : [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i];
    const y = pts[i + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!isFinite(minX)) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const bboxOfShape = (sh) => {
  if (sh.type === 'rect') {
    return { x: sh.x || 0, y: sh.y || 0, width: sh.width || 0, height: sh.height || 0 };
  }
  if (sh.type === 'circle') {
    const r = sh.radius || 0;
    const cx = sh.x || 0, cy = sh.y || 0;
    return { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r };
  }
  if (sh.type === 'oval') {
    const rx = sh.radiusX || 0, ry = sh.radiusY || 0;
    const cx = sh.x || 0, cy = sh.y || 0;
    return { x: cx - rx, y: cy - ry, width: 2 * rx, height: 2 * ry };
  }
  if (sh.type === 'polygon') {
    const pts = Array.isArray(sh.points) ? sh.points : [];
    const offX = Number.isFinite(sh.x) ? sh.x : 0;
    const offY = Number.isFinite(sh.y) ? sh.y : 0;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      const x = (pts[i] || 0) + offX;
      const y = (pts[i + 1] || 0) + offY;
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    if (!isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }
  return null;
};

const bboxOfItem = (id) => {
  const st = strokes.find(s => s.id === id);
  if (st) return bboxOfStroke(st);
  const sh = shapes.find(s => s.id === id);
  if (sh) return bboxOfShape(sh);
  return null;
};

const mergeSelected = useCallback(() => {
  const ids = Array.isArray(selectedId) ? selectedId : (selectedId ? [selectedId] : []);
  if (ids.length < 2) {
    alert("Select 2 or more items to merge.");
    return;
  }
  // Resolve items (strokes or shapes) by id
  const items = ids
    .map(id => strokes.find(s => s.id === id) || shapes.find(sh => sh.id === id))
    .filter(Boolean);
  if (items.length !== ids.length) {
    alert("Some selected items were not found.");
    return;
  }
  // Enforce same-layer merge
  const layerIds = new Set(items.map(it => it.layer_id));
  if (layerIds.size !== 1) {
    alert("All selected items must be on the same layer.");
    return;
  }
  const layerId = items[0].layer_id;
  // Compute union bounding box
  const bboxes = ids.map(bboxOfItem).filter(Boolean);
  if (bboxes.length !== ids.length) {
    alert("Could not compute bounds for all items.");
    return;
  }
  const minX = Math.min(...bboxes.map(b => b.x));
  const minY = Math.min(...bboxes.map(b => b.y));
  const maxX = Math.max(...bboxes.map(b => b.x + b.width));
  const maxY = Math.max(...bboxes.map(b => b.y + b.height));
  const block = {
    id: Date.now(),
    memberIds: ids.slice(),
    layer_id: layerId,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
  // History and lock members
  pushHistory('merge');
  setStrokes(prev => prev.map(s => ids.includes(s.id) ? { ...s, locked: true } : s));
  setShapes(prev => prev.map(s => ids.includes(s.id) ? { ...s, locked: true } : s));
  setMergedBlocks(prev => [...prev, block]);
  setSelectedId(null);
  setSaveState('unsaved');
}, [selectedId, strokes, shapes, setStrokes, setShapes, setMergedBlocks, pushHistory, setSaveState]);

const unmergeBlock = useCallback((blockId) => {
  const blk = mergedBlocks.find(b => b.id === blockId);
  if (!blk) return;
  const ids = blk.memberIds || [];
  setStrokes(prev => prev.map(s => ids.includes(s.id) ? { ...s, locked: false } : s));
  setShapes(prev => prev.map(s => ids.includes(s.id) ? { ...s, locked: false } : s));
  setMergedBlocks(prev => prev.filter(b => b.id !== blockId));
}, [mergedBlocks, setStrokes, setShapes, setMergedBlocks]);

// If any merged member is deleted, drop its block automatically
useEffect(() => {
  setMergedBlocks(prev =>
    prev.filter(b => {
      const stillThere = b.memberIds.every(id =>
        strokes.some(s => s.id === id) || shapes.some(sh => sh.id === id)
      );
      return stillThere;
    })
  );
}, [strokes, shapes]);

  const templateProps = {
    tool,
    strokes,
    setStrokes: onStrokesChange,
    erasers,
    setErasers: onErasersChange,
    shapes,
    setShapes: onShapesChange,
    drawColor,
    setDrawColor,
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
    onSave: () => {},
    previewStrokes, // Pass preview data
    previewShapes,
    mergedBlocks,
    onUnmergeBlock: unmergeBlock,
    anchoredBlocks,
    dimInactiveLayers,
  };

  // Helpers already defined: bboxOfItem
  const selectedIds = useMemo(() => {
    return Array.isArray(selectedId) ? selectedId.slice() : (selectedId ? [selectedId] : []);
  }, [selectedId]);
  
  const selectionBbox = useMemo(() => {
    if (!selectedIds.length) return null;
    const rects = selectedIds.map(bboxOfItem).filter(Boolean);
    if (!rects.length) return null;
    const minX = Math.min(...rects.map(r => r.x));
    const minY = Math.min(...rects.map(r => r.y));
    const maxX = Math.max(...rects.map(r => r.x + r.width));
    const maxY = Math.max(...rects.map(r => r.y + r.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, cx: (minX+maxX)/2, cy: (minY+maxY)/2 };
  }, [selectedIds, strokes, shapes]);
  
  // Bulk transform for multi-selection: dx/dy offsets, target width/height, rotation delta (deg)
  const applyBulkTransform = useCallback(({ dx = 0, dy = 0, targetWidth, targetHeight, rotateDelta = 0 }) => {
    if (!Array.isArray(selectedId) || !selectedId.length || !selectionBbox) return;
    const src = selectionBbox;
    const sx = (Number.isFinite(targetWidth) && src.width > 0) ? (targetWidth / src.width) : 1;
    const sy = (Number.isFinite(targetHeight) && src.height > 0) ? (targetHeight / src.height) : 1;
    const useScale = sx !== 1 || sy !== 1;
    const rot = (rotateDelta || 0) * Math.PI / 180;

    const rotatePoint = (x, y, cx, cy) => {
      const dx0 = x - cx, dy0 = y - cy;
      const nx = cx + (dx0 * Math.cos(rot) - dy0 * Math.sin(rot));
      const ny = cy + (dx0 * Math.sin(rot) + dy0 * Math.cos(rot));
      return { x: nx, y: ny };
    };

    pushHistory('bulk-transform');

    // Transform strokes
    setStrokes(prev => prev.map(st => {
      if (!selectedIds.includes(st.id)) return st;
      let pts = Array.isArray(st.points) ? st.points.slice() : [];
      // scale around selection minX/minY, then rotate around center, then translate
      const scaled = pts.map((p, i) => {
        const isX = (i % 2) === 0;
        const v = p;
        if (!useScale) return v;
        if (isX) return src.x + (v - src.x) * sx;
        return src.y + (v - src.y) * sy;
      });
      let rotated = scaled;
      if (rot !== 0) {
        rotated = scaled.slice();
        for (let i = 0; i < rotated.length; i += 2) {
          const rp = rotatePoint(rotated[i], rotated[i+1], src.cx, src.cy);
          rotated[i] = rp.x; rotated[i+1] = rp.y;
        }
      }
      const translated = rotated.map((p, i) => p + ((i % 2) === 0 ? dx : dy));
      return { ...st, points: translated, x: 0, y: 0 };
    }));

    // Transform shapes
    setShapes(prev => prev.map(sh => {
      if (!selectedIds.includes(sh.id)) return sh;
      let next = { ...sh };
      // scale position around min corner, then rotate around center, then translate
      let px = Number.isFinite(next.x) ? next.x : 0;
      let py = Number.isFinite(next.y) ? next.y : 0;
      if (useScale) {
        px = src.x + (px - src.x) * sx;
        py = src.y + (py - src.y) * sy;
      }
      if (rot !== 0) {
        const rp = rotatePoint(px, py, src.cx, src.cy);
        px = rp.x; py = rp.y;
      }
      px += dx; py += dy;

      if (next.type === 'rect') {
        next.x = px; next.y = py;
        next.width = (next.width || 0) * sx;
        next.height = (next.height || 0) * sy;
        next.rotation = (Number(next.rotation) || 0) + (rotateDelta || 0);
        return next;
      }
      if (next.type === 'circle') {
        next.x = px; next.y = py;
        // uniform scale by average factor
        const uni = useScale ? ((sx + sy) / 2) : 1;
        next.radius = (next.radius || 0) * uni;
        next.rotation = (Number(next.rotation) || 0) + (rotateDelta || 0);
        return next;
      }
      if (next.type === 'oval') {
        next.x = px; next.y = py;
        next.radiusX = (next.radiusX || 0) * sx;
        next.radiusY = (next.radiusY || 0) * sy;
        next.rotation = (Number(next.rotation) || 0) + (rotateDelta || 0);
        return next;
      }
      if (next.type === 'polygon' && Array.isArray(next.points)) {
        // scale points around min corner
        let pts = next.points.slice();
        if (useScale) {
          for (let i = 0; i < pts.length; i += 2) {
            pts[i] = src.x + (pts[i] - src.x) * sx;
            pts[i+1] = src.y + (pts[i+1] - src.y) * sy;
          }
        }
        if (rot !== 0) {
          for (let i = 0; i < pts.length; i += 2) {
            const rp = rotatePoint(pts[i], pts[i+1], src.cx, src.cy);
            pts[i] = rp.x; pts[i+1] = rp.y;
          }
        }
        // polygons typically ignore x/y in our renderer; keep x,y at 0 and store transformed points
        next.points = pts.map((p, i) => p + ((i % 2) === 0 ? dx : dy));
        next.x = 0; next.y = 0;
        next.rotation = 0;
        return next;
      }
      // default position-only
      next.x = px; next.y = py;
      next.rotation = (Number(next.rotation) || 0) + (rotateDelta || 0);
      return next;
    }));
    setSaveState('unsaved');
  }, [selectedId, selectionBbox, selectedIds, pushHistory, setStrokes, setShapes, setSaveState]);

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
            <motion.button
              onClick={() => setSidepanelMode("ai-chat")}
              className="bg-[#06b6d4] text-[#071021] text-sm px-4 py-2 shadow-md border border-[#334155] rounded-md"
              whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
              whileTap={{ scale: 0.98 }}
            >
              AI Chat
            </motion.button>
            {aiBusy && (
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-[#475569] bg-[#0b1322]"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <motion.div
                  className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
                <span className="text-xs text-gray-200 tracking-wide">AI is thinking…</span>
              </motion.div>
            )}
            <InertiaLink href="/" className="font-bold text-xl text-[#f3f4f6]">
              Blueprint App
            </InertiaLink>
          </div>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-3">
            <TextInput
              onChange={handleProjectNameChange}
              className="inline-block px-4 py-2 bg-[#334155] text-[#f3f4f6] font-semibold shadow-md border border-[#475569] rounded-md focus:border-[#06b6d4] focus:ring-2 focus:ring-[#06b6d4]"
              value={projectName || "Untitled Project"}
            />
            <motion.div
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border"
              animate={{
                backgroundColor: saveState === 'saved' ? '#065f46' : saveState === 'saving' ? '#7c2d12' : '#111827',
                borderColor:      saveState === 'saved' ? '#10b981' : saveState === 'saving' ? '#f59e0b' : '#374151',
              }}
              transition={{ duration: 0.25 }}
            >
              {saveState === 'saving' && (
                <motion.div
                  className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                />
              )}
              {saveState === 'saved' && (
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none">
                  <path d="M20 7L9 18l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {saveState === 'unsaved' && (
                <span className="w-2 h-2 rounded-full bg-white/80 inline-block" />
              )}
              <span className="text-xs font-semibold text-white uppercase tracking-wide">
                {saveState === 'saved' ? 'Saved' : saveState === 'saving' ? 'Saving' : 'Unsaved'}
              </span>
            </motion.div>
          </div>
          <div className="flex items-center space-x-4 ml-auto">
            {(previewStrokes.length > 0 || previewShapes.length > 0) && (
              <>
                <motion.button
                  onClick={confirmPreview}
                  className="bg-[#10b981] text-white text-sm px-4 py-2 rounded-md shadow-md border border-[#059669]"
                  whileHover={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Confirm Save
                </motion.button>
                <motion.button
                  onClick={clearPreview}
                  className="bg-[#dc2626] text-white text-sm px-4 py-2 rounded-md shadow-md border border-[#b91c1c]"
                  whileHover={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Clear Preview
                </motion.button>
              </>
            )}
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
            selectedId={selectedId}
            selectionBbox={selectionBbox}
            onBulkTransform={applyBulkTransform}
            updateSelectedProperty={updateSelectedProperty}
            aiMessages={aiMessages}
            aiRequestInProgress={aiRequestInProgress}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            handleAIPromptSubmit={handleAIPromptSubmit}
            chatContainerRef={chatContainerRef}
            clearAiMessages={clearAiMessages}
            makeAnchorBlock={handleCreateAnchorBlock}
            mergeSelected={mergeSelected}
            pxPerMeter={pxPerMeter}
            setPxPerMeter={setPxPerMeter}
            aiBusy={aiBusy}
          />
        </motion.div>
      </div>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-gradient-to-r from-[#1e293b] to-[#0f172a] flex items-center px-6 border-t border-[#475569] shadow-2xl"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center space-x-2 overflow-x-auto flex-1">
          <AnimatePresence>
            {layers.map((layer) => (
              <motion.div
                key={layer.id}
                className="flex items-center space-x-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.button
                  onClick={() => { setSelectedId(null); setActiveLayerId(layer.id); }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                    activeLayerId === layer.id
                      ? 'bg-gradient-to-t from-[#06b6d4] to-[#0891b2] text-white shadow-lg border-t-2 border-x-2 border-[#06b6d4]'
                      : 'bg-[#334155] text-[#94a3b8] hover:bg-[#475569] hover:text-white border-t border-x border-[#475569]'
                  }`}
                  whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  {layer.name}
                </motion.button>
                {layers.length > 1 && (
                  <motion.button
                    onClick={() => deleteLayer(layer.id)}
                    className="px-2 py-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs rounded-md shadow-md border border-[#b91c1c]"
                    whileHover={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.5)' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ✕
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
       <motion.button
         onClick={() => setDimInactiveLayers((v) => !v)}
         className={`ml-2 px-3 py-2 rounded-md text-sm border ${
           dimInactiveLayers
             ? 'bg-[#334155] text-white border-[#475569]'
            : 'bg-[#0b1322] text-[#cbd5e1] border-[#334155]'
         }`}
         whileHover={{ scale: 1.03 }}
         whileTap={{ scale: 0.98 }}
         title="Toggle dimming of non-active layers"
       >
         {dimInactiveLayers ? 'Dim Other Layers: On' : 'Dim Other Layers: Off'}
       </motion.button>
        <motion.button
          onClick={addLayer}
          className="ml-4 px-4 py-2 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] text-white rounded-md shadow-lg border border-[#0891b2] font-semibold"
          whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)', scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          + New Layer
        </motion.button>
      </motion.div>
    </motion.div>
  );
}