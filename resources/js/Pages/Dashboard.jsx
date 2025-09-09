import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Inertia } from '@inertiajs/inertia';
import axios from 'axios';

function Dashboard() {
  const page = usePage();
  const auth = page?.props?.auth || { user: null }; // safe fallback
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (auth.user) {
      axios.get('/projects')
        .then(response => {
          setProjects(response.data.projects || []);
        })
        .catch(err => console.error("Error fetching projects:", err));
    }
  }, [auth.user]);

const createProject = async () => {
  try {
    const response = await axios.post('/projects', {
      name: "Untitled Project"
    });
    const newId = response.data.id;
    window.location.href = `/editor/${newId}`;
  } catch (error) {
    console.error("Error creating project:", error.response?.data || error);
    alert("Failed to create project.");
  }
};

  const logout = () => {
    Inertia.post('/logout'); // Breeze expects POST
  };

  return (
    <div>
      <nav className="flex items-center justify-between bg-gray-900 text-white p-4">
        <Link href="/" className="font-bold text-xl">Blueprint App</Link>
        <div className="space-x-4">
          {auth.user ? (
            <>
              <Link href="/profile" className="hover:text-blue-300">Profile</Link>
              <button onClick={logout} className="bg-red-600 px-3 py-1 rounded hover:bg-red-700">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-blue-300">Login</Link>
              <Link href="/register" className="hover:text-blue-300">Register</Link>
            </>
          )}
        </div>
      </nav>

      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        {auth.user ? (
          <>
            <button
              onClick={createProject}
              className="bg-green-500 text-white px-4 py-2 rounded mb-4"
            >
              Create Project
            </button>
            <h2 className="text-xl font-bold mb-2">Your Projects</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div key={project.id} className="bg-gray-800 p-4 rounded shadow">
                <h3 className="font-bold">{project.name}</h3>
                <p className="text-sm text-gray-400">ID: {project.id}</p>
                <div className="flex space-x-2 mt-2">
                  <Link
                    href={`/editor/${project.id}`}
                    className="bg-blue-600 px-2 py-1 rounded hover:bg-blue-700"
                  >
                    Open
                  </Link>
                  <button
                    onClick={async () => {
                      if (confirm("Delete this project?")) {
                        await axios.delete(`/projects/${project.id}`);
                        setProjects(prev => prev.filter(p => p.id !== project.id));
                      }
                    }}
                    className="bg-red-600 px-2 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          </>
        ) : (
          <p>Guests cannot create or load projects. Please log in.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
