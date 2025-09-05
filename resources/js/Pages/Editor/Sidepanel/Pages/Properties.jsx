import React from 'react';
import { Link } from '@inertiajs/react';

function Properties({ projectId }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Properties for Project {projectId}</h2>
      <div className="mb-4">
        <label className="block mb-1">Wall Thickness</label>
        <input type="number" className="w-full p-2 border rounded" placeholder="Enter thickness (cm)" />
      </div>
      <div className="mb-4">
        <label className="block mb-1">Material</label>
        <select className="w-full p-2 border rounded">
          <option>Brick</option>
          <option>Concrete</option>
          <option>Wood</option>
        </select>
      </div>
      <Link href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded">
        Back to Dashboard
      </Link>
    </div>
  );
}

export default Properties;

{/* <div>
            <h3 className="text-lg font-bold">Properties</h3>
            {selectedLineIndex !== null ? (
              <div>
                <label>Thickness:</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={lines[selectedLineIndex].thickness}
                  onChange={(e) => updateLineProperty('thickness', parseInt(e.target.value))}
                />
                <label>Length:</label>
                <input
                  type="number"
                  value={lines[selectedLineIndex].length || 0}
                  onChange={(e) => updateLineProperty('length', parseFloat(e.target.value))}
                />
                <label>Width:</label>
                <input
                  type="number"
                  value={lines[selectedLineIndex].width || 0}
                  onChange={(e) => updateLineProperty('width', parseFloat(e.target.value))}
                />
                <label>Height:</label>
                <input
                  type="number"
                  value={lines[selectedLineIndex].height || 1}
                  onChange={(e) => updateLineProperty('height', parseFloat(e.target.value))}
                />
              </div>
            ) : (
              <p>Select an object to edit properties</p>
            )}
          </div> */}