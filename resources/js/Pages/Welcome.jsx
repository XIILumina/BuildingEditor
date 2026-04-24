import { Head, Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Cpu, Zap, Layers, Grid3x3, Shield } from "lucide-react";

export default function Welcome({ auth }) {
    const primaryHref = auth?.user ? "/dashboard" : "/register";
    
    const features = [
        { icon: Zap, title: "Lightning Fast", desc: "Real-time canvas with instant feedback" },
        { icon: Layers, title: "Layered Editing", desc: "Organize work across unlimited layers" },
        { icon: Grid3x3, title: "Precise Grid", desc: "Snap-to-grid for architectural accuracy" },
        { icon: Shield, title: "Secure & Private", desc: "Your designs stay private and protected" },
    ];

    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-gray-100 flex flex-col">
                {/* Navbar */}
                <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-700/40 bg-slate-950/60 backdrop-blur-xl shadow-xl">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center space-x-2"
                    >
                        <Cpu className="text-cyan-400" size={28} />
                        <Link
                            href="/"
                            className="text-2xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:from-cyan-300 hover:to-fuchsia-400 transition"
                        >
                            Blueprint<span className="text-slate-400">OS</span>
                        </Link>
                    </motion.div>
                    <div className="space-x-3 flex items-center">
                        {auth.user ? (
                            <Link
                                href="/dashboard"
                                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition font-medium"
                            >
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="px-4 py-2 hover:text-cyan-400 transition font-medium"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 transition font-medium shadow-lg shadow-cyan-500/20"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </nav>

                {/* Hero Section */}
                <div className="flex items-center justify-center text-center px-6 py-24">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-3xl"
                    >
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 }}
                            className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-6 text-cyan-300 text-sm font-medium"
                        >
                            <Sparkles size={16} />
                            Modern Floor Planning, Reimagined
                        </motion.div>

                        <motion.h1
                            className="text-7xl md:text-8xl font-extrabold bg-gradient-to-r from-cyan-300 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent mb-6 leading-tight"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                        >
                            Create Brilliant
                            <br />
                            Floor Plans
                        </motion.h1>
                        <motion.p 
                            className="text-gray-300 text-xl mb-12 leading-relaxed max-w-2xl mx-auto"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            Build floor plans faster with layered editing, AI-assisted
                            suggestions, and professional-grade precision tools built for architects and designers.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div 
                            className="flex gap-4 justify-center mb-16 flex-wrap"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                        >
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Link
                                    href={primaryHref}
                                    className="inline-flex items-center space-x-2 px-8 py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 shadow-2xl shadow-cyan-500/40 hover:shadow-cyan-500/60 transition font-bold text-lg"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    <span>{auth?.user ? "Enter Dashboard" : "Get Started Free"}</span>
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                            </motion.div>
                            {!auth?.user && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center space-x-2 px-8 py-4 rounded-lg border-2 border-slate-600 hover:border-cyan-400 text-slate-200 hover:text-cyan-300 transition font-bold text-lg"
                                    >
                                        Sign In
                                    </Link>
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.div>
                </div>

                {/* Features Grid */}
                <div className="px-6 py-20 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="max-w-6xl mx-auto"
                    >
                        <h2 className="text-4xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400">
                            Why Choose BlueprintOS?
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {features.map((feature, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6 + i * 0.1 }}
                                    className="group p-6 rounded-xl border border-slate-700/40 bg-slate-900/30 backdrop-blur hover:border-cyan-500/40 hover:bg-slate-900/50 transition"
                                >
                                    <feature.icon className="w-8 h-8 text-cyan-400 mb-3 group-hover:text-fuchsia-400 transition" />
                                    <h3 className="font-bold text-lg mb-2 text-slate-200">{feature.title}</h3>
                                    <p className="text-slate-400 text-sm">{feature.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <footer className="mt-auto py-8 text-center text-sm text-slate-500 border-t border-slate-800/40 bg-slate-950/40">
                    <div className="max-w-6xl mx-auto">
                        <p className="mb-2">© {new Date().getFullYear()} BlueprintOS · Plan. Design. Build.</p>
                        <div className="flex justify-center gap-6 text-xs">
                            {/* placeholder for future links */}
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}