import React from 'react';
import { Link } from '@inertiajs/react';

function Settings({ projectId }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Settings for Project {projectId}</h2>
      <div className="mb-4">
        <label className="block mb-1">Grid Size</label>
        <input type="number" className="w-full p-2 border rounded" placeholder="Enter grid size (px)" />
      </div>
      <div className="mb-4">
        <label className="block mb-1">Units</label>
        <select className="w-full p-2 border rounded">
          <option>Metric (cm)</option>
          <option>Imperial (in)</option>
        </select>
      </div>
      <Link href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded">
        Back to Dashboard
      </Link>
    </div>
  );
}

export default Settings;