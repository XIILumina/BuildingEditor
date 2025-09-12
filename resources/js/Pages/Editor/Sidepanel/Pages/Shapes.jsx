import React from "react";

export default function Shapes({ addShape }) {
  return (
    <div className="p-4 space-y-2">
      <button
        onClick={() => addShape("rect")}
        className="w-full bg-[#0ea5a7] px-3 py-2 rounded hover:bg-[#14b8a6]"
      >
        Rectangle
      </button>
      <button
        onClick={() => addShape("circle")}
        className="w-full bg-[#6366f1] px-3 py-2 rounded hover:bg-[#4f46e5]"
      >
        Circle
      </button>
      <button
        onClick={() => addShape("ellipse")}
        className="w-full bg-[#22c55e] px-3 py-2 rounded hover:bg-[#16a34a]"
      >
        Ellipse
      </button>
      <button
        onClick={() => addShape("triangle")}
        className="w-full bg-[#f59e0b] px-3 py-2 rounded hover:bg-[#d97706]"
      >
        Triangle
      </button>
    </div>
  );
}
