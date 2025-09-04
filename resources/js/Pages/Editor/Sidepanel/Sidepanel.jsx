import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Sidepanel({ projectId }) {
  const location = useLocation();

  return (
    <div className="w-64 bg-gray-100 p-4">
      <h2 className="text-lg font-bold">Sidepanel</h2>
      <Link
        to={`/editor/${projectId}/properties`}
        className={`block p-2 ${location.pathname.includes('properties') ? 'bg-blue-200' : 'bg-gray-200'} rounded mb-2`}
      >
        Properties
      </Link>
      <Link
        to={`/editor/${projectId}/settings`}
        className={`block p-2 ${location.pathname.includes('settings') ? 'bg-blue-200' : 'bg-gray-200'} rounded`}
      >
        Settings
      </Link>
    </div>
  );
}

export default Sidepanel;