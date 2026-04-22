import React, { useState, useEffect } from "react";
import { Link, usePage } from "@inertiajs/react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Folder, Trash2, LogOut, User } from "lucide-react";

export default function Dashboard() {
  const page = usePage();
  const auth = page?.props?.auth || { user: null };
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (auth.user) {
      axios.get("/projects")
        .then((res) => setProjects(res.data.projects || []))
        .catch((err) => console.error(err));
    }
  }, [auth.user]);

  const createProject = async () => {
    try {
      const res = await axios.post("/projects", { name: "Untitled Project" });
      const id = res.data?.id || res.data?.project?.id;
      if (id) window.location.href = `/editor/${id}`;
    } catch (err) {
      console.error(err);
      alert("Failed to create project.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60 backdrop-blur-xl">
        <Link href="/" className="text-2xl font-bold tracking-wide text-cyan-400">
          Blueprint<span className="text-fuchsia-500">OS</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/profile" className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
            <User size={16} /> Profile
          </Link>
          <button
            onClick={async () => {
              await axios.post("/logout");
              window.location.href = "/";
            }}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 p-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-6 text-cyan-300"
        >
          Your Projects
        </motion.h1>

        {auth.user ? (
          <>
            <motion.button
              onClick={createProject}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-5 py-2 mb-8 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:shadow-cyan-500/40 shadow-lg"
            >
              <Plus size={18} /> Create Project
            </motion.button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-gray-900/80 p-5 rounded-xl border border-gray-700 shadow-lg hover:shadow-cyan-500/20 transition"
                >
                  <h3 className="font-bold text-lg text-cyan-400 flex items-center gap-2">
                    <Folder size={18} /> {project.name}
                  </h3>
                  <p className="text-sm text-gray-400">ID: {project.id}</p>
                  <div className="flex space-x-3 mt-4">
                    <Link
                      href={`/editor/${project.id}`}
                      className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition"
                    >
                      Open
                    </Link>
                    <button
                      onClick={async () => {
                        if (confirm("Delete this project?")) {
                          await axios.delete(`/projects/${project.id}`);
                          setProjects((prev) =>
                            prev.filter((p) => p.id !== project.id)
                          );
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 transition"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400">Please log in to manage projects.</p>
        )}
      </div>
    </div>
  );
}
