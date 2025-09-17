import React, { useState } from 'react';
import axios from 'axios';

export default function FileMenu({ projectId, lines, layers, strokes, erasers, shapes }) {
  const [open, setOpen] = useState(false);

const save = async () => {
  try {
    const payload = {
      layers: layers.map(l => ({
        id: l.id,
        name: l.name,
        order: l.order,
        strokes: lines
          .filter(line => line.layer_id === l.id && !line.isEraser)
          .map(line => ({
            id: line.id,
            points: line.points,
            color: line.color,
            thickness: line.thickness,
            isWall: line.isWall,
            material: line.material,
          })),
        erasers: lines
          .filter(line => line.layer_id === l.id && line.isEraser)
          .map(line => ({
            id: line.id,
            points: line.points,
            thickness: line.thickness,
          })),
        shapes: [] // fill in later if you add shapes
      })),
    };

    await axios.post(`/projects/${projectId}/save`, payload);
    alert("Project saved!");
  } catch (err) {
    console.error("Save failed:", err.response?.data || err);
    alert("Failed to save project.");
  }
};
const exportJson = () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ lines }));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href", dataStr);
  dlAnchorElem.setAttribute("download", "project.json");
  dlAnchorElem.click();
};

  return (
    <div className="relative">
      <button onClick={() => setOpen(s => !s)} className="bg-[#071a2a] px-3 py-1 rounded border border-gray-700">File ▾</button>
      {open && (
        <div className="absolute mt-2 left-0 bg-white text-black rounded shadow-lg w-48 z-50">
          <button onClick={save} className="bg-green-600 px-3 py-1 rounded hover:bg-green-700">Save</button>
          <button className="w-full px-4 py-2 text-left hover:bg-gray-100" onClick={() => { navigator.clipboard.writeText(JSON.stringify({ lines })).then(() => alert('Copied JSON to clipboard')) }}>Copy JSON</button>
          <button className="w-full px-4 py-2 text-left hover:bg-gray-100" onClick={exportJson}>Export as JSON</button>
        </div>
      )}
    </div>
  );
};
