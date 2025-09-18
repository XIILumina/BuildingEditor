// Properties.jsx
import React from 'react';

export default function Properties({
  thickness, setThickness,
  material, setMaterial,
  drawColor, setDrawColor,
  selectedObject,
  updateSelectedProperty
}) {
  return (
    <div className="p-2">
      <h2 className="text-xl font-semibold mb-3">Properties</h2>

      <div className="mb-3">
        <label className="block text-sm mb-1">Thickness (cm)</label>
        <input type="range" min="1" max="60" value={thickness || 6} onChange={(e) => setThickness(parseInt(e.target.value, 10))} />
        <div className="text-xs opacity-80 mt-1">{thickness} cm</div>
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Material</label>
        <select value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full p-2 rounded bg-[#071826]">
          <option>Brick</option>
          <option>Concrete</option>
          <option>Wood</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="block text-sm mb-1">Draw color</label>
        <input type="color" value={drawColor || '#ffffff'} onChange={(e) => setDrawColor(e.target.value)} />
      </div>

      {selectedObject && (
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">Selected Object</h3>
          {selectedObject.isWall && selectedObject.points.length === 4 && (
            <div className="mb-3">
              <label className="block text-sm mb-1">Length</label>
              <input
                type="number"
                step="0.1"
                value={Math.hypot(
                  selectedObject.points[2] - selectedObject.points[0],
                  selectedObject.points[3] - selectedObject.points[1]
                ).toFixed(1)}
                onChange={(e) => updateSelectedProperty('length', parseFloat(e.target.value))}
                className="w-full p-2 rounded bg-[#071826]"
              />
            </div>
          )}
          {selectedObject.type === 'rect' && (
            <>
              <div className="mb-3">
                <label className="block text-sm mb-1">Width</label>
                <input
                  type="number"
                  step="1"
                  value={selectedObject.width || 80}
                  onChange={(e) => updateSelectedProperty('width', parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded bg-[#071826]"
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm mb-1">Height</label>
                <input
                  type="number"
                  step="1"
                  value={selectedObject.height || 60}
                  onChange={(e) => updateSelectedProperty('height', parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded bg-[#071826]"
                />
              </div>
            </>
          )}
          {selectedObject.type === 'circle' && (
            <div className="mb-3">
              <label className="block text-sm mb-1">Radius</label>
              <input
                type="number"
                step="1"
                value={selectedObject.radius || 40}
                onChange={(e) => updateSelectedProperty('radius', parseInt(e.target.value, 10))}
                className="w-full p-2 rounded bg-[#071826]"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}