import React from 'react';
import { Link } from '@inertiajs/react';

function Show({ project }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{project.name}</h1>
      <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(project.data, null, 2)}</pre>
      <Link href="/editor/{project.id}" className="bg-blue-500 text-white px-4 py-2 rounded">Open in Editor</Link>
    </div>
  );
}

export default Show;