import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function Style() {
  const [theme, setTheme] = useState('dark');

  return (
    <motion.div
      className="p-4 bg-[#1e293b] border border-[#334155] shadow-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-xl font-semibold mb-4 text-[#f3f4f6]">
        Style
      </h2>
      <div className="mb-4">
        <label className="block text-sm mb-2 text-[#f3f4f6]">Theme</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="w-full p-2 bg-[#071826] text-[#f3f4f6] border border-[#334155] focus:ring-2 focus:ring-[#06b6d4]"
        >
          <option value="dark">Dark (Default)</option>
          <option value="light">Light</option>
        </select>
      </div>
      <p className="text-sm text-[#9ca3af]">Theme customization options will be expanded soon.</p>
    </motion.div>
  );
}