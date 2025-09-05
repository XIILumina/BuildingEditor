import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Editor from './Editor';
import Properties from './Sidepanel/Pages/Properties';
import Settings from './Sidepanel/Pages/Settings';

function EditorApp({ projectId }) {
  return (
    <BrowserRouter> {/* Removed basename to prevent duplication */}
      <Routes>
        <Route path="/editor/:id" element={<Editor projectId={projectId} />} />
        <Route path="/editor/:id/properties" element={<Properties projectId={projectId} />} />
        <Route path="/editor/:id/settings" element={<Settings projectId={projectId} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default EditorApp;