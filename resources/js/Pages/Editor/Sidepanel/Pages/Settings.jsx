import React from 'react';
import { motion } from 'framer-motion';

export default function Settings({ gridSize, setGridSize, units, setUnits, pxPerMeter, setPxPerMeter }) {
  return (
    <motion.div
      className="p-4 bg-[#1e293b] border border-[#334155] shadow-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-4 text-[#f3f4f6]">
        Settings
      </h2>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Grid size (px)</label>
        <input
          type="number"
          value={gridSize || 20}
          onChange={(e) => setGridSize(parseInt(e.target.value || 20, 10))}
          className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Units</label>
        <select
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
        >
          <option>Metric</option>
          <option>Imperial</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Pixels per Meter</label>
        <input
          type="number"
          value={pxPerMeter}
          onChange={(e) => setPxPerMeter(parseInt(e.target.value, 10))}
          className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
        />
      </div>
    </motion.div>
  );
}