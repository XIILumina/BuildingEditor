import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Stage, Layer, Line, Group } from 'react-konva';
import { Link } from 'react-router-dom';
import { Link as InertiaLink } from '@inertiajs/react';
import axios from 'axios';

function Editor({ projectId }) {
  const [tool, setTool] = useState('select');
  const [lines, setLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const stageRef = useRef(null);

  useEffect(() => {
    axios.get(`/projects/${projectId}`).then(response => {
      if (response.data.project.data?.lines) {
        setLines(response.data.project.data.lines);
      }
    });
  }, [projectId]);

  const handleMouseDown = useCallback((e) => {
    if (tool !== 'freedraw' && tool !== 'wall') return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    const snapPos = { x: Math.round(pos.x / 20) * 20, y: Math.round(pos.y / 20) * 20 };
    setLines([...lines, { points: [snapPos.x, snapPos.y], isWall: tool === 'wall', thickness: 10, material: 'Brick' }]);
  }, [tool, lines]);

  const handleMouseMove = useCallback((e) => {
    if (!isDrawing || (tool !== 'freedraw' && tool !== 'wall')) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const snapPoint = { x: Math.round(point.x / 20) * 20, y: Math.round(point.y / 20) * 20 };
    let lastLine = lines[lines.length - 1];
    if (tool === 'wall') {
      const start = { x: lastLine.points[0], y: lastLine.points[1] };
      const dx = snapPoint.x - start.x;
      const dy = snapPoint.y - start.y;
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const snappedAngle = Math.round(angle / 45) * 45;
      const length = Math.sqrt(dx * dx + dy * dy);
      const newX = start.x + length * Math.cos(snappedAngle * Math.PI / 180);
      const newY = start.y + length * Math.sin(snappedAngle * Math.PI / 180);
      lastLine.points = [start.x, start.y, Math.round(newX / 20) * 20, Math.round(newY / 20) * 20];
    } else {
      lastLine.points = lastLine.points.concat([snapPoint.x, snapPoint.y]);
    }
    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);
  }, [isDrawing, tool, lines]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleSelect = (e) => {
    if (tool !== 'select') return;
    const pos = e.target.getStage().getPointerPosition();
    const selectedLine = lines.find(line => {
      const [x1, y1, x2, y2] = line.points;
      return Math.abs(pos.x - (x1 + x2) / 2) < 10 && Math.abs(pos.y - (y1 + y2) / 2) < 10;
    });
    if (selectedLine) {
      alert(`Selected line with thickness: ${selectedLine.thickness}, material: ${selectedLine.material}`);
    }
  };

  const saveProject = async () => {
    try {
      await axios.put(`/projects/${projectId}`, { data: { lines } });
      alert('Project saved!');
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const loadProject = async () => {
    try {
      const response = await axios.get(`/projects/${projectId}`);
      if (response.data.project.data?.lines) {
        setLines(response.data.project.data.lines);
        alert('Project loaded!');
      }
    } catch (error) {
      console.error('Error loading project:', error);
    }
  };

  const calculateWeight = () => {
    const weights = { Brick: 1800, Concrete: 2400, Wood: 600 }; // kg/m³
    const totalWeight = lines.reduce((sum, line) => {
      if (!line.isWall) return sum;
      const [x1, y1, x2, y2] = line.points;
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) / 100; // Convert to meters
      const volume = length * (line.thickness / 100) * 1; // Assume 1m height
      return sum + volume * (weights[line.material] || 1800);
    }, 0);
    alert(`Total weight: ${totalWeight.toFixed(2)} kg`);
  };

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * 1.05 : oldScale / 1.05;

    setScale(newScale);

    const newPosition = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setPosition(newPosition);
  }, [scale, position]);

  const handleDragStart = useCallback((e) => {
    setIsDragging(true);
    const pos = e.target.getStage().getPointerPosition();
    setDragStart({ x: pos.x - position.x, y: pos.y - position.y });
  }, [position]);

  const handleDragMove = useCallback((e) => {
    if (!isDrawing) return;
    const pos = e.target.getStage().getPointerPosition();
    setPosition({ x: pos.x - dragStart.x, y: pos.y - dragStart.y });
  }, [dragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Top Navbar - Fixed hovering */}
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

      {/* Left Corner Buttons - Fixed hovering */}
      <div className="absolute bottom-4 left-4 z-50 space-y-2">
        <button onClick={saveProject} className="bg-green-500 text-white px-4 py-2 rounded">
          Save Project
        </button>
        <button onClick={loadProject} className="bg-blue-500 text-white px-4 py-2 rounded">
          Load Project
        </button>
        <button onClick={calculateWeight} className="bg-purple-500 text-white px-4 py-2 rounded">
          Calculate Weight
        </button>
      </div>

      {/* Template Canvas - Movable and zoomable background */}
      <div className="absolute inset-0 bg-gray-800">
        <Stage
          ref={stageRef}
          width={window.innerWidth}
          height={window.innerHeight}
          onWheel={handleWheel}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleSelect}
        >
          <Layer>
            {[...Array(50)].map((_, i) => (
              <Line
                key={`grid-h-${i}`}
                points={[0, i * 20, window.innerWidth, i * 20]}
                stroke="#ddd"
                strokeWidth={1}
              />
            ))}
            {[...Array(50)].map((_, i) => (
              <Line
                key={`grid-v-${i}`}
                points={[i * 20, 0, i * 20, window.innerHeight]}
                stroke="#ddd"
                strokeWidth={1}
              />
            ))}
          </Layer>
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.isWall ? '#000' : '#999'}
                strokeWidth={line.isWall ? line.thickness : 5}
                tension={line.isWall ? 0 : 0.5}
                lineCap="round"
                globalCompositeOperation="source-over"
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Right Sidepanel - Fixed hovering */}
      <div className="absolute top-0 right-0 bottom-0 w-64 bg-gray-100 p-4 z-50">
        <h2 className="text-lg font-bold">Sidepanel</h2>
        <Link
          to={`/editor/${projectId}/properties`}
          className={`block p-2 ${window.location.pathname.includes('properties') ? 'bg-blue-200' : 'bg-gray-200'} rounded mb-2`}
        >
          Properties
        </Link>
        <Link
          to={`/editor/${projectId}/settings`}
          className={`block p-2 ${window.location.pathname.includes('settings') ? 'bg-blue-200' : 'bg-gray-200'} rounded`}
        >
          Settings
        </Link>
      </div>
    </div>
  );
}

export default Editor;
