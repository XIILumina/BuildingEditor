import React, { useState, useEffect, useCallback, useRef, useMemo} from "react";
import { usePage, Link as InertiaLink } from "@inertiajs/react";
import { motion, AnimatePresence } from "framer-motion";
import Template from "./Template";
import Toolbar from "./Toolbar";
import FileMenu from "./FileMenu";
import Sidepanel from "./Sidepanel/Sidepanel";
import TextInput from '@/Components/TextInput';
import LayerManager from "./Layers/LayerManager";
import { saveProject, loadProject } from "./utils/projectutils";
import { useHistory } from "./utils/HistoryManager";
import { askAI, askAIDraw } from "./utils/aiutils";
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
  const [previewStrokes, setPreviewStrokes] = useState([]);
  const [previewShapes, setPreviewShapes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [layers, setLayers] = useState([{ id: 1, name: "Layer 1" }]);
  const [activeLayerId, setActiveLayerId] = useState(1);
  const [saveState, setSaveState] = useState('saved');
  const [aiMessages, setAiMessages] = useState([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const chatContainerRef = useRef(null);
  const [clipboard, setClipboard] = useState({ strokes: [], shapes: [] });

  const { history, redoStack, snapshot, pushHistory, undo, redo } = useHistory({
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
  });

  const handleCreateAnchorBlock = useCallback(() => {
    const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
    const selectedObjects = [
      ...strokes.filter(s => ids.includes(s.id) && !s.isAnchor),
      ...shapes.filter(sh => ids.includes(sh.id) && !s.isAnchor),
    ];
    if (selectedObjects.length === 0) return;

    const blockData = makeAnchorBlock(selectedObjects);
    const newShape = {
      id: Date.now(),
      type: "rect",
      x: blockData.x,
      y: blockData.y,
      width: blockData.width,
      height: blockData.height,
      rotation: blockData.rotation || 0,
      color: "#9CA3AF",
      layer_id: activeLayerId,
      isAnchor: true,
      containedIds: ids,
    };

    axios.post('/editor/anchor-block/anchor', {
      layer_id: activeLayerId,
      ...blockData,
    }).then(res => {
      console.log('Block created:', res.data.block);
    });

    pushHistory("create-anchor-block");
    setShapes((prev) => [...prev, newShape]);
    setStrokes((prev) => prev.filter((s) => !ids.includes(s.id)));
    setShapes((prev) => prev.filter((sh) => !ids.includes(sh.id)));
    setSelectedId(newShape.id);
  }, [selectedId, strokes, shapes, activeLayerId, pushHistory]);

  const confirmPreview = useCallback(() => {
    pushHistory("confirm-ai-draw");

    const validatedStrokes = previewStrokes
      .filter(stroke => {
        const isValid = stroke &&
          typeof stroke.id === 'number' &&
          Array.isArray(stroke.points) &&
          typeof stroke.color === 'string' &&
          typeof stroke.thickness === 'number' &&
          typeof stroke.layer_id === 'number';
        if (!isValid) console.warn('Invalid stroke:', stroke);
        return isValid;
      })
      .map(stroke => ({
        ...stroke,
        id: Date.now() + Math.random(),
        layer_id: activeLayerId,
      }));

    const allowedShapeTypes = ['rect', 'circle', 'polygon', 'oval', 'triangle'];
    const validatedShapes = previewShapes
      .filter(shape => {
        if (!shape || typeof shape.id !== 'number' || typeof shape.type !== 'string' ||
            !allowedShapeTypes.includes(shape.type) ||
            typeof shape.color !== 'string' ||
            typeof shape.layer_id !== 'number') {
          console.warn('Invalid shape:', shape);
          return false;
        }
        if (shape.type === 'rect') {
          return typeof shape.x === 'number' &&
                 typeof shape.y === 'number' &&
                 typeof shape.width === 'number' &&
                 typeof shape.height === 'number';
        }
        if (shape.type === 'circle') {
          return typeof shape.x === 'number' &&
                 typeof shape.y === 'number' &&
                 typeof shape.radius === 'number';
        }
        if (shape.type === 'oval') {
          return typeof shape.x === 'number' &&
                 typeof shape.y === 'number' &&
                 typeof shape.radiusX === 'number' &&
                 typeof shape.radiusY === 'number';
        }
        if (shape.type === 'triangle') {
          return typeof shape.x === 'number' &&
                 typeof shape.y === 'number' &&
                 typeof shape.width === 'number' &&
                 typeof shape.height === 'number';
        }
        if (shape.type === 'polygon') {
          const hasPoints = Array.isArray(shape.points);
          const hasFillOrColor = typeof shape.fill === 'string' || typeof shape.color === 'string';
          const hasClosed = typeof shape.closed === 'boolean';
          if (!hasPoints || !hasFillOrColor || !hasClosed) return false;
          // Accept polygons with fill or color, but always set color for rendering
          if (!shape.color && shape.fill) shape.color = shape.fill;
          return true;
        }
        return false;
      })
      .map(shape => ({
        ...shape,
        id: Date.now() + Math.random(),
        layer_id: activeLayerId,
      }));

    setStrokes(prev => [...prev, ...validatedStrokes]);
    setShapes(prev => [...prev, ...validatedShapes]);
    setPreviewStrokes([]);
    setPreviewShapes([]);
    setSaveState('unsaved');
  }, [previewStrokes, previewShapes, pushHistory, activeLayerId]);

  const clearPreview = useCallback(() => {
    setPreviewStrokes([]);
    setPreviewShapes([]);
  }, []);

  const handleAIPromptSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!aiPrompt.trim()) return;
    const userMessage = { id: Date.now(), role: 'user', content: aiPrompt };
    setAiMessages((prev) => [...prev, userMessage]);
    setAiPrompt("");

    const drawKeywords = ['draw', 'add', 'create', 'place', 'room', 'wall', 'shape', 'furniture'];
    const isDrawRequest = drawKeywords.some(keyword => aiPrompt.toLowerCase().includes(keyword));

    try {
      if (isDrawRequest) {
        const projectData = { strokes, shapes, layers, activeLayerId };
        const result = await askAIDraw(aiPrompt, projectData);
        if (result.success) {
          setPreviewStrokes(result.data.strokes || []);
          setPreviewShapes(result.data.shapes || []);
          setAiMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, role: 'assistant', content: 'Generated drawing preview. Click "Confirm Save" to add to project, or "Clear Preview" to discard.' },
          ]);
        } else {
          setAiMessages((prev) => [
            ...prev,
            { id: Date.now() + 1, role: 'assistant', content: `Error: ${result.error || result.data}` },
          ]);
        }
      } else {
        const result = await askAI(aiPrompt);
        setAiMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'assistant', content: result.success ? result.data : `Error: ${result.data}` },
        ]);
      }
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    } catch (err) {
      setAiMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'assistant', content: 'Error: Could not get response from AI.' },
      ]);
    }
  }, [aiPrompt, strokes, shapes, layers, activeLayerId]);

  const clearAiMessages = useCallback(() => {
    setAiMessages([]);
    clearPreview();
  }, [clearPreview]);

  useEffect(() => {
    loadProject(projectId, {
      setStrokes,
      setErasers,
      setShapes,
      setGridSize,
      setUnits,
      setDrawColor,
      setThickness,
      setMaterial,
      setProjectName,
      setLayers,
      setActiveLayerId,
    });
  }, [projectId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (saveState === 'unsaved') {
        saveProject(projectId, {
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
        }, setSaveState);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [saveState, projectId, strokes, erasers, shapes, gridSize, units, drawColor, thickness, material, projectName, layers]);

  const addShape = useCallback((type) => {
    pushHistory("add-shape");
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
      base.points = [0, 0, 100, 100, 0, 100]; // triangle local points
      base.x = 150;
      base.y = 150;
    } else if (type === "polygon") {
      base.points = [0, 0, 100, 0, 100, 100, 0, 100];
      base.x = 150;
      base.y = 150;
    }
    setShapes((s) => [...s, base]);
  }, [pushHistory, activeLayerId]);

  const handleProjectNameChange = (e) => {
    setProjectName(e.target.value);
    setSaveState('unsaved');
  };

  const collectSelected = useCallback(() => {
    const ids = Array.isArray(selectedId) ? selectedId : (selectedId ? [selectedId] : []);
    const selStrokes = strokes.filter(s => ids.includes(s.id));
    const selShapes = shapes.filter(sh => ids.includes(sh.id));
    return { ids, selStrokes, selShapes };
  }, [selectedId, strokes, shapes]);

  const copySelection = useCallback(() => {
    const { selStrokes, selShapes } = collectSelected();
    // deep clone to avoid references
    setClipboard({
      strokes: JSON.parse(JSON.stringify(selStrokes || [])),
      shapes: JSON.parse(JSON.stringify(selShapes || [])),
    });
  }, [collectSelected]);

  const pasteClipboard = useCallback(() => {
    if ((!clipboard.strokes || clipboard.strokes.length === 0) && (!clipboard.shapes || clipboard.shapes.length === 0)) return;
    pushHistory("paste");
    const now = Date.now();
    const newStrokeIds = [];
    if (clipboard.strokes && clipboard.strokes.length) {
      const pasted = clipboard.strokes.map((s, i) => {
        const copy = { ...JSON.parse(JSON.stringify(s)), id: now + i + Math.floor(Math.random() * 1000), layer_id: activeLayerId };
        // small offset so pasted objects are visible
        copy.points = (copy.points || []).map((v, idx) => (idx % 2 === 0 ? v + 10 : v + 10));
        newStrokeIds.push(copy.id);
        return copy;
      });
      setStrokes(prev => [...prev, ...pasted]);
    }
    let newShapeIds = [];
    if (clipboard.shapes && clipboard.shapes.length) {
      const pastedShapes = clipboard.shapes.map((sh, i) => {
        const copy = { ...JSON.parse(JSON.stringify(sh)), id: now + 10000 + i + Math.floor(Math.random() * 1000), layer_id: activeLayerId };
        if (typeof copy.x === "number") copy.x += 10;
        if (typeof copy.y === "number") copy.y += 10;
        if (Array.isArray(copy.points)) copy.points = copy.points.map((v, idx) => (idx % 2 === 0 ? v + 10 : v + 10));
        newShapeIds.push(copy.id);
        return copy;
      });
      setShapes(prev => [...prev, ...pastedShapes]);
    }
    // select newly pasted items
    const pastedIds = [...newStrokeIds, ...newShapeIds];
    setSelectedId(pastedIds.length === 1 ? pastedIds[0] : pastedIds.length ? pastedIds : null);
  }, [clipboard, activeLayerId, pushHistory, setStrokes, setShapes]);

  const cutSelection = useCallback(() => {
    const { ids, selStrokes, selShapes } = collectSelected();
    if (!ids.length) return;
    copySelection();
    pushHistory("cut");
    setStrokes(prev => prev.filter(s => !ids.includes(s.id)));
    setShapes(prev => prev.filter(sh => !ids.includes(sh.id)));
    setSelectedId(null);
  }, [collectSelected, copySelection, pushHistory]);

  const deleteSelection = useCallback(() => {
    const ids = Array.isArray(selectedId) ? selectedId : (selectedId ? [selectedId] : []);
    if (!ids.length) return;
    pushHistory("delete");
    setStrokes(prev => prev.filter(s => !ids.includes(s.id)));
    setShapes(prev => prev.filter(sh => !ids.includes(sh.id)));
    setSelectedId(null);
  }, [selectedId, pushHistory]);

  const duplicateSelection = useCallback(() => {
    const { selStrokes, selShapes } = collectSelected();
    if ((selStrokes.length === 0) && (selShapes.length === 0)) return;
    pushHistory("duplicate");
    const now = Date.now();
    const newIds = [];
    if (selStrokes.length) {
      const copies = selStrokes.map((s, i) => {
        const c = { ...JSON.parse(JSON.stringify(s)), id: now + i + Math.floor(Math.random() * 1000), layer_id: activeLayerId };
        c.points = (c.points || []).map((v, idx) => (idx % 2 === 0 ? v + 10 : v + 10));
        newIds.push(c.id);
        return c;
      });
      setStrokes(prev => [...prev, ...copies]);
    }
    if (selShapes.length) {
      const copies = selShapes.map((sh, i) => {
        const c = { ...JSON.parse(JSON.stringify(sh)), id: now + 10000 + i + Math.floor(Math.random() * 1000), layer_id: activeLayerId };
        if (typeof c.x === "number") c.x += 10;
        if (typeof c.y === "number") c.y += 10;
        if (Array.isArray(c.points)) c.points = c.points.map((v, idx) => (idx % 2 === 0 ? v + 10 : v + 10));
        newIds.push(c.id);
        return c;
      });
      setShapes(prev => [...prev, ...copies]);
    }
    setSelectedId(newIds.length === 1 ? newIds[0] : newIds);
  }, [collectSelected, pushHistory, activeLayerId]);

  const selectAll = useCallback(() => {
    const allIds = [...strokes.filter(s => s.layer_id === activeLayerId).map(s=>s.id), ...shapes.filter(sh => sh.layer_id === activeLayerId).map(sh => sh.id)];
    setSelectedId(allIds);
  }, [strokes, shapes, activeLayerId]);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || document.activeElement?.isContentEditable;
      if (isTyping) return; // don't intercept typing

      const meta = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (meta && !e.shiftKey && key === "z") { e.preventDefault(); undo(); return; }
      if (meta && (key === "y" || (e.shiftKey && key === "z"))) { e.preventDefault(); redo(); return; }

      if (meta && key === "c") { e.preventDefault(); copySelection(); return; }
      if (meta && key === "v") { e.preventDefault(); pasteClipboard(); return; }
      if (meta && key === "x") { e.preventDefault(); cutSelection(); return; }
      if (meta && key === "d") { e.preventDefault(); duplicateSelection(); return; }
      if (meta && key === "a") { e.preventDefault(); selectAll(); return; }

      if (key === "delete" || key === "backspace") { e.preventDefault(); deleteSelection(); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, copySelection, pasteClipboard, cutSelection, deleteSelection, duplicateSelection, selectAll]);

  const templateProps = {
    tool,
    strokes,
    setStrokes,
    erasers,
    setErasers,
    shapes,
    setShapes,
    drawColor,
    setDrawColor,
    thickness,
    gridSize,
    material,
    selectedId,
    setSelectedId,
    layers,
    activeLayerId,
    snapToGrid: true,
    previewStrokes,
    previewShapes,
    onError: (msg) => console.error(msg),
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
              onSave={() => saveProject(projectId, {
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
              }, setSaveState)}
            />
            <motion.button
              onClick={() => setSidepanelMode("ai-chat")}
              className="bg-[#06b6d4] text-[#071021] text-sm px-4 py-2 shadow-md border border-[#334155]"
              whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
              whileTap={{ scale: 0.98 }}
            >
              AI Chat
            </motion.button>
            <InertiaLink href="/" className="font-bold text-xl text-[#f3f4f6]">
              Blueprint App
            </InertiaLink>
          </div>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center space-x-2">
            <TextInput
              onChange={handleProjectNameChange}
              className="inline-block px-4 py-2 bg-[#334155] text-[#f3f4f6] font-semibold shadow-md border border-[#06b6d4]"
              value={projectName || "Untitled Project"}
            />
            <span className="text-xl">
              {saveState === 'saved' ? '✅' : saveState === 'saving' ? '⏳' : '💾'}
            </span>
          </div>
          <div className="flex items-center space-x-4 ml-auto">
            {(previewStrokes.length > 0 || previewShapes.length > 0) && (
              <>
                <motion.button
                  onClick={confirmPreview}
                  className="bg-[#06b6d4] text-[#071021] text-sm px-4 py-2 shadow-md border border-[#334155]"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Confirm Save
                </motion.button>
                <motion.button
                  onClick={clearPreview}
                  className="bg-[#dc2626] text-[#f3f4f6] text-sm px-4 py-2 shadow-md border border-[#334155]"
                  whileHover={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Clear Preview
                </motion.button>
              </>
            )}
            <motion.button
              onClick={handleCreateAnchorBlock}
              className="bg-[#10b981] text-[#071021] text-sm px-4 py-2 shadow-md border border-[#334155]"
              whileHover={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)' }}
              whileTap={{ scale: 0.98 }}
            >
              Make Anchor Block
            </motion.button>
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
          addShape={addShape}
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
            selectedObject={useMemo(() => {
              if (!selectedId || Array.isArray(selectedId)) return null;
              return strokes.find(s => s.id === selectedId) || shapes.find(sh => sh.id === selectedId) || null;
            }, [selectedId, strokes, shapes])}
            updateSelectedProperty={(property, value) => {
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
            }}
            aiMessages={aiMessages}
            aiPrompt={aiPrompt}
            setAiPrompt={setAiPrompt}
            handleAIPromptSubmit={handleAIPromptSubmit}
            chatContainerRef={chatContainerRef}
            clearAiMessages={clearAiMessages}
            makeAnchorBlock={handleCreateAnchorBlock}
          />
        </motion.div>
      </div>
      <LayerManager
        layers={layers}
        activeLayerId={activeLayerId}
        setActiveLayerId={setActiveLayerId}
        addLayer={() => {
          const newLayer = { id: Date.now(), name: `Layer ${layers.length + 1}` };
          setLayers(prev => [...prev, newLayer]);
          setActiveLayerId(newLayer.id);
          setSaveState('unsaved');
        }}
        deleteLayer={(layerId) => {
          if (layers.length <= 1) return;
          if (!confirm(`Delete layer and all its contents?`)) return;
          const newActiveId = layers.find(l => l.id !== layerId)?.id || layers[0].id;
          setActiveLayerId(newActiveId);
          setLayers(prev => prev.filter(l => l.id !== layerId));
          setStrokes(prev => prev.filter(s => s.layer_id !== layerId));
          setShapes(prev => prev.filter(sh => sh.id !== layerId));
          setErasers(prev => prev.filter(e => e.layer_id !== layerId));
          setSaveState('unsaved');
        }}
      />
    </motion.div>
  );
}