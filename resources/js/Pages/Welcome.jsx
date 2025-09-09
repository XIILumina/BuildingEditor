import { Head, Link } from "@inertiajs/react";
import { motion } from "framer-motion";

export default function Welcome({ auth, laravelVersion, phpVersion }) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100 flex flex-col">
                {/* Navbar */}
                <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60 backdrop-blur-md">
                    <Link
                        href="/"
                        className="text-2xl font-extrabold tracking-wide text-cyan-400"
                    >
                        Blueprint<span className="text-fuchsia-500">App</span>
                    </Link>
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
                                    className="px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 transition"
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-2xl"
                    >
                        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent mb-6">
                            Welcome to BlueprintApp
                        </h1>
                        <p className="text-gray-400 text-lg mb-8">
                            A futuristic CAD-like project manager built with
                            Laravel + React. Organize, create, and manage your
                            blueprints with style.
                        </p>
                        <div className="flex justify-center space-x-4">
                            {auth.user ? (
                                <Link
                                    href="/dashboard"
                                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 shadow-lg shadow-cyan-500/30 transition"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 shadow-lg shadow-cyan-500/30 transition"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="px-6 py-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 shadow-lg shadow-fuchsia-500/30 transition"
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Footer */}
                <footer className="py-6 text-center text-sm text-gray-500 border-t border-gray-800">
                    Laravel v{laravelVersion} · PHP v{phpVersion}
                </footer>
            </div>
        </>
    );
}
