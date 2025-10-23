import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCopy,
  FiTrash2,
} from 'react-icons/fi';
import Properties from './Pages/Properties'; // Adjust path as needed
import Settings from './Pages/Settings'; // Adjust path as needed
import Shapes from './Pages/Shapes'; // Adjust path as needed
import Style from './Pages/Style'; // Adjust path as needed

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
  clearAiMessages,
  mergeSelected,
  pxPerMeter,
  setPxPerMeter
}) {
  const textareaRef = useRef(null);
  const maxChars = 500;

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [aiMessages, aiRequestInProgress]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !aiRequestInProgress && aiPrompt.trim()) {
      e.preventDefault();
      handleAIPromptSubmit();
      setAiPrompt('');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const formatTimestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-full flex flex-col bg-[#0a1428] text-[#f3f4f6] border-l border-[#1e293b]">
      {/* --- Mode Switch --- */}
      <div className="grid grid-cols-2 border-b border-[#1e293b]">
        {['properties', 'ai-chat'].map((mode) => (
          <motion.button
            key={mode}
            onClick={() => setSidepanelMode(mode)}
            className={`py-2 font-medium text-sm ${
              sidepanelMode === mode
                ? 'bg-[#06b6d4] text-[#0a1428]'
                : 'bg-[#1e293b] hover:bg-[#334155]'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            {mode === 'properties' ? 'Properties' : 'AI Chat'}
          </motion.button>
        ))}
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {sidepanelMode === 'properties' && (
          <div className="space-y-5">
            <Style />
            <Settings 
              gridSize={gridSize} 
              setGridSize={setGridSize} 
              units={units} 
              setUnits={setUnits} 
              pxPerMeter={pxPerMeter}
              setPxPerMeter={setPxPerMeter}
            />
            <Properties 
              thickness={thickness} 
              setThickness={setThickness} 
              material={material} 
              setMaterial={setMaterial} 
              drawColor={drawColor} 
              setDrawColor={setDrawColor} 
              selectedObject={selectedObject} 
              updateSelectedProperty={updateSelectedProperty}
              pxPerMeter={pxPerMeter}
            />
            <Shapes addShape={addShape} />
            <motion.button
              onClick={makeAnchorBlock}
              className="mt-3 w-full py-2 bg-[#06b6d4] text-[#0a1428] rounded font-medium hover:bg-[#0ea5e9] transition-colors"
              whileTap={{ scale: 0.96 }}
            >
              Anchor Block
            </motion.button>

            <motion.button
              onClick={mergeSelected}
              className="mt-2 w-full py-2 bg-[#22c55e] text-[#0a1428] rounded font-medium hover:bg-[#16a34a] transition-colors"
              whileTap={{ scale: 0.96 }}
              title="Merge exactly 2 selected items"
            >
              Merge Selected
            </motion.button>
          </div>
        )}

        {/* --- AI Chat Section --- */}
        {sidepanelMode === 'ai-chat' && (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">AI Assistant</h3>
              <motion.button
                onClick={clearAiMessages}
                className="p-2 bg-[#dc2626] text-white rounded-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FiTrash2 />
              </motion.button>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-2 bg-[#1e293b] border border-[#334155] rounded-md space-y-2"
            >
              <AnimatePresence>
                {aiMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    className={`p-2 rounded-lg text-sm relative ${
                      msg.role === 'user'
                        ? 'bg-[#06b6d4] text-[#0a1428] self-end'
                        : 'bg-[#334155] text-[#f3f4f6]'
                    }`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {msg.content}
                    <span className="text-xs text-gray-400 block mt-1">
                      {formatTimestamp()}
                    </span>
                    {msg.role !== 'user' && (
                      <motion.button
                        onClick={() => copyToClipboard(msg.content)}
                        className="absolute top-1 right-1 p-1 bg-[#475569] rounded text-white opacity-0 hover:opacity-100 transition"
                        whileHover={{ scale: 1.1 }}
                      >
                        <FiCopy size={12} />
                      </motion.button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-3">
              <textarea
                ref={textareaRef}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value.slice(0, maxChars))}
                onKeyDown={handleKeyDown}
                placeholder="Ask the AI..."
                rows="3"
                className="w-full p-2 bg-[#1e293b] border border-[#475569] rounded text-sm resize-none"
              />
              <div className="text-xs text-gray-400 text-right mt-1">
                {aiPrompt.length}/{maxChars}
              </div>
              <motion.button
                onClick={() => {
                  handleAIPromptSubmit();
                  setAiPrompt('');
                }}
                disabled={aiRequestInProgress || !aiPrompt.trim()}
                className={`w-full mt-2 py-2 bg-[#06b6d4] text-[#0a1428] rounded font-medium ${
                  aiRequestInProgress || !aiPrompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                whileTap={{ scale: 0.96 }}
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