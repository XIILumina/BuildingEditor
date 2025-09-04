import React from 'react';
import { InertiaLink } from '@inertiajs/react';

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
      <InertiaLink href="/dashboard" className="bg-blue-500 text-white px-4 py-2 rounded">
        Back to Dashboard
      </InertiaLink>
    </div>
  );
}

export default Properties;