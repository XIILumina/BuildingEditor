import React from "react";

export default function Settings({ gridSize, setGridSize, units, setUnits, snapEnabled, setSnapEnabled }) {
  return (
    <div className="p-2">
      <h2 className="text-xl font-semibold mb-3">Settings</h2>

      <div className="mb-3">
        <label className="block text-sm mb-1">Grid size (px)</label>
        <input
          type="number"
          value={gridSize || 20}
          onChange={(e) =>
            setGridSize(parseInt(e.target.value || 20, 10))
          }
          className="w-full p-2 rounded bg-[#071826]"
        />
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Units</label>
        <select
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          className="w-full p-2 rounded bg-[#071826]"
        >
          <option>Metric</option>
          <option>Imperial</option>
        </select>
      </div>

      <div className="mb-3 flex items-center">
        <input
          type="checkbox"
          checked={snapEnabled}
          onChange={(e) => setSnapEnabled(e.target.checked)}
          className="mr-2"
        />
        <label>Snap to Grid</label>
      </div>
    </div>
  );
}
