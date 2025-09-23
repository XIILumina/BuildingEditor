// ...existing imports...
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { IoArrowForward, IoCubeOutline, IoResize } from 'react-icons/io5';
import { TbEraser, TbPencil, TbBorderCorners, TbColorFilter } from "react-icons/tb";

export default function Toolbar({ tool, setTool, drawColor, setDrawColor, thickness, setThickness }) {
  const [showSizeMenu, setShowSizeMenu] = useState(false);

  const handleToolSelect = (selectedTool) => {
    setTool(selectedTool);
    if (selectedTool === 'eraser') {
      setThickness(40);
    } else {
      setThickness(6);
    }
    setShowSizeMenu(false);
  };

  return (
    <motion.div
      className="rounded-3xl flex items-center space-x-3 bg-[#1e293b] p-3 shadow-xl border border-[#334155]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center space-x-2 shadow-xl">
        {[
          { name: 'select', icon: <TbBorderCorners size={20} /> },
          { name: 'wall', icon: <IoCubeOutline size={20} /> },
          { name: 'freedraw', icon: <TbPencil size={20} /> },
          { name: 'eraser', icon: <TbEraser size={20} /> },
        ].map((t) => (
          <motion.button
            key={t.name}
            onClick={() => handleToolSelect(t.name)}
            className={`px-4 py-2 text-sm font-medium ${
              tool === t.name
                ? 'bg-[#06b6d4] text-[#071021]'
                : 'bg-[#334155] text-[#f3f4f6] hover:bg-[#475569]'
            } border border-[#334155] shadow-md`}
            whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
            whileTap={{ scale: 0.98 }}
          >
            {t.icon}
          </motion.button>
        ))}
      </div>
      <div className="relative">
        <motion.button
          onClick={() => setShowSizeMenu(s => !s)}
          className="px-4 py-2 bg-[#334155] text-[#f3f4f6] text-sm font-medium border border-[#334155] shadow-md hover:bg-[#475569]"
          whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
          whileTap={{ scale: 0.98 }}
        >
          <IoResize size={20} />
        </motion.button>
        {showSizeMenu && (
          <motion.div
            className="absolute mt-2 left-0 bg-[#1e293b] text-[#f3f4f6] shadow-md border border-[#334155] w-48 z-50 p-4 flex flex-col items-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <label className="mb-2 text-sm">Size: {thickness}px</label>
            <input
              type="range"
              min={2}
              max={50}
              value={thickness}
              onChange={e => setThickness(Number(e.target.value))}
              className="w-full accent-[#06b6d4]"
            />
          </motion.div>
        )}
      </div>
      <div className="flex rounded-3xl items-center bg-[#334155] p-2 border border-[#334155] shadow-md">
        <TbColorFilter size={22} className="text-[#06b6d4]" />
        <input
          type="color"
          value={drawColor || '#ffffff'}
          onChange={(e) => setDrawColor(e.target.value)}
          className="w-6 h-6 ml-1 rounded-3xl cursor-pointer "
        />
      </div>
    </motion.div>
  );
}