import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function Properties({
  thickness,
  setThickness,
  selectedObject,
  updateSelectedProperty,
  pxPerMeter
}) {
  const [sizeUnit, setSizeUnit] = useState('px');

  const pxPerInch = pxPerMeter / 39.37; // Approximate, 1 meter ≈ 39.37 inches

  const getDisplayedValue = (pxValue) => {
    if (pxValue === undefined || pxValue === null || pxValue === '') return '';
    const num = Number(pxValue);
    if (isNaN(num)) return '';
    if (sizeUnit === 'px') return num.toFixed(1);
    if (sizeUnit === 'meters') return (num / pxPerMeter).toFixed(2);
    if (sizeUnit === 'inches') return (num / pxPerInch).toFixed(2);
    return num.toFixed(1);
  };

  const updateToPx = (displayedValue) => {
    const num = parseFloat(displayedValue);
    if (isNaN(num)) return null;
    if (sizeUnit === 'px') return num;
    if (sizeUnit === 'meters') return num * pxPerMeter;
    if (sizeUnit === 'inches') return num * pxPerInch;
    return num;
  };

  const handleUpdate = (property, value) => {
    const pxValue = updateToPx(value);
    if (pxValue === null) return;
    if (selectedObject?.type === 'circle') {
      if (property === 'width' || property === 'height') {
        const newRadius = pxValue / 2;
        updateSelectedProperty('radius', newRadius);
        if (property === 'width' && selectedObject.width !== pxValue) {
          // Enforce circle by setting height to match width
          updateSelectedProperty('height', pxValue);
        } else if (property === 'height' && selectedObject.height !== pxValue) {
          updateSelectedProperty('width', pxValue);
        }
        return;
      }
      if (property === 'radius') {
        updateSelectedProperty('radius', pxValue);
        return;
      }
    }
    updateSelectedProperty(property, pxValue);
  };

  const getWidth = (obj) => {
    if (!obj) return '';
    if (obj.type === 'rect') return obj.width || '';
    if (obj.type === 'circle') return (obj.radius || 0) * 2;
    if (obj.isWall && obj.points && obj.points.length === 4) {
      const [x1, y1, x2, y2] = obj.points;
      return Math.hypot(x2 - x1, y2 - y1);
    }
    const bbox = getBbox(obj);
    return bbox ? bbox.width : '';
  };

  const getHeight = (obj) => {
    if (!obj) return '';
    if (obj.type === 'rect') return obj.height || '';
    if (obj.type === 'circle') return (obj.radius || 0) * 2;
    const bbox = getBbox(obj);
    return bbox ? bbox.height : '';
  };

  const getRadius = (obj) => {
    if (!obj) return '';
    if (obj.type === 'circle') return obj.radius || '';
    return '';
  };

  const getX = (obj) => {
    if (!obj) return '';
    if (typeof obj.x === 'number') return obj.x;
    if (obj.points && obj.points.length >= 2) return obj.points[0];
    const bbox = getBbox(obj);
    return bbox ? bbox.x : '';
  };

  const getY = (obj) => {
    if (!obj) return '';
    if (typeof obj.y === 'number') return obj.y;
    if (obj.points && obj.points.length >= 2) return obj.points[1];
    const bbox = getBbox(obj);
    return bbox ? bbox.y : '';
  };

  const getRotation = (obj) => {
    if (!obj) return '';
    return obj.rotation || 0;
  };

  const getBbox = (obj) => {
    if (obj.type === 'rect') {
      return { x: obj.x || 0, y: obj.y || 0, width: obj.width || 0, height: obj.height || 0 };
    }
    if (obj.type === 'circle') {
      const r = obj.radius || 0;
      return { x: (obj.x || 0) - r, y: (obj.y || 0) - r, width: 2 * r, height: 2 * r };
    }
    if (obj.type === 'line' || obj.isWall) {
      if (obj.points && obj.points.length === 4) {
        const [x1, y1, x2, y2] = obj.points;
        return {
          x: Math.min(x1, x2),
          y: Math.min(y1, y2),
          width: Math.hypot(x2 - x1, y2 - y1),
          height: obj.thickness || thickness || 0, // Assuming height as thickness for lines
        };
      }
    }
    if (obj.type === 'polygon' || obj.type === 'triangle') {
      const pts = obj.points || [];
      if (pts.length < 4) return null;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        minX = Math.min(minX, pts[i]);
        minY = Math.min(minY, pts[i + 1]);
        maxX = Math.max(maxX, pts[i]);
        maxY = Math.max(maxY, pts[i + 1]);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    // For freehand or other strokes, similar bbox calculation
    if (obj.points && obj.points.length >= 4) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < obj.points.length; i += 2) {
        minX = Math.min(minX, obj.points[i]);
        minY = Math.min(minY, obj.points[i + 1]);
        maxX = Math.max(maxX, obj.points[i]);
        maxY = Math.max(maxY, obj.points[i + 1]);
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    return null;
  };

  const isEditable = (property) => {
    if (!selectedObject) return false;
    if (property === 'width' || property === 'height') {
      return ['rect', 'circle', 'line', 'wall'].includes(selectedObject.type);
    }
    if (property === 'radius') {
      return selectedObject.type === 'circle';
    }
    if (property === 'x' || property === 'y' || property === 'rotation') {
      return true; // All objects can be moved or rotated
    }
    return false;
  };

  return (
    <motion.div
      className="p-4 bg-[#1e293b] border border-[#334155] shadow-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-4 text-[#f3f4f6]">
        Properties
      </h2>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Thickness (cm)</label>
        <input
          type="range"
          min="1"
          max="60"
          value={thickness || 6}
          onChange={(e) => setThickness(parseInt(e.target.value, 10))}
          className="w-full accent-[#06b6d4]"
        />
        <div className="text-xs text-[#9ca3af] mt-1">{thickness} cm</div>
      </div>
      <div className="border-t border-[#334155] pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-3 text-[#f3f4f6]">Selected Object</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <label className="block text-sm text-[#f3f4f6]">Width</label>
          <input
            type="number"
            step="0.1"
            value={getDisplayedValue(getWidth(selectedObject))}
            onChange={(e) => handleUpdate('width', e.target.value)}
            className="p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
            disabled={!isEditable('width')}
          />
          <select
            value={sizeUnit}
            onChange={(e) => setSizeUnit(e.target.value)}
            className="p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
          >
            <option>px</option>
            <option>meters</option>
            <option>inches</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <label className="block text-sm text-[#f3f4f6]">Height</label>
          <input
            type="number"
            step="0.1"
            value={getDisplayedValue(getHeight(selectedObject))}
            onChange={(e) => handleUpdate('height', e.target.value)}
            className="p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
            disabled={!isEditable('height')}
          />
          <select
            value={sizeUnit}
            onChange={(e) => setSizeUnit(e.target.value)}
            className="p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
          >
            <option>px</option>
            <option>meters</option>
            <option>inches</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <label className="block text-sm text-[#f3f4f6]">Radius</label>
          <input
            type="number"
            step="0.1"
            value={getDisplayedValue(getRadius(selectedObject))}
            onChange={(e) => handleUpdate('radius', e.target.value)}
            className="p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
            disabled={!isEditable('radius')}
          />
          <select
            value={sizeUnit}
            onChange={(e) => setSizeUnit(e.target.value)}
            className="p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
          >
            <option>px</option>
            <option>meters</option>
            <option>inches</option>
          </select>
        </div>
        {selectedObject?.type === 'text' && (
          <div className="mb-4">
            <label className="block text-sm mb-2 text-[#f3f4f6]">Text</label>
            <input
              type="text"
              value={selectedObject.text || ''}
              onChange={(e) => updateSelectedProperty('text', e.target.value)}
              className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
            />
          </div>
        )}
        <hr className="my-4 border-[#334155]" />
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="block text-sm mb-2 text-[#f3f4f6]">X</label>
            <input
              type="number"
              step="1"
              value={getX(selectedObject)}
              onChange={(e) => handleUpdate('x', e.target.value)}
              className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
              disabled={!isEditable('x')}
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-[#f3f4f6]">Y</label>
            <input
              type="number"
              step="1"
              value={getY(selectedObject)}
              onChange={(e) => handleUpdate('y', e.target.value)}
              className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
              disabled={!isEditable('y')}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm mb-2 text-[#f3f4f6]">Rotation (degrees)</label>
          <input
            type="number"
            step="1"
            value={getRotation(selectedObject)}
            onChange={(e) => handleUpdate('rotation', e.target.value)}
            className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
            disabled={!isEditable('rotation')}
          />
        </div>
      </div>
    </motion.div>
  );
}