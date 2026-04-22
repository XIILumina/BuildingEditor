import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { Link } from "@inertiajs/react";

export default function GuestLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-black via-gray-900 to-black text-gray-100 relative overflow-hidden">
      {/* Background motion blur lights */}
      <motion.div
        className="absolute top-0 left-0 w-96 h-96 bg-fuchsia-600/20 rounded-full blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, -50, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center space-x-2"
      >
        <Cpu size={32} className="text-cyan-400" />
        <Link
          href="/"
          className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent"
        >
          BlueprintOS
        </Link>
      </motion.div>

      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>

      <footer className="mt-10 text-sm text-gray-500">
        © {new Date().getFullYear()} BlueprintOS · Crafted with 🪄
      </footer>
    </div>
  );
}
