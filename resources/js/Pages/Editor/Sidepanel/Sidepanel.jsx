import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiCopy } from 'react-icons/fi';
import TextInput from '@/Components/TextInput';

const Sidepanel = ({
  sidepanelMode,
  setSidepanelMode,
  thickness,
  setThickness,
  material,
  setMaterial,
  gridSize,
  setGridSize,
  units,
  setUnits,
  drawColor,
  setDrawColor,
  addShape,
  selectedObject,
  updateSelectedProperty,
  aiMessages,
  aiPrompt,
  setAiPrompt,
  handleAIPromptSubmit,
  chatContainerRef,
  clearAiMessages,
  makeAnchorBlock,
}) => {
  const materials = ['Brick', 'Wood', 'Concrete', 'Steel'];
  const unitOptions = ['Metric', 'Imperial'];

  // AI chat helpers / local state
  const textareaRef = useRef(null);
  const [aiRequestInProgress, setAiRequestInProgress] = useState(false); // local optimistic flag
  const maxChars = 1000;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return new Date().toLocaleTimeString();
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toLocaleTimeString();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!aiRequestInProgress && aiPrompt?.trim()) {
        setAiRequestInProgress(true);
        Promise.resolve(handleAIPromptSubmit())
          .finally(() => {
            setAiRequestInProgress(false);
            setAiPrompt('');
            textareaRef.current?.blur();
          });
      }
    }
  };

  return (
    <div className="h-full p-4 flex flex-col space-y-4 bg-[#071227] text-[#f3f4f6]">
      <div className="flex space-x-2">
        <motion.button
          onClick={() => setSidepanelMode('properties')}
          className={`flex-1 px-4 py-2 text-sm rounded ${
            sidepanelMode === 'properties' ? 'bg-[#06b6d4] text-[#071021]' : 'bg-[#334155]'
          }`}
          whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
          whileTap={{ scale: 0.98 }}
        >
          Properties
        </motion.button>
        <motion.button
          onClick={() => setSidepanelMode('ai-chat')}
          className={`flex-1 px-4 py-2 text-sm rounded ${
            sidepanelMode === 'ai-chat' ? 'bg-[#06b6d4] text-[#071021]' : 'bg-[#334155]'
          }`}
          whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
          whileTap={{ scale: 0.98 }}
        >
          AI Chat
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {sidepanelMode === 'properties' && (
          <motion.div
            key="properties"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm">Thickness</label>
              <input
                type="range"
                min="1"
                max="20"
                value={thickness ?? 6}
                onChange={(e) => setThickness(Number(e.target.value))}
                className="w-full"
              />
              <span>{thickness ?? 6}px</span>
            </div>
            <div>
              <label className="block text-sm">Material</label>
              <select
                value={material ?? materials[0]}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full bg-[#334155] text-[#f3f4f6] rounded p-2"
              >
                {materials.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Grid Size</label>
              <input
                type="number"
                value={gridSize ?? 10}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full bg-[#334155] text-[#f3f4f6] rounded p-2"
              />
            </div>
            <div>
              <label className="block text-sm">Units</label>
              <select
                value={units ?? unitOptions[0]}
                onChange={(e) => setUnits(e.target.value)}
                className="w-full bg-[#334155] text-[#f3f4f6] rounded p-2"
              >
                {unitOptions.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Color</label>
              <input
                type="color"
                value={drawColor ?? '#ffffff'}
                onChange={(e) => setDrawColor(e.target.value)}
                className="w-full h-8 rounded"
              />
            </div>
            <div>
              <label className="block text-sm">Add Shape</label>
              <div className="flex space-x-2">
                <motion.button
                  onClick={() => addShape('rect')}
                  className="px-4 py-2 bg-[#334155] text-sm rounded"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Rectangle
                </motion.button>
                <motion.button
                  onClick={() => addShape('circle')}
                  className="px-4 py-2 bg-[#334155] text-sm rounded"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Circle
                </motion.button>
                <motion.button
                  onClick={() => addShape('oval')}
                  className="px-4 py-2 bg-[#334155] text-sm rounded"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Oval
                </motion.button>
                <motion.button
                  onClick={() => addShape('triangle')}
                  className="px-4 py-2 bg-[#334155] text-sm rounded"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Triangle
                </motion.button>
                <motion.button
                  onClick={() => addShape('polygon')}
                  className="px-4 py-2 bg-[#334155] text-sm rounded"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Polygon
                </motion.button>
              </div>
            </div>
            {selectedObject && (
              <div>
                <h3 className="text-lg font-semibold">Selected Object</h3>
                {selectedObject.isWall && (
                  <div>
                    <label className="block text-sm">Length</label>
                    <input
                      type="number"
                      value={Math.hypot(
                        selectedObject.points[2] - selectedObject.points[0],
                        selectedObject.points[3] - selectedObject.points[1]
                      )}
                      onChange={(e) => updateSelectedProperty('length', Number(e.target.value))}
                      className="w-full bg-[#334155] text-[#f3f4f6] rounded p-2"
                    />
                  </div>
                )}
                {selectedObject.type === 'rect' && (
                  <>
                    <div>
                      <label className="block text-sm">Width</label>
                      <input
                        type="number"
                        value={selectedObject.width ?? 80}
                        onChange={(e) => updateSelectedProperty('width', Number(e.target.value))}
                        className="w-full bg-[#334155] text-[#f3f4f6] rounded p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm">Height</label>
                      <input
                        type="number"
                        value={selectedObject.height ?? 60}
                        onChange={(e) => updateSelectedProperty('height', Number(e.target.value))}
                        className="w-full bg-[#334155] text-[#f3f4f6] rounded p-2"
                      />
                    </div>
                  </>
                )}
                {selectedObject.type === 'circle' && (
                  <div>
                    <label className="block text-sm">Radius</label>
                    <input
                      type="number"
                      value={selectedObject.radius ?? 40}
                      onChange={(e) => updateSelectedProperty('radius', Number(e.target.value))}
                      className="w-full bg-[#334155] text-[#f3f4f6] rounded p-2"
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {sidepanelMode === 'ai-chat' && (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">AI Assistant</h3>
              <motion.button
                onClick={clearAiMessages}
                className="p-2 bg-[#dc2626] text-[#f3f4f6] rounded-md border border-[#334155]"
                whileHover={{ boxShadow: '0 4px 12px rgba(220, 38, 38, 0.5)' }}
                whileTap={{ scale: 0.98 }}
                title="Clear Chat"
              >
                <FiTrash2 />
              </motion.button>
            </div>
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-2 bg-[#1e293b] border border-[#334155] rounded-md"
              style={{ scrollBehavior: 'smooth' }}
            >
              <AnimatePresence>
                {aiMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`mb-2 p-2 rounded-lg relative group ${
                      msg.role === 'user'
                        ? 'bg-[#06b6d4] text-[#071021] ml-8'
                        : 'bg-[#334155] text-[#f3f4f6] mr-8'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(msg.timestamp)}
                    </div>
                    {msg.role !== 'user' && (
                      <motion.button
                        onClick={() => copyToClipboard(msg.content)}
                        className="absolute top-2 right-2 p-1 bg-[#475569] text-[#f3f4f6] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Copy Message"
                      >
                        <FiCopy />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
                {aiRequestInProgress && (
                  <motion.div
                    className="mb-2 p-2 rounded-lg bg-[#334155] text-[#f3f4f6] mr-8 flex items-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="flex space-x-1">
                      <motion.div
                        className="w-2 h-2 bg-[#06b6d4] rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-[#06b6d4] rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-[#06b6d4] rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: 0.4 }}
                      />
                    </div>
                    <p className="text-sm italic ml-2">Loading...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-2 relative">
              <textarea
                ref={textareaRef}
                value={aiPrompt ?? ''}
                onChange={(e) => setAiPrompt(e.target.value.slice(0, maxChars))}
                onKeyDown={handleKeyDown}
                placeholder="Ask the AI for help (e.g., 'Tips for designing a blueprint')"
                className="w-full p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
                rows="3"
              />
              <div className="text-xs text-gray-400 absolute bottom-2 right-2">
                {aiPrompt?.length ?? 0}/{maxChars}
              </div>
              <motion.button
                onClick={() => {
                  if (!aiRequestInProgress && aiPrompt?.trim()) {
                    setAiRequestInProgress(true);
                    Promise.resolve(handleAIPromptSubmit())
                      .finally(() => {
                        setAiRequestInProgress(false);
                        setAiPrompt('');
                      });
                  }
                }}
                disabled={aiRequestInProgress || !aiPrompt?.trim()}
                className={`w-full mt-2 py-2 px-4 bg-[#06b6d4] text-[#071021] border border-[#334155] rounded-md ${
                  aiRequestInProgress || !aiPrompt?.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)', scale: aiRequestInProgress || !aiPrompt?.trim() ? 1 : 1.02 }}
                whileTap={{ scale: aiRequestInProgress || !aiPrompt?.trim() ? 1 : 0.98 }}
              >
                Send
              </motion.button>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Sidepanel;