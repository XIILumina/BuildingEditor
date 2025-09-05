import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Link as InertiaLink, usePage } from '@inertiajs/react';
import axios from 'axios';
import Template from './Template';
import Properties from './Sidepanel/Pages/Properties';
import Settings from './Sidepanel/Pages/Settings';

function Editor({ projectId }) {
  const { auth } = usePage().props;
  const [tool, setTool] = useState('select');
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);
  const [sidepanelMode, setSidepanelMode] = useState('default');
  const [drawColor, setDrawColor] = useState('#ffffff'); // Default white on dark grey
  const [selectionRect, setSelectionRect] = useState({ x: 0, y: 0, width: 0, height: 0, visible: false });
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedLines, setSelectedLines] = useState([]);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const response = await axios.get(`/projects/${projectId}`);
      if (response.data.project.data?.lines) {
        setLines(response.data.project.data.lines);
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const saveProject = async () => {
    if (!auth.user) {
      alert('Guests cannot save projects. Please log in.');
      return;
    }
    try {
      await axios.put(`/projects/${projectId}`, { data: { lines } });
      alert('Project saved!');
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const calculateWeight = () => {
    const weights = { Brick: 1800, Concrete: 2400, Wood: 600 }; // kg/m³
    const totalWeight = lines.reduce((sum, line) => {
      if (!line.isWall) return sum;
      const length = line.length || 0;
      const width = line.width || 0;
      const height = line.height || 1; // Default height 1m
      const volume = length * width * height;
      return sum + volume * (weights[line.material] || 1800);
    }, 0);
    alert(`Total weight: ${totalWeight.toFixed(2)} kg`);
  };

  const updateLineProperty = (property, value) => {
    if (selectedLineIndex === null) return;
    const updatedLines = [...lines];
    updatedLines[selectedLineIndex][property] = value;
    setLines(updatedLines);
  };

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    if (e.evt.button === 2) { // Right click pan
      setIsDragging(true);
      setDragStart({ x: pos.x - position.x, y: pos.y - position.y });
      return;
    }

    if (tool === 'select') {
      setIsSelecting(true);
      setSelectionRect({ x: pos.x, y: pos.y, width: 0, height: 0, visible: true });
      return;
    }

    if (tool !== 'freedraw' && tool !== 'wall') return;
    setIsDrawing(true);
    const snapPos = { x: Math.round(pos.x / 20) * 20, y: Math.round(pos.y / 20) * 20 };
    setLines([...lines, { points: [snapPos.x, snapPos.y], isWall: tool === 'wall', thickness: 10, material: 'Brick', color: drawColor }]);
  };

  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    if (isDragging) {
      setPosition({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
      return;
    }

    if (isSelecting && tool === 'select') {
      setSelectionRect({
        x: selectionRect.x,
        y: selectionRect.y,
        width: pos.x - selectionRect.x,
        height: pos.y - selectionRect.y,
        visible: true
      });
      return;
    }

    if (!isDrawing || (tool !== 'freedraw' && tool !== 'wall')) return;
    const point = e.target.getStage().getPointerPosition();
    let lastLine = lines[lines.length - 1];
    if (tool === 'wall') {
      const start = { x: lastLine.points[0], y: lastLine.points[1] };
      lastLine.points = [start.x, start.y, point.x, point.y];
    } else {
      lastLine.points = lastLine.points.concat([point.x, point.y]);
    }
    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (isSelecting && tool === 'select') {
      setIsSelecting(false);
      setSelectionRect({ ...selectionRect, visible: false });
      const selected = lines.reduce((acc, line, index) => {
        const [x1, y1, x2, y2] = line.points;
        const minX = Math.min(selectionRect.x, selectionRect.x + selectionRect.width);
        const maxX = Math.max(selectionRect.x, selectionRect.x + selectionRect.width);
        const minY = Math.min(selectionRect.y, selectionRect.y + selectionRect.height);
        const maxY = Math.max(selectionRect.y, selectionRect.y + selectionRect.height);
        if (x1 > minX && x1 < maxX && y1 > minY && y1 < maxY) {
          acc.push(index);
        }
        return acc;
      }, []);
      setSelectedLines(selected);
      if (selected.length > 0) {
        setSidepanelMode('properties'); // Switch to properties for selected lines
      }
      return;
    }

    setIsDrawing(false);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Template
        tool={tool}
        lines={lines}
        setLines={setLines}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        scale={scale}
        setScale={setScale}
        position={position}
        setPosition={setPosition}
      />

      <div className="absolute top-0 left-0 right-0 z-50 bg-gray-900 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between">
          <div>
            <InertiaLink href="/" className="text-xl font-bold">Blueprint App</InertiaLink>
          </div>
          <div className="space-x-4">
            <InertiaLink href="/dashboard" className="hover:text-blue-300">Dashboard</InertiaLink>
            <button onClick={() => setShowProfilePopup(!showProfilePopup)} className="hover:text-blue-300">Profile</button>
            {showProfilePopup && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 text-black">
                <InertiaLink href="/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</InertiaLink>
                <InertiaLink href="/projects" className="block px-4 py-2 hover:bg-gray-100">Projects</InertiaLink>
                <InertiaLink href="/settings" className="block px-4 py-2 hover:bg-gray-100">Settings</InertiaLink>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="absolute top-16 left-4 z-50 bg-gray-800 text-white p-4 rounded-lg space-y-2">
        <h2 className="text-lg font-bold">Tools</h2>
        <button
          onClick={() => setTool('select')}
          className={`block p-2 ${tool === 'select' ? 'bg-blue-500' : 'bg-gray-600'} rounded`}
        >
          Select
        </button>
        <button
          onClick={() => setTool('wall')}
          className={`block p-2 ${tool === 'wall' ? 'bg-blue-500' : 'bg-gray-600'} rounded`}
        >
          Draw Wall
        </button>
        <button
          onClick={() => setTool('freedraw')}
          className={`block p-2 ${tool === 'freedraw' ? 'bg-blue-500' : 'bg-gray-600'} rounded`}
        >
          Free Draw
        </button>
        <label>Draw Color:</label>
        <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} />
        <button onClick={saveProject} className="block p-2 bg-green-500 rounded">
          Save Project
        </button>
        <button onClick={calculateWeight} className="block p-2 bg-purple-500 rounded">
          Calculate Weight
        </button>
      </div>

      <div className="inline-block absolute top-0 right-0 bottom-0 w-80 bg-gray-100 p-4 z-50">
        <h2 className="text-lg font-bold">Sidepanel</h2>
        <button onClick={() => setSidepanelMode('style')} className="inline block p-2 bg-gray-200 rounded mx-1 mb-2">
          style
        </button>
        <button onClick={() => setSidepanelMode('properties')} className="inline block p-2 bg-gray-200 rounded mx-1 mb-2">
          Properties
        </button>
        <button onClick={() => setSidepanelMode('settings')} className="inline block p-2 bg-gray-200 rounded mx-1 mb-2">
          Settings
        </button>

        {sidepanelMode === 'style' && (
          <Style projectId={projectId} />
        )}
        {sidepanelMode === 'properties' && (
          <Properties projectId={projectId} />
        )}

        {sidepanelMode === 'settings' && (
          <Settings projectId={projectId} />
        )}
      </div>
    </div>
  );
}

export default Editor;