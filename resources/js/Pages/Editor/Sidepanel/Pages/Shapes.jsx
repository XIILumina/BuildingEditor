import React from "react";
import { motion } from "framer-motion";

export default function Shapes({ addShape }) {
  return (
    <motion.div
      className="p-4 bg-[#1e293b] border border-[#334155] shadow-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-4 text-[#f3f4f6]">
        Shapes
      </h2>
      <motion.button
        onClick={() => addShape("rect")}
        className="w-full bg-[#06b6d4] text-[#071021] px-4 py-2 mb-2 border border-[#334155] shadow-md hover:bg-[#14b8a6]"
        whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
        whileTap={{ scale: 0.98 }}
      >
        Rectangle
      </motion.button>
      <motion.button
        onClick={() => addShape("circle")}
        className="w-full bg-[#06b6d4] text-[#071021] px-4 py-2 border border-[#334155] shadow-md hover:bg-[#14b8a6]"
        whileHover={{ boxShadow: '0 4px 12px rgba(6, 182, 212, 0.5)' }}
        whileTap={{ scale: 0.98 }}
      >
        Circle
      </motion.button>
    </motion.div>
  );
}   