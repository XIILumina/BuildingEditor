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
    if (!auth.user) {
      alert('Guests cannot create projects. Please log in.');
      return;
    }
    try {
      const response = await axios.post('/projects');
      const newId = response.data.id;
      window.location.href = `/editor/${newId}`;
    } catch (error) {
      console.error('Error creating project:', error);
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
              <Link href="/dashboard" className="hover:text-blue-300">Dashboard</Link>
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
            <ul>
              {projects.map(project => (
                <li key={project.id}>
                  <Link href={`/editor/${project.id}`}>{project.name}</Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>Guests cannot create or load projects. Please log in.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
