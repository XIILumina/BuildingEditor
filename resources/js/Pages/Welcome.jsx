import { Head, Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Cpu } from "lucide-react";

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100 flex flex-col">
                {/* Navbar */}
                <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50 backdrop-blur-xl shadow-md">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2"
                    >
                        <Cpu className="text-cyan-400" size={28} />
                        <Link
                            href="/"
                            className="text-2xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                        >
                            Blueprint<span className="text-gray-400">OS</span>
                        </Link>
                    </motion.div>
                    <div className="space-x-4">
                        {auth.user ? (
                            <Link
                                href="/dashboard"
                                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="hover:text-cyan-400 transition"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 transition"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="flex flex-1 items-center justify-center text-center px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-2xl"
                    >
                        <motion.h1
                            className="text-6xl font-extrabold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent mb-6"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8 }}
                        >
                            Design Without Limits
                        </motion.h1>
                        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                            A futuristic 2D Drawing platform for visualizing,
                            managing, and building your creative projects — powered
                            by React, Inertia, and a touch of magic.
                        </p>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 shadow-lg shadow-cyan-500/30 cursor-pointer"
                        >
                            <Sparkles className="w-5 h-5" />
                            <Link href={auth.user ? "/dashboard" : "/register"}>
                                {auth.user ? "Enter Dashboard" : "Get Started"}
                            </Link>
                            <ArrowRight className="w-5 h-5" />
                        </motion.div>
                    </motion.div>
                </div>

                {/* Footer */}
                <footer className="py-6 text-center text-sm text-gray-500 border-t border-gray-800">
                    © {new Date().getFullYear()} HouseEditor · Crafted with 💎
                </footer>
            </div>
        </>
    );
}