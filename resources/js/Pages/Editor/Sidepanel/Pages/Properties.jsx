import React from 'react';
import { motion } from 'framer-motion';

export default function Properties({
  thickness,
  setThickness,
  material,
  setMaterial,
  drawColor,
  setDrawColor,
  selectedObject,
  updateSelectedProperty
}) {
  return (
    <motion.div
      className="p-4 bg-[#1e293b] border border-[#334155] shadow-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-4 text-[#f3f4f6]">
        Properties
      </h2>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Thickness (cm)</label>
        <input
          type="range"
          min="1"
          max="60"
          value={thickness || 6}
          onChange={(e) => setThickness(parseInt(e.target.value, 10))}
          className="w-full accent-[#06b6d4]"
        />
        <div className="text-xs text-[#9ca3af] mt-1">{thickness} cm</div>
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Material</label>
        <select
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
        >
          <option>Brick</option>
          <option>Concrete</option>
          <option>Wood</option>
        </select>
      </div>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Draw color</label>
        <input
          type="color"
          value={drawColor || '#ffffff'}
          onChange={(e) => setDrawColor(e.target.value)}
          className="w-12 h-12 border-none cursor-pointer"
        />
      </div>
      {selectedObject && (
        <div className="border-t border-[#334155] pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3 text-[#f3f4f6]">Selected Object</h3>
          {selectedObject.isWall && selectedObject.points.length === 4 && (
            <div className="mb-4">
              <label className="block text-sm mb-2 text-[#f3f4f6]">Length</label>
              <input
                type="number"
                step="0.1"
                value={Math.hypot(
                  selectedObject.points[2] - selectedObject.points[0],
                  selectedObject.points[3] - selectedObject.points[1]
                ).toFixed(1)}
                onChange={(e) => updateSelectedProperty('length', parseFloat(e.target.value))}
                className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
              />
            </div>
          )}
          {selectedObject.type === 'rect' && (
            <>
              <div className="mb-4">
                <label className="block text-sm mb-2 text-[#f3f4f6]">Width</label>
                <input
                  type="number"
                  step="1"
                  value={selectedObject.width || 80}
                  onChange={(e) => updateSelectedProperty('width', parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm mb-2 text-[#f3f4f6]">Height</label>
                <input
                  type="number"
                  step="1"
                  value={selectedObject.height || 60}
                  onChange={(e) => updateSelectedProperty('height', parseInt(e.target.value, 10))}
                  className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
                />
              </div>
            </>
          )}
          {selectedObject.type === 'circle' && (
            <div className="mb-4">
              <label className="block text-sm mb-2 text-[#f3f4f6]">Radius</label>
              <input
                type="number"
                step="1"
                value={selectedObject.radius || 40}
                onChange={(e) => updateSelectedProperty('radius', parseInt(e.target.value, 10))}
                className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}