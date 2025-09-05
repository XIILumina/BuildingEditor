import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Navbar from './Navbar';
import axios from 'axios';

function Dashboard() {
  const { auth } = usePage().props;
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (auth.user) {
      axios.get('/projects').then(response => {
        setProjects(response.data.projects);
      });
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

  return (
    <div>
      <Navbar auth={auth} />
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        {auth.user ? (
          <>
            <button onClick={createProject} className="bg-green-500 text-white px-4 py-2 rounded mb-4">
              Create Project
            </button>
            <h2 className="text-xl font-bold mb-2">Load Project</h2>
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