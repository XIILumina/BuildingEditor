import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Properties from "./Pages/Properties";
import Settings from "./Pages/Settings";
import Shapes from "./Pages/Shapes";
import Style from "./Pages/Style";

export default function Sidepanel({
  sidepanelMode,
  setSidepanelMode,
  projectId,
  thickness,
  setThickness,
  material,
  setMaterial,
  gridSize,
  setGridSize,
  units,
  setUnits,
  drawColor,
  setDrawColor,
  addShape,
  selectedObject,
  updateSelectedProperty
}) {
  return (
    <motion.div
      className="h-full bg-[#071227] text-[#f3f4f6] p-6 shadow-md border-l border-[#334155]"
      initial={{ x: 300 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          {['shapes', 'properties', 'settings', 'style'].map((mode) => (
            <motion.button
              key={mode}
              onClick={() => setSidepanelMode(mode)}
              className={`px-3 py-1 text-sm font-medium ${
                sidepanelMode === mode
                  ? 'bg-[#06b6d4] text-[#071021]'
                  : 'bg-[#334155] text-[#f3f4f6] hover:bg-[#475569]'
              } border border-[#334155] shadow-md`}
              whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
              whileTap={{ scale: 0.98 }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </motion.button>
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={sidepanelMode}
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {sidepanelMode === "properties" && (
            <Properties
              thickness={thickness}
              setThickness={setThickness}
              material={material}
              setMaterial={setMaterial}
              drawColor={drawColor}
              setDrawColor={setDrawColor}
              selectedObject={selectedObject}
              updateSelectedProperty={updateSelectedProperty}
            />
          )}
          {sidepanelMode === "settings" && (
            <Settings
              gridSize={gridSize}
              setGridSize={setGridSize}
              units={units}
              setUnits={setUnits}
            />
          )}
          {sidepanelMode === "shapes" && (
            <Shapes addShape={addShape} />
          )}
          {sidepanelMode === "style" && (
            <Style />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}