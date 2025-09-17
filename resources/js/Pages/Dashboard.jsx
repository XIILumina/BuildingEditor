import React, { useState, useEffect } from "react";
import { Link, usePage } from "@inertiajs/react";
import { Inertia } from "@inertiajs/inertia";
import axios from "axios";
import { motion } from "framer-motion";

function Dashboard() {
  const page = usePage();
  const auth = page?.props?.auth || { user: null };
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (auth.user) {
      axios
        .get("/projects")
        .then((response) => {
          setProjects(response.data.projects || []);
        })
        .catch((err) => console.error("Error fetching projects:", err));
    }
  }, [auth.user]);

const createProject = async () => {
  try {
    const response = await axios.post("/projects", {
      name: "Untitled Project",
    });
    // backend may return data.id or data.project.id — support both
    const newId = response.data?.id || response.data?.project?.id || response.data?.project?.id;
    if (!newId) {
      console.error("Unexpected project create response:", response.data);
      alert("Failed to create project (no id returned).");
      return;
    }
    window.location.href = `/editor/${newId}`;
  } catch (error) {
    console.error("Error creating project:", error.response?.data || error);
    alert("Failed to create project.");
  }
};

  const logout = () => {
    Inertia.post("/logout");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black text-gray-100 flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60 backdrop-blur-md">
        <Link href="/" className="text-2xl font-extrabold tracking-wide text-cyan-400">
          Blueprint<span className="text-fuchsia-500">App</span>
        </Link>
        <div className="flex items-center space-x-4">
          {auth.user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 transition"
              >
            
                <span>Profile</span>
              </Link> 
              <button
                onClick={logout}
                className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 transition"
              >
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-cyan-400 transition">
                Login
              </Link>
              <Link href="/register" className="hover:text-cyan-400 transition">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 p-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-6 text-cyan-300"
        >
          Dashboard
        </motion.h1>

        {auth.user ? (
          <>
            <motion.button
              onClick={createProject}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 px-5 py-2 mb-6 rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 shadow-lg shadow-cyan-500/30"
            >
              <span>Create Project</span>
            </motion.button>

            <h2 className="text-xl font-semibold mb-4 text-gray-200">Your Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-gray-900/80 backdrop-blur-lg p-5 rounded-xl border border-gray-700 shadow-lg hover:shadow-cyan-500/30 transition"
                >
                  <h3 className="font-bold text-lg text-cyan-400">{project.name}</h3>
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
                      className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-gray-400">
            Guests cannot create or load projects. Please log in.
          </p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;