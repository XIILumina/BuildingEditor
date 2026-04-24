import React, { useState, useEffect, useCallback } from "react";
import { Link, usePage } from "@inertiajs/react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Folder, Trash2, LogOut, User, Search, AlertCircle, CheckCircle, Loader } from "lucide-react";
import { validateProjectName, createRateLimiter, safeJsonParse } from "../utils/validators";

// Rate limiter for API calls (max 5 requests per 60 seconds)
const apiLimiter = createRateLimiter(5, 60000);

export default function Dashboard() {
  const page = usePage();
  const auth = page?.props?.auth || { user: null };
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Fetch projects with error handling
  useEffect(() => {
    if (auth.user) {
      fetchProjects();
    }
  }, [auth.user]);

  const fetchProjects = useCallback(async () => {
    if (!apiLimiter()) {
      setError("Too many requests. Please wait a moment.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await axios.get("/projects", { timeout: 10000 });
      const fetchedProjects = safeJsonParse(JSON.stringify(res.data), {}).projects || [];
      setProjects(Array.isArray(fetchedProjects) ? fetchedProjects : []);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to load projects";
      setError(message);
      console.error("Fetch projects error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = async () => {
    if (!apiLimiter()) {
      setError("Too many requests. Please wait.");
      return;
    }
    
    if (isCreating) return;
    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const nameValidation = validateProjectName("New Project");
      if (!nameValidation.valid) {
        setError(nameValidation.error);
        setIsCreating(false);
        return;
      }

      const res = await axios.post("/projects", { name: "New Project" }, { timeout: 10000 });
      const id = res.data?.id || res.data?.project?.id;
      
      if (!id || !Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid project ID received");
      }

      setSuccess("Project created! Redirecting...");
      setTimeout(() => {
        window.location.href = `/editor/${id}`;
      }, 500);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to create project";
      setError(message);
      setIsCreating(false);
    }
  };

  const deleteProject = async (projectId) => {
    if (!apiLimiter()) {
      setError("Too many requests. Please wait.");
      return;
    }

    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    setDeletingId(projectId);
    setError("");
    setSuccess("");

    try {
      await axios.delete(`/projects/${projectId}`, { timeout: 10000 });
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setSuccess("Project deleted successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Failed to delete project";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-slate-700/40 bg-slate-950/60 backdrop-blur-xl shadow-xl">
        <Link href="/" className="text-2xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 hover:opacity-80 transition">
          Blueprint<span className="text-slate-400">OS</span>
        </Link>
        <div className="flex items-center space-x-3">
          <Link href="/profile" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 transition font-medium text-sm">
            <User size={16} /> Profile
          </Link>
          <button
            onClick={async () => {
              try {
                await axios.post("/logout", {}, { timeout: 5000 });
                window.location.href = "/";
              } catch (err) {
                console.error("Logout error:", err);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 transition font-medium text-sm text-red-300"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {/* Alert Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-4 p-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 flex items-center gap-3"
          >
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError("")} className="ml-auto text-red-400 hover:text-red-300">✕</button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-4 p-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-300 flex items-center gap-3"
          >
            <CheckCircle size={20} />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400">
                Your Projects
              </h1>
              <p className="text-slate-400">Manage and create your floor plans</p>
            </div>
            <motion.button
              onClick={createProject}
              disabled={isCreating}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:shadow-lg hover:shadow-cyan-500/40 shadow-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} /> Create Project
                </>
              )}
            </motion.button>
          </div>

          {/* Search */}
          <div className="mb-8 relative">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700 focus:border-cyan-500 focus:outline-none transition text-slate-200 placeholder-slate-500"
            />
          </div>

          {/* Projects Grid or Loading/Empty State */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <p className="text-slate-400 font-medium">Loading your projects...</p>
            </div>
          ) : auth.user ? (
            filteredProjects.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredProjects.map((project, i) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative p-6 rounded-xl border border-slate-700/40 bg-gradient-to-br from-slate-900/50 to-slate-900/30 backdrop-blur hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/10 transition overflow-hidden"
                  >
                    {/* Background accent */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-fuchsia-500/0 group-hover:from-cyan-500/5 group-hover:to-fuchsia-500/5 transition pointer-events-none" />
                    
                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Folder size={24} className="text-cyan-400" />
                          <h3 className="font-bold text-lg text-slate-100 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-fuchsia-400 transition">
                            {project.name}
                          </h3>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">ID: {project.id}</p>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/editor/${project.id}`}
                          className="flex-1 px-4 py-2 rounded-lg bg-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-600/40 transition font-medium text-sm text-center"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => deleteProject(project.id)}
                          disabled={deletingId === project.id}
                          className="px-4 py-2 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600/40 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === project.id ? (
                            <Loader size={16} className="animate-spin" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <Folder className="w-16 h-16 text-slate-600 mb-4 opacity-50" />
                <p className="text-slate-400 font-medium mb-2">
                  {searchTerm ? "No projects found matching your search" : "No projects yet"}
                </p>
                {!searchTerm && (
                  <button
                    onClick={createProject}
                    className="mt-4 px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition font-medium text-sm"
                  >
                    Create your first project
                  </button>
                )}
              </motion.div>
            )
          ) : (
            <div className="text-center py-24 text-slate-400">
              <p>Please log in to manage projects.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
