import React from 'react';

export default function Properties({ thickness, setThickness, material, setMaterial, drawColor, setDrawColor }) {
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
    </div>
  );
}
