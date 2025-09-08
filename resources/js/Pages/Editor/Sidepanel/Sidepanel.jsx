import React from "react";
import Properties from "./Pages/Properties";
import Settings from "./Pages/Settings";
import Style from "./Pages/Style";

export default function Sidepanel({
  sidepanelMode,
  setSidepanelMode,
  projectId,
  thickness, setThickness,
  material, setMaterial,
  gridSize, setGridSize,
  units, setUnits,
  drawColor, setDrawColor
}) {
  return (
    <div className="h-full bg-[#071227] text-white p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Editor Settings</h3>
        <div className="flex space-x-2">
          <button onClick={() => setSidepanelMode("style")} className={`px-2 py-1 rounded ${sidepanelMode === 'style' ? 'bg-gray-700' : 'bg-transparent'}`}>Style</button>
          <button onClick={() => setSidepanelMode("properties")} className={`px-2 py-1 rounded ${sidepanelMode === 'properties' ? 'bg-gray-700' : 'bg-transparent'}`}>Properties</button>
          <button onClick={() => setSidepanelMode("settings")} className={`px-2 py-1 rounded ${sidepanelMode === 'settings' ? 'bg-gray-700' : 'bg-transparent'}`}>Settings</button>
        </div>
      </div>

      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
        {sidepanelMode === "properties" && (
          <Properties
            thickness={thickness}
            setThickness={setThickness}
            material={material}
            setMaterial={setMaterial}
            drawColor={drawColor}
            setDrawColor={setDrawColor}
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

        {sidepanelMode === "style" && <Style />}
      </div>
    </div>
  );
}
