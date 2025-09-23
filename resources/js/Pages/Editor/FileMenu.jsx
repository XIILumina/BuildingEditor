import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  onSave
}) {
  const [open, setOpen] = useState(false);

  const save = async () => {
    if (!projectId) return alert("No project loaded!");
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
  const exportPng = () => {
    if (!projectId) return alert("No project loaded!");
    window.open(`/projects/${projectId}/export-png`, '_blank');
    setOpen(false);
  }
  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(s => !s)}
        className="bg-gradient-to-r from-[#1e293b] to-[#334155] px-4 py-2 rounded-lg border border-[#334155] text-gray-200 shadow-md hover:shadow-lg"
        whileHover={{ scale: 1.05, rotate: 2 }}
        whileTap={{ scale: 0.95 }}
      >
        File ▾
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute mt-2 left-0 bg-[#1e293b]/95 backdrop-blur-md text-white rounded-lg shadow-xl w-48 z-50 border border-[#334155]/50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={save}
              className="w-full px-4 py-2 text-left hover:bg-[#334155] rounded-t-lg"
              whileHover={{ x: 5 }}
            >
              Save
            </motion.button>
            <motion.button
              className="w-full px-4 py-2 text-left hover:bg-[#334155]"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify({ layers, strokes, erasers, shapes })).then(() => alert('Copied JSON to clipboard'));
                setOpen(false);
              }}
              whileHover={{ x: 5 }}
            >
              Copy JSON
            </motion.button>
            <motion.button
              className="w-full px-4 py-2 text-left hover:bg-[#334155] rounded-b-lg"
              onClick={exportJson}
              whileHover={{ x: 5 }}
            >
              Export as JSON
            </motion.button>
                        <motion.button
              className="w-full px-4 py-2 text-left hover:bg-[#334155] rounded-b-lg"
              onClick={exportPng}
              whileHover={{ x: 5 }}
            >
              Save as Image (PNG)
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}