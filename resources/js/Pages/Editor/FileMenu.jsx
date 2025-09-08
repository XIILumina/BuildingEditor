import React, { useState } from 'react';
import axios from 'axios';

export default function FileMenu({ projectId, lines }) {
  const [open, setOpen] = useState(false);

  const save = async () => {
    try {
      await axios.put(`/projects/${projectId}`, {
        data: { lines }
      });
      alert('Saved!');
    } catch (err) {
      console.error('Save failed', err);
      alert('Save failed (check console)');
    } finally {
      setOpen(false);
    }
  };

  const exportJson = () => {
    // open export route
    window.open(`/projects/${projectId}/export`, '_blank');
    setOpen(false);
  };

  return (
    <div className="relative">
      <button onClick={() => setOpen(s => !s)} className="bg-[#071a2a] px-3 py-1 rounded border border-gray-700">File ▾</button>
      {open && (
        <div className="absolute mt-2 left-0 bg-white text-black rounded shadow-lg w-48 z-50">
          <button className="w-full px-4 py-2 text-left hover:bg-gray-100" onClick={save}>Save</button>
          <button className="w-full px-4 py-2 text-left hover:bg-gray-100" onClick={() => { navigator.clipboard.writeText(JSON.stringify({ lines })).then(() => alert('Copied JSON to clipboard')) }}>Copy JSON</button>
          <button className="w-full px-4 py-2 text-left hover:bg-gray-100" onClick={exportJson}>Export as JSON</button>
        </div>
      )}
    </div>
  );
}
