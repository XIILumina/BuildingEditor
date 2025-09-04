import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Editor from './Editor';
import Properties from './Sidepanel/Pages/Properties';
import Settings from './Sidepanel/Pages/Settings';

function EditorApp({ projectId }) {
  return (
    <BrowserRouter basename={`/editor/${projectId}`}>
      <Routes>
        <Route path="/" element={<Editor projectId={projectId} />} />
        <Route path="/properties" element={<Properties projectId={projectId} />} />
        <Route path="/settings" element={<Settings projectId={projectId} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default EditorApp;