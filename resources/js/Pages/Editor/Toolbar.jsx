import React from 'react';

export default function Toolbar({ tool, setTool, drawColor, setDrawColor, thickness, setThickness }) {
  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1 bg-[#0b1220] p-2 rounded-lg border border-gray-800">
        <button onClick={() => setTool('select')} className={`px-3 py-1 rounded ${tool === 'select' ? 'bg-[#0ea5a7] text-black' : 'bg-transparent'}`}>Select</button>
        <button onClick={() => setTool('wall')} className={`px-3 py-1 rounded ${tool === 'wall' ? 'bg-[#60a5fa] text-black' : 'bg-transparent'}`}>Wall</button>
        <button onClick={() => setTool('freedraw')} className={`px-3 py-1 rounded ${tool === 'freedraw' ? 'bg-[#f97316] text-black' : 'bg-transparent'}`}>Free</button>
      </div>

      <div className="flex items-center bg-[#081226] p-2 rounded-lg border border-gray-800">
        <input type="color" value={drawColor || '#ffffff'} onChange={(e) => setDrawColor(e.target.value)} className="w-10 h-8 p-0" />
        <label className="ml-2 text-sm opacity-80">Thickness</label>
        <input type="range" min="1" max="40" value={thickness || 6} onChange={(e) => setThickness(parseInt(e.target.value, 10))} className="ml-2" />
      </div>
    </div>
  );
}
