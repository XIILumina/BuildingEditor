import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCopy, FiTrash2 } from 'react-icons/fi'; // Add react-icons for copy and clear icons

export default function Sidepanel({
  makeAnchorBlock,
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
  aiRequestInProgress,
  aiPrompt,
  setAiPrompt,
  handleAIPromptSubmit,
  chatContainerRef,
  clearAiMessages, // New prop to clear chat
}) {
  const textareaRef = useRef(null);
  const maxChars = 500; // Character limit for AI prompt

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [aiMessages, aiRequestInProgress]);

  // Handle Enter key to submit prompt
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !aiRequestInProgress && aiPrompt.trim()) {
      e.preventDefault();
      handleAIPromptSubmit();
      setAiPrompt(''); // Clear input after sending
    }
  };

  // Copy message to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Message copied to clipboard!');
  };

  // Format timestamp
  const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-[#071227] text-[#f3f4f6]">
      <div className="flex border-b border-[#334155] p-2">
        <motion.button
          onClick={() => setSidepanelMode('properties')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            sidepanelMode === 'properties' ? 'bg-[#06b6d4] text-[#071021]' : 'bg-[#334155] hover:bg-[#475569]'
          } border border-[#334155]`}
          whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
          whileTap={{ scale: 0.98 }}
        >
          Properties
        </motion.button>
        <motion.button
          onClick={() => setSidepanelMode('ai-chat')}
          className={`flex-1 py-2 px-4 text-sm font-medium ${
            sidepanelMode === 'ai-chat' ? 'bg-[#06b6d4] text-[#071021]' : 'bg-[#334155] hover:bg-[#475569]'
          } border border-[#334155]`}
          whileHover={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)' }}
          whileTap={{ scale: 0.98 }}
        >
          AI Chat
        </motion.button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {sidepanelMode === 'properties' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Thickness</label>
              <input
                type="number"
                value={thickness}
                onChange={(e) => setThickness(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Material</label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
              >
                <option>Brick</option>
                <option>Concrete</option>
                <option>Wood</option>
                <option>Steel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Grid Size</label>
              <input
                type="number"
                value={gridSize}
                onChange={(e) => setGridSize(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Units</label>
              <select
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
              >
                <option>Metric</option>
                <option>Imperial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Draw Color</label>
              <input
                type="color"
                value={drawColor}
                onChange={(e) => setDrawColor(e.target.value)}
                className="w-full mt-1 h-10 bg-[#334155] border border-[#475569] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Shapes</label>
              <div className="flex space-x-2 mt-1">
                <motion.button
                  onClick={() => addShape('rect')}
                  className="flex-1 py-2 px-4 bg-[#06b6d4] text-[#071021] border border-[#334155]"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Rectangle
                </motion.button>
                                <motion.button
                  onClick={makeAnchorBlock}
                  className="flex-1 py-2 px-4 bg-[#06b6d4] text-[#071021] border border-[#334155]"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Create Anchor Block
                </motion.button>
                <motion.button
                  onClick={() => addShape('circle')}
                  className="flex-1 py-2 px-4 bg-[#06b6d4] text-[#071021] border border-[#334155]"
                  whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  Circle
                </motion.button>
              </div>
            </div>
            {selectedObject && (
              <div>
                <h3 className="text-lg font-semibold">Selected Object</h3>
                {selectedObject.isWall && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium">Length</label>
                    <input
                      type="number"
                      value={Math.hypot(
                        selectedObject.points[2] - selectedObject.points[0],
                        selectedObject.points[3] - selectedObject.points[1]
                      )}
                      onChange={(e) => updateSelectedProperty('length', Number(e.target.value))}
                      className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
                    />
                  </div>
                )}
                {selectedObject.type === 'rect' && (
                  <>
                    <div className="mt-2">
                      <label className="block text-sm font-medium">Width</label>
                      <input
                        type="number"
                        value={selectedObject.width}
                        onChange={(e) => updateSelectedProperty('width', Number(e.target.value))}
                        className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
                      />
                    </div>
                    <div className="mt-2">
                      <label className="block text-sm font-medium">Height</label>
                      <input
                        type="number"
                        value={selectedObject.height}
                        onChange={(e) => updateSelectedProperty('height', Number(e.target.value))}
                        className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
                      />
                    </div>
                  </>
                )}
                {selectedObject.type === 'circle' && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium">Radius</label>
                    <input
                      type="number"
                      value={selectedObject.radius}
                      onChange={(e) => updateSelectedProperty('radius', Number(e.target.value))}
                      className="w-full mt-1 p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
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
                      {formatTimestamp()}
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
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value.slice(0, maxChars))}
                onKeyDown={handleKeyDown}
                placeholder="Ask the AI for help (e.g., 'Tips for designing a blueprint')"
                className="w-full p-2 bg-[#334155] border border-[#475569] text-[#f3f4f6] rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[#06b6d4]"
                rows="3"
              />
              <div className="text-xs text-gray-400 absolute bottom-2 right-2">
                {aiPrompt.length}/{maxChars}
              </div>
              <motion.button
                onClick={() => {
                  handleAIPromptSubmit();
                  setAiPrompt(''); // Clear input after sending
                }}
                disabled={aiRequestInProgress || !aiPrompt.trim()}
                className={`w-full mt-2 py-2 px-4 bg-[#06b6d4] text-[#071021] border border-[#334155] rounded-md ${
                  aiRequestInProgress || !aiPrompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)', scale: aiRequestInProgress || !aiPrompt.trim() ? 1 : 1.02 }}
                whileTap={{ scale: aiRequestInProgress || !aiPrompt.trim() ? 1 : 0.98 }}
              >
                Send
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}