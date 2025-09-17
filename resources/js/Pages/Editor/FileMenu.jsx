import React, { useState } from 'react';
import axios from 'axios';

export default function FileMenu({
  projectId,
  layers,
  strokes,
  erasers,
  shapes,
  gridSize,
  units,
  drawColor,
  thickness,
  material,
  projectName,
  onSave // passed from Editor
}) {
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!projectId) return alert("No project loaded!");
    // prefer parent-provided save function (Editor.saveProject)
    if (onSave) {
      try {
        await onSave();
        alert("Project saved!");
      } catch (err) {
        console.error("Save failed (from parent):", err);
        alert("Failed to save project.");
      }
      return;
    }

    // fallback (if needed)
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
      alert("Project saved!");
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save project.");
    }
  };

  const exportJson = () => {
    if (!projectId) return alert("No project loaded!");
    window.open(`/projects/${projectId}/export`, '_blank');
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(s => !s)} className="bg-[#071a2a] px-3 py-1 rounded border border-gray-700">File ▾</button>
      {open && (
        <div className="absolute mt-2 left-0 bg-white text-black rounded shadow-lg w-48 z-50">
          <button onClick={save} className="w-full px-4 py-2 text-left hover:bg-gray-100">Save</button>
          <button className="w-full px-4 py-2 text-left hover:bg-gray-100" onClick={() => { navigator.clipboard.writeText(JSON.stringify({ layers, strokes, erasers, shapes })).then(() => alert('Copied JSON to clipboard')) }}>Copy JSON</button>
          <button className="w-full px-4 py-2 text-left hover:bg-gray-100" onClick={exportJson}>Export as JSON</button>
        </div>
      )}
    </div>
  );
};