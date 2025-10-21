import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LayerManager = ({ layers, activeLayerId, setActiveLayerId, addLayer, deleteLayer }) => {
  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-40 h-12 flex items-center px-4 bg-[#1e293b] border-t border-[#334155] shadow-md"
      initial={{ y: 50 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center space-x-2">
        {layers.map((layer) => (
          <motion.div
            key={layer.id}
            className={`px-4 py-1 text-sm rounded cursor-pointer ${
              activeLayerId === layer.id ? 'bg-[#06b6d4] text-[#071021]' : 'bg-[#334155] text-[#f3f4f6]'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveLayerId(layer.id)}
          >
            {layer.name}
            {layers.length > 1 && (
              <span
                className="ml-2 text-red-500 hover:text-red-700"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLayer(layer.id);
                }}
              >
                ✕
              </span>
            )}
          </motion.div>
        ))}
        <motion.button
          onClick={addLayer}
          className="px-4 py-1 bg-[#10b981] text-[#071021] text-sm rounded"
          whileHover={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.5)' }}
          whileTap={{ scale: 0.98 }}
        >
          + Add Layer
        </motion.button>
      </div>
    </motion.div>
  );
};

export default LayerManager;