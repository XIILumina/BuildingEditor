import React from "react";

export default function Shapes({ addShape }) {
    
  return (
    
    <div className="p-4 space-y-2">
        <div className="flex flex-col space-y-2"></div>
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
    </div>
  );
}
